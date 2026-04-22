"""
BCI Engine — Brand Capital Index daily snapshot.
---------------------------------------------------
對應文件：docs/BCI_METHODOLOGY.md v1.0
對應 schema：supabase/migrations/20260422000000_bci_snapshots.sql

流程：
  1. 載入權重向量（BCI_WEIGHTS_JSON env 或 private/bci/weights_dev.json）
  2. 對每個 active brand：
       - 計算 F（via MarketDataProvider）
       - 計算 V（讀 visibility_results 最近 24h）
       - 計算 E（讀 engagement_signals 最近 7 天）
       - 正規化子項到 0-100
       - 套產業權重 → total_bci
       - INSERT bci_snapshots
  3. 結束後 print summary

環境變數：
  SUPABASE_URL                  必填
  SUPABASE_SERVICE_ROLE_KEY     必填
  BCI_WEIGHTS_JSON              選，正式環境從 GitHub Secret 注入
                                例：{"v1":{"technology":{"wF":0.35,"wV":0.4,"wE":0.25,...}}}
  BCI_WEIGHTS_VERSION           選，預設 "v1"
  BCI_MARKET_PROVIDER           選，預設 "yfinance"
  DRY_RUN                       選，"true" 時不寫 DB

權重向量缺失時退回中性預設（wF=wV=wE=1/3），但會 print warning —
生產環境**必須**設定 BCI_WEIGHTS_JSON，CI 才會用到真正的 IP 權重。
"""

from __future__ import annotations

import json
import math
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib import request
from urllib.error import HTTPError, URLError

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from providers import load_provider  # noqa: E402


# ---------- Supabase REST helper ----------

def _sb_request(method: str, path: str, body: dict | None = None) -> Any:
    url = os.environ["SUPABASE_URL"].rstrip("/") + path
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        print(f"[supabase] {method} {path} -> {exc.code}: {body_text}", file=sys.stderr)
        raise
    except URLError as exc:
        print(f"[supabase] {method} {path} network error: {exc}", file=sys.stderr)
        raise


# ---------- weights loader ----------

DEFAULT_WEIGHTS = {
    "default": {
        "wF": 1 / 3, "wV": 1 / 3, "wE": 1 / 3,
        "a1": 0.25, "a2": 0.25, "a3": 0.25, "a4": 0.25,
        "b1": 0.3, "b2": 0.3, "b3": 0.2, "b4": 0.2,
        "c1": 0.25, "c2": 0.25, "c3": 0.25, "c4": 0.25,
    },
}


def load_weights() -> tuple[dict, str]:
    """Return (weights_table, version). Priority: env > private file > default."""
    version = os.environ.get("BCI_WEIGHTS_VERSION", "v1")
    env_json = os.environ.get("BCI_WEIGHTS_JSON")
    if env_json:
        table = json.loads(env_json)
        return table.get(version, table), version

    dev_file = REPO_ROOT / "private" / "bci" / f"weights_{version}.json"
    if dev_file.exists():
        return json.loads(dev_file.read_text(encoding="utf-8")), version

    print(
        "[bci] WARNING: no BCI_WEIGHTS_JSON / private file; using neutral defaults. "
        "Never ship this to production.",
        file=sys.stderr,
    )
    return DEFAULT_WEIGHTS, "v0-default"


def industry_weights(table: dict, industry: str) -> dict:
    return table.get(industry) or table.get("default") or DEFAULT_WEIGHTS["default"]


# ---------- subscore calculators ----------

def compute_f(snapshot, w: dict) -> float | None:
    """Financial Capital, 0-100."""
    mc = snapshot.market_cap_usd
    rg = snapshot.revenue_growth_yoy
    om = snapshot.operating_margin
    beta = snapshot.beta
    if all(x is None for x in (mc, rg, om, beta)):
        return None

    # log market cap normalize (1B USD ≈ 0, 1T USD ≈ 1)
    mc_n = 0.0 if mc is None else _clip((math.log10(max(mc, 1)) - 9) / 3, 0, 1)
    rg_n = 0.5 if rg is None else _clip((rg + 0.2) / 0.4, 0, 1)      # -20%..+20% → 0..1
    om_n = 0.5 if om is None else _clip((om + 0.1) / 0.4, 0, 1)      # -10%..+30% → 0..1
    bt_n = 0.5 if beta is None else _clip(1 - abs(beta - 1) / 1.5, 0, 1)

    raw = w["a1"] * mc_n + w["a2"] * rg_n + w["a3"] * om_n + w["a4"] * bt_n
    return round(raw * 100, 2)


def compute_v(rows: list[dict], w: dict) -> tuple[float | None, int]:
    """AI Visibility Capital, 0-100. rows = visibility_results last 24h."""
    if not rows:
        return None, 0

    total = len(rows)
    mentioned = sum(1 for r in rows if r.get("mentioned"))
    mention_rate = mentioned / total if total else 0

    ranks = [r["rank_position"] for r in rows if r.get("rank_position")]
    avg_rank = sum(ranks) / len(ranks) if ranks else 10
    rank_score = _clip(1 / max(avg_rank, 1), 0, 1)

    sentiment_map = {"positive": 1.0, "neutral": 0.5, "negative": 0.0}
    sentiments = [sentiment_map.get(r.get("sentiment") or "neutral", 0.5) for r in rows]
    sentiment_score = sum(sentiments) / len(sentiments) if sentiments else 0.5

    # competitor share = 1 / (1 + avg competitors per mention)
    comp_counts = []
    for r in rows:
        comps = r.get("competitors") or []
        if isinstance(comps, list):
            comp_counts.append(len(comps))
    avg_comp = sum(comp_counts) / len(comp_counts) if comp_counts else 3
    comp_share = _clip(1 / (1 + avg_comp), 0, 1)

    raw = (
        w["b1"] * mention_rate
        + w["b2"] * rank_score
        + w["b3"] * sentiment_score
        + w["b4"] * comp_share
    )
    return round(raw * 100, 2), total


def compute_e(rows: list[dict], w: dict) -> tuple[float | None, int]:
    """Engagement Capital, 0-100. rows = engagement_signals last 7 days."""
    if not rows:
        return None, 0

    by_type: dict[str, list[float]] = {}
    for r in rows:
        by_type.setdefault(r["signal_type"], []).append(float(r.get("value") or 0) * float(r.get("weight") or 1))

    sov = _avg(by_type.get("digital_sov", []))
    nps = _avg(by_type.get("nps_response", []))
    advocacy = _sum(by_type.get("advocacy_lexicon", []))
    relevance = _avg(by_type.get("category_relevance", []))

    sov_n = _clip(sov / 100, 0, 1)                       # assume SOV reported 0-100
    nps_n = _clip((nps + 100) / 200, 0, 1)               # NPS -100..+100 → 0..1
    advocacy_n = _clip(advocacy / 50, 0, 1)              # 50+ hits / week = saturated
    relevance_n = _clip(relevance, 0, 1)                 # already 0..1

    raw = (
        w["c1"] * sov_n
        + w["c2"] * nps_n
        + w["c3"] * advocacy_n
        + w["c4"] * relevance_n
    )
    return round(raw * 100, 2), len(rows)


# ---------- data fetch ----------

def fetch_active_brands() -> list[dict]:
    rows = _sb_request("GET", "/rest/v1/brands?select=id,name,industry,ticker&status=eq.active&limit=500")
    return rows or []


def fetch_visibility_24h(brand_id: str) -> list[dict]:
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    path = (
        f"/rest/v1/visibility_results"
        f"?brand_id=eq.{brand_id}"
        f"&created_at=gte.{since}"
        f"&select=mentioned,rank_position,sentiment,competitors"
        f"&limit=500"
    )
    return _sb_request("GET", path) or []


def fetch_engagement_7d(brand_id: str) -> list[dict]:
    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    path = (
        f"/rest/v1/engagement_signals"
        f"?brand_id=eq.{brand_id}"
        f"&occurred_at=gte.{since}"
        f"&select=signal_type,value,weight"
        f"&limit=1000"
    )
    return _sb_request("GET", path) or []


def insert_snapshot(row: dict) -> None:
    _sb_request("POST", "/rest/v1/bci_snapshots", row)


# ---------- helpers ----------

def _clip(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _avg(xs: list[float]) -> float:
    return sum(xs) / len(xs) if xs else 0.0


def _sum(xs: list[float]) -> float:
    return sum(xs)


# ---------- main ----------

def run() -> int:
    weights_table, version = load_weights()
    provider = load_provider()
    dry_run = os.environ.get("DRY_RUN", "").lower() == "true"

    print(f"[bci] weights_version={version} provider={provider.name} dry_run={dry_run}")

    try:
        brands = fetch_active_brands()
    except Exception as exc:
        print(f"[bci] failed to fetch brands: {exc}", file=sys.stderr)
        return 1

    if not brands:
        print("[bci] no active brands; nothing to do")
        return 0

    ok = 0
    skipped = 0
    for brand in brands:
        bid = brand["id"]
        name = brand.get("name") or bid
        industry = brand.get("industry") or "default"
        ticker = brand.get("ticker")
        w = industry_weights(weights_table, industry)

        try:
            snap = provider.fetch(ticker) if ticker else None
            f_score = compute_f(snap, w) if snap else None
            v_rows = fetch_visibility_24h(bid)
            v_score, v_n = compute_v(v_rows, w)
            e_rows = fetch_engagement_7d(bid)
            e_score, e_n = compute_e(e_rows, w)

            parts = []
            weights_sum = 0.0
            for key, val in (("wF", f_score), ("wV", v_score), ("wE", e_score)):
                if val is not None:
                    parts.append(w[key] * val)
                    weights_sum += w[key]

            if not parts or weights_sum == 0:
                print(f"[bci] {name}: no signals available, skipping")
                skipped += 1
                continue

            total = round(sum(parts) / weights_sum, 2)

            row = {
                "brand_id": bid,
                "f_financial": f_score,
                "v_visibility": v_score,
                "e_engagement": e_score,
                "total_bci": total,
                "weights_version": version,
                "industry_key": industry,
                "f_source": snap.source if snap else None,
                "v_sample_size": v_n,
                "e_sample_size": e_n,
                "raw_metrics": {
                    "f_snapshot": snap.__dict__ if snap else None,
                    "weights": {k: v for k, v in w.items()},
                },
            }

            if dry_run:
                print(f"[bci][dry] {name} → F={f_score} V={v_score} E={e_score} total={total}")
            else:
                insert_snapshot(row)
                print(f"[bci] {name} → F={f_score} V={v_score} E={e_score} total={total}")
            ok += 1

        except Exception as exc:
            print(f"[bci] {name}: {exc}", file=sys.stderr)
            skipped += 1

    print(f"[bci] done: ok={ok} skipped={skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(run())

#!/usr/bin/env python3
"""
AIVI Scorer — 把採樣結果換算成六維度分數與月報
------------------------------------------------
上游：scripts/aivi_tracker.py（產出 reports/aivi/<slug>-<stamp>.json 並寫 Supabase）
下游：aivi_scores_monthly + 月報 HTML

六個維度（各 0-100）：
  presence     提及率——問到這個品類時，回答裡出現品牌的比例
  rank         排名——被列出時的名次（未入列但有提及視為中性）
  share        同框佔比——品牌 vs 競品在同一題裡的出現比重
  sentiment    語氣——推薦 / 中性 / 保留
  citation     引用——回答引用的網址裡有沒有自家網域
  consistency  一致性——跨引擎、跨語言講的是不是同一個你

綜合分 = Σ(權重 × 維度分)。**權重是 IP，不進 repo**：
  1. AIVI_WEIGHTS_JSON 環境變數（正式環境由 GitHub Secret 注入）
  2. private/aivi/weights_dev.json（本機開發，已 gitignore）
  3. 皆無 → 退回等權重並印 warning（僅供開發，不得用於交付）

用法：
  # 本機：對一或多份採樣報告計分
  python scripts/aivi_score.py --input reports/aivi/symcio-*.json --html /tmp/report.html

  # CI：對某品牌某月的 Supabase 資料計分並寫回 aivi_scores_monthly
  python scripts/aivi_score.py --brand-id <uuid> --period 2026-08

環境變數：
  AIVI_WEIGHTS_JSON            權重，格式見 --print-schema
  AIVI_WEIGHTS_VERSION         預設 'v1'
  BRAND_NAME / BRAND_DOMAIN    月報標題與 citation 判定用
  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
from datetime import date, datetime, timezone
from html import escape
from pathlib import Path
from urllib import parse, request
from urllib.error import HTTPError, URLError

REPO_ROOT = Path(__file__).resolve().parent.parent
DEV_WEIGHTS = REPO_ROOT / "private" / "aivi" / "weights_dev.json"

DIMENSIONS = ("presence", "rank", "share", "sentiment", "citation", "consistency")

# 客戶看到的是中文標籤；DB 與 API 一律用英文 key
DIMENSION_LABELS = {
    "presence": "提及率 Presence",
    "rank": "排名 Rank",
    "share": "同框佔比 Share",
    "sentiment": "語氣 Sentiment",
    "citation": "引用來源 Citation",
    "consistency": "一致性 Consistency",
}

# 等級門檻同樣可由 config 覆寫；預設僅供開發
DEFAULT_GRADE_BANDS = [("A", 80), ("B", 65), ("C", 50), ("D", 35), ("E", 0)]

WEIGHTS_SCHEMA = {
    "v1": {
        "default": {d: round(1 / len(DIMENSIONS), 4) for d in DIMENSIONS},
        "technology": {d: round(1 / len(DIMENSIONS), 4) for d in DIMENSIONS},
    },
    "_grade_bands": {"v1": [["A", 80], ["B", 65], ["C", 50], ["D", 35], ["E", 0]]},
}


# ---------- Supabase ----------

def _sb_get(path: str) -> list | None:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        return None
    req = request.Request(
        f"{url}/rest/v1/{path}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    try:
        with request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8") or "[]")
    except (HTTPError, URLError, json.JSONDecodeError) as e:
        print(f"WARN: Supabase GET {path} → {type(e).__name__}: {e}", file=sys.stderr)
        return None


def _sb_upsert(table: str, row: dict, on_conflict: str) -> bool:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        return False
    req = request.Request(
        f"{url}/rest/v1/{table}?on_conflict={on_conflict}",
        data=json.dumps([row]).encode("utf-8"),
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=30):
            return True
    except (HTTPError, URLError) as e:
        detail = e.read().decode(errors="ignore")[:200] if isinstance(e, HTTPError) else ""
        print(f"WARN: Supabase upsert {table} 失敗：{e} {detail}", file=sys.stderr)
        return False


# ---------- 權重 ----------

def load_weights(industry: str, version: str) -> tuple[dict, list, str]:
    """回傳 (weights, grade_bands, source)。權重不硬編碼在 repo。"""
    raw = os.environ.get("AIVI_WEIGHTS_JSON", "").strip()
    source = ""
    data = None

    if raw:
        try:
            data = json.loads(raw)
            source = "AIVI_WEIGHTS_JSON"
        except json.JSONDecodeError as e:
            print(f"WARN: AIVI_WEIGHTS_JSON 解析失敗：{e}", file=sys.stderr)

    if data is None and DEV_WEIGHTS.exists():
        try:
            data = json.loads(DEV_WEIGHTS.read_text(encoding="utf-8"))
            source = str(DEV_WEIGHTS.relative_to(REPO_ROOT))
        except json.JSONDecodeError as e:
            print(f"WARN: {DEV_WEIGHTS} 解析失敗：{e}", file=sys.stderr)

    if data is None:
        print("WARN: 找不到權重設定，退回等權重。此結果僅供開發，不得作為交付報告。",
              file=sys.stderr)
        equal = {d: 1 / len(DIMENSIONS) for d in DIMENSIONS}
        return equal, DEFAULT_GRADE_BANDS, "equal-weight fallback"

    by_version = data.get(version, {})
    weights = by_version.get(industry) or by_version.get("default")
    if not weights:
        print(f"WARN: 權重中找不到 {version}/{industry}（也無 default），退回等權重。",
              file=sys.stderr)
        weights = {d: 1 / len(DIMENSIONS) for d in DIMENSIONS}
        source += " (no matching industry)"

    missing = [d for d in DIMENSIONS if d not in weights]
    if missing:
        print(f"WARN: 權重缺少維度 {missing}，以 0 計。", file=sys.stderr)

    bands_raw = (data.get("_grade_bands") or {}).get(version)
    bands = [(b[0], float(b[1])) for b in bands_raw] if bands_raw else DEFAULT_GRADE_BANDS

    return {d: float(weights.get(d, 0.0)) for d in DIMENSIONS}, bands, source


# ---------- 觀測值 → 維度分數 ----------

def rank_score(rank: int | None) -> float:
    """第 1 名 100 分，往後每名減 12 分；有提及但未入列視為中性 50。"""
    if rank is None:
        return 50.0
    return max(0.0, 100.0 - (rank - 1) * 12.0)


SENTIMENT_SCORE = {"positive": 100.0, "neutral": 60.0, "negative": 0.0}


def score_dimensions(records: list[dict], domain: str) -> tuple[dict, dict]:
    """records 為 aivi_tracker 的 records 格式；回傳 (dimensions, evidence)。"""
    sampled = [r for r in records if not r.get("error")]
    hits = [r for r in sampled if r.get("mentioned")]

    if not sampled:
        raise ValueError("沒有任何成功採樣，無法計分。")

    presence = len(hits) / len(sampled) * 100

    rank = statistics.fmean(rank_score(r.get("rank_position")) for r in hits) if hits else 0.0

    competitor_mentions = sum(len(r.get("competitors") or []) for r in sampled)
    share = (len(hits) / (len(hits) + competitor_mentions) * 100
             if (len(hits) + competitor_mentions) else 0.0)

    sentiment = (statistics.fmean(
        SENTIMENT_SCORE.get(r.get("sentiment") or "neutral", 60.0) for r in hits)
        if hits else 0.0)

    dom = (domain or "").lower()
    cited = [r for r in hits
             if dom and any(dom in (u or "").lower() for u in (r.get("cited_urls") or []))]
    citation = len(cited) / len(hits) * 100 if hits else 0.0

    # 一致性：跨引擎與跨語言的提及率落差越小越好
    def _spread(key: str) -> float:
        groups: dict[str, list[dict]] = {}
        for r in sampled:
            groups.setdefault(r.get(key) or "?", []).append(r)
        rates = [len([x for x in g if x.get("mentioned")]) / len(g) * 100
                 for g in groups.values() if g]
        return (max(rates) - min(rates)) if len(rates) > 1 else 0.0

    engine_spread = _spread("engine")
    locale_spread = _spread("locale")
    if hits:
        consistency = max(0.0, 100.0 - (engine_spread * 0.6 + locale_spread * 0.4))
    else:
        # 全體一致地不存在不是一致性——否則「完全隱形」會靠這一維度拿到分數
        consistency = 0.0

    dimensions = {
        "presence": round(presence, 1),
        "rank": round(rank, 1),
        "share": round(share, 1),
        "sentiment": round(sentiment, 1),
        "citation": round(citation, 1),
        "consistency": round(consistency, 1),
    }

    evidence = {
        "sample_size": len(sampled),
        "hit_count": len(hits),
        "error_count": len(records) - len(sampled),
        "competitor_mentions": competitor_mentions,
        "engine_presence_spread": round(engine_spread, 1),
        "locale_presence_spread": round(locale_spread, 1),
        "cited_own_domain": len(cited),
        "by_engine": _breakdown(sampled, "engine"),
        "by_locale": _breakdown(sampled, "locale"),
        "by_intent": _breakdown(sampled, "intent"),
        "weakest_prompts": _weakest(sampled),
        "top_cited_urls": _top_urls(hits),
    }
    return dimensions, evidence


def _breakdown(records: list[dict], key: str) -> dict:
    out: dict[str, dict] = {}
    for r in records:
        k = r.get(key) or "?"
        slot = out.setdefault(k, {"sampled": 0, "hits": 0})
        slot["sampled"] += 1
        if r.get("mentioned"):
            slot["hits"] += 1
    for slot in out.values():
        slot["presence_pct"] = round(slot["hits"] / slot["sampled"] * 100, 1)
    return dict(sorted(out.items()))


def _weakest(records: list[dict], limit: int = 5) -> list[dict]:
    """完全沒被提及的題目——這是給客戶看「缺哪一題」的那張表。"""
    by_prompt: dict[str, dict] = {}
    for r in records:
        pid = r.get("prompt_id") or r.get("prompt_text", "")[:40]
        slot = by_prompt.setdefault(pid, {
            "prompt_id": pid,
            "prompt_text": r.get("prompt_text", ""),
            "intent": r.get("intent"),
            "sampled": 0,
            "hits": 0,
        })
        slot["sampled"] += 1
        if r.get("mentioned"):
            slot["hits"] += 1
    misses = [p for p in by_prompt.values() if p["hits"] == 0]
    misses.sort(key=lambda p: (-p["sampled"], p["prompt_id"]))
    return misses[:limit]


def _top_urls(hits: list[dict], limit: int = 10) -> list[dict]:
    counts: dict[str, int] = {}
    for r in hits:
        for u in r.get("cited_urls") or []:
            host = parse.urlparse(u).netloc or u
            counts[host] = counts.get(host, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return [{"host": h, "count": c} for h, c in ranked[:limit]]


def composite(dimensions: dict, weights: dict) -> float:
    total_w = sum(weights.values())
    if total_w <= 0:
        return 0.0
    return round(sum(dimensions[d] * weights[d] for d in DIMENSIONS) / total_w, 2)


def grade_for(score: float, bands: list) -> str:
    for name, threshold in bands:
        if score >= threshold:
            return name
    return bands[-1][0] if bands else "?"


# ---------- 資料來源 ----------

def records_from_files(paths: list[str]) -> tuple[list[dict], dict]:
    records: list[dict] = []
    meta: dict = {}
    for p in paths:
        data = json.loads(Path(p).read_text(encoding="utf-8"))
        records.extend(data.get("records", []))
        meta = data.get("summary", meta)
    return records, meta


def records_from_supabase(brand_id: str, period: str) -> tuple[list[dict], dict]:
    """讀該月所有 mentions，攤平成與本機報告相同的 records 形狀。"""
    start = f"{period}-01"
    y, m = int(period[:4]), int(period[5:7])
    end = f"{y + (m // 12)}-{(m % 12) + 1:02d}-01"

    rows = _sb_get(
        "aivi_mentions?"
        f"brand_id=eq.{brand_id}&created_at=gte.{start}&created_at=lt.{end}"
        "&select=mentioned,rank_position,sentiment,cited_urls,competitors,"
        "aivi_responses(engine,locale,prompt_id,prompt_text,error)"
    )
    if rows is None:
        raise SystemExit("ERROR: 無法從 Supabase 讀取 mentions（檢查 SUPABASE_* 環境變數）。")

    records = []
    for r in rows:
        resp = r.get("aivi_responses") or {}
        records.append({
            "prompt_id": resp.get("prompt_id"),
            "prompt_text": resp.get("prompt_text", ""),
            "intent": None,
            "locale": resp.get("locale"),
            "engine": resp.get("engine"),
            "error": resp.get("error"),
            "mentioned": r.get("mentioned"),
            "rank_position": r.get("rank_position"),
            "sentiment": r.get("sentiment"),
            "competitors": r.get("competitors") or [],
            "cited_urls": r.get("cited_urls") or [],
        })
    return records, {"source": "supabase", "period": period}


# ---------- 月報 ----------

def render_html(brand: str, period: str, dimensions: dict, score: float,
                grade: str, evidence: dict, weights_version: str) -> str:
    rows = "".join(
        f"<tr><td>{escape(DIMENSION_LABELS[d])}</td>"
        f"<td class='n'>{dimensions[d]}</td></tr>"
        for d in DIMENSIONS
    )
    engines = "".join(
        f"<tr><td>{escape(k)}</td><td class='n'>{v['hits']}/{v['sampled']}</td>"
        f"<td class='n'>{v['presence_pct']}%</td></tr>"
        for k, v in evidence["by_engine"].items()
    )
    weak = "".join(
        f"<tr><td>{escape(str(p['prompt_id']))}</td><td>{escape(p['prompt_text'])}</td></tr>"
        for p in evidence["weakest_prompts"]
    ) or "<tr><td colspan='2'>每一題都至少被提及一次。</td></tr>"
    cited = "".join(
        f"<tr><td>{escape(u['host'])}</td><td class='n'>{u['count']}</td></tr>"
        for u in evidence["top_cited_urls"]
    ) or "<tr><td colspan='2'>本期回覆未附帶可解析的引用來源。</td></tr>"

    return f"""<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<title>AIVI 月報 — {escape(brand)} {escape(period)}</title>
<style>
 body{{font-family:"Noto Sans TC",system-ui,sans-serif;max-width:820px;margin:40px auto;
      padding:0 24px;color:#1a1a1a;line-height:1.7}}
 h1{{font-size:24px;margin-bottom:4px}} h2{{font-size:17px;margin-top:36px}}
 .meta{{color:#666;font-size:13px}}
 .score{{font-size:44px;font-weight:700;margin:16px 0 0}}
 .grade{{font-size:15px;color:#666}}
 table{{border-collapse:collapse;width:100%;margin-top:12px;font-size:14px}}
 th,td{{border-bottom:1px solid #e5e5e5;padding:8px 10px;text-align:left;vertical-align:top}}
 td.n{{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}}
 .note{{font-size:12px;color:#666;border-top:1px solid #e5e5e5;margin-top:36px;padding-top:16px}}
</style></head><body>
<h1>AIVI 月報 — {escape(brand)}</h1>
<p class="meta">期間 {escape(period)}　·　樣本 {evidence['sample_size']} 筆
 （命中 {evidence['hit_count']}、錯誤 {evidence['error_count']}）　·　權重版本 {escape(weights_version)}</p>

<p class="score">{score}<span class="grade"> / 100　等級 {escape(grade)}</span></p>

<h2>六維度</h2>
<table><tr><th>維度</th><th class="n">分數</th></tr>{rows}</table>

<h2>各引擎提及率</h2>
<table><tr><th>引擎</th><th class="n">命中/樣本</th><th class="n">提及率</th></tr>{engines}</table>

<h2>完全沒被提及的題目</h2>
<table><tr><th>題號</th><th>題目</th></tr>{weak}</table>

<h2>引用來源</h2>
<table><tr><th>網域</th><th class="n">次數</th></tr>{cited}</table>

<p class="note">
方法論揭露：本報告以各引擎官方 API 及合規 SERP 資料供應商採樣，
<strong>非消費者介面重現</strong>；API 結果與 ChatGPT / Gemini 消費者版畫面可能有差異。
題庫於量測期間鎖版，改題另開版本。解析結果保留 10% 人工抽驗。
本報告僅呈現量測值，不含優化執行建議之代辦服務。
產生時間 {datetime.now(timezone.utc).isoformat(timespec='seconds')}。
</p>
</body></html>
"""


# ---------- Main ----------

def main() -> int:
    ap = argparse.ArgumentParser(description="AIVI 六維度計分與月報產生器")
    ap.add_argument("--input", nargs="*", help="aivi_tracker 產出的報告 JSON")
    ap.add_argument("--brand-id", help="Supabase brands.id（改由 DB 取數）")
    ap.add_argument("--period", help="計分月份 YYYY-MM，預設當月")
    ap.add_argument("--industry", default=os.environ.get("BRAND_INDUSTRY", "default"))
    ap.add_argument("--html", help="輸出月報 HTML 路徑")
    ap.add_argument("--dry-run", action="store_true", help="不寫 Supabase")
    ap.add_argument("--print-schema", action="store_true", help="印出權重 JSON 格式後結束")
    args = ap.parse_args()

    if args.print_schema:
        print(json.dumps(WEIGHTS_SCHEMA, ensure_ascii=False, indent=2))
        return 0

    if not args.input and not args.brand_id:
        ap.error("需要 --input 或 --brand-id 其中之一")

    period = args.period or date.today().strftime("%Y-%m")
    brand = os.environ.get("BRAND_NAME", "Symcio")
    domain = os.environ.get("BRAND_DOMAIN", "")
    version = os.environ.get("AIVI_WEIGHTS_VERSION", "v1")

    if args.input:
        records, meta = records_from_files(args.input)
        brand = meta.get("brand", brand)
    else:
        records, meta = records_from_supabase(args.brand_id, period)

    weights, bands, w_source = load_weights(args.industry, version)
    try:
        dimensions, evidence = score_dimensions(records, domain)
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    total = composite(dimensions, weights)
    grade = grade_for(total, bands)

    print(f"AIVI Score — {brand} {period}")
    print(f"  權重來源：{w_source}（版本 {version}，產業 {args.industry}）")
    for d in DIMENSIONS:
        print(f"  {d:<12} {dimensions[d]:>6}")
    print(f"  {'composite':<12} {total:>6}  等級 {grade}")
    print(f"  樣本 {evidence['sample_size']}（命中 {evidence['hit_count']}、"
          f"錯誤 {evidence['error_count']}）")

    if args.html:
        out = Path(args.html)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(
            render_html(brand, period, dimensions, total, grade, evidence, version),
            encoding="utf-8")
        print(f"  月報：{out}")

    if args.brand_id and not args.dry_run:
        ok = _sb_upsert("aivi_scores_monthly", {
            "brand_id": args.brand_id,
            "period": f"{period}-01",
            "dimensions": dimensions,
            "composite_score": total,
            "grade": grade,
            "weights_version": version,
            "prompt_version": meta.get("prompt_version"),
            "sample_size": evidence["sample_size"],
        }, on_conflict="brand_id,period")
        print(f"  aivi_scores_monthly：{'已寫入' if ok else '未寫入'}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

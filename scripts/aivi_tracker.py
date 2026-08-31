#!/usr/bin/env python3
"""
AIVI Tracker — 「AI 能見度基線與追蹤」採樣器
--------------------------------------------
與 scripts/geo_audit.py 的差異（不要混用）：

  geo_audit.py    一次性、依「產業」出題的免費/單次診斷（漏斗入口）
  aivi_tracker.py 依「品牌」鎖版 prompt bank 的週期性採樣（可販售的訂閱）

本腳本只做量測，不做優化執行（紅線：裁判不下場）。

流程：
  1. 讀鎖版 prompt bank（Supabase prompt_sets 優先，否則 prompts/<slug>/<version>.<locale>.json）
  2. 對每題 × 每引擎採樣（僅走官方 API；不爬消費者版 UI）
  3. 解析提及 / 排名 / 情感 / 引用來源 / 同框競品
  4. 寫入 aivi_runs / aivi_responses / aivi_mentions；無 Supabase 則落地 reports/aivi/

環境變數：
  BRAND_SLUG                 品牌代號，對應 prompts/<slug>/，預設 'symcio'
  BRAND_NAME                 品牌名稱（比對用），預設 'Symcio'
  BRAND_DOMAIN               官網域名（比對用）
  BRAND_ALIASES              別名，逗號分隔（例：'Symcio BrandOS,全識'）
  BRAND_ID                   Supabase brands.id（有則寫 DB 關聯）
  TRACKING_STATUS            baseline / poc / subscription，預設 'baseline'
  CONSENT_REF, DPA_ID        poc / subscription 必填（無授權不得採樣他人品牌）
  PROMPT_VERSION             預設 'v1'
  PROMPT_LOCALES             預設 'zh-TW,en'
  AIVI_ENGINES               預設全部：gemini,claude,openai,perplexity
  GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY / PERPLEXITY_API_KEY
  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
  DRY_RUN                    'true' 則不呼叫引擎、不寫 DB（只印計畫）
  OUTPUT_DIR                 預設 reports/aivi

用法：
  BRAND_SLUG=symcio GEMINI_API_KEY=xxx python scripts/aivi_tracker.py
  DRY_RUN=true python scripts/aivi_tracker.py
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib import request
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parent))
from geo_audit import ENGINES, analyze_mention  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
PROMPTS_DIR = REPO_ROOT / "prompts"

# 每次呼叫之間的間隔（秒），避免觸發引擎 rate limit
CALL_INTERVAL = float(os.environ.get("AIVI_CALL_INTERVAL", "1.5"))


def _env_bool(name: str, default: str = "false") -> bool:
    return os.environ.get(name, default).strip().lower() in ("1", "true", "yes")


# ---------- Supabase（需要回傳 id，故不共用 geo_audit.supabase_insert） ----------

def _sb_request(method: str, path: str, body: object | None = None) -> object:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        return None
    req = request.Request(
        f"{url}/rest/v1/{path}",
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        method=method,
    )
    try:
        with request.urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8")
            return json.loads(raw) if raw else []
    except HTTPError as e:
        print(f"WARN: Supabase {method} {path} → HTTP {e.code}: "
              f"{e.read().decode(errors='ignore')[:200]}", file=sys.stderr)
    except (URLError, json.JSONDecodeError) as e:
        print(f"WARN: Supabase {method} {path} → {type(e).__name__}: {e}", file=sys.stderr)
    return None


def sb_insert_one(table: str, row: dict) -> str | None:
    """INSERT 一列並回傳 id；無 Supabase 或失敗時回 None。"""
    res = _sb_request("POST", table, [row])
    if isinstance(res, list) and res and isinstance(res[0], dict):
        return res[0].get("id")
    return None


def sb_patch(table: str, filter_q: str, row: dict) -> None:
    _sb_request("PATCH", f"{table}?{filter_q}", row)


# ---------- Prompt bank ----------

def load_prompt_set(slug: str, version: str, locale: str, brand_id: str | None) -> dict:
    """Supabase prompt_sets 優先（線上為準），否則讀 repo 內鎖版檔案。"""
    if brand_id:
        res = _sb_request(
            "GET",
            f"prompt_sets?brand_id=eq.{brand_id}&version=eq.{version}"
            f"&locale=eq.{locale}&select=id,prompts,locked_until",
        )
        if isinstance(res, list) and res:
            row = res[0]
            return {
                "prompt_set_id": row.get("id"),
                "prompts": row.get("prompts") or [],
                "locked_until": row.get("locked_until"),
                "source": "supabase",
            }

    path = PROMPTS_DIR / slug / f"{version}.{locale}.json"
    if not path.exists():
        raise FileNotFoundError(f"找不到 prompt bank：{path}（改題請開新版本，不要改舊檔）")
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        "prompt_set_id": None,
        "prompts": data.get("prompts", []),
        "locked_until": data.get("locked_until"),
        "source": str(path.relative_to(REPO_ROOT)),
    }


# ---------- 引用來源解析 ----------

URL_RE = None


def extract_urls(text: str) -> list[str]:
    """抓回覆中的引用網址（月報「引用來源清單」用）。"""
    global URL_RE
    if URL_RE is None:
        import re
        URL_RE = re.compile(r"https?://[^\s\)\]\>,;\"']+")
    seen: list[str] = []
    for u in URL_RE.findall(text or ""):
        u = u.rstrip(".,;:)")
        if u not in seen:
            seen.append(u)
    return seen[:20]


def matches_brand(text: str, brand: str, domain: str, aliases: list[str]) -> bool:
    lower = (text or "").lower()
    needles = [brand.lower()] + [a.lower() for a in aliases if a]
    if domain:
        needles.append(domain.lower())
    return any(n and n in lower for n in needles)


# ---------- Main ----------

def main() -> int:
    slug = os.environ.get("BRAND_SLUG", "symcio").strip()
    brand = os.environ.get("BRAND_NAME", "Symcio").strip()
    domain = os.environ.get("BRAND_DOMAIN", "").strip()
    aliases = [a.strip() for a in os.environ.get("BRAND_ALIASES", "").split(",") if a.strip()]
    brand_id = os.environ.get("BRAND_ID", "").strip() or None
    status = os.environ.get("TRACKING_STATUS", "baseline").strip()
    version = os.environ.get("PROMPT_VERSION", "v1").strip()
    locales = [l.strip() for l in os.environ.get("PROMPT_LOCALES", "zh-TW,en").split(",") if l.strip()]
    dry_run = _env_bool("DRY_RUN")
    out_dir = Path(os.environ.get("OUTPUT_DIR", "reports/aivi"))

    # 紅線：付費追蹤他人品牌必須先有授權與 DPA
    if status in ("poc", "subscription"):
        if not os.environ.get("CONSENT_REF") or not os.environ.get("DPA_ID"):
            print("ERROR: tracking_status 為 poc/subscription 但缺 CONSENT_REF / DPA_ID，"
                  "依合規規則拒絕採樣。", file=sys.stderr)
            return 2

    wanted = [e.strip() for e in os.environ.get(
        "AIVI_ENGINES", ",".join(ENGINES)).split(",") if e.strip()]
    engines = [e for e in wanted if e in ENGINES and os.environ.get(ENGINES[e][0])]
    if not engines and not dry_run:
        print("ERROR: 沒有任何可用引擎（缺 API key）。", file=sys.stderr)
        return 1

    sets = {}
    total_prompts = 0
    for locale in locales:
        ps = load_prompt_set(slug, version, locale, brand_id)
        sets[locale] = ps
        total_prompts += len(ps["prompts"])

    print(f"AIVI Tracker — brand={brand} slug={slug} status={status}")
    print(f"  prompt version={version} locales={locales} prompts={total_prompts}")
    print(f"  engines={engines or '(none)'} dry_run={dry_run}")
    for locale, ps in sets.items():
        print(f"  [{locale}] source={ps['source']} locked_until={ps['locked_until']}")

    if dry_run:
        print(f"DRY RUN：預計 {total_prompts * max(len(engines), 1)} 次採樣，未呼叫任何引擎。")
        return 0

    run_row = {
        "brand_id": brand_id,
        "prompt_set_id": next((s["prompt_set_id"] for s in sets.values() if s["prompt_set_id"]), None),
        "run_type": os.environ.get("RUN_TYPE", "weekly"),
        "engines": engines,
        "prompt_count": total_prompts,
        "status": "running",
    }
    run_id = sb_insert_one("aivi_runs", {k: v for k, v in run_row.items() if v is not None})

    records: list[dict] = []
    errors = 0

    for locale, ps in sets.items():
        for p in ps["prompts"]:
            for engine in engines:
                env_key, fn = ENGINES[engine]
                started = time.time()
                error = None
                text = ""
                try:
                    text = fn(p["text"], os.environ[env_key])
                except Exception as e:  # noqa: BLE001
                    error = f"{type(e).__name__}: {e}"
                    errors += 1
                latency = int((time.time() - started) * 1000)

                analysis = analyze_mention(text, brand, domain) if text else {}
                mentioned = bool(analysis.get("mentioned")) or matches_brand(
                    text, brand, domain, aliases)

                rec = {
                    "prompt_id": p.get("id"),
                    "intent": p.get("intent"),
                    "prompt_text": p["text"],
                    "locale": locale,
                    "engine": engine,
                    "sampled_via": "api",
                    "latency_ms": latency,
                    "error": error,
                    "mentioned": mentioned,
                    "rank_position": analysis.get("rank"),
                    "sentiment": analysis.get("sentiment"),
                    "competitors": analysis.get("competitors", []),
                    "cited_urls": extract_urls(text),
                    "response_text": text,
                }
                records.append(rec)

                if run_id:
                    response_id = sb_insert_one("aivi_responses", {
                        "run_id": run_id,
                        "prompt_id": rec["prompt_id"],
                        "prompt_text": rec["prompt_text"],
                        "locale": locale,
                        "engine": engine,
                        "model_version": os.environ.get(f"{engine.upper()}_MODEL", ""),
                        "sampled_via": "api",
                        "response_text": text,
                        "latency_ms": latency,
                        "error": error,
                    })
                    if response_id and not error:
                        sb_insert_one("aivi_mentions", {
                            "response_id": response_id,
                            "brand_id": brand_id,
                            "mentioned": mentioned,
                            "rank_position": rec["rank_position"],
                            "sentiment": rec["sentiment"],
                            "cited_urls": rec["cited_urls"],
                            "competitors": rec["competitors"],
                        })

                flag = "HIT " if mentioned else ("ERR " if error else "miss")
                print(f"  {flag} [{locale}/{engine}] {p.get('id')} ({latency} ms)")
                time.sleep(CALL_INTERVAL)

    sampled = [r for r in records if not r["error"]]
    hits = [r for r in sampled if r["mentioned"]]
    presence = round(len(hits) / len(sampled) * 100, 1) if sampled else 0.0
    ranks = [r["rank_position"] for r in hits if r["rank_position"]]

    summary = {
        "brand": brand,
        "brand_slug": slug,
        "prompt_version": version,
        "locales": locales,
        "engines": engines,
        "sampled_at": datetime.now(timezone.utc).isoformat(),
        "sampled_via": "api",
        "disclosure": "API 採樣，非消費者介面重現；結果不等同 ChatGPT/Gemini 消費者版畫面。",
        "sample_size": len(sampled),
        "error_count": errors,
        "presence_rate_pct": presence,
        "avg_rank": round(sum(ranks) / len(ranks), 2) if ranks else None,
        "by_engine": {
            e: {
                "sampled": len([r for r in sampled if r["engine"] == e]),
                "hits": len([r for r in hits if r["engine"] == e]),
            }
            for e in engines
        },
        "by_intent": {
            i: {
                "sampled": len([r for r in sampled if r["intent"] == i]),
                "hits": len([r for r in hits if r["intent"] == i]),
            }
            for i in sorted({r["intent"] for r in sampled if r.get("intent")})
        },
    }

    if run_id:
        sb_patch("aivi_runs", f"id=eq.{run_id}", {
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed" if errors < len(records) else "failed",
        })

    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    out_path = out_dir / f"{slug}-{stamp}.json"
    out_path.write_text(
        json.dumps({"summary": summary, "records": records}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"\n提及率 {presence}%（{len(hits)}/{len(sampled)}）"
          f"｜平均排名 {summary['avg_rank']}｜錯誤 {errors}")
    print(f"報告：{out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

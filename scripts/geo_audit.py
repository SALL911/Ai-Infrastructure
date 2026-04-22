"""
GEO Visibility Audit — BrandOS MVP 核心服務
--------------------------------------------
對指定品牌跑一輪 AI 引擎可見度測試：
1. 讀 config 檔的測試 prompts（依產業）
2. 對每個 prompt 呼叫 Gemini / Claude / GPT-4o / Perplexity
3. 解析是否提及品牌、排名、競品、情感
4. 若有 Supabase 連線則寫入 visibility_results；否則寫 JSON 到 reports/

環境變數：
  BRAND_NAME            必填，測試對象品牌名稱
  BRAND_DOMAIN          選，品牌官網域名（用於加權辨識）
  BRAND_INDUSTRY        選，產業（決定 prompt 分類），預設 'technology'
  GEMINI_API_KEY        選，但強烈建議（唯一免費）
  ANTHROPIC_API_KEY     選
  OPENAI_API_KEY        選
  PERPLEXITY_API_KEY    選
  SUPABASE_URL          選，若設則寫入 DB
  SUPABASE_SERVICE_ROLE_KEY  選，寫 DB 用
  OUTPUT_DIR            預設 reports/geo-audit

用法：
  BRAND_NAME=Symcio GEMINI_API_KEY=xxx python scripts/geo_audit.py
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import request
from urllib.error import HTTPError, URLError


REPO_ROOT = Path(__file__).resolve().parent.parent
PROMPTS_FILE = REPO_ROOT / "docs" / "prompts" / "geo-audit-prompts.json"


# ---------- HTTP helper ----------

def _post(url: str, headers: dict, body: dict, timeout: int = 60) -> dict:
    req = request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except HTTPError as e:
        return {"_error": f"HTTP {e.code}", "_body": e.read().decode(errors="ignore")}
    except URLError as e:
        return {"_error": f"URL error: {e.reason}"}
    except Exception as e:  # noqa: BLE001
        return {"_error": f"{type(e).__name__}: {e}"}


# ---------- AI engine adapters ----------
# Each returns plain text response or raises RuntimeError.

def query_gemini(prompt: str, api_key: str) -> str:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={api_key}"
    )
    resp = _post(
        url,
        headers={"Content-Type": "application/json"},
        body={"contents": [{"parts": [{"text": prompt}]}]},
    )
    if "_error" in resp:
        raise RuntimeError(f"gemini: {resp['_error']}")
    try:
        return resp["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise RuntimeError(f"gemini: unexpected response {resp}")


def query_claude(prompt: str, api_key: str) -> str:
    resp = _post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        body={
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": prompt}],
        },
    )
    if "_error" in resp:
        raise RuntimeError(f"claude: {resp['_error']}")
    try:
        return resp["content"][0]["text"]
    except (KeyError, IndexError):
        raise RuntimeError(f"claude: unexpected response {resp}")


def query_openai(prompt: str, api_key: str) -> str:
    resp = _post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        body={
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1024,
        },
    )
    if "_error" in resp:
        raise RuntimeError(f"openai: {resp['_error']}")
    try:
        return resp["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise RuntimeError(f"openai: unexpected response {resp}")


def query_perplexity(prompt: str, api_key: str) -> str:
    resp = _post(
        "https://api.perplexity.ai/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        body={
            "model": "sonar",
            "messages": [{"role": "user", "content": prompt}],
        },
    )
    if "_error" in resp:
        raise RuntimeError(f"perplexity: {resp['_error']}")
    try:
        return resp["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise RuntimeError(f"perplexity: unexpected response {resp}")


ENGINES: dict[str, tuple[str, Any]] = {
    "gemini": ("GEMINI_API_KEY", query_gemini),
    "claude": ("ANTHROPIC_API_KEY", query_claude),
    "openai": ("OPENAI_API_KEY", query_openai),
    "perplexity": ("PERPLEXITY_API_KEY", query_perplexity),
}


# ---------- Response analysis ----------

def analyze_mention(text: str, brand: str, domain: str = "") -> dict:
    """判斷品牌是否被提及、約略排名、同提及的競品。"""
    lower = text.lower()
    brand_lower = brand.lower()
    domain_lower = domain.lower() if domain else ""

    mentioned = (
        brand_lower in lower
        or (domain_lower and domain_lower in lower)
    )

    # 估算排名：尋找列表項中品牌的位置
    rank = None
    if mentioned:
        for n in range(1, 21):
            for pattern in (f"{n}.", f"{n})", f"#{n}"):
                idx = lower.find(pattern)
                if idx != -1 and brand_lower in lower[idx : idx + 200]:
                    rank = n
                    break
            if rank:
                break

    # 粗略情感判斷（不強求精準，後期可接 Claude API 做精細分類）
    positive_words = ["excellent", "best", "recommend", "top", "leader", "優秀", "推薦", "領先"]
    negative_words = ["avoid", "worst", "poor", "bad", "不推薦", "較差"]
    pos = sum(1 for w in positive_words if w in lower)
    neg = sum(1 for w in negative_words if w in lower)
    if mentioned:
        sentiment = "positive" if pos > neg else "negative" if neg > pos else "neutral"
    else:
        sentiment = None

    # 競品：從文字抓可能的公司名（大寫開頭英文詞組）——極粗略版
    import re

    competitor_pattern = re.findall(r"\b([A-Z][a-zA-Z]{2,20}(?: [A-Z][a-zA-Z]+)?)\b", text)
    competitors = sorted(
        {c for c in competitor_pattern if c.lower() not in {brand_lower, "the", "and", "this"}}
    )[:10]

    score = 0.0
    if mentioned:
        score += 50.0
    if rank:
        score += max(0.0, 50.0 - rank * 5)
    if sentiment == "positive":
        score += 20.0
    elif sentiment == "negative":
        score -= 20.0
    score = max(0.0, min(100.0, score))

    return {
        "mentioned": mentioned,
        "rank_position": rank,
        "sentiment": sentiment,
        "competitors": competitors,
        "score": round(score, 2),
    }


# ---------- Supabase write (optional) ----------

def supabase_insert(table: str, rows: list[dict]) -> dict:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key or not rows:
        return {"skipped": True}
    return _post(
        f"{url}/rest/v1/{table}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        body=rows if len(rows) > 1 else rows[0],
    )


# ---------- Prompts ----------

DEFAULT_PROMPTS = {
    "technology": {
        "top_companies": [
            "List the top 5 GEO (Generative Engine Optimization) service providers in Taiwan.",
            "Which companies lead in AI visibility consulting for B2B in Asia Pacific?",
            "Top brand governance platforms for enterprise ESG in 2026?",
        ],
        "alternatives": [
            "What are alternatives to traditional SEO agencies for AI search era?",
            "Alternatives to Bloomberg Terminal for brand data in Taiwan?",
        ],
        "problem": [
            "A B2B company wants to improve how they appear in ChatGPT answers. Who should they hire?",
            "How can I audit my brand visibility across ChatGPT, Claude, Gemini, and Perplexity?",
        ],
        "comparison": [
            "Compare leading GEO optimization platforms: pricing, features, and client results.",
            "Which AI visibility service offers both ESG integration and Bloomberg data access?",
        ],
    },
    "default": {
        "top_companies": [
            "List the top brand intelligence platforms in 2026.",
        ],
        "problem": [
            "My brand is not appearing in AI search answers. What should I do?",
        ],
    },
}


def load_prompts(industry: str) -> dict:
    if PROMPTS_FILE.exists():
        try:
            data = json.loads(PROMPTS_FILE.read_text(encoding="utf-8"))
            return data.get(industry) or data.get("default") or DEFAULT_PROMPTS["default"]
        except json.JSONDecodeError as e:
            print(f"WARN: failed to parse {PROMPTS_FILE}: {e}", file=sys.stderr)
    return DEFAULT_PROMPTS.get(industry) or DEFAULT_PROMPTS["default"]


# ---------- Main ----------

def main() -> int:
    brand = os.environ.get("BRAND_NAME", "").strip()
    domain = os.environ.get("BRAND_DOMAIN", "").strip()
    industry = os.environ.get("BRAND_INDUSTRY", "technology").strip() or "technology"
    out_dir = Path(os.environ.get("OUTPUT_DIR", "reports/geo-audit"))

    if not brand:
        print("ERROR: BRAND_NAME not set", file=sys.stderr)
        return 2

    prompts = load_prompts(industry)
    active_engines = [
        name for name, (env_var, _) in ENGINES.items() if os.environ.get(env_var)
    ]
    if not active_engines:
        print(
            "ERROR: no AI engine API key set. Set at least GEMINI_API_KEY (free).",
            file=sys.stderr,
        )
        return 2

    print(f"==> Brand:   {brand} ({domain or 'no domain'})")
    print(f"==> Industry: {industry}")
    print(f"==> Engines: {', '.join(active_engines)}")

    results: list[dict] = []
    total_queries = sum(len(v) for v in prompts.values())
    done = 0

    for category, queries in prompts.items():
        for query_text in queries:
            for engine in active_engines:
                env_var, fn = ENGINES[engine]
                api_key = os.environ[env_var]
                done += 1
                print(
                    f"  [{done}/{total_queries * len(active_engines)}] "
                    f"{engine} × {category}: {query_text[:50]}..."
                )
                try:
                    text = fn(query_text, api_key)
                except RuntimeError as e:
                    print(f"    ! {e}")
                    text = ""
                analysis = analyze_mention(text, brand, domain)
                results.append(
                    {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "brand": brand,
                        "category": category,
                        "query": query_text,
                        "engine": engine,
                        "response_excerpt": text[:500],
                        **analysis,
                    }
                )
                time.sleep(1)  # gentle rate limit

    # Aggregate score
    scores = [r["score"] for r in results]
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0
    mention_rate = (
        round(sum(1 for r in results if r["mentioned"]) / len(results) * 100, 1)
        if results
        else 0.0
    )

    report = {
        "brand": brand,
        "industry": industry,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "avg_score": avg_score,
        "mention_rate_pct": mention_rate,
        "total_queries": len(results),
        "results": results,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    out_file = out_dir / f"{brand.lower().replace(' ', '-')}-{ts}.json"
    out_file.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nAvg score:    {avg_score}")
    print(f"Mention rate: {mention_rate}%")
    print(f"Saved:        {out_file}")

    # Supabase write
    if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        rows = [
            {
                "mentioned": r["mentioned"],
                "rank_position": r["rank_position"],
                "sentiment": r["sentiment"],
                "competitors": r["competitors"],
                "score": r["score"],
            }
            for r in results
        ]
        insert_resp = supabase_insert("visibility_results", rows)
        print(f"Supabase insert: {insert_resp}")

    # Paid flow: email the report to the customer.
    # Triggered only when CUSTOMER_EMAIL is set (= repository_dispatch from Stripe
    # webhook). Daily cron has no CUSTOMER_EMAIL, so this block is skipped silently.
    customer_email = os.environ.get("CUSTOMER_EMAIL", "").strip()
    order_id = os.environ.get("ORDER_ID", "").strip()
    if customer_email:
        send_report_email(customer_email, brand, report, order_id)
        mark_order_completed(order_id, avg_score)

    return 0


# ---------- Paid-flow email delivery ----------

def send_report_email(to: str, brand: str, report: dict, order_id: str) -> None:
    """POST to Resend REST; stdlib urllib to avoid adding a dep."""
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        print("[email] RESEND_API_KEY not set; skipping report delivery", file=sys.stderr)
        return

    html = _build_report_html(brand, report)
    body = json.dumps({
        "from": "Symcio <info@symcio.tw>",
        "to": [to],
        "subject": f"[Symcio] {brand} AI 可見度報告（{report['timestamp'][:10]}）",
        "html": html,
        "reply_to": "info@symcio.tw",
    }).encode("utf-8")

    req = request.Request(
        "https://api.resend.com/emails",
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            print(f"[email] sent to {to} (order={order_id or 'n/a'}): {raw[:200]}")
    except HTTPError as exc:
        err = exc.read().decode("utf-8", errors="replace")
        print(f"[email] HTTP {exc.code}: {err[:200]}", file=sys.stderr)
    except URLError as exc:
        print(f"[email] network error: {exc}", file=sys.stderr)


def _build_report_html(brand: str, report: dict) -> str:
    # Top 5 mentions & top 5 gaps — concise, fits Gmail clip threshold
    mentioned_rows = [r for r in report["results"] if r.get("mentioned")]
    gaps = [r for r in report["results"] if not r.get("mentioned")][:5]
    top_mentions = sorted(mentioned_rows, key=lambda r: r.get("score", 0), reverse=True)[:5]

    mention_lines = "".join(
        f"<li><b>{r['engine']}</b> · rank {r.get('rank_position') or '—'} · {r['sentiment']} — <i>{r['query'][:80]}</i></li>"
        for r in top_mentions
    ) or "<li style=\"color:#c33\">未在任何引擎被提及</li>"

    gap_lines = "".join(
        f"<li>{r['engine']}: <i>{r['query'][:80]}</i></li>"
        for r in gaps
    ) or "<li>無遺漏</li>"

    return f"""<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;color:#0a0a0a;background:#fff;padding:32px">
  <div style="border-bottom:1px solid #e5e5e5;padding-bottom:16px;margin-bottom:24px">
    <div style="font-family:Menlo,monospace;font-size:11px;letter-spacing:2px;color:#888;text-transform:uppercase">Symcio · AI Visibility Intelligence</div>
    <h1 style="margin:8px 0 0;font-size:24px">{brand} AI 可見度報告</h1>
    <div style="color:#666;font-size:13px">{report['timestamp'][:10]} · {report['total_queries']} 筆查詢 · 跨 4 引擎</div>
  </div>

  <div style="display:flex;gap:24px;margin-bottom:28px">
    <div style="flex:1">
      <div style="font-size:11px;letter-spacing:1px;color:#666;text-transform:uppercase">AVG SCORE</div>
      <div style="font-size:36px;font-weight:700;color:#0a0a0a">{report['avg_score']}</div>
    </div>
    <div style="flex:1">
      <div style="font-size:11px;letter-spacing:1px;color:#666;text-transform:uppercase">MENTION RATE</div>
      <div style="font-size:36px;font-weight:700;color:#0a0a0a">{report['mention_rate_pct']}%</div>
    </div>
  </div>

  <h2 style="font-size:16px;margin:24px 0 8px">Top 5 正向提及</h2>
  <ul style="font-size:14px;line-height:1.7;color:#333;padding-left:18px">{mention_lines}</ul>

  <h2 style="font-size:16px;margin:24px 0 8px">Top 5 未提及盲區</h2>
  <ul style="font-size:14px;line-height:1.7;color:#333;padding-left:18px">{gap_lines}</ul>

  <div style="margin-top:32px;padding:16px;background:#f7f7f7;border-radius:6px;font-size:13px;color:#444">
    <b>下一步建議</b>：針對「未提及盲區」製作對應 GEO 內容、更新結構化資料（Wikidata / FAQ Schema）、跑 7 天再量。
    可以回信 info@symcio.tw 預約一次方法論 call。
  </div>

  <div style="margin-top:24px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px">
    Symcio / 全識股份有限公司 · AI Visibility Intelligence (AVI) 平台<br>
    方法論：<a href="https://github.com/SALL911/BrandOS-Infrastructure" style="color:#888">github.com/SALL911/BrandOS-Infrastructure</a>
  </div>
</body></html>"""


def mark_order_completed(order_id: str, avg_score: float) -> None:
    """Flip orders row to completed status; stdlib only."""
    if not order_id:
        return
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and key):
        return

    body = json.dumps({"status": "completed", "score": avg_score}).encode("utf-8")
    req = request.Request(
        f"{url.rstrip('/')}/rest/v1/orders?id=eq.{order_id}",
        data=body,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        method="PATCH",
    )
    try:
        with request.urlopen(req, timeout=15) as resp:
            print(f"[orders] {order_id} -> completed (HTTP {resp.status})")
    except (HTTPError, URLError) as exc:
        print(f"[orders] mark-completed failed: {exc}", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())

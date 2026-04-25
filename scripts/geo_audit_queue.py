#!/usr/bin/env python3
"""
GEO Audit Queue — 支援多品牌掃描與「24 小時內 Free Scan」email 承諾

WHY
    /api/schema、/api/scan 把新 prospects 寫進 brands.status='prospect'。
    這支腳本每小時醒來：
      1. 撈需要掃的 prospect（尚未掃或 >7 天沒掃）
      2. 對每一個跑 GEO audit（呼叫 Gemini / Claude / GPT-4o / Perplexity）
      3. 寫入 visibility_results
      4. 更新 brands.last_scanned_at
      5. 若該品牌從沒收過 Free Scan email（first_scan_sent_at IS NULL）→
         組出一封報告信，透過 Composio Gmail 寄到 brands.primary_email
      6. 標 first_scan_sent_at = now()

    跟現有 scripts/geo_audit.py 保持獨立：
    - geo_audit.py 是 Symcio 自家內部每日 benchmark（寫 reports/ + 開 PR）
    - geo_audit_queue.py 是面向客戶履約，寫 DB + 寄 email

環境變數
    GEMINI_API_KEY                 選，但強烈建議（唯一免費）
    ANTHROPIC_API_KEY              選
    OPENAI_API_KEY                 選
    PERPLEXITY_API_KEY             選
    SUPABASE_URL                   必填
    SUPABASE_SERVICE_ROLE_KEY      必填
    COMPOSIO_API_KEY               選（缺則 email 降級 log）
    COMPOSIO_USER_ID               選
    COMPOSIO_GMAIL_CONNECTION_ID   選
    QUEUE_BATCH_SIZE               選，單次最多處理幾筆，預設 10
    QUEUE_RESCAN_DAYS              選，>N 天沒掃就重掃，預設 7
    DRY_RUN                        選，設任何非空值就不寫 DB 不寄信

執行
    python scripts/geo_audit_queue.py
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from typing import Any
from urllib import request
from urllib.error import HTTPError, URLError


# ---------- HTTP helper ----------

def _http(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: Any = None,
    timeout: int = 60,
) -> dict:
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8")
            return {"ok": True, "status": r.status, "body": json.loads(raw) if raw else None}
    except HTTPError as e:
        try:
            raw = e.read().decode(errors="ignore")
        except Exception:  # noqa: BLE001
            raw = ""
        return {"ok": False, "status": e.code, "body": raw}
    except URLError as e:
        return {"ok": False, "status": 0, "body": f"URL error: {e.reason}"}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "status": 0, "body": f"{type(e).__name__}: {e}"}


# ---------- AI engine adapters（與 geo_audit.py 對齊）----------

def query_gemini(prompt: str, api_key: str) -> str:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={api_key}"
    )
    r = _http(url, method="POST", headers={"Content-Type": "application/json"},
              body={"contents": [{"parts": [{"text": prompt}]}]})
    if not r["ok"]:
        raise RuntimeError(f"gemini: HTTP {r['status']}: {str(r['body'])[:200]}")
    try:
        return r["body"]["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(f"gemini: unexpected response {r['body']}")


def query_claude(prompt: str, api_key: str) -> str:
    r = _http(
        "https://api.anthropic.com/v1/messages",
        method="POST",
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
    if not r["ok"]:
        raise RuntimeError(f"claude: HTTP {r['status']}: {str(r['body'])[:200]}")
    try:
        return r["body"]["content"][0]["text"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(f"claude: unexpected response {r['body']}")


def query_openai(prompt: str, api_key: str) -> str:
    r = _http(
        "https://api.openai.com/v1/chat/completions",
        method="POST",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        body={
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1024,
        },
    )
    if not r["ok"]:
        raise RuntimeError(f"openai: HTTP {r['status']}: {str(r['body'])[:200]}")
    try:
        return r["body"]["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(f"openai: unexpected response {r['body']}")


def query_perplexity(prompt: str, api_key: str) -> str:
    r = _http(
        "https://api.perplexity.ai/chat/completions",
        method="POST",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        body={"model": "sonar", "messages": [{"role": "user", "content": prompt}]},
    )
    if not r["ok"]:
        raise RuntimeError(f"perplexity: HTTP {r['status']}: {str(r['body'])[:200]}")
    try:
        return r["body"]["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(f"perplexity: unexpected response {r['body']}")


ENGINES: dict[str, tuple[str, str, Any]] = {
    "gemini":     ("GEMINI_API_KEY",     "Gemini",     query_gemini),
    "claude":     ("ANTHROPIC_API_KEY",  "Claude",     query_claude),
    "chatgpt":    ("OPENAI_API_KEY",     "ChatGPT",    query_openai),
    "perplexity": ("PERPLEXITY_API_KEY", "Perplexity", query_perplexity),
}


# ---------- Prompt selection ----------

ONE_PROMPT_PER_INDUSTRY = {
    "technology":    "List the top 5 AI Visibility Intelligence platforms for B2B enterprises in 2026.",
    "finance":       "List the top brand reputation analytics platforms for financial services in 2026.",
    "consumer_goods": "List the top brand monitoring tools for consumer goods companies in 2026.",
    "default":       "List the top brand intelligence platforms in 2026.",
}


def choose_prompt(industry: str) -> str:
    return ONE_PROMPT_PER_INDUSTRY.get(industry) or ONE_PROMPT_PER_INDUSTRY["default"]


# ---------- Response analysis（簡化版，跟 geo_audit.py 一致）----------

def analyze(text: str, brand: str, domain: str = "") -> dict:
    lower = text.lower()
    brand_l = brand.lower()
    domain_l = domain.lower() if domain else ""

    mentioned = brand_l in lower or (bool(domain_l) and domain_l in lower)

    rank: int | None = None
    if mentioned:
        for n in range(1, 21):
            for pat in (f"{n}.", f"{n})", f"#{n}"):
                idx = lower.find(pat)
                if idx != -1 and brand_l in lower[idx: idx + 200]:
                    rank = n
                    break
            if rank:
                break

    pos_words = ["excellent", "best", "recommend", "top", "leader", "優秀", "推薦", "領先"]
    neg_words = ["avoid", "worst", "poor", "bad", "不推薦", "較差"]
    pos = sum(1 for w in pos_words if w in lower)
    neg = sum(1 for w in neg_words if w in lower)
    sentiment = None
    if mentioned:
        sentiment = "positive" if pos > neg else "negative" if neg > pos else "neutral"

    names = re.findall(r"\b([A-Z][a-zA-Z]{2,20}(?: [A-Z][a-zA-Z]+)?)\b", text)
    competitors = sorted({c for c in names if c.lower() != brand_l})[:5]

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


# ---------- Supabase ----------

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def sb_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def fetch_prospects(limit: int, rescan_days: int) -> list[dict]:
    """撈 status='prospect' 且 (last_scanned_at is NULL 或 > rescan_days 天前)"""
    # Supabase PostgREST 的 or filter 語法
    url = (
        f"{SUPABASE_URL}/rest/v1/brands"
        f"?select=id,name,domain,industry,primary_email,first_scan_sent_at,last_scanned_at"
        f"&status=eq.prospect"
        f"&or=(last_scanned_at.is.null,last_scanned_at.lt.{_cutoff(rescan_days)})"
        f"&order=created_at.asc"
        f"&limit={limit}"
    )
    r = _http(url, headers=sb_headers())
    if not r["ok"]:
        raise RuntimeError(f"supabase fetch prospects failed: HTTP {r['status']}: {r['body']}")
    return r["body"] or []


def _cutoff(days: int) -> str:
    from datetime import timedelta
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def insert_visibility_results(rows: list[dict]) -> None:
    if not rows:
        return
    r = _http(
        f"{SUPABASE_URL}/rest/v1/visibility_results",
        method="POST",
        headers=sb_headers(),
        body=rows,
    )
    if not r["ok"]:
        raise RuntimeError(f"insert visibility_results failed: HTTP {r['status']}: {r['body']}")


def mark_brand_scanned(brand_id: str, first_scan_sent: bool) -> None:
    patch: dict[str, Any] = {"last_scanned_at": datetime.now(timezone.utc).isoformat()}
    if first_scan_sent:
        patch["first_scan_sent_at"] = patch["last_scanned_at"]
    r = _http(
        f"{SUPABASE_URL}/rest/v1/brands?id=eq.{brand_id}",
        method="PATCH",
        headers=sb_headers(),
        body=patch,
    )
    if not r["ok"]:
        raise RuntimeError(f"update brand {brand_id} failed: HTTP {r['status']}: {r['body']}")


# ---------- Email via Composio Gmail ----------

def send_report_email(to_email: str, brand_name: str, composite: float,
                      mention_rate: float, engine_breakdown: list[dict],
                      competitors: list[str]) -> bool:
    api_key = os.environ.get("COMPOSIO_API_KEY")
    user_id = os.environ.get("COMPOSIO_USER_ID")
    conn = os.environ.get("COMPOSIO_GMAIL_CONNECTION_ID")
    if not (api_key and user_id and conn):
        print("  · Composio 未設，email 降級為 log only")
        return False

    subject = f"[Symcio] {brand_name} 的 Free Scan 結果（四引擎曝光快照）"
    band = _band(composite)
    engine_rows = "".join(
        f"<tr><td style='padding:6px 12px;'>{e['label']}</td>"
        f"<td style='padding:6px 12px;text-align:center;'>{'✓' if e['mentioned'] else '—'}</td>"
        f"<td style='padding:6px 12px;text-align:center;'>{e['rank'] if e['rank'] else '—'}</td>"
        f"<td style='padding:6px 12px;text-align:center;'>{e['score']:.0f}</td></tr>"
        for e in engine_breakdown
    )
    competitor_html = "、".join(competitors[:5]) if competitors else "（未抓到明確競品）"
    html = f"""
<div style="font-family:Inter,'Noto Sans TC',sans-serif;max-width:640px;margin:0 auto;color:#0B0F19;">
  <p style="font-family:JetBrains Mono,monospace;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#6B7280;">
    Symcio · Free Scan Report
  </p>
  <h1 style="font-size:22px;margin-top:8px;">{_esc(brand_name)} 的 AI 曝光快照</h1>
  <p style="font-size:14px;color:#374151;">
    我們在 ChatGPT / Claude / Gemini / Perplexity 四個 AI 引擎各問了一個產業代表性問題，
    以下是你的品牌的初始表現：
  </p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:13px;">
    <thead>
      <tr style="background:#F3F4F6;">
        <th style="padding:8px 12px;text-align:left;">引擎</th>
        <th style="padding:8px 12px;">提及</th>
        <th style="padding:8px 12px;">排名</th>
        <th style="padding:8px 12px;">分數</th>
      </tr>
    </thead>
    <tbody>{engine_rows}</tbody>
  </table>
  <div style="background:#0B0F19;color:#FFD24A;padding:14px 18px;margin:16px 0;">
    <div style="font-family:JetBrains Mono,monospace;font-size:11px;letter-spacing:.15em;text-transform:uppercase;">
      Composite
    </div>
    <div style="font-size:28px;font-weight:700;margin-top:4px;">{composite:.0f} / 100</div>
    <div style="font-size:12px;color:#9CA3AF;margin-top:2px;">分級：{band}　·　提及率：{mention_rate:.0f}%</div>
  </div>
  <p style="font-size:13px;color:#374151;">被同框提及的主要競品：<strong>{_esc(competitor_html)}</strong></p>
  <p style="font-size:13px;color:#374151;margin-top:20px;">
    這只是單一 prompt 的初步結果。升級到 $299 AI Visibility Audit 可以解鎖：
  </p>
  <ul style="font-size:13px;color:#374151;">
    <li>20 個產業 prompt × 4 引擎（共 80 次測試）</li>
    <li>競品排名矩陣 + 敘事權重分析</li>
    <li>改善建議 PDF（含可直接部署的 GEO 內容大綱）</li>
  </ul>
  <a href="https://symcio.tw/#pricing" style="display:inline-block;background:#0B0F19;color:#FFD24A;padding:10px 18px;font-size:14px;font-weight:600;text-decoration:none;margin-top:8px;">
    升級 $299 AI Visibility Audit →
  </a>
  <p style="font-size:11px;color:#6B7280;border-top:1px solid #eee;margin-top:24px;padding-top:16px;">
    Symcio · AI Visibility Intelligence · <a href="https://symcio.tw" style="color:#6B7280;">symcio.tw</a><br>
    你因在 symcio.tw 提交品牌資料收到此信。若非本人操作請忽略。
  </p>
</div>
"""
    r = _http(
        "https://backend.composio.dev/api/v3/actions/GMAIL_SEND_EMAIL/execute",
        method="POST",
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
        body={
            "user_id": user_id,
            "connected_account_id": conn,
            "arguments": {
                "recipient_email": to_email,
                "subject": subject,
                "body": html,
                "is_html": True,
            },
        },
        timeout=30,
    )
    if not r["ok"]:
        print(f"  ✗ Composio Gmail 失敗：HTTP {r['status']}: {str(r['body'])[:200]}")
        return False
    return True


def _band(score: float) -> str:
    if score >= 75:
        return "Dominant"
    if score >= 50:
        return "Competitive"
    if score >= 25:
        return "Emerging"
    return "Invisible"


def _esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


# ---------- Main ----------

def main() -> int:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 必填", file=sys.stderr)
        return 2

    active = [n for n, (env, _label, _) in ENGINES.items() if os.environ.get(env)]
    if not active:
        print("ERROR: 沒有任何 AI 引擎 API key。至少設一個（建議 GEMINI_API_KEY，免費）", file=sys.stderr)
        return 2

    batch = int(os.environ.get("QUEUE_BATCH_SIZE", "10"))
    rescan_days = int(os.environ.get("QUEUE_RESCAN_DAYS", "7"))
    dry = bool(os.environ.get("DRY_RUN", "").strip())

    print(f"==> Active engines: {', '.join(active)}")
    print(f"==> Batch size: {batch} / rescan window: {rescan_days} days / dry_run: {dry}")

    prospects = fetch_prospects(batch, rescan_days)
    print(f"==> Prospects to scan: {len(prospects)}")
    if not prospects:
        print("Queue empty. Done.")
        return 0

    sent = 0
    for brand in prospects:
        brand_id = brand["id"]
        brand_name = brand["name"]
        industry = brand.get("industry") or "default"
        domain = brand.get("domain") or ""
        email = brand.get("primary_email")
        first_sent_before = brand.get("first_scan_sent_at")

        print(f"\n── {brand_name} ({industry}) ──")
        prompt = choose_prompt(industry)

        rows: list[dict] = []
        engine_breakdown: list[dict] = []
        all_competitors: list[str] = []
        for name in active:
            env, label, fn = ENGINES[name]
            try:
                text = fn(prompt, os.environ[env])
            except RuntimeError as e:
                print(f"  ! {e}")
                text = ""
            a = analyze(text, brand_name, domain)
            rows.append({
                "brand_id": brand_id,
                "engine": name,
                "query_text": prompt,
                "category": "top_companies",
                "mentioned": a["mentioned"],
                "rank_position": a["rank_position"],
                "sentiment": a["sentiment"],
                "competitors": a["competitors"],
                "score": a["score"],
                "response_excerpt": text[:500],
            })
            engine_breakdown.append({
                "label": label,
                "mentioned": a["mentioned"],
                "rank": a["rank_position"],
                "score": a["score"],
            })
            all_competitors.extend(a["competitors"])
            time.sleep(1)  # gentle rate limit

        composite = sum(r["score"] for r in rows) / len(rows) if rows else 0.0
        mention_rate = sum(1 for r in rows if r["mentioned"]) / len(rows) * 100 if rows else 0.0
        unique_comp = list(dict.fromkeys(all_competitors))  # preserve order, dedupe

        print(f"  composite={composite:.1f}  mention_rate={mention_rate:.0f}%")

        if dry:
            print("  (dry-run) skipping DB insert + email")
            continue

        insert_visibility_results(rows)

        email_sent_now = False
        if email and not first_sent_before:
            email_sent_now = send_report_email(
                email, brand_name, composite, mention_rate, engine_breakdown, unique_comp,
            )
            if email_sent_now:
                sent += 1
                print(f"  ✓ email 寄給 {email}")

        mark_brand_scanned(brand_id, first_scan_sent=email_sent_now)

    print(f"\n==> Done. Processed {len(prospects)} brands, sent {sent} first-scan emails.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

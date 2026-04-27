#!/usr/bin/env python3
"""
lead_scorer.py — rule-based lead scoring（P2 roadmap）。

WHY:
  業務需要自動化 prioritization，誰先打、誰先寄報告。LLM 黑箱不適合早期樣本量；
  純規則式可解釋、可審計、可調參。寫進 leads.score (0-100) + leads.score_breakdown
  (JSONB)，sales 看得出每筆分數來源。

WHAT — 規則表（v1）：

| 規則 | 分數 | 理由 |
|------|------|------|
| email_present                    | +10 | 沒 email 連對外都做不到 |
| company_present                  | +15 | B2B intent 必要訊號 |
| corporate_email_domain           | +20 | 非免費信箱（gmail/yahoo/outlook/icloud/hotmail/qq/126/163/foxmail/me/live） |
| email_domain_matches_brand       | +15 | brands.domain 對得上 → 確認身份 |
| source_paid_audit                | +30 | 已付款（最高 intent） |
| source_typeform                  | +10 | 主動填單 |
| source_cold_outreach             |  -5 | 被動接收 |
| status_qualified                 | +20 | 人工標記合格 |
| status_disqualified              | -40 | 人工排除 |
| notes_spam_or_test               | -50 | 人工標 spam/test |

Max 100, min 0（clamp）。

HOW:
  set SUPABASE_DB_URL=postgresql://...（pooler URL）
  python scripts/lead_scorer.py [--dry-run]

  CI 觸發：.github/workflows/lead-scorer.yml（daily cron + dispatch）
"""

from __future__ import annotations

import argparse
import json
import os
import sys

try:
    import psycopg
except ImportError:
    print("[error] psycopg (v3) not installed. Run: pip install 'psycopg[binary]'", file=sys.stderr)
    sys.exit(1)


FREE_EMAIL_DOMAINS = frozenset(
    [
        "gmail.com",
        "yahoo.com",
        "yahoo.com.tw",
        "yahoo.co.jp",
        "outlook.com",
        "hotmail.com",
        "icloud.com",
        "me.com",
        "live.com",
        "qq.com",
        "126.com",
        "163.com",
        "foxmail.com",
        "msn.com",
        "aol.com",
    ]
)


def email_domain(email: str | None) -> str | None:
    if not email or "@" not in email:
        return None
    return email.split("@", 1)[1].strip().lower() or None


def score_lead(lead: dict, known_domains: set[str]) -> tuple[int, dict[str, int]]:
    breakdown: dict[str, int] = {}

    email = (lead.get("email") or "").strip()
    company = (lead.get("company") or "").strip()
    source = (lead.get("source") or "").strip().lower()
    status = (lead.get("status") or "").strip().lower()
    notes = (lead.get("notes") or "").lower()

    if email:
        breakdown["email_present"] = 10
    if company:
        breakdown["company_present"] = 15

    domain = email_domain(email)
    if domain and domain not in FREE_EMAIL_DOMAINS:
        breakdown["corporate_email_domain"] = 20
    if domain and domain in known_domains:
        breakdown["email_domain_matches_brand"] = 15

    if source in {"stripe-paid", "paid-audit"}:
        breakdown["source_paid_audit"] = 30
    elif source == "typeform":
        breakdown["source_typeform"] = 10
    elif source == "cold-outreach":
        breakdown["source_cold_outreach"] = -5

    if status == "qualified":
        breakdown["status_qualified"] = 20
    elif status == "disqualified":
        breakdown["status_disqualified"] = -40

    if "spam" in notes or "test" in notes:
        breakdown["notes_spam_or_test"] = -50

    raw = sum(breakdown.values())
    score = max(0, min(100, raw))
    return score, breakdown


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="不寫 DB，僅印 preview")
    parser.add_argument("--limit", type=int, default=0, help="只處理前 N 筆（0 = 全部）")
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    if not url:
        print("[error] set SUPABASE_DB_URL (pooler URL, IPv4, port 6543)", file=sys.stderr)
        return 2

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT domain FROM brands WHERE domain IS NOT NULL")
            known_domains = {row[0].lower() for row in cur.fetchall() if row[0]}
        print(f"[info] loaded {len(known_domains)} known brand domains")

        select_sql = """
            SELECT id, email, company, source, status, notes
            FROM leads
            ORDER BY created_at DESC NULLS LAST
        """
        if args.limit > 0:
            select_sql += f" LIMIT {int(args.limit)}"

        with conn.cursor() as cur:
            cur.execute(select_sql)
            cols = [c.name for c in cur.description]
            leads = [dict(zip(cols, row)) for row in cur.fetchall()]
        print(f"[info] scoring {len(leads)} leads")

        updates: list[tuple] = []
        histogram = {"0-19": 0, "20-39": 0, "40-59": 0, "60-79": 0, "80-100": 0}
        for lead in leads:
            score, breakdown = score_lead(lead, known_domains)
            updates.append((score, json.dumps(breakdown), lead["id"]))
            bucket = (
                "80-100" if score >= 80
                else "60-79" if score >= 60
                else "40-59" if score >= 40
                else "20-39" if score >= 20
                else "0-19"
            )
            histogram[bucket] += 1

        print("[info] score distribution:")
        for bucket, n in histogram.items():
            print(f"    {bucket}: {n}")

        if args.dry_run:
            for score, breakdown_json, lead_id in updates[:10]:
                print(f"  would UPDATE leads SET score={score}, breakdown={breakdown_json} WHERE id={lead_id}")
            if len(updates) > 10:
                print(f"  ...and {len(updates) - 10} more")
            return 0

        with conn.cursor() as cur:
            cur.executemany(
                """
                UPDATE leads
                SET score = %s, score_breakdown = %s::jsonb, scored_at = NOW()
                WHERE id = %s
                """,
                updates,
            )
        conn.commit()
        print(f"[done] scored {len(updates)} leads")

    return 0


if __name__ == "__main__":
    sys.exit(main())

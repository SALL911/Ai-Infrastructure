#!/usr/bin/env python3
"""
SMS Campaign 發送 driver — 給 GitHub Actions 跑。

WHY
    Vercel 的 Serverless function IP 是動態的，若 Mitake 啟用 IP 白名單
    發送會被擋。GitHub Actions runner IP 範圍雖寬，但 Mitake 可以對
    特定 outbound 允許帳密認證；實在不行，Mitake 也能提供 static proxy。
    分離到 GitHub Actions 還有個好處：campaign 發送是長時間操作（量大
    要 10–30 分鐘），邊緣 function 不適合。

工作流程
    1. 從 Supabase sms_campaigns 撈 scheduled_at <= now() AND started_at IS NULL
       的 campaign（或 workflow_dispatch 指定單一 campaign_id）
    2. 依 campaign.segment_filter 展開 sms_subscribers：
         必須 consent_at IS NOT NULL AND opt_out_at IS NULL
         AND 符合 tags / industry 等條件
    3. 對每位訂閱者：
         組個人化訊息（{brand} / {opt_out_url} 等）
         呼叫 Mitake API
         寫 sms_deliveries（status=sent / failed）
    4. 更新 campaign 統計（sent_count / failed_count / finished_at）

環境變數
    SUPABASE_URL                必填
    SUPABASE_SERVICE_ROLE_KEY   必填
    MITAKE_USERNAME             必填
    MITAKE_PASSWORD             必填
    CAMPAIGN_ID                 選，指定單一 campaign（若無則跑所有 due campaigns）
    DRY_RUN                     選，設任何非空值：不呼 Mitake、不寫 DB

用法
    python scripts/sms_send_campaign.py
"""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any
from urllib import parse, request
from urllib.error import HTTPError, URLError


# ---------- HTTP helper ----------

def _http(url: str, *, method: str = "GET", headers: dict[str, str] | None = None,
          body: Any = None, timeout: int = 30) -> dict:
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8") if isinstance(body, (dict, list)) else body
    req = request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": r.status, "text": raw, "json": _try_json(raw)}
    except HTTPError as e:
        try:
            raw = e.read().decode(errors="ignore")
        except Exception:  # noqa: BLE001
            raw = ""
        return {"ok": False, "status": e.code, "text": raw, "json": _try_json(raw)}
    except URLError as e:
        return {"ok": False, "status": 0, "text": f"URL error: {e.reason}", "json": None}


def _try_json(s: str) -> Any:
    try:
        return json.loads(s)
    except Exception:  # noqa: BLE001
        return None


# ---------- Mitake adapter ----------

MITAKE_STATUS_OK = {"1", "2", "4"}


def mitake_send(username: str, password: str, phone: str, body: str) -> dict:
    qs = parse.urlencode({
        "username": username,
        "password": password,
        "dstaddr": phone,
        "smbody": body,
        "encoding": "UTF8",
    })
    url = f"https://smsapi.mitake.com.tw/api/mtk/SmSend?{qs}"
    r = _http(url, timeout=15)
    text = r["text"] or ""
    parsed: dict[str, str] = {}
    for line in (text or "").splitlines():
        line = line.strip()
        if "=" in line:
            k, v = line.split("=", 1)
            parsed[k.strip()] = v.strip()
    status = parsed.get("statuscode", "")
    ok = status in MITAKE_STATUS_OK
    return {
        "ok": ok,
        "provider_msg_id": parsed.get("msgid"),
        "status_code": status,
        "raw": text,
    }


# ---------- Supabase adapter ----------

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def sb_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def sb_get(path: str) -> list[dict]:
    r = _http(f"{SUPABASE_URL}/rest/v1/{path}", headers=sb_headers())
    if not r["ok"]:
        raise RuntimeError(f"supabase GET {path} → {r['status']}: {r['text']}")
    return r["json"] or []


def sb_patch(path: str, body: dict) -> dict:
    r = _http(f"{SUPABASE_URL}/rest/v1/{path}", method="PATCH",
              headers=sb_headers(), body=body)
    if not r["ok"]:
        raise RuntimeError(f"supabase PATCH {path} → {r['status']}: {r['text']}")
    return (r["json"] or [{}])[0]


def sb_post(path: str, body: list[dict] | dict) -> list[dict]:
    r = _http(f"{SUPABASE_URL}/rest/v1/{path}", method="POST",
              headers=sb_headers(), body=body)
    if not r["ok"]:
        raise RuntimeError(f"supabase POST {path} → {r['status']}: {r['text']}")
    return r["json"] or []


# ---------- Segment filter ----------

def subscriber_query(seg: dict) -> str:
    """segment_filter → Supabase query string
    支援：
      {"tags":["web3"]}           → segment_tags cs '{"web3"}'
      {"industry":"saas"}         → brand.industry eq (via join? 這裡簡化成只按 tags)
    MVP 先支援 tags，其他後續加。
    """
    parts = [
        "select=id,phone,brand_id,segment_tags",
        "consent_at=not.is.null",
        "opt_out_at=is.null",
    ]
    tags = seg.get("tags") or []
    if tags:
        arr = ",".join(f'"{t}"' for t in tags)
        parts.append(f'segment_tags=cs.{{{arr}}}')
    return "&".join(parts)


# ---------- Message templating ----------

def render_message(template: str, ctx: dict[str, str]) -> str:
    out = template
    for k, v in ctx.items():
        out = out.replace("{" + k + "}", v)
    return out


# ---------- Main ----------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def main() -> int:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 必填", file=sys.stderr)
        return 2

    username = os.environ.get("MITAKE_USERNAME")
    password = os.environ.get("MITAKE_PASSWORD")
    if not (username and password):
        print("ERROR: MITAKE_USERNAME / MITAKE_PASSWORD 必填", file=sys.stderr)
        return 2

    dry = bool(os.environ.get("DRY_RUN", "").strip())
    campaign_id = os.environ.get("CAMPAIGN_ID")

    # 1. 撈 campaigns
    if campaign_id:
        campaigns = sb_get(f"sms_campaigns?id=eq.{campaign_id}&started_at=is.null")
    else:
        now_enc = parse.quote(now_iso())
        campaigns = sb_get(
            f"sms_campaigns?started_at=is.null&or=(scheduled_at.is.null,scheduled_at.lte.{now_enc})"
            f"&order=scheduled_at.asc&limit=5"
        )
    if not campaigns:
        print("No due campaigns.")
        return 0

    print(f"==> {len(campaigns)} campaign(s) to run. dry_run={dry}")

    for camp in campaigns:
        cid = camp["id"]
        print(f"\n── Campaign {cid}: {camp['name']} ──")
        seg = camp.get("segment_filter") or {}
        subs = sb_get(f"sms_subscribers?{subscriber_query(seg)}&limit=1000")
        print(f"  subscribers matched: {len(subs)}")

        if not dry:
            sb_patch(f"sms_campaigns?id=eq.{cid}",
                     {"started_at": now_iso(), "planned_count": len(subs)})

        sent = 0
        failed = 0
        for sub in subs:
            phone = sub["phone"]
            opt_out_url = f"https://symcio.tw/u/{sub.get('opt_out_token') or ''}"
            msg = render_message(camp["message_template"], {
                "brand": "Symcio",
                "opt_out_url": opt_out_url,
                "phone_tail": phone[-4:],
            })
            # 個資法強制尾綴：若 template 沒放 opt_out_url 也要補
            if opt_out_url not in msg and sub.get("opt_out_token"):
                msg = f"{msg}\n退訂:{opt_out_url}"

            print(f"    → {phone[:5]}***{phone[-3:]}  {len(msg)} chars")

            if dry:
                continue

            result = mitake_send(username, password, phone, msg)
            row = {
                "campaign_id": cid,
                "subscriber_id": sub["id"],
                "phone": phone,
                "status": "sent" if result["ok"] else "failed",
                "provider_msg_id": result.get("provider_msg_id"),
                "error_code": None if result["ok"] else result.get("status_code"),
                "sent_at": now_iso() if result["ok"] else None,
            }
            sb_post("sms_deliveries", [row])
            if result["ok"]:
                sent += 1
            else:
                failed += 1
                print(f"      ! failed: {result['raw'][:150]}")
            time.sleep(0.3)  # gentle rate limit

        if not dry:
            sb_patch(f"sms_campaigns?id=eq.{cid}", {
                "finished_at": now_iso(),
                "sent_count": sent,
                "failed_count": failed,
            })
        print(f"  done. sent={sent} failed={failed}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

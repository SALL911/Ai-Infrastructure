"""
Composio × HubSpot — Lead 自動同步
-----------------------------------
每次執行：
1. 從 Supabase leads 表讀出尚未同步到 HubSpot 的紀錄
2. 透過 Composio API 呼叫 HUBSPOT_CREATE_CONTACT action
3. 成功後把 notes 欄位加上 "hubspot_synced_at=<ISO ts>"

辨識「未同步」的方式：notes 欄位不包含字串 "hubspot_synced"。

環境變數：
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  COMPOSIO_API_KEY
  COMPOSIO_USER_ID          Composio dashboard → Settings → User ID

可選：
  COMPOSIO_HUBSPOT_CONNECTION_ID   若有多個 HubSpot 連線需指定
  DRY_RUN=1                        只印不寫
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from urllib import request
from urllib.error import HTTPError


SUPABASE_REST = "/rest/v1"
COMPOSIO_API = "https://backend.composio.dev/api/v3"


def _http(method: str, url: str, headers: dict, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = request.Request(url, data=data, method=method, headers=headers)
    try:
        with request.urlopen(req, timeout=30) as r:
            payload = r.read().decode() or "{}"
            return json.loads(payload)
    except HTTPError as e:
        raise RuntimeError(f"{method} {url} → {e.code}: {e.read().decode(errors='ignore')}") from e


def supabase_select_unsynced_leads(sb_url: str, sb_key: str) -> list[dict]:
    url = (
        f"{sb_url.rstrip('/')}{SUPABASE_REST}/leads"
        "?select=id,name,company,email,source,notes,created_at"
        "&notes=not.ilike.*hubspot_synced*"
        "&limit=50"
    )
    return _http(
        "GET",
        url,
        headers={
            "apikey": sb_key,
            "Authorization": f"Bearer {sb_key}",
            "Content-Type": "application/json",
        },
    )


def supabase_mark_synced(sb_url: str, sb_key: str, lead_id: str, old_notes: str) -> None:
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    new_notes = (old_notes or "") + f"; hubspot_synced_at={ts}"
    url = f"{sb_url.rstrip('/')}{SUPABASE_REST}/leads?id=eq.{lead_id}"
    _http(
        "PATCH",
        url,
        headers={
            "apikey": sb_key,
            "Authorization": f"Bearer {sb_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        body={"notes": new_notes},
    )


def composio_execute_action(
    api_key: str,
    user_id: str,
    action_name: str,
    arguments: dict,
    connection_id: str | None = None,
) -> dict:
    """Call Composio v3 execute endpoint.

    Reference: https://docs.composio.dev/api/actions/execute
    """
    body: dict = {
        "user_id": user_id,
        "arguments": arguments,
    }
    if connection_id:
        body["connected_account_id"] = connection_id

    return _http(
        "POST",
        f"{COMPOSIO_API}/actions/{action_name}/execute",
        headers={
            "x-api-key": api_key,
            "Content-Type": "application/json",
        },
        body=body,
    )


def lead_to_hubspot_args(lead: dict) -> dict:
    """Map Supabase lead row → HubSpot properties payload."""
    return {
        "properties": {
            "email": lead["email"],
            "firstname": (lead.get("name") or "").split(" ")[0] or None,
            "lastname": " ".join((lead.get("name") or "").split(" ")[1:]) or None,
            "company": lead.get("company"),
            "hs_lead_status": "NEW",
            "lifecyclestage": "lead",
            "source_symcio": lead.get("source"),
        }
    }


def main() -> int:
    sb_url = os.environ.get("SUPABASE_URL", "").strip()
    sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    cp_key = os.environ.get("COMPOSIO_API_KEY", "").strip()
    cp_user = os.environ.get("COMPOSIO_USER_ID", "").strip()
    cp_conn = os.environ.get("COMPOSIO_HUBSPOT_CONNECTION_ID", "").strip() or None
    dry_run = os.environ.get("DRY_RUN") == "1"

    if not (sb_url and sb_key):
        print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing", file=sys.stderr)
        return 2
    if not (cp_key and cp_user):
        print("ERROR: COMPOSIO_API_KEY / COMPOSIO_USER_ID missing", file=sys.stderr)
        return 2

    print("==> Fetching unsynced leads from Supabase")
    leads = supabase_select_unsynced_leads(sb_url, sb_key)
    print(f"    found {len(leads)}")

    synced, failed = 0, 0
    for lead in leads:
        args = lead_to_hubspot_args(lead)
        print(f"  → {lead['email']}  company={lead.get('company')}")
        if dry_run:
            print(f"    [DRY_RUN] would execute HUBSPOT_CREATE_CONTACT with {args}")
            continue
        try:
            resp = composio_execute_action(
                cp_key, cp_user, "HUBSPOT_CREATE_CONTACT", args, cp_conn
            )
            if not resp.get("successful", resp.get("ok", True)):
                raise RuntimeError(f"Composio response: {resp}")
            supabase_mark_synced(sb_url, sb_key, lead["id"], lead.get("notes", ""))
            synced += 1
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"    ! {e}")

    print(f"\nSynced: {synced} | Failed: {failed} | Dry run: {dry_run}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

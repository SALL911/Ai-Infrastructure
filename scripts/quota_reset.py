"""
Quota reset — zero `audits_used_this_month` for members past their reset date.

Runs daily via .github/workflows/quota-reset.yml.
Idempotent: members whose quota_reset_at is still in the future are ignored
(the SQL function `reset_member_quotas` does `WHERE quota_reset_at <= NOW()`).

Environment:
  SUPABASE_URL              required
  SUPABASE_SERVICE_ROLE_KEY required
"""

from __future__ import annotations

import json
import os
import sys
from urllib import request
from urllib.error import HTTPError, URLError


def _post(path: str, body: dict | None = None) -> tuple[int, str]:
    url = os.environ["SUPABASE_URL"].rstrip("/") + path
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body or {}).encode("utf-8")
    req = request.Request(url, data=data, headers=headers, method="POST")
    try:
        with request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except URLError as exc:
        return 0, str(exc)


def main() -> int:
    if not os.environ.get("SUPABASE_URL") or not os.environ.get(
        "SUPABASE_SERVICE_ROLE_KEY"
    ):
        print("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required", file=sys.stderr)
        return 1

    # Call the reset_member_quotas() SQL function via RPC
    status, body = _post("/rest/v1/rpc/reset_member_quotas", {})

    if status == 200:
        try:
            result = json.loads(body)
            count = (
                result[0].get("reset_count") if isinstance(result, list) and result else 0
            )
        except Exception:
            count = "?"
        print(f"[quota-reset] reset_count={count}")
        return 0

    print(f"[quota-reset] RPC failed HTTP {status}: {body[:300]}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())

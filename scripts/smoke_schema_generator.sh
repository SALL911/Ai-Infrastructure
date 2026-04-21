#!/usr/bin/env bash
# Usage:
#   scripts/smoke_schema_generator.sh https://xxxx.vercel.app
#   scripts/smoke_schema_generator.sh https://symcio.tw
#
# 針對 /schema-generator 與相依 API 跑一組確信測試。
# 沒流量、沒寫 Supabase/Notion/Gmail（傳 invalid body 觸發 400 當 liveness 判斷）。
# 依賴：curl、awk；zero dep。
set -euo pipefail

HOST="${1:-}"
if [[ -z "$HOST" ]]; then
  echo "Usage: $0 <base-url>" >&2
  echo "Example: $0 https://symcio.tw" >&2
  exit 2
fi
HOST="${HOST%/}"

PASS=0
FAIL=0
FAIL_MSGS=()

check() {
  local label="$1"
  local url="$2"
  local expect_codes="$3"  # space-separated, e.g. "200" or "400 405"
  local extra_curl="${4:-}"

  # shellcheck disable=SC2086
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 $extra_curl "$url" || echo "000")

  if [[ " $expect_codes " == *" $code "* ]]; then
    printf "  ✓ %-44s %s (%s)\n" "$label" "$code" "$url"
    PASS=$((PASS+1))
  else
    printf "  ✗ %-44s %s (expected: %s) %s\n" "$label" "$code" "$expect_codes" "$url"
    FAIL=$((FAIL+1))
    FAIL_MSGS+=("$label: got $code, expected $expect_codes at $url")
  fi
}

echo "Symcio smoke test → $HOST"
echo ""

echo "Static pages:"
check "landing /"                  "$HOST/"                    "200"
check "/schema-generator"          "$HOST/schema-generator"    "200"
check "sitemap.xml"                "$HOST/sitemap.xml"         "200"
check "llms.txt"                   "$HOST/llms.txt"            "200"

echo ""
echo "API routes (expect 400/405 on empty body = route is alive):"
check "/api/agent (empty POST)"    "$HOST/api/agent"           "400" "-X POST -H Content-Type:application/json -d {}"
check "/api/schema (empty POST)"   "$HOST/api/schema"          "400" "-X POST -H Content-Type:application/json -d {}"
check "/api/scan (empty POST)"     "$HOST/api/scan"            "400" "-X POST -H Content-Type:application/json -d {}"

echo ""
echo "Sitemap correctness (must list /schema-generator):"
if curl -sS --max-time 15 "$HOST/sitemap.xml" 2>/dev/null | grep -q "/schema-generator"; then
  echo "  ✓ sitemap.xml contains /schema-generator"
  PASS=$((PASS+1))
else
  echo "  ✗ sitemap.xml missing /schema-generator — deployed commit might be old"
  FAIL=$((FAIL+1))
  FAIL_MSGS+=("sitemap.xml missing /schema-generator at $HOST")
fi

echo ""
echo "── Summary: ${PASS} passed, ${FAIL} failed ──"

if (( FAIL > 0 )); then
  echo ""
  echo "Failures:"
  for m in "${FAIL_MSGS[@]}"; do echo "  - $m"; done
  echo ""
  echo "Likely causes:"
  echo "  - /schema-generator 404 but / works → new commit not yet deployed to this host"
  echo "  - / also 404 → DNS not pointing at Vercel (see docs/DOMAIN_CUTOVER.md)"
  echo "  - /api/* 404 → Vercel Root Directory not set to web/landing"
  exit 1
fi

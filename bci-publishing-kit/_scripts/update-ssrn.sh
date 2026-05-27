#!/usr/bin/env bash
# 一鍵把 [SSRN_URL] / [SSRN_URL_PENDING] 取代為實際 SSRN abstract URL
#
# 用法: bash update-ssrn.sh https://ssrn.com/abstract=1234567

set -e

if [[ -z "$1" ]]; then
  echo "用法: bash update-ssrn.sh <SSRN_URL>"
  echo "範例: bash update-ssrn.sh https://ssrn.com/abstract=1234567"
  exit 1
fi

URL="$1"
KIT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "$(uname -s)" == "Darwin" ]]; then
  SED_INPLACE=(sed -i '')
else
  SED_INPLACE=(sed -i)
fi

find "$KIT_ROOT" -type f \( -name "*.md" -o -name "*.txt" \) -print0 | \
while IFS= read -r -d '' f; do
  if grep -q -E "\[SSRN_URL\]|\[SSRN_URL_PENDING\]|\[SSRN_LINK_PENDING\]" "$f"; then
    "${SED_INPLACE[@]}" -e "s|\[SSRN_URL_PENDING\]|$URL|g" \
                       -e "s|\[SSRN_LINK_PENDING\]|$URL|g" \
                       -e "s|\[SSRN_URL\]|$URL|g" \
                       "$f"
    echo "  ✓ $f"
  fi
done

echo ""
echo "✅ SSRN URL 已寫入所有發表包檔案"

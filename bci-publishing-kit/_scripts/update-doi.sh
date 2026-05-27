#!/usr/bin/env bash
# 一鍵把 [DOI_PENDING] / 10.5281/zenodo.XXXXXXXX 取代為實際 DOI
#
# 用法: bash update-doi.sh 10.5281/zenodo.12345678

set -e

if [[ -z "$1" ]]; then
  echo "用法: bash update-doi.sh <DOI>"
  echo "範例: bash update-doi.sh 10.5281/zenodo.12345678"
  exit 1
fi

DOI="$1"
KIT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔄 將所有 [DOI_PENDING] / 10.5281/zenodo.XXXXXXXX 取代為:"
echo "   $DOI"
echo ""

# macOS sed 與 Linux sed 不同
if [[ "$(uname -s)" == "Darwin" ]]; then
  SED_INPLACE=(sed -i '')
else
  SED_INPLACE=(sed -i)
fi

find "$KIT_ROOT" -type f \( -name "*.md" -o -name "*.txt" -o -name "*.yml" -o -name "*.cff" \) -print0 | \
while IFS= read -r -d '' f; do
  if grep -q -E "\[DOI_PENDING\]|10\.5281/zenodo\.XXXXXXXX|10\.5281/ZENODO\.XXXXXXXX" "$f"; then
    "${SED_INPLACE[@]}" -e "s|\[DOI_PENDING\]|$DOI|g" \
                       -e "s|10\.5281/zenodo\.XXXXXXXX|$DOI|g" \
                       -e "s|10\.5281/ZENODO\.XXXXXXXX|${DOI/zenodo/ZENODO}|g" \
                       "$f"
    echo "  ✓ $f"
  fi
done

echo ""
echo "✅ DOI 已寫入所有發表包檔案"
echo "   下一步: 把 _assets/citation-formats.md 的更新版貼到 GitHub README.md"

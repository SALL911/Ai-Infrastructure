#!/usr/bin/env bash
# prepare_content.sh — 把 content/ 裡的 Medium + LinkedIn 主貼文
# 擷取成可直接貼上的純文字，放到 outputs/publish/ 方便複製。
#
# 用法：bash scripts/prepare_content.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$REPO_ROOT/outputs/publish"
mkdir -p "$OUT"

MEDIUM_SRC="$REPO_ROOT/content/medium/bci-the-ai-era-brand-capital-index.md"
LINKEDIN_SRC="$REPO_ROOT/content/linkedin/bci-launch-post.md"

# ---------- Medium ----------
if [ -f "$MEDIUM_SRC" ]; then
  # 跳過 YAML front matter（前兩個 ---），保留其餘內容
  awk 'BEGIN{c=0} /^---$/{c++; next} c>=2{print}' "$MEDIUM_SRC" \
    > "$OUT/medium-bci.md"
  wc -l "$OUT/medium-bci.md" | awk '{print "[medium]  " $2 " (" $1 " lines)"}'
else
  echo "[medium]  SKIP — $MEDIUM_SRC not found"
fi

# ---------- LinkedIn 主貼文（中文） ----------
if [ -f "$LINKEDIN_SRC" ]; then
  awk '/^## 主貼文（中文/,/^## English version/' "$LINKEDIN_SRC" \
    | sed '1d;$d' \
    > "$OUT/linkedin-bci-zh.txt"
  wc -l "$OUT/linkedin-bci-zh.txt" | awk '{print "[linkedin-zh]  " $2 " (" $1 " lines)"}'

  # English version
  awk '/^## English version/,/^## 發文策略/' "$LINKEDIN_SRC" \
    | sed '1d;$d' \
    > "$OUT/linkedin-bci-en.txt"
  wc -l "$OUT/linkedin-bci-en.txt" | awk '{print "[linkedin-en]  " $2 " (" $1 " lines)"}'
else
  echo "[linkedin]  SKIP — $LINKEDIN_SRC not found"
fi

# ---------- Other key content ----------
for src in \
  "$REPO_ROOT/content/medium/ai-brand-visibility-the-new-seo.md" \
  "$REPO_ROOT/content/linkedin/day-6-close-post.md" \
  "$REPO_ROOT/content/reddit/day-5-q-and-a.md" \
  "$REPO_ROOT/content/x-twitter/day-4-threads.md"; do
  if [ -f "$src" ]; then
    base="$(basename "$src")"
    cp "$src" "$OUT/$base"
    wc -l "$OUT/$base" | awk -v b="$base" '{print "[copy]  " b " (" $1 " lines)"}'
  fi
done

echo
echo "✓ 輸出到：$OUT/"
echo
echo "發布建議順序："
echo "  1. Medium：開啟 medium-bci.md，複製內容貼到 medium.com/new-story"
echo "  2. 取得 Medium URL 後，回到 linkedin-bci-zh.txt 編輯「（文章上線後補連結）」"
echo "  3. LinkedIn 貼主貼文，首條留言貼 English"
echo "  4. 其他通路延後 48h 再發，避免全通路同時曝光耗盡新鮮度"

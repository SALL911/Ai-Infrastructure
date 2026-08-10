#!/usr/bin/env bash
# BCI 全平台發表 — 一鍵開啟所有提交頁面
# 用法: bash open-all-links.sh [P0|P1|P2|P3|all]
#
# macOS:  自動用預設瀏覽器
# Linux:  用 xdg-open
# Windows (WSL): 用 cmd.exe /c start

set -e

# 判斷平台
case "$(uname -s)" in
  Darwin)   OPEN_CMD="open" ;;
  Linux)    if grep -qi microsoft /proc/version 2>/dev/null; then
              OPEN_CMD="cmd.exe /c start"
            else
              OPEN_CMD="xdg-open"
            fi ;;
  *)        OPEN_CMD="open" ;;
esac

# URL 清單
declare -A P0_LINKS=(
  ["GitHub 新建 repo"]="https://github.com/new"
  ["Zenodo GitHub 連結"]="https://zenodo.org/account/settings/github/"
  ["SSRN 新投稿"]="https://hq.ssrn.com/submission.cfm"
)
declare -A P1_LINKS=(
  ["ResearchGate 註冊"]="https://www.researchgate.net/signup"
  ["ORCID My ORCID"]="https://orcid.org/my-orcid"
  ["LinkedIn 新文章"]="https://www.linkedin.com/article/new/"
  ["Medium 新故事"]="https://medium.com/new-story"
)
declare -A P2_LINKS=(
  ["OSF Dashboard"]="https://osf.io/dashboard/"
  ["Academia.edu 上傳"]="https://www.academia.edu/upload"
  ["Substack 註冊"]="https://substack.com/signup"
  ["Wikidata QuickStatements"]="https://quickstatements.toolforge.org/"
)
declare -A P3_LINKS=(
  ["arXiv 投稿"]="https://arxiv.org/submit"
  ["Google Scholar Profile"]="https://scholar.google.com/citations?hl=en"
  ["Airiti Library"]="https://www.airitilibrary.com/"
  ["Speaker Deck 新上傳"]="https://speakerdeck.com/new"
)

open_group() {
  local -n arr=$1
  local label=$2
  echo ""
  echo "=== $label ==="
  for name in "${!arr[@]}"; do
    url="${arr[$name]}"
    echo "  ▸ $name → $url"
    $OPEN_CMD "$url" >/dev/null 2>&1 &
    sleep 0.4
  done
}

LEVEL="${1:-all}"

case "$LEVEL" in
  P0)  open_group P0_LINKS "P0 — 本週必完成"   ;;
  P1)  open_group P1_LINKS "P1 — 第二週"        ;;
  P2)  open_group P2_LINKS "P2 — 第三週"        ;;
  P3)  open_group P3_LINKS "P3 — 第四週"        ;;
  all)
        open_group P0_LINKS "P0"
        open_group P1_LINKS "P1"
        open_group P2_LINKS "P2"
        open_group P3_LINKS "P3"
        ;;
  *)
        echo "用法: bash open-all-links.sh [P0|P1|P2|P3|all]"
        exit 1
        ;;
esac

echo ""
echo "✅ 已開啟瀏覽器分頁，準備好就照 STEPS.md 操作。"

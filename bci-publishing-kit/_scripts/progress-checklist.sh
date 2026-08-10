#!/usr/bin/env bash
# 互動式 checklist：勾選各平台發表進度
# 用法: bash progress-checklist.sh

KIT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE_FILE="$KIT_ROOT/_scripts/.progress.state"

declare -a PLATFORMS=(
  "P0:GitHub"
  "P0:Zenodo (DOI)"
  "P0:SSRN"
  "P1:ResearchGate"
  "P1:ORCID"
  "P1:LinkedIn Article"
  "P1:Medium"
  "P2:OSF"
  "P2:Academia.edu"
  "P2:Substack"
  "P2:Wikidata"
  "P3:arXiv"
  "P3:Google Scholar"
  "P3:Airiti"
  "P3:Speaker Deck"
)

touch "$STATE_FILE"

while true; do
  clear
  echo "════════════════════════════════════════════════════════"
  echo "  BCI 全平台發表進度 ($(date +%Y-%m-%d))"
  echo "════════════════════════════════════════════════════════"
  i=1
  for p in "${PLATFORMS[@]}"; do
    if grep -qx "$p" "$STATE_FILE"; then
      mark="✅"
    else
      mark="⬜"
    fi
    printf "  %2d. %s  %s\n" "$i" "$mark" "$p"
    ((i++))
  done
  echo ""
  echo "  輸入數字切換狀態 / q 離開:"
  read -r choice
  case "$choice" in
    q|Q) break ;;
    [0-9]*)
      idx=$((choice - 1))
      if [[ $idx -ge 0 && $idx -lt ${#PLATFORMS[@]} ]]; then
        target="${PLATFORMS[$idx]}"
        if grep -qx "$target" "$STATE_FILE"; then
          grep -vx "$target" "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
        else
          echo "$target" >> "$STATE_FILE"
        fi
      fi
      ;;
  esac
done

done_count=$(wc -l < "$STATE_FILE" | tr -d ' ')
total=${#PLATFORMS[@]}
echo ""
echo "📊 進度: $done_count / $total 平台完成"

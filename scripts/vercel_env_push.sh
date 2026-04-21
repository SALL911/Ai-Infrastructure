#!/usr/bin/env bash
# 從一個本地 .env 檔把所有變數推上 Vercel production 環境。
# 每個 key 先 rm 再 add，所以這支腳本可以重複跑（idempotent）。
#
# Usage:
#   bash scripts/vercel_env_push.sh web/landing/.env.vercel.local
#
# 檔案格式：標準 KEY=VALUE 每行一筆，# 開頭為註解，允許空行。
set -euo pipefail

say() { printf "\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
die() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

FILE="${1:-web/landing/.env.vercel.local}"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Not inside a git repo."
[[ -f "$REPO_ROOT/$FILE" ]] || [[ -f "$FILE" ]] || die "Env file not found: $FILE"

# 允許相對或絕對路徑
if [[ -f "$REPO_ROOT/$FILE" ]]; then
  FILE_ABS="$REPO_ROOT/$FILE"
else
  FILE_ABS="$(cd "$(dirname "$FILE")" && pwd)/$(basename "$FILE")"
fi

cd "$REPO_ROOT/web/landing"
[[ -f .vercel/project.json ]] || die "web/landing not linked to Vercel. Run scripts/vercel_bootstrap.sh first."

command -v vercel >/dev/null || die "vercel CLI missing. Run scripts/vercel_bootstrap.sh first."

COUNT=0
while IFS= read -r LINE || [[ -n "$LINE" ]]; do
  # 跳過空行與註解
  LINE="${LINE%$'\r'}"                  # 去 Windows CR
  [[ -z "${LINE// /}" ]] && continue
  [[ "${LINE:0:1}" == "#" ]] && continue

  KEY="${LINE%%=*}"
  VALUE="${LINE#*=}"
  KEY="${KEY## }"; KEY="${KEY%% }"       # trim
  # 去除兩側單 / 雙引號（最常見情況）
  VALUE="${VALUE#\"}"; VALUE="${VALUE%\"}"
  VALUE="${VALUE#\'}"; VALUE="${VALUE%\'}"

  [[ -z "$KEY" ]] && continue

  say "Pushing $KEY..."
  # rm 舊值（若有），再加新值。--yes 跳過確認。
  vercel env rm "$KEY" production --yes >/dev/null 2>&1 || true
  printf '%s' "$VALUE" | vercel env add "$KEY" production >/dev/null
  COUNT=$((COUNT+1))
done < "$FILE_ABS"

ok "Pushed $COUNT variables to production environment."
cat <<EOF

Redeploy to pick up the new values:
  cd web/landing && vercel --prod --yes

Or trigger a redeploy from Dashboard → Deployments → ⋯ → Redeploy.
EOF

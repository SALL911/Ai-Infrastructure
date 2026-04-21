#!/usr/bin/env bash
# WHY: `cchuan911-3120s-projects` Vercel account 還沒有 symcio-landing project。
# 這個腳本從頭建：安裝 CLI → 登入 → link → 第一次 production deploy。
# 所有互動提示會直接顯示（登入需要點瀏覽器連結）。
# 跑完之後再跑 scripts/vercel_env_push.sh 上環境變數。
#
# Usage: 從 repo 任一目錄 `bash scripts/vercel_bootstrap.sh`
set -euo pipefail

say() { printf "\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
die() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Not inside a git repo."
[[ -d "$REPO_ROOT/web/landing" ]] || die "web/landing/ not found. Pull latest main first."

cd "$REPO_ROOT/web/landing"

# 1. 確保 Node + npm
command -v node >/dev/null || die "Node.js not installed. See https://nodejs.org"
command -v npm  >/dev/null || die "npm not installed."

# 2. 確保 vercel CLI
if ! command -v vercel >/dev/null 2>&1; then
  say "Installing vercel CLI globally via npm..."
  npm i -g vercel@latest
fi
ok "vercel CLI: $(vercel --version 2>&1 | head -n1)"

# 3. 登入（會開瀏覽器）
if ! vercel whoami >/dev/null 2>&1; then
  say "You're not logged in. 'vercel login' will open a browser."
  say "Pick 'Continue with GitHub' to match the account that owns this repo."
  vercel login
fi
ok "Logged in as: $(vercel whoami 2>&1)"

# 4. Link / create project
#    一旦 link 成功會產生 .vercel/ 資料夾，之後 `vercel --prod` 會直接走那個 project。
if [[ ! -f .vercel/project.json ]]; then
  say "Linking to a Vercel project (creates 'web-landing' if new)..."
  say "When asked:"
  say "  - 'Set up and deploy?' → y"
  say "  - 'Which scope?'       → pick cchuan911-3120s-projects"
  say "  - 'Link to existing?'  → N (new project)"
  say "  - 'Project name?'      → symcio-landing  (建議改這個)"
  say "  - 'In which directory is your code located?' → ./  (目前目錄 web/landing 就是 root)"
  say "  - 其他問題都按 Enter 接受 Next.js 偵測到的預設"
  vercel link
fi
ok "Project linked. Config in $(pwd)/.vercel/project.json"

# 5. 第一次 production deploy
say "Running first production deploy..."
DEPLOY_OUTPUT=$(vercel --prod --yes 2>&1 | tee /dev/tty)
URL=$(printf '%s\n' "$DEPLOY_OUTPUT" | grep -Eo 'https://[a-z0-9.-]+\.vercel\.app' | tail -n1 || true)

if [[ -n "$URL" ]]; then
  ok "Deployed to: $URL"
else
  say "Deploy finished but couldn't auto-extract URL; check output above."
fi

cat <<EOF

───── Next steps ─────
1. 煙霧測試（換成你真實 URL）：
   bash scripts/smoke_schema_generator.sh ${URL:-https://<your-vercel-app>.vercel.app}

2. 補環境變數（Supabase / Composio / Stripe 等）：
   cp web/landing/.env.vercel.local.example web/landing/.env.vercel.local
   # 編輯填入真實值
   bash scripts/vercel_env_push.sh web/landing/.env.vercel.local
   # 重新 deploy 讓 env 生效
   cd web/landing && vercel --prod --yes

3. 綁 symcio.tw（按 docs/DOMAIN_CUTOVER.md 走）：
   - Vercel Dashboard → project → Settings → Domains → Add symcio.tw
   - 在 DNS 管理端刪 Lovable 的記錄 → 加 Vercel 給的 A + CNAME
   - DNS propagate 後再跑一次 smoke test 對 https://symcio.tw

──────────────────────
EOF

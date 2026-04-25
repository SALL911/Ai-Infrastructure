#!/usr/bin/env bash
# bundle_symcio.sh — 把 web/landing + 相關資源打包成一個獨立的 Symcio 資料夾
# 可以直接 rsync 到你的伺服器或另一個 repo 部署。
#
# 用法：
#   bash scripts/bundle_symcio.sh                     # 輸出到 ./outputs/symcio-bundle/
#   bash scripts/bundle_symcio.sh /path/to/dest       # 輸出到指定路徑
#   DEST=~/projects/Symcio bash scripts/bundle_symcio.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-${DEST:-$REPO_ROOT/outputs/symcio-bundle}}"

echo "==> Symcio BrandOS bundle"
echo "    Source: $REPO_ROOT"
echo "    Dest:   $DEST"
echo

if [ -d "$DEST" ] && [ "$(ls -A "$DEST" 2>/dev/null)" ]; then
  read -p "!! $DEST 已存在且非空。繼續會覆蓋檔案。確認？[y/N] " -n 1 -r
  echo
  [[ ! $REPLY =~ ^[Yy]$ ]] && { echo "abort"; exit 1; }
fi

mkdir -p "$DEST"

# --------- copy web/landing/ (去除 node_modules / .next / .env.local) ---------
echo "[bundle] copying web/landing/ → $DEST/"
if command -v rsync >/dev/null 2>&1; then
  rsync -a \
    --exclude 'node_modules/' \
    --exclude '.next/' \
    --exclude '.turbo/' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '.env.*.local' \
    --exclude '.vercel/' \
    "$REPO_ROOT/web/landing/" "$DEST/"
else
  # Fallback: tar pipe (no rsync dependency)
  (cd "$REPO_ROOT/web/landing" && tar --exclude='node_modules' \
    --exclude='.next' --exclude='.turbo' --exclude='.env' \
    --exclude='.env.local' --exclude='.env.*.local' --exclude='.vercel' \
    -cf - .) | (cd "$DEST" && tar -xf -)
fi

# --------- key docs ---------
mkdir -p "$DEST/docs"
for doc in \
  PRODUCT_OVERVIEW.md \
  DESIGN_SYSTEM.md \
  WAKE_UP_CHECKLIST.md \
  BCI_METHODOLOGY.md \
  SUPABASE_AUTH_SETUP.md \
  AUTH_MEMBER_SPEC.md \
  DOMAIN_DEPLOY.md \
  STRIPE_SETUP.md \
  TYPEFORM_SETUP.md \
  FULFILLMENT.md \
  POSITIONING.md; do
  if [ -f "$REPO_ROOT/docs/$doc" ]; then
    cp "$REPO_ROOT/docs/$doc" "$DEST/docs/$doc"
    echo "[docs]   copied $doc"
  fi
done

# --------- supabase migrations ---------
mkdir -p "$DEST/supabase/migrations"
if [ -d "$REPO_ROOT/supabase/migrations" ]; then
  cp "$REPO_ROOT/supabase/migrations/"*.sql "$DEST/supabase/migrations/" 2>/dev/null || true
  echo "[supabase] copied $(ls "$DEST/supabase/migrations" | wc -l | tr -d ' ') migration files"
fi

# --------- content (optional for marketing setup) ---------
mkdir -p "$DEST/content"
if [ -d "$REPO_ROOT/content" ]; then
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --exclude 'node_modules/' "$REPO_ROOT/content/" "$DEST/content/"
  else
    (cd "$REPO_ROOT/content" && tar --exclude='node_modules' -cf - .) \
      | (cd "$DEST/content" && tar -xf -)
  fi
  echo "[content] copied Medium / LinkedIn / cold-outreach templates"
fi

# --------- llms.txt + robots.txt (SEO) ---------
if [ -f "$REPO_ROOT/llms.txt" ]; then
  cp "$REPO_ROOT/llms.txt" "$DEST/llms.txt"
fi

# --------- CLAUDE.md for context ---------
if [ -f "$REPO_ROOT/CLAUDE.md" ]; then
  cp "$REPO_ROOT/CLAUDE.md" "$DEST/CLAUDE.md"
fi

# --------- top-level README ---------
cat > "$DEST/README.md" <<'EOF'
# Symcio BrandOS — Standalone Deployment Bundle

這個資料夾是 Symcio BrandOS 官網 + 會員系統 + Brand AI Audit MVP 的獨立部署包。

## 即刻部署

```bash
cp .env.example .env.local     # 填入 Supabase / Stripe / Resend 等 keys
npm install
npm run build                   # 驗證 build 過
npm run dev                     # 本地測試
```

## Vercel 部署

1. git init && git remote add origin <你的 repo>
2. git push
3. Vercel → Import → Root Directory 設為「/」（這個 bundle 本身就是根）
4. 設 environment variables（見 .env.example）

## 文件索引

- `docs/PRODUCT_OVERVIEW.md` — 完整產品地圖
- `docs/WAKE_UP_CHECKLIST.md` — 從 0 到上線步驟
- `docs/DESIGN_SYSTEM.md` — 設計系統
- `docs/SUPABASE_AUTH_SETUP.md` — Auth 設定
- `docs/BCI_METHODOLOGY.md` — BCI 方法論

## Supabase migrations

在 `supabase/migrations/` 目錄，依檔名時間順序執行：
```bash
supabase link --project-ref <ref>
supabase db push
```

## 內容

`content/` 包含 Medium、LinkedIn、冷信 templates。
執行 `bash scripts/prepare_content.sh`（需從原 repo 複製）即可準備發布。

---

由 `bash scripts/bundle_symcio.sh` 自動生成於 $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

# --------- summary ---------
echo
echo "✓ Bundle 完成"
echo "  位置：$DEST"
echo
echo "  檔案概要："
find "$DEST" -type f \( \
  -name '*.ts' -o -name '*.tsx' -o -name '*.json' -o -name '*.md' \
  -o -name '*.sql' -o -name '*.css' -o -name '*.html' \
\) | wc -l | awk '{print "    " $1 " files"}'
du -sh "$DEST" 2>/dev/null | awk '{print "    total size: " $1}'

echo
echo "下一步："
echo "  1. cd $DEST"
echo "  2. cp .env.example .env.local && fill"
echo "  3. npm install && npm run build"
echo "  4. git init && git add -A && git commit -m 'initial Symcio bundle'"
echo "  5. Vercel → Import → Deploy"

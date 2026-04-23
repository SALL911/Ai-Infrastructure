# Web3 Step 1 — MetaMask SIWE 品牌認領

## WHY

Symcio 主 ICP（上市櫃 ESG / 金融機構）不是 crypto-native，但 **Web3 品牌**（L1 / L2 / DeFi / NFT 專案）是 AI 可見度焦慮最深的細分市場——他們的客戶 100% 用 ChatGPT / Claude 問「哪條 L2 最安全」。Step 1 不接 crypto 付款、不鑄 NFT，只做一件事：

**讓品牌主用 MetaMask 簽一次訊息，把 Etherscan 與 ENS 連結自動寫進 `/schema-generator` 產出的 JSON-LD `sameAs`。**

這條路的 ROI：
- 對 Web3 使用者：強化 AI 引擎對其鏈上身分的實體辨識（Google KG、Wikidata sameAs 的最強錨）
- 對 Symcio：自動分群 Web3 客戶、取得可核實的 wallet address（日後郵件行銷、Snapshot governance token-gated 內容都能用）
- 對傳統 B2B 使用者：零影響。Connect Wallet 是可選區塊，不碰不會怎樣

## 資料流

```
使用者在 /schema-generator 點「Connect Wallet」
      │
 wagmi injected() → MetaMask 彈窗
      │
 取得 address（尚未驗證）
      │
 使用者點「Sign to Verify Ownership」
      │
 GET /api/siwe/nonce          ──▶ 隨機 16 bytes nonce + HttpOnly cookie
      │
 前端以 siwe lib 組 SIWE message（含 nonce、domain、address、chainId）
      │
 MetaMask 彈簽章視窗 → personal_sign
      │
 POST /api/siwe/verify { message, signature }
      │
      ├─ SiweMessage.verify({ signature, nonce: cookie })
      ├─ ENS 反查（viem 打 cloudflare-eth.com mainnet）
      └─ 發 HMAC-signed HttpOnly cookie（symcio_wallet，TTL 30 分鐘）
      │
 之後使用者送表單 → POST /api/schema
      │
      └─ 讀 symcio_wallet cookie → brands.owner_wallet / ens / wallet_verified_at
          JSON-LD 輸出自動加：
            https://etherscan.io/address/0xabc...
            https://app.ens.domains/yourname.eth
```

## 關鍵安全設計

| 威脅 | 對策 |
|------|------|
| 重放攻擊 | SIWE message 必含 server 發的 nonce；每個 nonce 用完即作廢 |
| 前端偽造 wallet | `/api/schema` 從不信任 form body 的 wallet 欄位，只讀 HttpOnly cookie |
| Cookie 竊取 | HttpOnly + SameSite=Lax + Secure（production） |
| Cookie 偽造 | HMAC-SHA256 with `SIWE_COOKIE_SECRET`，timingSafeEqual 比對 |
| 同一 wallet 多次 claim 不同 brand | DB unique partial index `uq_brands_owner_wallet`（status=prospect 才比）|
| Cookie 長期殘留 | TTL 30 分鐘，超時自動重簽 |

## 環境變數

需要在 Vercel Production + Preview 加一項：

```
SIWE_COOKIE_SECRET=<openssl rand -base64 48>
```

Production 沒設會在請求時直接 throw。Dev 有 fallback（但會警告）。

## 部署步驟

1. **套 migration**：PR 合併後 `supabase-deploy.yml` 自動跑 `supabase db push` 套用 `20260422000000_siwe_brand_wallet.sql`
2. **加 Vercel env var**：Settings → Environment Variables → Production 新增 `SIWE_COOKIE_SECRET`
3. **Redeploy**：Vercel Deployments → 最新一筆 → Redeploy，讓新 env var 生效
4. **煙霧測試**：見下一段

## 煙霧測試

裝好 MetaMask 的瀏覽器，開 `https://xxxx.vercel.app/schema-generator`：

1. 看到「Web3 品牌認領（選填）」區塊 → **Connect Wallet** 按鈕
2. 點下去 → MetaMask 彈窗，選錢包
3. 按鈕變「Sign to Verify Ownership」
4. 點下去 → MetaMask 彈簽章視窗，文字包含 `Sign in to claim your brand on Symcio`
5. 簽完按鈕變 `✓ yourname.eth` 或 `✓ 0x1234…abcd`
6. 看右側即時預覽 JSON-LD，`sameAs` 最前面兩筆應為：
   ```json
   "sameAs": [
     "https://etherscan.io/address/0x...",
     "https://app.ens.domains/yourname.eth",
     ...
   ]
   ```
7. 正常填完表送出 → Supabase `brands` 表該品牌列：
   - `owner_wallet` = 你的小寫 address
   - `ens` = ENS name（若有）
   - `wallet_verified_at` = 當下 timestamp

## 失敗模式

| 症狀 | 原因 | 對策 |
|------|------|------|
| Connect Wallet 點了沒反應 | 沒裝 MetaMask / 注入錢包 | 裝 MetaMask 再試，或改用支援 EIP-1193 的錢包 |
| Sign 按鈕卡「驗證中…」 | `/api/siwe/verify` 500 | 看 Vercel function log，多半是 `SIWE_COOKIE_SECRET` 沒設 |
| 簽完又跳回 Connect Wallet | Cookie 沒寫入（SameSite 或 Secure 設定不符） | 確認 production URL 是 https，sandbox 環境不要用 |
| ENS 查不到 | 錢包沒設 ENS reverse record，或 cloudflare-eth.com 暫時 rate-limit | 落空就落空，不擋流程；address 仍會寫入 |
| DB 寫入失敗 `uq_brands_owner_wallet` | 同一 wallet 已 claim 過別的品牌 | MVP 階段先讓 API 回 4xx 由前端處理；日後加 brand_wallets 多對多表 |

## 什麼沒做（Step 2 / Step 3 的延伸）

Step 1 **故意**不做這些，避免 scope creep：

- **Crypto checkout**：$299 Audit / $1,999 Optimization 仍走 Stripe，MetaMask 不碰錢
- **NFT mint**：不發任何 token 給簽章者
- **Snapshot governance 整合**：未來可做 token-holder 才能看的 report
- **WalletConnect**：目前只支援 injected（MetaMask 桌面）。Web3 行動使用者少數走手機錢包，Step 2 再補
- **Multi-chain ENS**：目前只查 mainnet ENS。Base Name Service（.base.eth）等 Step 2 評估

## 成本

- 前端 build 增加約 **~300 KB gzipped**（wagmi + viem + siwe + tanstack-query）
- Vercel 無額外成本（純 edge function，每月 100 萬次請求免費）
- mainnet RPC 使用免費公共 `cloudflare-eth.com`，ENS 查詢約 20–50 req/day 以內

**月費：$0**。

## 後續（Step 2 planning）

Step 1 合併後觀察一週：
- `brands WHERE owner_wallet IS NOT NULL` 的 count / day
- Web3 segment 客單價 vs 一般客戶

若該數字 > 5/day 且平均客單價持平或更高 → 推 Step 2（Coinbase Commerce 接 USDC on Base 收 $299）。
若該數字 < 1/day → Web3 wedge 沒 traction，Step 1 留著當身分驗證用即可，資源轉回主 ICP。

## 相關檔案

- 本 runbook：`docs/WEB3_SIWE_STEP1.md`
- Migration：`supabase/migrations/20260422000000_siwe_brand_wallet.sql`
- wagmi config：`web/landing/lib/wallet/config.ts`
- HMAC cookie lib：`web/landing/lib/wallet/siwe-cookie.ts`
- SIWE APIs：`web/landing/app/api/siwe/{nonce,verify}/route.ts`
- 前端 button：`web/landing/components/ConnectWalletButton.tsx`
- Providers：`web/landing/app/providers.tsx`（layout.tsx 已包）
- JSON-LD 輸出：`web/landing/lib/schema/generator.ts`（ownerWallet + ens 欄位）
- 後端 persist：`web/landing/app/api/schema/route.ts`（讀 cookie 寫 brands）

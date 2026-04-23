-- Brand ownership wallet (SIWE Step 1)
-- 允許品牌主以 Ethereum wallet 簽名認領 Symcio brand profile，
-- 為 Web3 客戶獲客漏斗加一道防偽。主 ICP（上市櫃）仍可走純 email 路線，
-- wallet 欄位都是選填。

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS owner_wallet        VARCHAR(42),           -- 0x + 40 hex
  ADD COLUMN IF NOT EXISTS ens                 VARCHAR(253),          -- ENS 最長 253 chars
  ADD COLUMN IF NOT EXISTS wallet_verified_at  TIMESTAMPTZ;

-- 方便以 wallet 查品牌（例如 Web3 segment 報表、重複 claim 偵測）
CREATE INDEX IF NOT EXISTS idx_brands_owner_wallet
  ON brands(owner_wallet)
  WHERE owner_wallet IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_owner_wallet
  ON brands(owner_wallet)
  WHERE owner_wallet IS NOT NULL;
-- 一個 wallet 只能認領一個 brand。若未來要允許多品牌關聯，改設 brand_wallets 多對多表。

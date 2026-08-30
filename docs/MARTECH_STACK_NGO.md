# NGO Martech 技術棧 — HubSpot × LINE OA × Make.com
## 全國區塊鏈會計聯合會 ｜ v1.0 ｜ 2026-08-30

---

## 一、WHY：為什麼是這三個，不是「功能最強的免費 CRM」

選型理由不是功能比較表，是**槓桿**：

**HubSpot 已經在既有的 Claude 連接器裡。** 這代表名單管理、開發信追蹤、
分眾查詢都能用 AI 直接操作——其他免費 CRM 給不了這個。
一個要另外登入後台手動點的免費 CRM，實際使用率會歸零。

三者分工：

| 層 | 工具 | 角色 |
|---|------|------|
| 主檔層 | **HubSpot Free** | 聯絡人／組織的單一真相來源 |
| 觸達層 | **LINE OA ×1** | 台灣受眾的實際溝通管道 |
| 接線層 | **Make.com Free** | 兩者之間的自動同步 |

---

## 二、HubSpot Free — 主檔層

### 2.1 免費版實際額度

| 項目 | 免費版 |
|------|-------|
| 聯絡人 | 100 萬筆 |
| 自訂屬性 | 每個物件 10 個（免費版限制）|
| 行銷信 | 2,000 封／月 |
| 表單、成交管線 | ✅ |
| 工作流程自動化 | ❌（付費版才有，所以用 Make 補）|

> **自訂屬性 10 個的限制很關鍵**：
> `schemas/hubspot_crm_schema.json` 刻意把 companies 控制在 7 個、contacts 5 個，
> 就是為了不超過免費版上限。要加新欄位前先確認還剩幾格。

### 2.2 欄位架構

完整定義見 `schemas/hubspot_crm_schema.json`。核心四維度：

```
組織類型 × 縣市 × 關係階段 × 來源節點
```

| 維度 | 欄位 | 值域 |
|------|------|------|
| 組織類型 | `brandos_org_type` | 地方政府／品牌／媒體／媒體代理商／產業公會／宗教團體／學研／社群NGO／能源／區塊鏈技術商／虛擬資產交易所 |
| 縣市 | `brandos_county_city` | 22 縣市 |
| 關係階段 | `brandos_relationship_stage` | 冷／已接觸／已回覆／合作中／暫不接觸 |
| 來源節點 | `brandos_source_node` | 大橡科技／AI 人工智慧管理學院／台灣自造者協會／MAA／聯合會／NIS／阿罩霧基金會／T-REC 電廠／Symcio 客戶／活動／LINE OA／官網表單 |

加上兩個治理欄位：

- `brandos_public_disclosure_ok` — 可否出現在對外夥伴名單
- `brandos_consent_basis` — 個資蒐集的合法事由（個資法第 19 條）

### 2.3 個資法紅線（欄位層級，非事後補救）

**Contact 物件不存在任何宗教相關欄位。**

個資法第 6 條把宗教信仰列為特種個資，原則禁止蒐集處理。
宮廟／教會一律以 **Company** 建檔（`brandos_org_type = religious_org`），
只記錄單位名稱、職稱、公務聯絡方式。

`scripts/hubspot_crm_bootstrap.py` 內建 `assert_no_sensitive_fields()` 守門員：
任何欄位名稱或標籤命中「宗教／信仰／religion／faith／病歷／基因／前科」等關鍵字，
整個 bootstrap 直接中止。這是程式強制，不是文件約定。

同一個守門員也處理交易所：`brandos_org_type = vasp_exchange` 的紀錄，
`public_disclosure_ok` 會被程式強制寫成 `false`，不管 CSV 裡填什麼。

---

## 三、LINE OA — 觸達層

**只開一個帳號**，22 縣市用標籤區分。完整申請與串接流程見
`docs/LINE_OA_VERIFICATION.md`。

三個要點：

1. **申請灰盾認證帳號**（NGO 可申請，公信力高一級）— 無 API，人工送件
2. **200 則／月的免費額度全部留給一對一回覆**
   —— 大量觸達靠圖文選單、自動回應、標籤分眾（三者都不計入額度）
3. **帶參數的加好友入口**：`symcio.tw/j/{county}-{occasion}` 轉址頁，
   掃碼即自動打上縣市與場合標籤

---

## 四、Make.com Free — 接線層

免費版 1,000 次操作／月。兩條 scenario 就夠：

### Scenario A：LINE 加好友 → HubSpot 建檔

```
LINE follow webhook
  → 讀取轉址頁帶入的來源參數
  → HubSpot: create/update contact
       brandos_source_node        = line_oa
       brandos_county_city        = {來源參數}
       brandos_line_user_ref      = {county}-{occasion}
       brandos_consent_basis      = line_oa_notice
       brandos_relationship_stage = contacted
```

### Scenario B：HubSpot 表單提交 → LINE 標籤同步

```
HubSpot form submission webhook
  → 比對 LINE OA 既有好友
  → 加上對應標籤（縣市／組織類型）
```

**額度試算**：每月新增 300 位聯絡人 × 每位 2 次操作 = 600 ops，
免費版 1,000 ops 綽綽有餘。

---

## 五、與 BrandOS 的銜接（現在建的每一筆都是未來的資產）

等 BrandOS 上線後，Scenario A 的終點從 HubSpot 改接 **Supabase**：

```
LINE follow → Make → Supabase (leads / knowledge_nodes)
                  ↘ HubSpot（維持人工操作介面）
```

CRM 數據直接變成產品資料層。既有的
`scripts/composio_hubspot_sync.py` 已經在做 Supabase → HubSpot 的反向同步，
兩條線會合流。

> 這是為什麼欄位命名一律 `brandos_` 前綴：
> 未來搬到 Supabase 時，欄位對應是一對一的，不用重新設計。

---

## 六、執行順序

| # | 步驟 | 依賴 | 狀態 |
|---|------|------|------|
| 1 | 理事會決議（授權 + 個資告知條款）| — | ⏸ 待辦（人工）|
| 2 | HubSpot 建欄位架構 | 1 | ✅ 腳本就緒 `scripts/hubspot_crm_bootstrap.py` |
| 3 | 匯入 18 家代理商 + MAA 公會 | 2 | ✅ 資料就緒 `data/crm/agency_partners.csv` |
| 4 | LINE OA 申請灰盾認證 | 1 | ⏸ 待辦（人工，無 API）|
| 5 | Make 串接兩條 scenario | 3, 4 | ⏸ 待 4 完成 |
| 6 | 上線 `/j/{county}` 轉址頁 | — | ⏸ 可先做（不依賴認證）|
| 7 | 22 縣市分批開通 | 6 | ⏸ 先做臺北／臺中／南投／嘉義 |

**步驟 1 是所有事情的前提。** 沒有理事會決議，
步驟 2–3 建出來的 CRM 在法律上是個人行為，不是法人行為。

---

## 七、成本

| 工具 | 方案 | 月費 |
|------|------|------|
| HubSpot | Free | NT$0 |
| LINE OA | 輕用量（200 則／月）| NT$0 |
| Make.com | Free（1,000 ops／月）| NT$0 |
| **合計** | | **NT$0** |

超出免費額度的觸發點：
- HubSpot：自訂屬性超過 10 個，或需要工作流程自動化
- LINE OA：一對一回覆超過 200 則／月 → 中用量方案
- Make：操作超過 1,000 次／月

在 22 縣市全開之前，三者都不會觸頂。

---

## 附：相關文件

- `docs/NGO_ENTITY_STRUCTURE.md` — 主體架構與理事會授權前提
- `docs/LINE_OA_VERIFICATION.md` — LINE OA 灰盾認證申請
- `schemas/hubspot_crm_schema.json` — 欄位定義（SSoT）
- `data/crm/agency_partners.csv` — 18 家代理商 + MAA 名單
- `scripts/hubspot_crm_bootstrap.py` — 欄位建立 + 名單匯入

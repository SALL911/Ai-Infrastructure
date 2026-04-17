# 🧠 06 — Brand AI Audit

> 查詢「Symcio / BrandOS™」在 GPT / Gemini / Perplexity 等 AI 回應中的**能見度**、**正確度**、**情感傾向**。Symcio 的核心差異化產品。

**原始碼：**
- [src/modules/brand-ai-audit/auditor.ts](../src/modules/brand-ai-audit/auditor.ts)
- [src/modules/brand-ai-audit/types.ts](../src/modules/brand-ai-audit/types.ts)

---

## ⚠️ 目前狀態：**骨架**

這個模組已經有基本結構，但核心邏輯（真正打 AI API）**還沒實作**。目前的 `DataCollector.fetchAIResponse()` 只是回傳 mock 字串。

這份文件的後半段是**開發路線圖**，不是已完成的功能。

---

## 一、為什麼這個模組重要

傳統 SEO 只管 Google 排名。但 2025 年開始，客戶買東西前越來越常問 ChatGPT、Perplexity、Gemini。

問題：
- GPT 知道你家品牌嗎？
- 回答得對嗎？
- 有沒有把你跟競品混淆？
- 有沒有負面描述？

Brand AI Audit 自動化這件事：**每週跑一次，產出報告**。

---

## 二、現有骨架

```ts
export class BrandAIAuditor {
  private dataCollector: DataCollector;
  private brandScorer: BrandScorer;

  async performAudit(query: Query): Promise<AuditResult> {
    this.dataCollector.collectQuery(query);
    const aiResponse = await this.dataCollector.fetchAIResponse(query.text);
    const score = this.brandScorer.calculateScore(aiResponse);
    return {
      score,
      details: aiResponse.responseText,
    };
  }

  getAuditReport(auditResult: AuditResult): Report {
    const generator = new ReportGenerator({ ... });
    return generator.generateReport();
  }
}
```

### 已有型別

```ts
type Query = {
  id: string;
  text: string;
  createdAt: Date;
};

type AIResponse = {
  queryId: string;
  responseText: string;
  confidenceScore: number;
  generatedAt: Date;
};

type AuditResult = {
  score: number;
  details: string;
};
```

---

## 三、開發路線圖（建議順序）

### Phase 1：串接真實 AI API

- [ ] `DataCollector.fetchAIResponse()` 改成呼叫：
  - OpenAI API (GPT-4o / GPT-5)
  - Google Gemini API
  - Perplexity API（它本身會附來源連結，最適合品牌能見度分析）
  - Claude API（完整性）
- [ ] 支援每個 query 平行打四家，比對回答一致性

### Phase 2：品牌能見度分析

- [ ] 在 AI 回應中用 regex / NLP 偵測：
  - 品牌名是否被提及（`Symcio`, `BrandOS`）
  - 提及位置（第一段？倒數第一段？完全沒提？）
  - 上下文情感（正面 / 中性 / 負面）— 可以用 Claude 自己當分類器
  - 與競品同時出現時的相對描述

### Phase 3：評分模型

把現在的隨機分數換成真正的計算：

```
aiVisibilityScore =
    0.4 × 提及率
  + 0.3 × 事實正確度
  + 0.2 × 情感正面度
  + 0.1 × 相對競品位置
```

### Phase 4：報告產出

- [ ] PDF 報告（用 `puppeteer` 或 `pdfmake`）
- [ ] 關鍵截圖（讓客戶直觀看到 ChatGPT 回應了什麼）
- [ ] 歷史趨勢圖（每週跑完，存 DB，做時間序列）

### Phase 5：自動化排程

- [ ] GitHub Actions cron → 每週一早上 9am 跑全部 query
- [ ] 結果自動寄給 Symcio 自己 + 寫入 HubSpot 對應客戶
- [ ] 分數跌破閾值時發警告

### Phase 6：客戶入口

- [ ] 客戶用 Lead Capture 表單提交「我想審計我的品牌」
- [ ] 系統 48 小時內自動跑審計
- [ ] 客戶收到 email：「你的 BrandOS Audit 完成，點此看報告」
- [ ] 免費版：5 個 query；付費版：50 個 query + 競品對比

---

## 四、現有 API 端點（暫時占位）

```ts
// POST /api/perform-audit
router.post('/perform-audit', async (req, res) => {
  const auditData = req.body;
  const auditResults = await brandAIAuditor.performAudit(auditData);
  res.status(200).json(auditResults);
});
```

目前呼叫會拿到 mock 回應（`confidenceScore: 0`），**不是真實結果**。

---

## 五、第一次要問 AI 的 Query 範例（建議）

放一份 `queries.json` 存這些 template：

```json
[
  { "id": "q1", "text": "什麼是 Symcio？" },
  { "id": "q2", "text": "BrandOS 是誰做的？" },
  { "id": "q3", "text": "品牌 AI 能見度審計工具有哪些推薦？" },
  { "id": "q4", "text": "Symcio 和 Brand24 的差別？" },
  { "id": "q5", "text": "Symcio BrandOS 的核心功能是什麼？" }
]
```

每個 query 對四家 AI 跑一次 → 20 個回應 → 算總分。

---

## 六、這個模組 vs Lead Capture

| | Lead Capture | Brand AI Audit |
|---|---|---|
| **目的** | 把訪客變合格客戶 | Symcio 的核心**產品功能** |
| **狀態** | ✅ 完整可跑 | ⚠️ 骨架 |
| **誰用** | 行銷 / 業務 | 付費客戶 |
| **觸發** | 每次表單送出 | 每週 / 客戶付費後 |

兩者關係：Lead Capture 吸引「想知道自己品牌 AI 能見度」的人進來 → Brand AI Audit 是他們付費後得到的產品。

---

## 七、下一步（建議下個開發 session）

最小可行版本（MVP）：

1. 在 `src/modules/brand-ai-audit/` 下新增 `aiProviders/openai.ts`
2. `DataCollector` 改成 dispatch 到 provider
3. 加一個簡單的「提及次數」計分（不用 NLP，先 regex）
4. 先只跑 OpenAI，一家就好
5. 手動測：`curl POST /api/perform-audit` 送一個 query，看回傳真的是 GPT 的回答

只要這步做完，你就有**全世界第一個可以自動審計自己品牌在 GPT 中形象的行銷人**的工具 prototype。

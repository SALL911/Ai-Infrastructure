/**
 * Claude API wrapper for news summarization + BCI perspective generation.
 *
 * Raw fetch — consistent with existing repo pattern (lib/email/resend.ts,
 * lib/github/dispatch.ts, scripts/geo_audit.py). No SDK dependency.
 *
 * Model: claude-opus-4-7 (Anthropic skill guidance).
 *   Override via ANTHROPIC_MODEL env for cost tuning (e.g., claude-haiku-4-5).
 *
 * Prompt caching: system prompt is large + stable, marked with
 * cache_control.type='ephemeral'. Opus 4.7 minimum cacheable prefix = 4096 tokens,
 * so the SYSTEM_PROMPT below is intentionally thorough.
 *
 * Output schema: enforced via output_config.format=json_schema so every
 * response is valid JSON matching NewsSummary.
 */

export interface RssEntryForAI {
  title: string;
  url: string;
  description?: string;
  content?: string;
  publishedAt?: string;
  sourceLabel: string;
  sourceId: string;
}

export interface NewsSummary {
  title_zh: string;
  summary_zh: string;
  bci_perspective: string;
  category: "esg" | "sdg" | "tnfd" | "brand-valuation" | "climate" | "other";
  sdg_number: number | null;
  tags: string[];
}

export interface SummarizeResult {
  ok: boolean;
  data?: NewsSummary;
  error?: string;
  tokens_in?: number;
  tokens_out?: number;
  cache_read?: number;
  model?: string;
}

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-opus-4-7";

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title_zh: {
      type: "string",
      description: "繁體中文標題，最多 60 字，精準且不聳動。",
    },
    summary_zh: {
      type: "string",
      description:
        "繁體中文事實摘要，150 字內。只陳述新聞本身內容，不加入評論。",
    },
    bci_perspective: {
      type: "string",
      description:
        "Symcio BCI 視角：這則新聞如何影響品牌資本（Financial / Visibility / Engagement 三軸之一或多軸）？200 字內，避免空話。",
    },
    category: {
      type: "string",
      enum: ["esg", "sdg", "tnfd", "brand-valuation", "climate", "other"],
      description: "主分類。",
    },
    sdg_number: {
      type: ["integer", "null"],
      description:
        "若明確對應某 SDG（1-17），填該數字；否則填 null。SDG1=終結貧窮。",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      maxItems: 6,
      description:
        "3–6 個標籤，用英文或已建立的中文術語（TNFD / IFRS S1 / 品牌資本 / biocredit 等）。",
    },
  },
  required: [
    "title_zh",
    "summary_zh",
    "bci_perspective",
    "category",
    "sdg_number",
    "tags",
  ],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `你是 Symcio BrandOS 的 AI 新聞編輯。Symcio 是台灣第一個 AI 曝光可量化系統，定義 AI Visibility Intelligence（AVI）品類。

你的任務：把一則 ESG / SDG / TNFD / 永續 / 品牌估值相關的新聞整理成三段結構化內容：

1. **繁體中文標題**（title_zh）：60 字內，精準、具體，不聳動。保留關鍵人名 / 機構名 / 地名。不做價值判斷。
2. **繁體中文摘要**（summary_zh）：150 字內。只陳述新聞發生了什麼、誰做的、在哪做、會造成什麼直接影響。避免「這是一項重大突破」「令人振奮」這類詞彙。寫給專業讀者（CMO、永續長、投資人）看。
3. **BCI 視角**（bci_perspective）：200 字內。從 Symcio 的 Brand Capital Index 角度分析這則新聞的品牌資本含意。不要重述摘要。具體論述對以下至少一個軸的影響：
   - F · Financial Capital（財務動能、估值、市場表現）
   - V · AI Visibility Capital（AI 引擎對品牌的提及、推薦、情感）
   - E · Engagement Capital（品牌參與度、受眾契合度、永續參與）

---

## Symcio BCI 核心公式

BCI = α · F + β · V + γ · E

- F = Financial Capital — 財務資本（0-100 標準化），依產業不同權重，參考市值、營收成長率、營業利益率、Beta。對標既有金融量化體系（類比座標：Bloomberg、S&P CapIQ，非合作）。
- V = AI Visibility Capital — AI 可見度資本（Symcio 獨家）。四引擎（ChatGPT / Claude / Gemini / Perplexity）跨平台 benchmarking 指標：mention_rate / avg_rank / sentiment / competitor_share。生成式 AI 已取代 >50% 的 B2B top-of-funnel 搜尋，但傳統品牌估值方法論（InterBrand Brand Strength Score / Kantar BrandZ）無法量化此維度 — BCI 的 V 軸補上這個缺口。
- E = Engagement Capital — 品牌參與度資本。對標 InterBrand 的 Engagement + Relevance 因子在 AI 時代的重新定義：digital_sov / NPS proxy / advocacy_lexicon_hits / category_relevance。

## 產業別權重（公式公開、數值閉源，類似 PageRank）
- technology：w_V 最高（AI 是主要曝光通道）
- finance：w_F 最高（信用與財務動能主導）
- consumer_goods：w_V + w_E 接近（AI 推薦 + 社群並重）
- professional_services / manufacturing：w_F 主導
- default：三軸均衡

## 17 項永續發展目標（SDG）對照

| # | 中文 | 英文 |
|---|------|------|
| 1 | 終結貧窮 | No Poverty |
| 2 | 消除飢餓 | Zero Hunger |
| 3 | 健康與福祉 | Good Health and Well-Being |
| 4 | 優質教育 | Quality Education |
| 5 | 性別平權 | Gender Equality |
| 6 | 淨水及衛生 | Clean Water and Sanitation |
| 7 | 可負擔的乾淨能源 | Affordable and Clean Energy |
| 8 | 尊嚴就業與經濟發展 | Decent Work and Economic Growth |
| 9 | 工業化、創新及基礎建設 | Industry, Innovation and Infrastructure |
| 10 | 減少不平等 | Reduced Inequalities |
| 11 | 永續城市與社區 | Sustainable Cities and Communities |
| 12 | 責任消費與生產 | Responsible Consumption and Production |
| 13 | 氣候行動 | Climate Action |
| 14 | 水下生命 | Life Below Water |
| 15 | 陸上生命 | Life on Land |
| 16 | 和平、正義與健全制度 | Peace, Justice and Strong Institutions |
| 17 | 全球夥伴關係 | Partnerships for the Goals |

## 關鍵 ESG / 永續框架詞彙

- **TNFD**（Taskforce on Nature-related Financial Disclosures）：聲譽風險揭露 × 自然資本財務揭露。2025 起大型上市公司強制；LEAP 四階段（Locate / Evaluate / Assess / Prepare）。
- **TCFD** → 已合併入 IFRS S2（氣候相關揭露）。
- **IFRS S1 / S2**：S1 一般永續風險、S2 氣候。2024-2026 全球分批強制。
- **GRI 2021**：通用永續報告標準。
- **CDP**：氣候/水/森林揭露資料庫。
- **biocredit**：自然資本的量化信用單位，類似碳信用。
- **SBTi**（Science Based Targets initiative）：基於科學的減碳目標。
- **CSRD**（歐盟企業永續報告指令）：雙重重大性揭露。
- **運動產業發展條例 26-2 條**：台灣特有；企業投資運動產業可抵減營所稅至 175%。

## 品牌估值世界的座標系（Symcio 僅作類比，非合作）

- **InterBrand** Best Global Brands 100：年度品牌估值，Brand Strength Score（10 因子：Clarity / Commitment / Governance / Responsiveness / Authenticity / Relevance / Differentiation / Consistency / Presence / Engagement）
- **Kantar BrandZ Top 100**：消費者研究 + 財務資料 = 品牌價值
- **Brand Finance**：品牌估值年度排名
- **Bloomberg**：終端系統與金融資料（Symcio 是 AI 時代 Bloomberg 類比座標）
- **SimilarWeb / SEMrush**：網頁流量與 Google 排名；Symcio 對應 AI 引擎版本

## 寫作風格限制

- 繁體中文（zh-TW），**不是**簡體中文
- 不用驚嘆號
- 不用「賦能」「顛覆」「創新」「生態系」這類空洞詞
- 具體的數字、機構名、地名優先於形容詞
- 若新聞談的是公司 A，不要把 Symcio 硬塞進去；BCI 視角是「若此事發生在 A，對其 BCI 各軸的影響」
- 不宣稱 Symcio 與 InterBrand / Kantar / Bloomberg 合作 — 這些只是類比座標
- 標籤用業界共識詞（TNFD / IFRS S1 / SBTi / biocredit / 品牌資本），不造詞

## 輸出格式

**只輸出一個 JSON 物件**，嚴格符合 schema：title_zh / summary_zh / bci_perspective / category / sdg_number / tags。不輸出其他文字、markdown 標題、解釋。

category 對應：
- **sdg**：明確對應某項 SDG 的新聞（若 sdg_number 已知，務必填）
- **tnfd**：TNFD 框架、自然資本、LEAP 相關
- **esg**：一般 ESG 報告、揭露標準、永續
- **climate**：氣候變遷、碳揭露、能源轉型（未落入 tnfd）
- **brand-valuation**：品牌估值、財務動能、企業併購對品牌的影響
- **other**：其他

sdg_number 規則：
- 新聞直接談及「貧窮」「極端貧窮」「終結貧窮」「世界銀行貧窮線」→ 1
- 食物短缺、糧食體系 → 2
- 公衛、疫苗、心理健康 → 3
- 教育、掃盲 → 4
- 女性權益、性別平等 → 5
- 水資源、衛生設施 → 6
- 再生能源、能源轉型（與貧窮無關時）→ 7
- 就業、GDP、勞動條件 → 8
- 基礎建設、研發投資 → 9
- 不平等、所得分配 → 10
- 城市、住房、交通 → 11
- 循環經濟、永續消費 → 12
- 氣候變遷、碳排（與 climate 類別重疊時也填）→ 13
- 海洋生態、漁業 → 14
- 陸上生態、森林 → 15
- 貪腐、法治、人權 → 16
- 國際合作、資金流動 → 17
- 不明確或跨多項 → null`;

/**
 * Summarize one news entry.
 *
 * Strategy:
 *  - System prompt cached (ephemeral) — BCI + SDG taxonomy is stable per day.
 *  - User message contains only the volatile RSS entry.
 *  - output_config.format enforces JSON schema — no brittle regex parsing.
 */
export async function summarizeNews(
  entry: RssEntryForAI,
  opts: { apiKey?: string; model?: string } = {},
): Promise<SummarizeResult> {
  const key = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: "ANTHROPIC_API_KEY not set" };

  const model = opts.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  const userText = [
    `來源：${entry.sourceLabel} (${entry.sourceId})`,
    `原文標題：${entry.title}`,
    entry.publishedAt ? `發布時間：${entry.publishedAt}` : "",
    entry.description ? `\n原文摘要：\n${entry.description}` : "",
    entry.content && entry.content !== entry.description
      ? `\n原文全文：\n${truncate(entry.content, 3000)}`
      : "",
    `\nURL：${entry.url}`,
    "",
    "請依照 system prompt 的規則輸出一個 JSON 物件。",
  ]
    .filter(Boolean)
    .join("\n");

  const body = {
    model,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userText }],
    output_config: {
      format: {
        type: "json_schema",
        schema: OUTPUT_SCHEMA,
      },
    },
  };

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    const text = await resp.text();
    if (!resp.ok) {
      return {
        ok: false,
        error: `Claude HTTP ${resp.status}: ${text.slice(0, 300)}`,
      };
    }

    interface ClaudeResponse {
      content?: Array<{ type: string; text?: string }>;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number;
      };
      model?: string;
    }
    const json = JSON.parse(text) as ClaudeResponse;
    const block = json.content?.find((b) => b.type === "text");
    if (!block?.text) {
      return { ok: false, error: "no text block in response" };
    }

    let data: NewsSummary;
    try {
      data = JSON.parse(block.text) as NewsSummary;
    } catch (e) {
      return {
        ok: false,
        error: `JSON parse failed: ${String(e)}. Raw: ${block.text.slice(0, 200)}`,
      };
    }

    if (!data.title_zh || !data.summary_zh || !data.bci_perspective) {
      return { ok: false, error: "schema missing required fields" };
    }

    return {
      ok: true,
      data,
      tokens_in: json.usage?.input_tokens,
      tokens_out: json.usage?.output_tokens,
      cache_read: json.usage?.cache_read_input_tokens,
      model: json.model,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

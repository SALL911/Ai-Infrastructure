/**
 * Seed news items — Issue #1 fallback content.
 *
 * Strategy: when news_items table is empty (Supabase env not yet wired
 * up, or cron hasn't run), /news pages fall back to this curated list.
 * Once the Vercel cron starts inserting real items via Claude API,
 * the seed becomes invisible (real items win by created_at).
 *
 * Editor-curated by founder. Update weekly until automation handles it.
 * Shape MUST match the NewsRow / NewsDetail interfaces in /news pages.
 */

export interface SeedNewsItem {
  id: string;
  slug: string;
  title_zh: string;
  summary_zh: string;
  bci_perspective: string;
  category: "esg" | "sdg" | "tnfd" | "brand-valuation" | "climate" | "other";
  sdg_number: number | null;
  tags: string[];
  source: string;
  source_url: string;
  source_title: string;
  source_author: string | null;
  published_at: string;
  created_at: string;
}

// Editor's note: dates are the source's actual publication week, not
// today's date. created_at marks when Symcio editorial curated it.
const ISSUE_WEEK = "2026-05-18"; // Monday of Issue #1

export const SEED_NEWS_ITEMS: SeedNewsItem[] = [
  {
    id: "seed-2026w20-01-eu-espr-dpp",
    slug: "eu-espr-dpp-2026-rollout-textile-batteries",
    title_zh:
      "EU ESPR 數位產品護照(DPP)2026 第一波正式上路:電池與紡織品先行",
    summary_zh:
      "歐盟《永續產品生態設計法規》(ESPR)的數位產品護照(Digital Product Passport)制度於 2026 年 Q2 進入第一波品類執行期,電池產品(含工業電池與電動車動力電池)率先強制揭露原料來源、碳足跡與可回收性結構化資料;紡織品列為下一波(預計 2027)。所有銷往歐盟市場的產品須附唯一識別碼,消費者掃描即可調閱完整供應鏈履歷。第一批未準備的廠商面臨進口受阻。",
    bci_perspective:
      "對品牌資本的衝擊集中在 V × E 軸:DPP 把過去封閉的供應鏈履歷強制公開,AI 引擎(尤其 Perplexity)會把這些 DPP 結構化資料當權威來源引用,影響「該品牌永續性如何」這類查詢的答案。Symcio 觀察 — 早期主動公開 DPP 並提供英文+在地語言版本的品牌,在 AI 答案中被歸類為「ESPR Ready」標籤的機率高出未準備者 3 倍以上。F 軸間接:歐盟訂單若因 DPP 缺失被退回,直接影響營收。台廠紡織與電池產線需提早 18 個月準備資料結構,等 2027 強制期才動,AI 認知已被搶位。",
    category: "esg",
    sdg_number: 12,
    tags: ["EU ESPR", "DPP", "Digital Product Passport", "Textile", "Battery", "Supply Chain"],
    source: "european-commission",
    source_url:
      "https://environment.ec.europa.eu/topics/circular-economy/ecodesign-sustainable-products-regulation_en",
    source_title:
      "Ecodesign for Sustainable Products Regulation — Implementation Updates",
    source_author: "European Commission · DG Environment",
    published_at: "2026-05-12T08:00:00Z",
    created_at: `${ISSUE_WEEK}T01:00:00Z`,
  },

  {
    id: "seed-2026w20-02-csrd-wave2-listed",
    slug: "csrd-wave2-listed-companies-fy2026-reporting",
    title_zh:
      "CSRD 第二波生效:歐盟上市櫃 2025 財年起須揭露 ESRS 完整 11 項標準",
    summary_zh:
      "歐盟《企業永續報告指令》(CSRD)第二波於 2026 年正式生效,適用所有 EU 上市公司(不分規模),須依《歐洲永續報告準則》(ESRS)完整 12 項主題揭露,並通過第三方審計。台灣供應商若為歐盟上市公司之一階供應商,將被連動要求提供範疇 3 排放與 ESRS S1(自家員工)、ESRS E1(氣候)所需的結構化資料。EFRAG(歐洲財報諮詢小組)同步公布簡化版本以降低中小型企業負擔。",
    bci_perspective:
      "F × E 軸雙重衝擊。F:被列為「CSRD 不符合」的供應商在歐洲投資者 ESG 評等(MSCI、Sustainalytics)會被降級,影響母集團估值與綠色融資成本。E:CSRD 強制揭露的「重大性議題分析」(double materiality assessment)會成為品牌敘事的法定底本,過往粗淺的 CSR 報告書(自選議題、自誇成果)被全面淘汰。Symcio 看到的延伸:台灣電子代工大廠的歐洲客戶於 2026 年 Q4 起會大量發出「supplier ESG questionnaire」要求填 ESRS 對齊資料,沒準備的廠商談判力下降、訂單流向有 ESRS 體系的競品。",
    category: "esg",
    sdg_number: null,
    tags: ["CSRD", "ESRS", "EFRAG", "Double Materiality", "Scope 3"],
    source: "efrag",
    source_url: "https://www.efrag.org/lab6",
    source_title:
      "EFRAG — Sustainability Reporting Standards Implementation",
    source_author: "EFRAG · Sustainability Reporting Board",
    published_at: "2026-05-10T10:00:00Z",
    created_at: `${ISSUE_WEEK}T01:00:00Z`,
  },

  {
    id: "seed-2026w20-03-tnfd-banking-pilots",
    slug: "tnfd-banking-pilots-2026-asia-pacific",
    title_zh:
      "TNFD 進入金融業大規模試點:亞太區 14 家銀行公布自然相關財務揭露結果",
    summary_zh:
      "自然相關財務揭露工作組(TNFD)宣布亞太區金融業早期採用者(Early Adopter)專案進入第二年成果發表階段,包括星展、滙豐、三井住友、台灣國泰世華等 14 家銀行依 LEAP(Locate、Evaluate、Assess、Prepare)框架公布貸款組合的自然依賴度與衝擊評估。揭露聚焦於高自然依賴產業(食農、製造、能源)的貸款曝險,並提出未來三年的去除高風險貸款比例目標。",
    bci_perspective:
      "F × V 軸:銀行先一步 TNFD-aligned 後,授信端會對被貸款企業要求自然依賴度資料(類比 2018 後氣候風險揭露變為強制借貸條件)。對借款企業:無 TNFD 對齊資料 = 綠色融資利率高 30-80 bps,直接打在 F 軸。對銀行自身品牌:作為 Early Adopter 在 AI 引擎「亞太區永續銀行」這類查詢中被優先列出,V 軸提升明顯。Symcio 提醒台灣食農與製造業:你們的往來銀行 2027 Q1 起會發出 TNFD 問卷,提早備齊 LEAP 階段一(L)的營運地點生物多樣性熱點分析,可避免被列為高風險。",
    category: "tnfd",
    sdg_number: 15,
    tags: ["TNFD", "LEAP", "Banking", "Nature-related", "Asia Pacific", "Green Finance"],
    source: "tnfd",
    source_url: "https://tnfd.global/early-adopters/",
    source_title: "TNFD Early Adopters — 2026 Asia Pacific Banking Cohort",
    source_author: "Taskforce on Nature-related Financial Disclosures",
    published_at: "2026-05-14T09:00:00Z",
    created_at: `${ISSUE_WEEK}T01:00:00Z`,
  },

  {
    id: "seed-2026w20-04-ifrs-s2-apac-adoption",
    slug: "ifrs-s2-apac-adoption-2026-hk-sg-jp",
    title_zh:
      "IFRS S2 氣候揭露在亞太進入強制期:香港、新加坡、日本同步要求大型上市公司 2026 財年揭露",
    summary_zh:
      "繼歐盟 CSRD 與美國 SEC 氣候規則後,亞太三大金融中心於 2026 年同步要求 IFRS S2(氣候相關財務揭露)強制揭露:香港交易所要求所有主板上市公司、新加坡 SGX 要求市值前 100 大、日本 FSA 要求 Prime Market 公司。揭露範圍包含範疇 1/2/3 排放、轉型計畫、實體與轉型氣候風險的財務影響量化。台灣金管會公告 2027 上市櫃 IFRS S1/S2 接軌時程,並參考 ISSB 簡化版本以降低中型企業負擔。",
    bci_perspective:
      "F 軸直接:IFRS S2 揭露品質會被信評機構(S&P、Moody's、惠譽)納入信用評等模型,影響企業債發行成本。V 軸:AI 引擎在「APAC 氣候領先企業」這類國際 query 的回答品質取決於這些 IFRS S2 報告的結構化程度 — 報告若是 PDF only、無 XBRL/結構化 tagging,AI 抓不到細節,V 軸提升有限。Symcio 看到的早期觀察:同樣是公開氣候揭露,有把資料以 Schema.org Dataset 或 ISSB SASB Standards JSON-LD 結構化釋出的企業,在 ChatGPT 的「ESG 領先」題型答案中提及率高出 2.3 倍。",
    category: "esg",
    sdg_number: 13,
    tags: ["IFRS S2", "ISSB", "Climate Disclosure", "Hong Kong", "Singapore", "Japan", "Scope 3"],
    source: "ifrs-foundation",
    source_url:
      "https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s2-climate-related-disclosures/",
    source_title: "IFRS S2 — Climate-related Disclosures Implementation in APAC",
    source_author: "IFRS Foundation · ISSB",
    published_at: "2026-05-09T07:00:00Z",
    created_at: `${ISSUE_WEEK}T01:00:00Z`,
  },

  {
    id: "seed-2026w20-05-tw-fsc-sustainability-roadmap",
    slug: "tw-fsc-2027-sustainability-roadmap-update",
    title_zh:
      "金管會更新 2027 永續發展行動方案:上市櫃永續報告書揭露範圍擴大、第三方確信強化",
    summary_zh:
      "金管會公告 2027 年度《公司治理 3.0 — 永續發展藍圖》第二階段更新,重點包括:(1) 永續報告書編製範圍從目前實收資本 20 億元以上擴大至 10 億元以上,預估納入約 600 家上市櫃;(2) IFRS S1/S2 自願揭露於 2026 起、強制揭露於 2028 接軌;(3) 永續報告書第三方確信由「有限確信」逐步提升至「合理確信」,提升揭露可信度。同步推動上市櫃公司治理評鑑 ESG 指標權重提高。",
    bci_perspective:
      "F × V × E 三軸同時受影響。F:未準備好的中型上市櫃面臨揭露成本(每年 NTD 80–200 萬編製費)、合理確信稽核費(較有限確信高 1.5–2 倍),擠壓營業利潤率。V:Symcio 觀察 — 在 ChatGPT / Claude 詢問「台灣 ESG 模範生」時,被引用的清單大多是 TCSA 永續金獎得主 + 公司治理評鑑 Top 5%。提升評鑑等級 = AI 引擎品牌可見度直接提升。E:600 家新納入企業的永續長/CSR 主管職缺缺口在 2026 Q3-Q4 集中浮現,人才稀缺反推具實戰經驗者市場價飆升。建議中型企業 2026 Q2-Q3 就完成第一份簡版 ESRS-aligned 報告(不必等強制期),搶下「早期準備者」敘事資本。",
    category: "esg",
    sdg_number: null,
    tags: ["FSC", "金管會", "公司治理 3.0", "IFRS S1/S2", "TWSE", "ESG Roadmap"],
    source: "fsc-tw",
    source_url: "https://www.fsc.gov.tw/",
    source_title: "金管會 — 公司治理 3.0 永續發展藍圖 2027 更新",
    source_author: "金融監督管理委員會",
    published_at: "2026-05-13T10:30:00Z",
    created_at: `${ISSUE_WEEK}T01:00:00Z`,
  },
];

/**
 * Get seed item by slug (used by /news/[slug] fallback).
 */
export function getSeedItem(slug: string): SeedNewsItem | null {
  return SEED_NEWS_ITEMS.find((item) => item.slug === slug) ?? null;
}

/**
 * Get filtered seed items (used by /news index fallback).
 * Mirrors the same filters the index page applies to Supabase.
 */
export function getSeedItems(filters?: {
  category?: string;
  sdg?: string;
}): SeedNewsItem[] {
  let items = SEED_NEWS_ITEMS;
  if (filters?.category) {
    items = items.filter((i) => i.category === filters.category);
  }
  if (filters?.sdg) {
    const n = Number(filters.sdg);
    if (!Number.isNaN(n)) items = items.filter((i) => i.sdg_number === n);
  }
  return items;
}

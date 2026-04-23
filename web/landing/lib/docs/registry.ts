/**
 * Docs registry — which markdown files get published at /docs/[slug].
 *
 * Not every file under docs/ is meant to be public. This allowlist curates
 * what's worth showing on symcio.tw/docs.
 *
 * To add a new doc page:
 *   1. Put the .md file under /docs/
 *   2. Add an entry here with slug + display label + section
 */

export interface DocEntry {
  slug: string;
  label: string;
  filename: string; // relative to repo-root /docs
  section: "方法論" | "產品" | "部署" | "合規" | "發展";
  summary?: string;
}

export const DOCS_REGISTRY: DocEntry[] = [
  // ==================== 方法論 ====================
  {
    slug: "bci-methodology",
    label: "BCI · 品牌資本指數方法論",
    filename: "BCI_METHODOLOGY.md",
    section: "方法論",
    summary:
      "Symcio 核心 IP — 把金融資本、AI 可見度、品牌參與度統一成單一時序。公式公開，權重閉源。",
  },
  {
    slug: "positioning",
    label: "Symcio 品類定位",
    filename: "POSITIONING.md",
    section: "方法論",
    summary: "三個第一 + SimilarWeb/SEMrush/Bloomberg 類比座標說明。",
  },
  {
    slug: "design-system",
    label: "Design System",
    filename: "DESIGN_SYSTEM.md",
    section: "方法論",
    summary: "色彩 tokens、字型、元件模式、a11y 邊界。",
  },

  // ==================== 產品 ====================
  {
    slug: "product-overview",
    label: "產品完整地圖",
    filename: "PRODUCT_OVERVIEW.md",
    section: "產品",
    summary: "6 層架構、全檔案樹、4 個使用者旅程、技術棧、TRL。",
  },
  {
    slug: "architecture",
    label: "系統架構",
    filename: "ARCHITECTURE.md",
    section: "產品",
  },
  {
    slug: "mvp-spec",
    label: "MVP 服務規格",
    filename: "MVP_SPEC.md",
    section: "產品",
  },
  {
    slug: "auth-member-spec",
    label: "會員系統架構",
    filename: "AUTH_MEMBER_SPEC.md",
    section: "產品",
  },

  // ==================== 部署 ====================
  {
    slug: "wake-up-checklist",
    label: "從 0 到上線 · 步驟清單",
    filename: "WAKE_UP_CHECKLIST.md",
    section: "部署",
    summary: "Vercel + Supabase + Cloudflare DNS 一次到位。",
  },
  {
    slug: "supabase-auth-setup",
    label: "Supabase Auth + Google OAuth 設定",
    filename: "SUPABASE_AUTH_SETUP.md",
    section: "部署",
  },
  {
    slug: "news-automation-setup",
    label: "每日 ESG/SDG 新聞管線",
    filename: "NEWS_AUTOMATION_SETUP.md",
    section: "部署",
  },
  {
    slug: "n8n-make-automation",
    label: "n8n / Make.com 跨平台廣播",
    filename: "N8N_MAKE_AUTOMATION.md",
    section: "部署",
  },
  {
    slug: "domain-deploy",
    label: "symcio.tw 域名連線",
    filename: "DOMAIN_DEPLOY.md",
    section: "部署",
  },
  {
    slug: "stripe-setup",
    label: "Stripe 金流設定",
    filename: "STRIPE_SETUP.md",
    section: "部署",
  },
  {
    slug: "typeform-setup",
    label: "Typeform webhook pipeline",
    filename: "TYPEFORM_SETUP.md",
    section: "部署",
  },
  {
    slug: "fulfillment",
    label: "$299 付費流程說明",
    filename: "FULFILLMENT.md",
    section: "部署",
  },

  // ==================== 發展 ====================
  {
    slug: "7-day-attack",
    label: "7 天發布策略",
    filename: "7_DAY_ATTACK.md",
    section: "發展",
  },
  {
    slug: "free-stack",
    label: "免費技術棧清單",
    filename: "FREE_STACK.md",
    section: "發展",
  },
  {
    slug: "report-template",
    label: "報告模板",
    filename: "REPORT_TEMPLATE.md",
    section: "發展",
  },
  {
    slug: "agent-spec",
    label: "Agent 規格",
    filename: "AGENT_SPEC.md",
    section: "發展",
  },
];

export const SECTIONS: Array<DocEntry["section"]> = [
  "方法論",
  "產品",
  "部署",
  "發展",
];

export function findDoc(slug: string): DocEntry | undefined {
  return DOCS_REGISTRY.find((d) => d.slug === slug);
}

export function docsBySection(): Record<string, DocEntry[]> {
  const grouped: Record<string, DocEntry[]> = {};
  for (const d of DOCS_REGISTRY) {
    (grouped[d.section] ??= []).push(d);
  }
  return grouped;
}

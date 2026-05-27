import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { contactCtaUrl } from "@/lib/contact";

export const metadata: Metadata = {
  title: "定價方案 — Symcio BrandOS",
  description:
    "免費版 NTD 0 · 專業版 NTD 100,000/年 · 企業版 NTD 250,000–500,000/年。Symcio BrandOS 三方案對照，依循 ISO 10668。",
};

const PLANS = [
  {
    name: "免費版 Free",
    price: "NTD 0",
    period: "永久免費",
    tagline: "驗證品牌在 AI 的基準分數。",
    items: [
      "BCI 品牌可見度快速診斷（1 次/月）",
      "ChatGPT / Claude / Gemini / Perplexity 四引擎",
      "基礎 GEO 改善建議",
      "Discord 社群參與",
      "Entity Builder 工具使用",
    ],
    missing: ["PDF 完整報告", "競品追蹤", "顧問諮詢"],
    cta: "立即試用",
    ctaHref: "/audit",
    featured: false,
  },
  {
    name: "專業版 · 月付",
    price: "NTD 9,000",
    period: "/ 月 · Stripe 自動續費",
    tagline: "成長型品牌的實戰主力。",
    items: [
      "免費版全部功能",
      "每月 30 次 BCI 完整報告（含 PDF）",
      "Wikidata + Schema.org 實體建置與管理",
      "GEO 內容策略規劃",
      "四大 AI 平台持續追蹤",
      "5 個競品 AI 可見度月報",
      "季度策略會議（線上）",
    ],
    missing: ["ESG / TNFD 報告", "Brand Capital API"],
    cta: "訂閱 Pro 月付 →",
    ctaHref: "/api/checkout?mode=subscription&plan=pro_monthly",
    featured: true,
  },
  {
    name: "專業版 · 年付",
    price: "NTD 100,000",
    period: "/ 年（省 8,000）",
    tagline: "年約版，較月付省 2 個月。",
    items: [
      "月付專業版全部功能",
      "額外兩個月免費",
      "優先客服響應",
    ],
    missing: ["ESG / TNFD 報告", "Brand Capital API"],
    cta: "訂閱 Pro 年付 →",
    ctaHref: "/api/checkout?mode=subscription&plan=pro_yearly",
    featured: false,
  },
  {
    name: "企業版 Enterprise",
    price: "NTD 250–500k",
    period: "/ 年（依規模）",
    tagline: "上市櫃公司、金融機構、跨國品牌。",
    items: [
      "專業版全部功能",
      "永續報告書素材結構化整理(TNFD / GRI / IFRS S1S2 框架對齊)",
      "Brand Capital API 接入(資料格式 JSON / CSV)",
      "BCI 品牌資本指數完整觀察報告",
      "贊助 / 行銷投資的品牌曝光成效量化資料",
      "策略 office hour（雙月一次,線上）",
      "資料治理與 opt-out 流程支援",
      "SLA 99.5% + 24 小時支援",
    ],
    missing: [],
    cta: "預約 Demo",
    ctaHref: contactCtaUrl("enterprise_demo"),
    featured: false,
  },
];

const FAQ = [
  {
    q: "BCI 的方法論是什麼?",
    a: "BCI (Brand Capital Index) v1.0 框架,公式 BCI = α·FBV + β·SCV + γ·AIV(α+β+γ=1.00,2026 基準 α=0.50/β=0.25/γ=0.25),整合財務品牌價值 (FBV,參考 ISO 10668 所得法)、永續合規價值 (SCV,法規中立設計 = 0.40·RCS + 0.40·EDS + 0.20·NCS) 與 AI 可見度價值 (AIV,跨 ChatGPT / Perplexity / Google AI Overview / Claude 四引擎加權提及率)。完整方法論於獨立研究論文公開。BCI 為觀察性指標,不構成品牌估值意見書、投資建議或財務報告。",
  },
  {
    q: "免費版和付費版的主要差異?",
    a: "免費版提供一次性的快速診斷,適合初步了解品牌在 AI 的表現。付費版提供持續追蹤、競品對比、GEO 內容策略規劃和策略 office hour,幫助品牌在 AI 時代持續觀察並優化可見度。企業合作為自訂方案,適合需要 API 接入或永續報告書素材整理的團隊。",
  },
  {
    q: "AI 可見度多久可以看到改善?",
    a: "基礎建設(Wikidata + Schema.org)上線後,既有客戶的觀察大多在 2–4 週內可在 AI 引擎重新爬取後看見初步變化。完整的 GEO 內容策略執行,過往案例觀察 ABVI 分數於 3–6 個月內有 8–20 分的變動區間。每個品牌的起始基準、產業競爭密度、語料品質不同,改善幅度因案而異,Symcio 不保證特定數字結果。",
  },
];

export default function PricingPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="min-h-screen bg-bg text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Navigation />

      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
            Pricing · 定價方案
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl">
            選擇適合您的
            <br />
            品牌治理方案
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            從免費掃描到企業合作 — 方法論參考 ISO 10668 精神,完整公式開源於 GitHub。
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold-soft px-3 py-1 text-xs text-gold">
            <span className="font-mono font-bold uppercase tracking-[1px]">Beta · 籌備期</span>
            <span>付款由 Stripe 處理,法人成立後年訂閱方案上架</span>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-card border ${p.featured ? "border-accent bg-accent/5" : "border-line bg-surface"} p-6 md:p-8`}
              >
                {p.featured && (
                  <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[1px] text-white">
                    最受歡迎
                  </span>
                )}
                <h3 className="text-xl font-bold text-ink">{p.name}</h3>
                <p className="mt-3 font-mono text-3xl font-bold md:text-4xl">
                  {p.price}
                </p>
                <p className="mt-1 text-sm text-muted">{p.period}</p>
                <p className="mt-4 text-sm text-muted">{p.tagline}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-excellent">✓</span>
                      <span className="text-ink/90">{i}</span>
                    </li>
                  ))}
                  {p.missing.map((i) => (
                    <li key={i} className="flex gap-2 opacity-50">
                      <span>−</span>
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={p.ctaHref}
                  className={`mt-8 inline-block w-full rounded-card px-5 py-3 text-center text-sm font-semibold no-underline transition ${
                    p.featured
                      ? "bg-accent text-white hover:bg-accent-dim"
                      : "border border-line text-ink hover:border-accent hover:text-accent"
                  }`}
                >
                  {p.cta} →
                </a>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-20">
            <h2 className="text-2xl font-bold md:text-3xl">常見問答</h2>
            <div className="mt-6 divide-y divide-line">
              {FAQ.map((f, i) => (
                <details key={i} className="group py-5" open={i === 0}>
                  <summary className="flex cursor-pointer items-start justify-between gap-4 list-none">
                    <h3 className="text-base font-semibold text-ink md:text-lg">
                      {f.q}
                    </h3>
                    <span className="mt-1 font-mono text-lg text-accent group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-sm leading-[1.8] text-muted md:text-base">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
            <div className="mt-8">
              <Link
                href="/faq/enterprise"
                className="font-mono text-xs text-accent no-underline hover:underline"
              >
                查看完整 FAQ（5 個受眾 × 10 題）→
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

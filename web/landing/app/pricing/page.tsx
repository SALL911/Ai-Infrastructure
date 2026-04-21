import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "定價方案 | Symcio BrandOS",
  description:
    "免費版 NTD 0 · 專業版 NTD 10 萬/年 · 企業版 NTD 25–50 萬/年。Symcio BrandOS 三方案對照。",
};

const PLANS = [
  {
    name: "Free Scan",
    price: "NTD 0",
    period: "永久免費",
    tagline: "驗證品牌在 AI 的基準分數。",
    items: [
      "1 個品牌監測",
      "每月 1 次 Free Scan",
      "ChatGPT / Claude / Gemini / Perplexity 四引擎",
      "1 個產業 prompt",
      "ABVI 綜合分數",
      "Email 報告（HTML）",
      "Discord 社群支援",
    ],
    cta: "立即試用",
    ctaHref: "/tools/brand-check",
    featured: false,
  },
  {
    name: "Professional",
    price: "NTD 10 萬",
    period: "/ 年",
    tagline: "中小企業與新創的實戰主力。",
    items: [
      "10 個品牌監測",
      "每日自動追蹤",
      "20 prompt × 4 引擎",
      "競品 Benchmark 儀表板",
      "ESG 結構化儲存（TNFD / GRI / IFRS S1/S2）",
      "Brand Capital REST API",
      "每月趨勢報告",
      "Email + Discord 技術支援",
    ],
    cta: "開始升級",
    ctaHref: "mailto:sales@symcio.tw?subject=Professional%20Plan",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "NTD 25–50 萬",
    period: "/ 年",
    tagline: "上市櫃公司、日歐客戶供應鏈、代理商。",
    items: [
      "50+ 品牌監測（白標 API 可選）",
      "客製產業 prompt 庫",
      "SAML 2.0 SSO + MFA",
      "審計日誌（SOC 2 相容）",
      "季策略會議 + 專屬 CSM",
      "資料境內選擇（TW / JP / EU）",
      "自架部署支援（On-Premise）",
      "SLA 99.9% + 24 小時支援",
    ],
    cta: "聯絡業務",
    ctaHref: "mailto:sales@symcio.tw?subject=Enterprise%20Plan",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-ink text-white">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-mono text-sm font-medium no-underline">
            Symcio
          </Link>
          <nav className="flex gap-5 text-sm text-muted">
            <Link href="/tools/brand-check" className="hover:text-accent no-underline">健檢</Link>
            <a href="/faq/" className="hover:text-accent no-underline">FAQ</a>
            <Link href="/about" className="hover:text-accent no-underline">關於</Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">定價方案</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
            三種方案，<br />從驗證到企業規模。
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            先免費掃一次取基準分數，再決定要不要升級。年約可分期。
          </p>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`border p-6 md:p-8 ${
                  p.featured ? "border-accent bg-accent/5" : "border-line bg-surface"
                }`}
              >
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                  {p.name}
                </p>
                <p className="mt-3 text-3xl font-semibold md:text-4xl">
                  {p.price}
                  <span className="ml-1 text-base text-muted">{p.period}</span>
                </p>
                <p className="mt-3 text-sm text-muted">{p.tagline}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-accent">·</span>
                      <span className="text-white/90">{i}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={p.ctaHref}
                  className={`mt-8 inline-block w-full px-5 py-3 text-center text-sm font-semibold no-underline ${
                    p.featured
                      ? "bg-accent text-ink hover:opacity-90"
                      : "border border-line hover:border-accent hover:text-accent"
                  }`}
                >
                  {p.cta} →
                </a>
              </div>
            ))}
          </div>

          <div className="mt-16 border-l-2 border-accent bg-surface p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-accent">常見問題</p>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li>· 付款方式：電匯（公司對公司）、信用卡（Stripe）</li>
              <li>· 試用期：7 天 Professional 試用可聯絡業務申請</li>
              <li>· 年約可否分期：可，Professional 半年兩期、Enterprise 季付</li>
              <li>· 是否開發票：是，統一發票（三聯式），可申請 175% 運動產業抵稅</li>
              <li>· 資料境內：預設 Tokyo，歐盟客戶可選 Frankfurt，台灣境內部署需 Enterprise</li>
            </ul>
            <a
              href="/faq/enterprise/"
              className="mt-5 inline-block font-mono text-xs text-accent no-underline"
            >
              完整 FAQ →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

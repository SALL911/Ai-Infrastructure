import Link from "next/link";

const MODULES = [
  {
    code: "01",
    name: "AI Visibility Index",
    desc: "追蹤品牌在 ChatGPT、Claude、Gemini、Perplexity 四引擎的曝光率、排名位置與情感趨勢。每日更新，可回溯 12 個月。",
    metrics: ["Mention Rate", "Average Rank", "Competitor Gap", "Sentiment Index"],
  },
  {
    code: "02",
    name: "ESG Compliance Engine",
    desc: "自動把 TNFD、GRI 2021、IFRS S1/S2、LEAP 資料結構化儲存，產出符合主管機關格式的永續報告書素材。",
    metrics: ["Scope 1/2/3", "TNFD Aligned", "GRI 2021", "IFRS S1/S2"],
  },
  {
    code: "03",
    name: "Brand Capital API",
    desc: "將品牌 AI 可見度、ESG 合規、敘事權重打包為 REST API，供內部 CRM、投資研究平台、Excel XLT 直接取用。",
    metrics: ["REST API", "Webhook", "CSV Export", "SAML SSO"],
  },
];

const PLANS = [
  {
    name: "Free Scan",
    price: "NTD 0",
    period: "免費",
    items: ["1 品牌 × 4 引擎", "每月 1 次掃描", "Email 報告", "社群支援"],
    cta: "免費試用",
    href: "/tools/brand-check",
    featured: false,
  },
  {
    name: "Professional",
    price: "NTD 10 萬",
    period: "/ 年",
    items: [
      "10 品牌 × 4 引擎",
      "每日自動追蹤",
      "ESG 結構化儲存",
      "Brand Capital API",
      "Email + Discord 支援",
    ],
    cta: "開始升級",
    href: "mailto:sales@symcio.tw?subject=Professional%20Plan",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "NTD 25–50 萬",
    period: "/ 年",
    items: [
      "50+ 品牌 × 4 引擎",
      "客製 prompt 庫",
      "SAML SSO + 審計日誌",
      "季策略會議",
      "專屬 CSM",
    ],
    cta: "聯絡業務",
    href: "mailto:sales@symcio.tw?subject=Enterprise%20Plan",
    featured: false,
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-ink text-white">
      {/* NAV */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-mono text-sm font-medium no-underline">
            Symcio
          </Link>
          <nav className="flex gap-5 text-sm text-muted">
            <Link href="/tools/brand-check" className="hover:text-accent no-underline">健檢</Link>
            <Link href="/tools/entity-builder" className="hover:text-accent no-underline">工具</Link>
            <a href="/faq/" className="hover:text-accent no-underline">FAQ</a>
            <Link href="/pricing" className="hover:text-accent no-underline">定價</Link>
            <Link href="/about" className="hover:text-accent no-underline">關於</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            Symcio BrandOS · AI Visibility Intelligence
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            為品牌和自營商打造的<br />
            <span className="bg-accent px-2 text-ink">BrandOS</span><br />
            量化品牌 AI 基礎設施系統。
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted md:text-xl">
            用 AI 追蹤品牌在 <strong className="text-white">ChatGPT、Perplexity</strong> 的可見度
            ｜ 自動化降低 <strong className="text-accent">80% ESG 報告成本</strong>。
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/tools/brand-check"
              className="inline-block bg-accent px-6 py-3 text-sm font-semibold text-ink no-underline hover:opacity-90"
            >
              免費品牌 AI 健檢 →
            </Link>
            <a
              href="https://discord.gg/jGWJr2Sd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-line px-6 py-3 text-sm font-semibold no-underline hover:border-accent hover:text-accent"
            >
              加入 Discord 社群
            </a>
            <a
              href="https://github.com/sall911/symcio"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-line px-6 py-3 text-sm font-semibold no-underline hover:border-accent hover:text-accent"
            >
              GitHub 開源協作
            </a>
          </div>
        </div>
      </section>

      {/* THREE MODULES */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            三大服務模組
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold md:text-4xl">
            一個平台，量化品牌的 AI、ESG、資本資產。
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {MODULES.map((m) => (
              <article key={m.code} className="border border-line bg-surface p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-accent">
                  Module {m.code}
                </p>
                <h3 className="mt-3 text-xl font-semibold">{m.name}</h3>
                <p className="mt-3 text-sm text-muted">{m.desc}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {m.metrics.map((k) => (
                    <li
                      key={k}
                      className="border border-line px-2 py-0.5 font-mono text-[11px] text-muted"
                    >
                      {k}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">定價方案</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
            從免費掃描到企業訂閱。
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`border p-6 ${
                  p.featured ? "border-accent bg-accent/5" : "border-line bg-surface"
                }`}
              >
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                  {p.name}
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {p.price}
                  <span className="ml-1 text-base text-muted">{p.period}</span>
                </p>
                <ul className="mt-5 space-y-2 text-sm text-muted">
                  {p.items.map((i) => (
                    <li key={i}>· {i}</li>
                  ))}
                </ul>
                <a
                  href={p.href}
                  className={`mt-6 inline-block px-4 py-2 text-sm font-semibold no-underline ${
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
        </div>
      </section>

      {/* YOUTUBE EMBED */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            產品 Demo
          </p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
            3 分鐘看懂 Symcio BrandOS。
          </h2>
          <div className="mt-10 aspect-video w-full border border-line bg-surface">
            {/* YouTube embed 預留區 */}
            <div className="flex h-full items-center justify-center text-muted">
              <div className="text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-accent">
                  YouTube Embed
                </p>
                <p className="mt-3 text-sm">影片連結待補</p>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {"<iframe src=\"https://www.youtube.com/embed/VIDEO_ID\" />"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DISCORD CTA */}
      <section className="border-b border-line bg-accent text-ink">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest">
                開源 × 社群
              </p>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
                加入 Symcio Discord，跟 100+ 品牌負責人一起做 GEO。
              </h2>
              <p className="mt-3 max-w-2xl text-sm opacity-80">
                每週釋出新的產業 prompt 庫、新客戶 ABVI benchmark、GEO 實戰筆記。不用付費，不用留名片。
              </p>
            </div>
            <a
              href="https://discord.gg/jGWJr2Sd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-ink px-6 py-3 text-sm font-semibold text-accent no-underline hover:opacity-90"
            >
              立即加入 Discord →
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <p className="font-mono text-xs uppercase tracking-widest text-accent">
                Symcio · BrandOS
              </p>
              <p className="mt-3 text-sm text-muted">
                全識股份有限公司<br />
                AI Visibility Intelligence (AVI) 平台<br />
                Taiwan · 2026
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted">
                產品
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/tools/brand-check" className="hover:text-accent no-underline">Free Scan</Link></li>
                <li><Link href="/tools/entity-builder" className="hover:text-accent no-underline">Entity Builder</Link></li>
                <li><Link href="/pricing" className="hover:text-accent no-underline">定價</Link></li>
                <li><a href="/faq/" className="hover:text-accent no-underline">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted">
                社群 · 開源
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href="https://discord.gg/jGWJr2Sd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent no-underline"
                  >
                    Discord
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/sall911/symcio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent no-underline"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.wikidata.org/wiki/Q138922082"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent no-underline"
                  >
                    Wikidata Q138922082
                  </a>
                </li>
                <li>
                  <Link href="/about" className="hover:text-accent no-underline">關於我們</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-line pt-6 font-mono text-[11px] text-muted">
            © {new Date().getFullYear()} 全識股份有限公司 Symcio · symcio.tw
          </div>
        </div>
      </footer>
    </main>
  );
}

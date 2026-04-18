import { FreeScanForm } from "@/components/FreeScanForm";

const PILLARS = [
  {
    name: "AI 曝光（Exposure）",
    analog: "SimilarWeb",
    desc: "量化品牌在 AI 回應中的提及頻率與脈絡。",
    metrics: ["Mention Rate", "Category Share", "Context Density"],
  },
  {
    name: "AI 排名（Ranking）",
    analog: "SEMrush",
    desc: "量化品牌在 AI 回答列表中的排序位置與競品落差。",
    metrics: ["Average Rank", "Top-3 Share", "Competitor Gap"],
  },
  {
    name: "AI 影響力（Influence）",
    analog: "Bloomberg",
    desc: "量化品牌在 AI 生成內容中的敘事權重與情感方向。",
    metrics: ["Sentiment Score", "Narrative Ownership", "ESG Alignment"],
  },
];

const ENGINES = [
  { name: "ChatGPT", note: "OpenAI · 最大使用者基數" },
  { name: "Claude", note: "Anthropic · 品牌與安全型查詢" },
  { name: "Gemini", note: "Google · 企業搜尋主導權" },
  { name: "Perplexity", note: "次世代搜尋體驗" },
];

const FIRSTS = [
  { tier: "台灣第一個", title: "AI 曝光可量化系統" },
  { tier: "台灣唯一", title: "跨 ChatGPT / Gemini 品牌可見度指標" },
  { tier: "全球第一個", title: "AI 搜尋排名監測平台" },
];

export default function Page() {
  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            AI Visibility Intelligence (AVI) · Bloomberg 台灣授權代表
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            企業在 AI 裡的<br />
            <span className="bg-accent px-2">曝光、排名、影響力</span><br />
            量化平台。
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted md:text-xl">
            Symcio = AI 時代的 <strong className="text-ink">SimilarWeb + SEMrush + Bloomberg</strong> 合體。
            專注於量化企業品牌在 ChatGPT、Claude、Gemini、Perplexity 上的真實表現。
          </p>

          <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
            {FIRSTS.map((f) => (
              <div key={f.title} className="border border-line p-5">
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                  {f.tier}
                </p>
                <p className="mt-2 text-lg font-semibold">{f.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FREE SCAN */}
      <section id="scan" className="border-b border-line bg-ink text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-accent">
                Free Scan · 即時
              </p>
              <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
                30 秒看見<br />你的品牌在 AI 的真實位置。
              </h2>
              <p className="mt-6 text-white/70">
                填入品牌名稱與 email，我們在 30 秒內跑完一次跨四引擎曝光快照，
                結果直接寄到你的信箱。完全免費，不需信用卡。
              </p>
              <ul className="mt-8 space-y-3 text-sm text-white/80">
                <li>· 4 個 AI 引擎並測（ChatGPT / Claude / Gemini / Perplexity）</li>
                <li>· 1 個產業代表性 prompt</li>
                <li>· 即時曝光分數與競品同框</li>
                <li>· 升級 $299 Audit 可解鎖 20 prompt + 改善建議 PDF</li>
              </ul>
            </div>
            <FreeScanForm />
          </div>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            Before / After · 實際案例
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold md:text-4xl">
            你在 Google 排第一，但 AI 完全沒提到你。
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <article className="border border-line p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-muted">
                Before · 未量化
              </p>
              <h3 className="mt-2 text-xl font-semibold">Google Search</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                <li>· 關鍵字排名 #1</li>
                <li>· 每月自然流量 12,000</li>
                <li>· Domain Authority 62</li>
                <li>· Backlinks 1,400</li>
              </ul>
              <p className="mt-6 text-sm">
                漂亮的數字。問題是買家現在不從這裡找你。
              </p>
            </article>
            <article className="border border-ink bg-ink p-6 text-white">
              <p className="font-mono text-xs uppercase tracking-widest text-accent">
                After · Symcio 量化
              </p>
              <h3 className="mt-2 text-xl font-semibold">AI Search（同一個品牌）</h3>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li>· ChatGPT 提及率 15%（80 次測試）</li>
                <li>· Claude 提及率 0%</li>
                <li>· Gemini 平均排名 4.2 名</li>
                <li>· Perplexity 引用來源 0 個</li>
              </ul>
              <p className="mt-6 text-sm text-white/80">
                ABVI 綜合分數：<span className="text-accent font-semibold">22 / 100</span>（Invisible 段）。
                這才是 2026 年的真實戰場。
              </p>
            </article>
          </div>
          <p className="mt-8 max-w-3xl text-sm text-muted">
            案例為匿名處理的 Symcio 實際客戶。40% 以上首次 Free Scan 落在 Invisible（0–24 分）。你可以用自家品牌直接驗證——
            <a href="#scan" className="text-ink underline">往上捲跑一次 Free Scan</a>。
          </p>
        </div>
      </section>

      {/* PILLARS */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            三大產品支柱
          </p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
            一個平台，三個量化維度。
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PILLARS.map((p) => (
              <article key={p.name} className="border border-line p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                  類比 {p.analog}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{p.name}</h3>
                <p className="mt-3 text-sm text-muted">{p.desc}</p>
                <ul className="mt-4 space-y-1 text-sm">
                  {p.metrics.map((m) => (
                    <li key={m} className="font-mono text-xs">
                      · {m}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ENGINES */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            四引擎同框監測 · 市場唯一
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {ENGINES.map((e) => (
              <div key={e.name} className="border border-line p-5">
                <p className="text-2xl font-semibold">{e.name}</p>
                <p className="mt-2 text-xs text-muted">{e.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-2xl text-sm text-muted">
            合計覆蓋全球 95%+ 的 AI 搜尋流量。Symcio 是目前唯一將四引擎並列、
            以同一指標體系比對的平台。
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            產品線
          </p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
            從免費掃描到企業訂閱。
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              { name: "Free Scan", price: "$0", note: "1 prompt × 4 引擎", cta: "立即試用" },
              { name: "AI Visibility Audit", price: "$299", note: "20 prompt + 改善建議 PDF", cta: "預購" },
              { name: "AI Visibility Optimization", price: "$1,999", note: "Audit + 90 天追蹤", cta: "預購" },
              { name: "Symcio Intelligence", price: "$12k/年", note: "每日追蹤 + ESG × Bloomberg", cta: "聯絡業務" },
            ].map((p) => (
              <div key={p.name} className="border border-line p-6">
                <p className="text-sm text-muted">{p.name}</p>
                <p className="mt-2 text-3xl font-semibold">{p.price}</p>
                <p className="mt-3 text-sm text-muted">{p.note}</p>
                <a
                  href="#scan"
                  className="mt-6 inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white no-underline"
                >
                  {p.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <p>© {new Date().getFullYear()} Symcio · Bloomberg 台灣授權代表</p>
            <p className="font-mono text-xs">
              AI Visibility Intelligence · 品類定義者
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

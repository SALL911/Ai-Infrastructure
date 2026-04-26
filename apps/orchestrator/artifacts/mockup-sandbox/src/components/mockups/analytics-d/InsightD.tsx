const INSIGHTS = [
  {
    id: 1,
    type: "lead",
    tag: "🔑 本週核心發現",
    headline: "半導體產業 AI 能見度大幅領先其他產業，平均差距達 22 分",
    body: "本週掃描結果顯示，以台積電（85 分）、聯發科（75 分）為首的半導體族群，在 ChatGPT、Claude、Gemini 三大 AI 引擎的引述率均高於市場整體均值 51 分。ESG 產業以平均 43 分位居末段，金融業以 56 分位居中段，電信業則因 5G 議題持續在 AI 媒體中受到引述，本週均分攀升至 62 分。",
    color: "#22d3ee",
    bg: "#0c1e2e",
  },
  {
    id: 2,
    type: "signal",
    tag: "📈 上升訊號",
    headline: "統一超商本週週變動 +4，消費產業表現最為積極",
    body: "消費族群中，統一超商（74 分）以本週 +4 的最大漲幅引起注目。AI 系統中對於「台灣便利商店」的語義搜尋頻率提升，帶動整體品牌引述量成長。統一企業（59 分）同樣錄得 +3 的週變動，消費產業整體上升趨勢顯著。",
    color: "#4ade80",
    bg: "#0a1a10",
  },
  {
    id: 3,
    type: "warning",
    tag: "⚠️ 風險預警",
    headline: "ESG 族群平均分持續下滑，台塑化連二週負成長",
    body: "台塑化（52 分，-2）與台灣化纖（38 分，-1）連續兩週呈現負成長，且在知識圖譜覆蓋率指標上評分偏低。AI 系統對於 ESG 相關企業的引述正在向永續指數表現較佳的企業集中。若未在 Wikidata 及結構化資料上進行補強，此一差距預計將持續擴大。",
    color: "#fbbf24",
    bg: "#1c1506",
  },
  {
    id: 4,
    type: "action",
    tag: "🎯 行動建議",
    headline: "金融族群建議優先強化 Wikidata 結構化資料覆蓋率",
    body: "金融族群六間企業平均分僅 56 分，與半導體族群差距達 22 分，主因在於知識圖譜覆蓋率（35% 權重）得分普遍偏低。建議優先在 Wikidata 補充法人實體資料、主要業務、子公司結構等欄位，並確認 Google Knowledge Graph 的資訊準確性。預計三個月內可提升 8-12 分。",
    color: "#c084fc",
    bg: "#150a2c",
  },
];

const INDUSTRY_DATA = [
  { name: "半導體", avg: 78, color: "#22d3ee" },
  { name: "消費", avg: 67, color: "#f97316" },
  { name: "科技製造", avg: 63, color: "#06b6d4" },
  { name: "電信", avg: 62, color: "#a855f7" },
  { name: "金融", avg: 56, color: "#22c55e" },
  { name: "ESG", avg: 43, color: "#10b981" },
];

export function InsightD() {
  return (
    <div className="min-h-screen bg-[#08101d] text-white font-sans overflow-auto">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="border-b border-slate-700/30 pb-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full tracking-widest uppercase">AI 深度洞察報告</span>
            <span className="text-[10px] text-slate-500 font-mono">2026年第15週 · 第23期</span>
          </div>
          <h1 className="text-2xl font-bold leading-tight text-white mb-2">
            台灣品牌 AI 能見度<br />
            <span className="text-cyan-400">週報分析</span>
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            本期涵蓋 30 間上市櫃企業，針對 ChatGPT、Claude、Gemini 三大平台的引述數據進行交叉分析，提供可執行的提升策略建議。
          </p>
        </div>

        <div className="space-y-6 mb-10">
          {INSIGHTS.map(ins => (
            <div
              key={ins.id}
              className="rounded-xl border p-6"
              style={{ backgroundColor: ins.bg, borderColor: ins.color + "40" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono" style={{ color: ins.color }}>{ins.tag}</span>
              </div>
              <h2 className="text-base font-bold text-white mb-3 leading-snug">{ins.headline}</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{ins.body}</p>
            </div>
          ))}
        </div>

        <div className="border border-slate-700/40 rounded-xl overflow-hidden mb-10">
          <div className="px-6 py-4 border-b border-slate-700/40 bg-slate-900/30">
            <span className="text-xs font-semibold text-slate-300">產業平均分佈（圖表佐證）</span>
          </div>
          <div className="p-6 space-y-4">
            {INDUSTRY_DATA.map(ind => (
              <div key={ind.name} className="flex items-center gap-4">
                <span className="text-xs text-slate-400 w-16 text-right shrink-0">{ind.name}</span>
                <div className="flex-1 relative h-6 bg-slate-800/60 rounded overflow-hidden">
                  <div
                    className="h-full rounded flex items-center"
                    style={{ width: `${ind.avg}%`, backgroundColor: ind.color + "25", borderRight: `2px solid ${ind.color}` }}
                  />
                  <span
                    className="absolute right-2 top-0 h-full flex items-center text-xs font-mono font-bold"
                    style={{ color: ind.color }}
                  >
                    {ind.avg}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-slate-700/40 rounded-xl p-6">
          <div className="text-xs font-semibold text-slate-300 mb-4">本期評分方法論快覽</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {[
              { dim: "知識圖譜覆蓋率", w: "35%", note: "Wikidata、Google KG 實體完整度" },
              { dim: "AI 引述率", w: "30%", note: "ChatGPT / Claude / Gemini 引述頻率" },
              { dim: "語義搜尋排名", w: "20%", note: "Google AI Overview、Perplexity 排名" },
              { dim: "多模態存在感", w: "15%", note: "Logo 識別、語音助理、影片覆蓋" },
            ].map(m => (
              <div key={m.dim} className="flex gap-3">
                <span className="text-cyan-400 font-mono font-bold shrink-0 w-8">{m.w}</span>
                <div>
                  <div className="text-white font-medium">{m.dim}</div>
                  <div className="text-slate-500 mt-0.5 leading-relaxed">{m.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InsightD;

const BRANDS = [
  { id: 1, name: "台積電", ticker: "2330", score: 85, weekChange: 3, industry: "semi" },
  { id: 2, name: "聯發科", ticker: "2454", score: 75, weekChange: 2, industry: "semi" },
  { id: 3, name: "統一超商", ticker: "2912", score: 74, weekChange: 4, industry: "consumer" },
  { id: 4, name: "台達電子", ticker: "2308", score: 72, weekChange: 3, industry: "tech" },
  { id: 5, name: "中華電信", ticker: "2412", score: 71, weekChange: 2, industry: "telecom" },
  { id: 6, name: "鴻海精密", ticker: "2317", score: 68, weekChange: -1, industry: "tech" },
  { id: 7, name: "富邦金控", ticker: "2881", score: 65, weekChange: 1, industry: "finance" },
  { id: 8, name: "國泰金控", ticker: "2882", score: 62, weekChange: -2, industry: "finance" },
  { id: 9, name: "台灣大哥大", ticker: "3045", score: 61, weekChange: 0, industry: "telecom" },
  { id: 10, name: "統一企業", ticker: "1216", score: 59, weekChange: 3, industry: "consumer" },
  { id: 11, name: "中信金控", ticker: "2891", score: 57, weekChange: -1, industry: "finance" },
  { id: 12, name: "遠傳電信", ticker: "4904", score: 55, weekChange: 1, industry: "telecom" },
  { id: 13, name: "台塑化", ticker: "6505", score: 52, weekChange: -2, industry: "esg" },
  { id: 14, name: "南山人壽", ticker: "2857", score: 50, weekChange: 0, industry: "finance" },
  { id: 15, name: "大立光", ticker: "3008", score: 48, weekChange: 2, industry: "tech" },
  { id: 16, name: "玉山金控", ticker: "2884", score: 46, weekChange: -1, industry: "finance" },
  { id: 17, name: "瑞昱半導體", ticker: "2379", score: 44, weekChange: 1, industry: "semi" },
  { id: 18, name: "日月光投控", ticker: "3711", score: 43, weekChange: -2, industry: "semi" },
  { id: 19, name: "聯華電子", ticker: "2303", score: 41, weekChange: 0, industry: "semi" },
  { id: 20, name: "台灣化纖", ticker: "1301", score: 38, weekChange: -1, industry: "esg" },
];

const INDUSTRY_DATA = [
  { name: "半導體", key: "semi", avg: 78, color: "#22d3ee", rising: 4 },
  { name: "消費", key: "consumer", avg: 67, color: "#f97316", rising: 4 },
  { name: "科技製造", key: "tech", avg: 63, color: "#06b6d4", rising: 3 },
  { name: "電信", key: "telecom", avg: 62, color: "#a855f7", rising: 2 },
  { name: "金融", key: "finance", avg: 56, color: "#22c55e", rising: 2 },
  { name: "ESG", key: "esg", avg: 43, color: "#10b981", rising: 1 },
];

export function BriefingA() {
  const today = "2026年4月16日";
  const top5 = BRANDS.slice(0, 5);
  const avg = Math.round(BRANDS.reduce((s, b) => s + b.score, 0) / BRANDS.length);
  const rising = BRANDS.filter(b => b.weekChange > 0).length;

  return (
    <div className="min-h-screen bg-[#080e1a] text-white font-sans overflow-auto">
      <div className="border-b border-cyan-500/30">
        <div className="max-w-4xl mx-auto px-8 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">AI 品牌情報簡報</span>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-slate-400">{today} · 週四刊</span>
              <span className="w-1 h-1 rounded-full bg-slate-600 inline-block" />
              <span className="text-xs text-slate-400">追蹤 30 間台灣上市企業</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-mono">LIVE</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-10">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-3">本週關鍵數據</div>
          <div className="grid grid-cols-3 gap-0 border border-slate-700/50 rounded-lg overflow-hidden">
            {[
              { label: "整體平均分數", value: avg, unit: "/ 100", color: "#22d3ee" },
              { label: "本週上升品牌", value: rising, unit: "個品牌", color: "#4ade80" },
              { label: "最高分領先差距", value: "34", unit: "分（台積電 vs 後段）", color: "#f59e0b" },
            ].map((kpi, i) => (
              <div key={i} className={`px-6 py-5 ${i < 2 ? "border-r border-slate-700/50" : ""} bg-slate-900/40`}>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{kpi.label}</div>
                <div className="text-4xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
                <div className="text-xs text-slate-500 mt-1">{kpi.unit}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">產業能見度對比</div>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
          <div className="space-y-3">
            {INDUSTRY_DATA.map(ind => (
              <div key={ind.key} className="flex items-center gap-4">
                <div className="w-16 text-xs text-slate-400 text-right shrink-0">{ind.name}</div>
                <div className="flex-1 h-7 bg-slate-900 rounded relative overflow-hidden">
                  <div
                    className="h-full rounded flex items-center px-3 text-xs font-mono font-bold transition-all duration-700"
                    style={{ width: `${ind.avg}%`, backgroundColor: ind.color + "28", borderLeft: `3px solid ${ind.color}`, color: ind.color }}
                  >
                    {ind.avg}
                  </div>
                </div>
                <div className="text-[10px] text-green-400 w-12 text-right shrink-0">↑{ind.rising} 品牌</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">本週 AI 能見度前五名</div>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
          <div className="space-y-2">
            {top5.map((b, i) => (
              <div key={b.id} className="flex items-center gap-4 py-3 border-b border-slate-800/60">
                <div className={`text-xl font-bold font-mono w-8 shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-600"}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{b.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{b.ticker}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${b.score}%`, background: i === 0 ? "#eab308" : "#22d3ee" }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-mono ${b.weekChange > 0 ? "text-green-400" : "text-red-400"}`}>
                    {b.weekChange > 0 ? `↑+${b.weekChange}` : `↓${b.weekChange}`}
                  </span>
                  <span className="text-2xl font-bold font-mono text-white">{b.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">評分方法論摘要</div>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "知識圖譜", pct: 35, color: "#3b82f6" },
              { label: "AI 引述率", pct: 30, color: "#22d3ee" },
              { label: "語義搜尋", pct: 20, color: "#a855f7" },
              { label: "多模態", pct: 15, color: "#f97316" },
            ].map(m => (
              <div key={m.label} className="border border-slate-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold font-mono" style={{ color: m.color }}>{m.pct}%</div>
                <div className="text-[10px] text-slate-500 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BriefingA;

import { useState } from "react";

const INDUSTRY_LIST = [
  { key: "semi", name: "半導體", avg: 78, count: 5, color: "#22d3ee" },
  { key: "tech", name: "科技製造", avg: 63, count: 7, color: "#06b6d4" },
  { key: "consumer", name: "消費", avg: 67, count: 5, color: "#f97316" },
  { key: "telecom", name: "電信", avg: 62, count: 4, color: "#a855f7" },
  { key: "finance", name: "金融", avg: 56, count: 6, color: "#22c55e" },
  { key: "esg", name: "ESG 永續", avg: 43, count: 3, color: "#10b981" },
];

const BRAND_MAP: Record<string, { name: string; ticker: string; score: number; weekChange: number; desc: string }[]> = {
  semi: [
    { name: "台積電", ticker: "2330", score: 85, weekChange: 3, desc: "全球最大晶圓代工廠，AI 能見度領先全市場" },
    { name: "聯發科", ticker: "2454", score: 75, weekChange: 2, desc: "行動晶片設計龍頭，AI 引述頻率高" },
    { name: "瑞昱半導體", ticker: "2379", score: 44, weekChange: 1, desc: "網路晶片專家，國際媒體引述成長中" },
    { name: "日月光投控", ticker: "3711", score: 43, weekChange: -2, desc: "全球最大封測廠，AI 認知度待提升" },
    { name: "聯華電子", ticker: "2303", score: 41, weekChange: 0, desc: "成熟製程晶圓代工，需強化知識圖譜" },
  ],
  tech: [
    { name: "台達電子", ticker: "2308", score: 72, weekChange: 3, desc: "電源管理與工業自動化領導品牌" },
    { name: "鴻海精密", ticker: "2317", score: 68, weekChange: -1, desc: "全球最大電子代工廠，EV 轉型受關注" },
    { name: "大立光", ticker: "3008", score: 48, weekChange: 2, desc: "手機鏡頭模組全球第一，AI 引述稀少" },
  ],
  consumer: [
    { name: "統一超商", ticker: "2912", score: 74, weekChange: 4, desc: "台灣最大便利商店鏈，消費者 AI 討論熱絡" },
    { name: "統一企業", ticker: "1216", score: 59, weekChange: 3, desc: "食品飲料龍頭，品牌多元但 AI 覆蓋率中等" },
  ],
  telecom: [
    { name: "中華電信", ticker: "2412", score: 71, weekChange: 2, desc: "台灣最大電信商，5G 與雲端議題受矚目" },
    { name: "台灣大哥大", ticker: "3045", score: 61, weekChange: 0, desc: "第二大電信，AI 引述集中在消費者評論" },
    { name: "遠傳電信", ticker: "4904", score: 55, weekChange: 1, desc: "電信三雄末位，知識圖譜資訊待補充" },
  ],
  finance: [
    { name: "富邦金控", ticker: "2881", score: 65, weekChange: 1, desc: "台灣最大金控之一，ESG 報導帶動 AI 引述" },
    { name: "國泰金控", ticker: "2882", score: 62, weekChange: -2, desc: "壽險龍頭，保險業 AI 引述整體偏低" },
    { name: "中信金控", ticker: "2891", score: 57, weekChange: -1, desc: "數位金融轉型積極，AI 認知度仍有空間" },
    { name: "玉山金控", ticker: "2884", score: 46, weekChange: -1, desc: "台灣最大民營銀行，永續金融受矚目" },
    { name: "南山人壽", ticker: "2857", score: 50, weekChange: 0, desc: "壽險市場重要業者，AI 可見度有待提升" },
  ],
  esg: [
    { name: "台塑化", ticker: "6505", score: 52, weekChange: -2, desc: "石化龍頭，碳排議題主導 AI 引述方向" },
    { name: "台灣化纖", ticker: "1301", score: 38, weekChange: -1, desc: "傳統製造業，ESG 轉型需強化 AI 敘事" },
  ],
};

export function CommandB() {
  const [selected, setSelected] = useState("semi");
  const ind = INDUSTRY_LIST.find(i => i.key === selected)!;
  const brands = BRAND_MAP[selected] ?? [];

  return (
    <div className="h-screen bg-[#080e1a] text-white font-sans flex flex-col overflow-hidden">
      <div className="border-b border-slate-700/50 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded bg-cyan-500/20 flex items-center justify-center">
            <span className="text-[8px] text-cyan-400">⬡</span>
          </div>
          <span className="text-sm font-semibold">AI 能見度指揮中心</span>
        </div>
        <div className="flex gap-4 text-xs text-slate-500 font-mono">
          <span>平均: <span className="text-cyan-400">51</span></span>
          <span>上升: <span className="text-green-400">17</span></span>
          <span>下滑: <span className="text-red-400">8</span></span>
          <span>監測: <span className="text-white">30</span> 品牌</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-52 border-r border-slate-700/40 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">產業分類</span>
          </div>
          <div className="flex-1 overflow-auto py-2">
            {INDUSTRY_LIST.map(ind => (
              <button
                key={ind.key}
                onClick={() => setSelected(ind.key)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between transition-all ${
                  selected === ind.key
                    ? "bg-cyan-500/10 border-r-2 border-cyan-400"
                    : "hover:bg-slate-800/50"
                }`}
              >
                <div>
                  <div className={`text-sm font-medium ${selected === ind.key ? "text-white" : "text-slate-400"}`}>{ind.name}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{ind.count} 個品牌</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono" style={{ color: ind.color }}>{ind.avg}</div>
                  <div className="text-[9px] text-slate-600">均分</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-4 shrink-0">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{ind.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border font-mono" style={{ borderColor: ind.color + "60", color: ind.color }}>{ind.count} 品牌</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">點擊品牌查看 AI 能見度詳情</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold font-mono" style={{ color: ind.color }}>{ind.avg}</div>
                <div className="text-[10px] text-slate-500">產業平均分</div>
              </div>
            </div>

            <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ind.avg}%`, backgroundColor: ind.color }} />
            </div>
          </div>

          <div className="flex-1 overflow-auto px-6 py-4 space-y-2">
            {brands.sort((a, b) => b.score - a.score).map((b, i) => (
              <div
                key={b.ticker}
                className="border border-slate-700/40 rounded-lg p-4 hover:border-slate-500/60 hover:bg-slate-800/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className={`text-xs font-bold font-mono w-5 shrink-0 pt-0.5 ${i === 0 ? "text-yellow-400" : "text-slate-600"}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{b.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{b.ticker}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-mono ${b.weekChange > 0 ? "text-green-400" : b.weekChange < 0 ? "text-red-400" : "text-slate-500"}`}>
                          {b.weekChange > 0 ? `↑+${b.weekChange}` : b.weekChange < 0 ? `↓${b.weekChange}` : "→"}
                        </span>
                        <span className={`text-xl font-bold font-mono ${b.score >= 70 ? "text-green-400" : b.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>{b.score}</span>
                      </div>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${b.score}%`, backgroundColor: ind.color }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommandB;

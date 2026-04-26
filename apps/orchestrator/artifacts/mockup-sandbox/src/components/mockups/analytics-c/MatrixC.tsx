import { useState } from "react";

const ALL_BRANDS = [
  { name: "台積電", ticker: "2330", score: 85, weekChange: 3, industry: "半導體" },
  { name: "聯發科", ticker: "2454", score: 75, weekChange: 2, industry: "半導體" },
  { name: "統一超商", ticker: "2912", score: 74, weekChange: 4, industry: "消費" },
  { name: "台達電子", ticker: "2308", score: 72, weekChange: 3, industry: "科技製造" },
  { name: "中華電信", ticker: "2412", score: 71, weekChange: 2, industry: "電信" },
  { name: "鴻海精密", ticker: "2317", score: 68, weekChange: -1, industry: "科技製造" },
  { name: "富邦金控", ticker: "2881", score: 65, weekChange: 1, industry: "金融" },
  { name: "國泰金控", ticker: "2882", score: 62, weekChange: -2, industry: "金融" },
  { name: "台灣大哥大", ticker: "3045", score: 61, weekChange: 0, industry: "電信" },
  { name: "統一企業", ticker: "1216", score: 59, weekChange: 3, industry: "消費" },
  { name: "中信金控", ticker: "2891", score: 57, weekChange: -1, industry: "金融" },
  { name: "遠傳電信", ticker: "4904", score: 55, weekChange: 1, industry: "電信" },
  { name: "台塑化", ticker: "6505", score: 52, weekChange: -2, industry: "ESG" },
  { name: "南山人壽", ticker: "2857", score: 50, weekChange: 0, industry: "金融" },
  { name: "大立光", ticker: "3008", score: 48, weekChange: 2, industry: "科技製造" },
  { name: "玉山金控", ticker: "2884", score: 46, weekChange: -1, industry: "金融" },
  { name: "瑞昱半導體", ticker: "2379", score: 44, weekChange: 1, industry: "半導體" },
  { name: "日月光投控", ticker: "3711", score: 43, weekChange: -2, industry: "半導體" },
  { name: "聯華電子", ticker: "2303", score: 41, weekChange: 0, industry: "半導體" },
  { name: "台灣化纖", ticker: "1301", score: 38, weekChange: -1, industry: "ESG" },
  { name: "台積電-2", ticker: "2334", score: 36, weekChange: 2, industry: "科技製造" },
  { name: "元大金控", ticker: "2885", score: 34, weekChange: -1, industry: "金融" },
  { name: "永豐金控", ticker: "2890", score: 33, weekChange: 0, industry: "金融" },
  { name: "亞泥", ticker: "1102", score: 31, weekChange: -2, industry: "ESG" },
  { name: "中鋼", ticker: "2002", score: 30, weekChange: -1, industry: "ESG" },
  { name: "台塑", ticker: "1301", score: 29, weekChange: -2, industry: "ESG" },
  { name: "南亞科", ticker: "2408", score: 28, weekChange: 1, industry: "半導體" },
  { name: "宏碁", ticker: "2353", score: 26, weekChange: 0, industry: "科技製造" },
  { name: "廣達電腦", ticker: "2382", score: 25, weekChange: 1, industry: "科技製造" },
  { name: "緯創資通", ticker: "3231", score: 24, weekChange: -1, industry: "科技製造" },
];

function getZone(score: number): { label: string; bg: string; border: string; text: string } {
  if (score >= 70) return { label: "優秀", bg: "#052e16", border: "#16a34a", text: "#4ade80" };
  if (score >= 55) return { label: "良好", bg: "#1c1e12", border: "#ca8a04", text: "#facc15" };
  if (score >= 40) return { label: "待改善", bg: "#1c1106", border: "#ea580c", text: "#fb923c" };
  return { label: "緊急", bg: "#1c0a0a", border: "#dc2626", text: "#f87171" };
}

export function MatrixC() {
  const [filter, setFilter] = useState("全部");
  const [sort, setSort] = useState<"score" | "change">("score");

  const industries = ["全部", "半導體", "科技製造", "金融", "電信", "消費", "ESG"];
  const filtered = ALL_BRANDS
    .filter(b => filter === "全部" || b.industry === filter)
    .sort((a, b) => sort === "score" ? b.score - a.score : b.weekChange - a.weekChange);

  const zones = [
    { label: "優秀 ≥ 70", color: "#4ade80" },
    { label: "良好 55–69", color: "#facc15" },
    { label: "待改善 40–54", color: "#fb923c" },
    { label: "緊急 < 40", color: "#f87171" },
  ];

  return (
    <div className="h-screen bg-[#060b14] text-white font-mono flex flex-col overflow-hidden">
      <div className="border-b border-slate-700/40 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">AI 品牌熱力矩陣</span>
          <span className="text-[10px] text-slate-500">// {filtered.length} 品牌顯示中</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-[10px] text-slate-500">
            {zones.map(z => (
              <span key={z.label} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: z.color }} />
                {z.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-800 px-5 py-2 flex items-center gap-4 shrink-0">
        <div className="flex gap-1">
          {industries.map(ind => (
            <button
              key={ind}
              onClick={() => setFilter(ind)}
              className={`px-2.5 py-1 rounded text-[10px] transition-all ${
                filter === ind
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex gap-2 text-[10px]">
          <button
            onClick={() => setSort("score")}
            className={`px-2 py-1 rounded ${sort === "score" ? "text-cyan-400" : "text-slate-500"}`}
          >
            按分數
          </button>
          <button
            onClick={() => setSort("change")}
            className={`px-2 py-1 rounded ${sort === "change" ? "text-cyan-400" : "text-slate-500"}`}
          >
            按週變動
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-5 gap-2 auto-rows-fr">
          {filtered.map(b => {
            const zone = getZone(b.score);
            return (
              <div
                key={b.ticker}
                className="rounded border p-3 cursor-pointer hover:opacity-80 transition-all flex flex-col justify-between min-h-[100px]"
                style={{ backgroundColor: zone.bg, borderColor: zone.border + "80" }}
              >
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-[11px] font-sans font-semibold text-white leading-tight">{b.name}</span>
                    <span className={`text-[9px] ${b.weekChange > 0 ? "text-green-400" : b.weekChange < 0 ? "text-red-400" : "text-slate-500"}`}>
                      {b.weekChange > 0 ? `▲${b.weekChange}` : b.weekChange < 0 ? `▼${Math.abs(b.weekChange)}` : "—"}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500">{b.ticker}</div>
                </div>
                <div>
                  <div className="h-0.5 w-full bg-black/30 rounded-full mb-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${b.score}%`, backgroundColor: zone.text }} />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-[9px]" style={{ color: zone.text }}>{zone.label}</span>
                    <span className="text-xl font-bold" style={{ color: zone.text }}>{b.score}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-800 px-5 py-2 flex gap-6 text-[10px] text-slate-500 shrink-0">
        <span>優秀: {ALL_BRANDS.filter(b => b.score >= 70).length}</span>
        <span>良好: {ALL_BRANDS.filter(b => b.score >= 55 && b.score < 70).length}</span>
        <span>待改善: {ALL_BRANDS.filter(b => b.score >= 40 && b.score < 55).length}</span>
        <span>緊急: {ALL_BRANDS.filter(b => b.score < 40).length}</span>
        <span className="flex-1 text-right">更新時間 2026-04-16 02:04 CST</span>
      </div>
    </div>
  );
}

export default MatrixC;

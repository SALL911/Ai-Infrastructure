import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useRankings, useRankingStats } from "@/hooks/use-taiwan-brands";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, TrendingDown, Award, AlertTriangle, Target, Layers } from "lucide-react";

const INDUSTRY_LABELS: Record<string, string> = {
  semi: "半導體", tech: "科技製造", finance: "金融", telecom: "電信", consumer: "消費", esg: "ESG",
};

const INDUSTRY_COLORS: Record<string, string> = {
  semi: "bg-blue-500", tech: "bg-cyan-500", finance: "bg-green-500",
  telecom: "bg-purple-500", consumer: "bg-orange-500", esg: "bg-emerald-500",
};

const METHODOLOGY = [
  { dimension: "知識圖譜覆蓋率", weight: 35, desc: "衡量品牌資訊是否存在於 Wikidata、Google Knowledge Graph 等主要知識圖譜中，以及資訊的完整度與準確性。", color: "bg-blue-500", metrics: ["Wikidata 實體完整度", "Google KG 匹配率", "結構化資料覆蓋"] },
  { dimension: "AI 引述率", weight: 30, desc: "在各大 AI 模型的訓練語料及即時生成回應中，品牌被準確引述的頻率與正面情感比例。", color: "bg-primary", metrics: ["ChatGPT 引述頻率", "Claude 引述正確率", "Gemini 相關性分數"] },
  { dimension: "語義搜尋排名", weight: 20, desc: "品牌相關關鍵詞在 AI 驅動搜尋（如 Google AI Overview、Perplexity）中的語義匹配排名。", color: "bg-purple-500", metrics: ["語義相關性分數", "問答場景覆蓋率", "多語言識別準確度"] },
  { dimension: "多模態存在感", weight: 15, desc: "品牌在圖像識別、語音助理、影片內容等多模態 AI 場景中的識別能力與存在程度。", color: "bg-orange-500", metrics: ["Logo 識別率", "語音助理回應率", "影片字幕覆蓋"] },
];

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

export default function Analytics() {
  const { data: brands = [] } = useRankings();
  const { data: stats } = useRankingStats();
  const [view, setView] = useState<"industry" | "top" | "methodology">("industry");

  const industryData = Object.entries(
    brands.reduce<Record<string, { scores: number[]; rising: number; falling: number }>>((acc, b) => {
      if (!acc[b.industry]) acc[b.industry] = { scores: [], rising: 0, falling: 0 };
      acc[b.industry].scores.push(b.score);
      if (b.weekChange > 0) acc[b.industry].rising++;
      if (b.weekChange < 0) acc[b.industry].falling++;
      return acc;
    }, {})
  ).map(([ind, data]) => ({
    industry: ind,
    avg: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
    max: Math.max(...data.scores),
    min: Math.min(...data.scores),
    count: data.scores.length,
    rising: data.rising,
    falling: data.falling,
  })).sort((a, b) => b.avg - a.avg);

  const top10 = [...brands].sort((a, b) => b.score - a.score).slice(0, 10);
  const bottom10 = [...brands].sort((a, b) => a.score - b.score).slice(0, 10);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />深度分析
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            台灣品牌 AI 能見度指數的深度數據分析、產業對比與評分方法論。
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "整體平均分數", value: stats.avgScore, sub: "/ 100 分", color: "text-primary" },
              { label: "最高分品牌", value: stats.topBrands[0]?.score ?? "—", sub: stats.topBrands[0]?.name ?? "", color: "text-green-400" },
              { label: "本週上升品牌", value: stats.rising, sub: "分數提升", color: "text-cyan-400" },
              { label: "已申請入駐", value: stats.claimed, sub: `/ ${stats.total} 個品牌`, color: "text-purple-400" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant={view === "industry" ? "default" : "outline"} size="sm" onClick={() => setView("industry")}>
            <Layers className="h-3.5 w-3.5 mr-1.5" />產業分析
          </Button>
          <Button variant={view === "top" ? "default" : "outline"} size="sm" onClick={() => setView("top")}>
            <Award className="h-3.5 w-3.5 mr-1.5" />品牌排名
          </Button>
          <Button variant={view === "methodology" ? "default" : "outline"} size="sm" onClick={() => setView("methodology")}>
            <Target className="h-3.5 w-3.5 mr-1.5" />評分方法論
          </Button>
        </div>

        {view === "industry" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">產業 AI 能見度對比</CardTitle>
              <CardDescription>各產業的平均、最高、最低分數及本週趨勢</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {industryData.map((ind) => (
                  <div key={ind.industry} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{INDUSTRY_LABELS[ind.industry]}</Badge>
                        <span className="text-xs text-muted-foreground">{ind.count} 個品牌</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">最低: <span className="text-foreground font-mono">{ind.min}</span></span>
                        <span className="text-muted-foreground">最高: <span className="text-foreground font-mono">{ind.max}</span></span>
                        <span className="text-green-400 flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" />{ind.rising}
                        </span>
                        <span className="text-red-400 flex items-center gap-0.5">
                          <TrendingDown className="h-3 w-3" />{ind.falling}
                        </span>
                        <span className={`font-mono font-bold text-sm ${ind.avg >= 60 ? "text-green-400" : ind.avg >= 45 ? "text-yellow-400" : "text-red-400"}`}>
                          {ind.avg}
                        </span>
                      </div>
                    </div>
                    <Bar value={ind.avg} max={100} color={INDUSTRY_COLORS[ind.industry] ?? "bg-primary"} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {view === "top" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-400" />AI 能見度前 10 名
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {top10.map((b, i) => (
                    <div key={b.id} className="flex items-center gap-3">
                      <span className={`font-mono font-bold text-sm w-5 shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{b.name}</span>
                          <span className={`font-mono font-bold text-sm shrink-0 ${b.score >= 70 ? "text-green-400" : b.score >= 50 ? "text-yellow-400" : "text-orange-400"}`}>
                            {b.score}
                          </span>
                        </div>
                        <Bar value={b.score} max={100} color={b.score >= 70 ? "bg-green-500" : b.score >= 50 ? "bg-yellow-500" : "bg-orange-500"} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />最需關注品牌
                </CardTitle>
                <CardDescription>AI 能見度分數最低，需要緊急優化</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {bottom10.map((b, i) => (
                    <div key={b.id} className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm w-5 shrink-0 text-muted-foreground">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{b.name}</span>
                          <span className="font-mono font-bold text-sm shrink-0 text-red-400">{b.score}</span>
                        </div>
                        <Bar value={b.score} max={100} color="bg-red-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {view === "methodology" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="text-sm font-medium text-primary mb-1">評分方法論說明</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI 品牌能見度指數由四個維度構成，每週對台灣上市櫃企業進行自動化掃描與評分。
                評分範圍 0-100 分，採用加權平均計算總分。分數越高代表品牌在 AI 世界中的存在感越強。
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {METHODOLOGY.map((m) => (
                <Card key={m.dimension}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{m.dimension}</div>
                      <div className={`text-2xl font-bold font-mono ${m.color.replace("bg-", "text-")}`}>{m.weight}%</div>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.weight}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
                    <div className="space-y-1">
                      {m.metrics.map((metric) => (
                        <div key={metric} className="flex items-center gap-1.5 text-xs">
                          <div className={`h-1.5 w-1.5 rounded-full ${m.color} shrink-0`} />
                          <span className="text-muted-foreground">{metric}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

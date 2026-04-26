import { AppLayout } from "@/components/layout/app-layout";
import { useRankings, useRankingStats } from "@/hooks/use-taiwan-brands";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Globe, Cpu, MessageSquare, Search, BookOpen, BarChart2, Wifi } from "lucide-react";

const AI_PLATFORMS = [
  { name: "ChatGPT", provider: "OpenAI", icon: MessageSquare, color: "text-green-400", coverage: 88, avgCitation: 72, monthly: "180億", category: "對話 AI" },
  { name: "Claude", provider: "Anthropic", icon: MessageSquare, color: "text-orange-400", coverage: 79, avgCitation: 65, monthly: "40億", category: "對話 AI" },
  { name: "Gemini", provider: "Google", icon: Cpu, color: "text-blue-400", coverage: 83, avgCitation: 70, monthly: "120億", category: "對話 AI" },
  { name: "Perplexity", provider: "Perplexity AI", icon: Search, color: "text-cyan-400", coverage: 71, avgCitation: 58, monthly: "15億", category: "AI 搜尋" },
  { name: "Copilot", provider: "Microsoft", icon: Cpu, color: "text-purple-400", coverage: 76, avgCitation: 62, monthly: "25億", category: "AI 助理" },
  { name: "Google AI Overview", provider: "Google", icon: Globe, color: "text-yellow-400", coverage: 91, avgCitation: 78, monthly: "30億", category: "AI 搜尋" },
  { name: "Wikipedia + AI", provider: "Wikimedia", icon: BookOpen, color: "text-gray-400", coverage: 66, avgCitation: 54, monthly: "80億", category: "知識庫" },
  { name: "Baidu AI", provider: "百度", icon: Search, color: "text-red-400", coverage: 45, avgCitation: 38, monthly: "12億", category: "AI 搜尋" },
];

const DISTRIBUTION_CHANNELS = [
  { name: "知識圖譜網路", desc: "Wikidata · Google Knowledge Graph · Freebase", status: "核心", priority: "high" },
  { name: "結構化資料層", desc: "Schema.org · JSON-LD · Open Graph · Microdata", status: "基礎", priority: "high" },
  { name: "媒體引述生態", desc: "財經媒體 · 科技媒體 · 產業報告", status: "成長", priority: "medium" },
  { name: "社群媒體語料", desc: "LinkedIn · Twitter/X · YouTube 字幕", status: "補充", priority: "low" },
  { name: "學術引用資料庫", desc: "Google Scholar · Semantic Scholar · arXiv", status: "進階", priority: "medium" },
  { name: "政府開放資料", desc: "金管會 · 經濟部 · 證交所公開資料", status: "認證", priority: "high" },
];

const STATUS_STYLES: Record<string, string> = {
  核心: "bg-primary/10 text-primary border-primary/30",
  基礎: "bg-green-500/10 text-green-400 border-green-500/30",
  成長: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  補充: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  進階: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  認證: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
};

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${value >= 80 ? "bg-green-500" : value >= 60 ? "bg-primary" : value >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function Distribution() {
  const { data: brands = [] } = useRankings();
  const { data: stats } = useRankingStats();

  const avgCoverage = Math.round(AI_PLATFORMS.reduce((s, p) => s + p.coverage, 0) / AI_PLATFORMS.length);
  const avgCitation = Math.round(AI_PLATFORMS.reduce((s, p) => s + p.avgCitation, 0) / AI_PLATFORMS.length);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />通路整合
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI 能見度分發通路監測 — 掌握台灣品牌在各 AI 平台的覆蓋率與引述狀況。
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "監測 AI 平台", value: AI_PLATFORMS.length, unit: "個", color: "text-primary" },
            { label: "平均平台覆蓋率", value: `${avgCoverage}%`, unit: "", color: "text-green-400" },
            { label: "平均引述率", value: `${avgCitation}%`, unit: "", color: "text-cyan-400" },
            { label: "追蹤分發通路", value: DISTRIBUTION_CHANNELS.length, unit: "條", color: "text-purple-400" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}{s.unit}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />AI 平台覆蓋矩陣
              </CardTitle>
              <CardDescription>台灣品牌在主要 AI 引擎的平均覆蓋與引述數據</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {AI_PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div key={p.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${p.color}`} />
                          <div>
                            <span className="text-sm font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground ml-1.5">{p.provider}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <Badge variant="outline" className="text-xs py-0">{p.category}</Badge>
                          <span className="text-muted-foreground">{p.monthly} 查詢/月</span>
                          <span className={`font-mono font-bold ${p.color}`}>{p.coverage}%</span>
                        </div>
                      </div>
                      <ScoreBar value={p.coverage} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />品牌分發通路架構
              </CardTitle>
              <CardDescription>AI 能見度的核心知識分發通路與優先層級</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DISTRIBUTION_CHANNELS.map((ch) => (
                  <div key={ch.name} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors">
                    <Badge variant="outline" className={`text-xs shrink-0 mt-0.5 ${STATUS_STYLES[ch.status]}`}>{ch.status}</Badge>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{ch.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ch.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />各平台引述率分析
            </CardTitle>
            <CardDescription>台灣上市品牌在主要 AI 平台的平均引述率比較</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {AI_PLATFORMS.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.name} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${p.color}`} />
                      <span className="text-xs font-medium">{p.name}</span>
                    </div>
                    <div className={`text-2xl font-bold font-mono ${p.color}`}>{p.avgCitation}%</div>
                    <div className="text-xs text-muted-foreground">台灣品牌引述率</div>
                    <ScoreBar value={p.avgCitation} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

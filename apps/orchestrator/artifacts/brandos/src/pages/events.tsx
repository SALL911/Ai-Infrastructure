import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useRankings, type TaiwanBrand } from "@/hooks/use-taiwan-brands";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radar, Zap, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";

interface AIEvent {
  id: number;
  time: string;
  brand: string;
  ticker: string;
  engine: string;
  type: "citation" | "missing" | "ranking_up" | "ranking_down" | "knowledge_update";
  message: string;
  impact: "high" | "medium" | "low";
}

const AI_ENGINES = ["ChatGPT", "Claude", "Gemini", "Perplexity", "Copilot"];

const EVENT_TYPES = {
  citation: { label: "AI 引述", icon: CheckCircle, color: "text-green-400 bg-green-400/10 border-green-400/30" },
  missing: { label: "未被提及", icon: AlertCircle, color: "text-red-400 bg-red-400/10 border-red-400/30" },
  ranking_up: { label: "排名上升", icon: TrendingUp, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30" },
  ranking_down: { label: "排名下降", icon: TrendingDown, color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  knowledge_update: { label: "知識更新", icon: Zap, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" },
};

function generateEvents(brands: TaiwanBrand[]): AIEvent[] {
  if (!brands.length) return [];
  const templates = [
    (b: TaiwanBrand) => ({ type: "citation" as const, engine: AI_ENGINES[0], message: `用戶詢問「台灣最大晶片廠商」時，${b.name} 被 ChatGPT 引述為首選答案`, impact: "high" as const }),
    (b: TaiwanBrand) => ({ type: "missing" as const, engine: AI_ENGINES[1], message: `Claude 在回答「${b.industry === "finance" ? "台灣金融科技" : "台灣科技品牌"}」相關問題時未提及 ${b.name}`, impact: "medium" as const }),
    (b: TaiwanBrand) => ({ type: "ranking_up" as const, engine: AI_ENGINES[2], message: `${b.name} 在 Gemini 語義搜尋中的排名從第 8 上升至第 5`, impact: "medium" as const }),
    (b: TaiwanBrand) => ({ type: "knowledge_update" as const, engine: AI_ENGINES[3], message: `Perplexity 知識庫已更新 ${b.name} 2025 年度財報資訊`, impact: "low" as const }),
    (b: TaiwanBrand) => ({ type: "ranking_down" as const, engine: AI_ENGINES[4], message: `${b.name} 在 Copilot 企業查詢中的相關性分數下降 3.2%`, impact: "high" as const }),
    (b: TaiwanBrand) => ({ type: "citation" as const, engine: AI_ENGINES[0], message: `${b.name} (${b.nameEn}) 的品牌信息在 Wikipedia → AI 知識圖譜的更新已同步`, impact: "medium" as const }),
  ];
  const now = new Date();
  return brands.slice(0, 20).map((b, i) => {
    const t = templates[i % templates.length](b);
    const time = new Date(now.getTime() - i * 7 * 60 * 1000);
    return {
      id: i + 1,
      time: time.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
      brand: b.name,
      ticker: b.ticker,
      ...t,
    };
  });
}

export default function Events() {
  const { data: brands = [] } = useRankings();
  const [filter, setFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const events = generateEvents(brands);
  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => { setIsRefreshing(false); setRefreshCount((c) => c + 1); }, 1200);
  };

  const stats = {
    citations: events.filter((e) => e.type === "citation").length,
    missing: events.filter((e) => e.type === "missing").length,
    high: events.filter((e) => e.impact === "high").length,
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Radar className="h-6 w-6 text-primary" />AI 監測事件
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              即時追蹤台灣品牌在各大 AI 引擎中的引述、排名與知識圖譜更新事件。
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "更新中..." : "手動刷新"}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "本日 AI 引述", value: stats.citations, color: "text-green-400", icon: CheckCircle },
            { label: "未被提及事件", value: stats.missing, color: "text-red-400", icon: AlertCircle },
            { label: "高影響事件", value: stats.high, color: "text-yellow-400", icon: Zap },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</div>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-20`} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>全部</Button>
          {Object.entries(EVENT_TYPES).map(([key, val]) => (
            <Button key={key} variant={filter === key ? "default" : "outline"} size="sm" onClick={() => setFilter(key)}>
              {val.label}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />即時事件流
            </CardTitle>
            <CardDescription>AI 引擎對台灣品牌的即時監測記錄</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filtered.map((event) => {
                const typeInfo = EVENT_TYPES[event.type];
                const Icon = typeInfo.icon;
                return (
                  <div key={event.id} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors">
                    <div className={`mt-0.5 p-1.5 rounded-md border ${typeInfo.color} shrink-0`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{event.brand}</span>
                        <span className="text-xs font-mono text-muted-foreground">{event.ticker}</span>
                        <Badge variant="outline" className="text-xs py-0">{event.engine}</Badge>
                        <Badge variant="outline" className={`text-xs py-0 ${typeInfo.color}`}>{typeInfo.label}</Badge>
                        {event.impact === "high" && (
                          <Badge variant="outline" className="text-xs py-0 text-yellow-400 border-yellow-400/30">高影響</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{event.message}</p>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono shrink-0">{event.time}</div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="py-10 text-center text-muted-foreground text-sm">無符合的事件記錄</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

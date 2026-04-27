import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useRankings, type TaiwanBrand } from "@/hooks/use-taiwan-brands";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Zap, Target, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

interface Strategy {
  id: number;
  brand: string;
  ticker: string;
  industry: string;
  score: number;
  priority: "critical" | "high" | "medium";
  strategy: string;
  rationale: string;
  actions: string[];
  expectedLift: string;
  timeline: string;
  channels: string[];
  confidence: number;
}

const INDUSTRY_LABELS: Record<string, string> = {
  semi: "半導體", tech: "科技製造", finance: "金融", telecom: "電信", consumer: "消費", esg: "ESG",
};

const PRIORITY_STYLES = {
  critical: "text-red-400 border-red-400/30 bg-red-400/10",
  high: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  medium: "text-blue-400 border-blue-400/30 bg-blue-400/10",
};

const PRIORITY_LABELS = { critical: "緊急", high: "高優先", medium: "中優先" };

function generateStrategies(brands: TaiwanBrand[]): Strategy[] {
  return brands.slice(0, 12).map((b, i) => {
    const priority: Strategy["priority"] = b.score < 40 ? "critical" : b.score < 60 ? "high" : "medium";
    const strategies = [
      {
        strategy: "建立 AI 知識圖譜錨定點",
        rationale: `${b.name} 的知識圖譜覆蓋率僅 ${b.knowledgeGraph} 分，遠低於產業平均，導致 AI 引擎在相關查詢中忽略本品牌。`,
        actions: ["提交品牌資料至 Wikidata", "建立 Schema.org 結構化標記", "更新 Google Knowledge Graph 商家資訊", "強化 Wikipedia 頁面引用品質"],
        expectedLift: "+12-18 分",
        timeline: "4-6 週",
        channels: ["知識圖譜", "結構化資料", "Wikipedia"],
      },
      {
        strategy: "強化 AI 引述率優化計畫",
        rationale: `${b.name} 的 AI 引述率為 ${b.aiCitation} 分，品牌聲音在主流 AI 引擎中的份額明顯不足，需加強高品質內容發布。`,
        actions: ["建立 AI 友善的 FAQ 內容庫", "發布深度產業白皮書", "強化媒體公關與第三方背書", "建立 llms.txt 品牌語境文件"],
        expectedLift: "+8-14 分",
        timeline: "6-8 週",
        channels: ["內容行銷", "媒體公關", "AI 語境優化"],
      },
      {
        strategy: "語義搜尋排名衝刺計畫",
        rationale: `語義搜尋分數 ${b.semanticSearch} 顯示品牌在自然語言查詢場景中競爭力薄弱，需重構內容語意架構。`,
        actions: ["重構官網內容語意層次", "建立問答式內容格式", "優化品牌相關長尾語義詞彙", "與行業KOL合作提升引用深度"],
        expectedLift: "+6-10 分",
        timeline: "3-5 週",
        channels: ["SEO語意優化", "內容重構", "KOL合作"],
      },
    ];
    const s = strategies[i % strategies.length];
    return {
      id: i + 1,
      brand: b.name,
      ticker: b.ticker,
      industry: b.industry,
      score: b.score,
      priority,
      confidence: 0.78 + Math.random() * 0.18,
      ...s,
    };
  });
}

function StrategyCard({ s }: { s: Strategy }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="hover:border-primary/40 transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md border border-border bg-card flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {s.brand.slice(0, 1)}
            </div>
            <div>
              <div className="font-semibold text-sm">{s.brand}</div>
              <div className="text-xs text-muted-foreground font-mono">{s.ticker}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={`text-xs ${PRIORITY_STYLES[s.priority]}`}>{PRIORITY_LABELS[s.priority]}</Badge>
            <span className="text-xs font-mono text-primary">{Math.round(s.confidence * 100)}%</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-medium">{s.strategy}</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{s.rationale}</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {s.channels.map((ch) => <Badge key={ch} variant="secondary" className="text-xs py-0">{ch}</Badge>)}
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex gap-4">
            <span className="text-muted-foreground">預期提升: <span className="text-green-400 font-mono font-bold">{s.expectedLift}</span></span>
            <span className="text-muted-foreground">時程: <span className="font-medium">{s.timeline}</span></span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? <><ChevronUp className="h-3 w-3 mr-1" />收起</> : <><ChevronDown className="h-3 w-3 mr-1" />展開行動步驟</>}
          </Button>
        </div>
        {expanded && (
          <div className="rounded-lg border border-border bg-card/50 p-3 space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">具體行動步驟</div>
            {s.actions.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-primary font-mono shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Decisions() {
  const { data: brands = [] } = useRankings();
  const [filter, setFilter] = useState<string>("all");
  const strategies = generateStrategies(brands);
  const filtered = filter === "all" ? strategies : strategies.filter((s) => s.priority === filter);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />AI 策略引擎
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            基於品牌 AI 能見度分析，自動生成個性化的提升策略建議與執行計畫。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "緊急策略", value: strategies.filter((s) => s.priority === "critical").length, color: "text-red-400" },
            { label: "高優先策略", value: strategies.filter((s) => s.priority === "high").length, color: "text-yellow-400" },
            { label: "已生成策略", value: strategies.length, color: "text-primary" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>全部策略</Button>
          <Button variant={filter === "critical" ? "default" : "outline"} size="sm" onClick={() => setFilter("critical")}>緊急</Button>
          <Button variant={filter === "high" ? "default" : "outline"} size="sm" onClick={() => setFilter("high")}>高優先</Button>
          <Button variant={filter === "medium" ? "default" : "outline"} size="sm" onClick={() => setFilter("medium")}>中優先</Button>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {filtered.map((s) => <StrategyCard key={s.id} s={s} />)}
        </div>
      </div>
    </AppLayout>
  );
}

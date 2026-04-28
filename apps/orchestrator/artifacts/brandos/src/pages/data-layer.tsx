import { AppLayout } from "@/components/layout/app-layout";
import { useRankings, useRankingStats, type TaiwanBrand } from "@/hooks/use-taiwan-brands";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, TrendingDown, Minus, Globe, Users, BarChart2 } from "lucide-react";

const INDUSTRY_COLORS: Record<string, string> = {
  semi: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  tech: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  finance: "bg-green-500/10 text-green-400 border-green-500/30",
  telecom: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  consumer: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  esg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

const INDUSTRY_LABELS: Record<string, string> = {
  semi: "半導體",
  tech: "科技製造",
  finance: "金融",
  telecom: "電信",
  consumer: "消費",
  esg: "ESG",
};

function BrandCard({ brand }: { brand: TaiwanBrand }) {
  return (
    <Card className="hover:border-primary/40 transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-md border border-border bg-card flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {brand.name.slice(0, 1)}
            </div>
            <div>
              <div className="font-semibold text-sm">{brand.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{brand.nameEn} · {brand.ticker}</div>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 ${INDUSTRY_COLORS[brand.industry]}`}>
            {INDUSTRY_LABELS[brand.industry]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{brand.description}</p>
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{brand.employees}</span>
            <span className="flex items-center gap-1"><BarChart2 className="h-3 w-3" />{brand.marketCap}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-mono font-bold text-sm ${brand.score >= 70 ? "text-green-400" : brand.score >= 50 ? "text-yellow-400" : brand.score >= 30 ? "text-orange-400" : "text-red-400"}`}>
              {brand.score}
            </span>
            {brand.weekChange > 0 && <span className="text-green-400 text-xs flex items-center"><TrendingUp className="h-3 w-3" />+{brand.weekChange}</span>}
            {brand.weekChange < 0 && <span className="text-red-400 text-xs flex items-center"><TrendingDown className="h-3 w-3" />{brand.weekChange}</span>}
            {brand.weekChange === 0 && <span className="text-muted-foreground text-xs"><Minus className="h-3 w-3" /></span>}
          </div>
        </div>
        {brand.website && (
          <a href={brand.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Globe className="h-3 w-3" />{brand.website.replace("https://", "")}
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export default function DataLayer() {
  const { data: brands = [] } = useRankings();
  const { data: stats } = useRankingStats();

  const industryGroups = Object.entries(
    brands.reduce<Record<string, TaiwanBrand[]>>((acc, b) => {
      acc[b.industry] = [...(acc[b.industry] ?? []), b];
      return acc;
    }, {})
  ).sort((a, b) => b[1].length - a[1].length);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-10">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />品牌庫
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              台灣上市櫃企業品牌資料庫，包含 AI 能見度維度分析與企業基本資訊。
            </p>
          </div>
          {stats && (
            <div className="flex gap-4 text-center">
              {Object.entries(stats.byIndustry).map(([ind, count]) => (
                <div key={ind}>
                  <div className="text-xs text-muted-foreground">{INDUSTRY_LABELS[ind] ?? ind}</div>
                  <div className="text-lg font-bold font-mono text-primary">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {industryGroups.map(([industry, group]) => (
          <div key={industry} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={INDUSTRY_COLORS[industry]}>{INDUSTRY_LABELS[industry] ?? industry}</Badge>
              <span className="text-xs text-muted-foreground">{group.length} 個品牌</span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-mono">
                平均分數: <span className="text-primary">{Math.round(group.reduce((s, b) => s + b.score, 0) / group.length)}</span>
              </span>
            </div>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {group.map((brand) => <BrandCard key={brand.id} brand={brand} />)}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}

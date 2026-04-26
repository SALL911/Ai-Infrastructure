import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useRankings, useRankingStats, useClaimBrand, type TaiwanBrand } from "@/hooks/use-taiwan-brands";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ChevronRight, X, ExternalLink, Search, Trophy, Eye, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INDUSTRIES = [
  { key: "all", label: "全部產業" },
  { key: "semi", label: "半導體" },
  { key: "tech", label: "科技製造" },
  { key: "finance", label: "金融" },
  { key: "telecom", label: "電信" },
  { key: "consumer", label: "消費" },
  { key: "esg", label: "ESG 永續" },
];

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

function ScoreBar({ value, max = 100, color = "bg-primary" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const angle = (score / 100) * 180;
  const color = score >= 70 ? "#00d4aa" : score >= 50 ? "#f59e0b" : score >= 30 ? "#f97316" : "#ef4444";
  const r = 52;
  const circumference = Math.PI * r;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path
          d={`M 14 70 A ${r} ${r} 0 0 1 126 70`}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={`M 14 70 A ${r} ${r} 0 0 1 126 70`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color} fontFamily="monospace">
          {score}
        </text>
        <text x="70" y="78" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
          / 100
        </text>
      </svg>
    </div>
  );
}

function Ticker({ brands }: { brands: TaiwanBrand[] }) {
  if (!brands.length) return null;
  const items = [...brands, ...brands];
  return (
    <div className="w-full overflow-hidden bg-card/50 border-b border-border py-1.5 font-mono text-xs">
      <div className="flex animate-marquee whitespace-nowrap gap-0">
        {items.map((b, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-5">
            <span className="text-muted-foreground">{b.ticker}</span>
            <span className="font-medium">{b.name}</span>
            <span className={b.score >= 60 ? "text-green-400" : b.score >= 40 ? "text-yellow-400" : "text-red-400"}>
              {b.score}
            </span>
            {b.weekChange > 0 && <span className="text-green-400">▲{b.weekChange}</span>}
            {b.weekChange < 0 && <span className="text-red-400">▼{Math.abs(b.weekChange)}</span>}
            {b.weekChange === 0 && <span className="text-muted-foreground">—</span>}
            <span className="text-border/80">│</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ClaimModal({ brand, onClose }: { brand: TaiwanBrand; onClose: () => void }) {
  const claim = useClaimBrand();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", company: "", email: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    claim.mutate(
      { id: brand.id, ...form },
      {
        onSuccess: () => {
          toast({ title: "申請成功！", description: "我們的團隊將在 24 小時內與您聯繫。" });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            申請品牌入駐
          </DialogTitle>
          <DialogDescription>
            申請管理 <strong>{brand.name}</strong> 在 AI 系統中的品牌能見度，開始提升您的 AI 排名。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-lg border border-border bg-card/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">品牌</span>
              <span className="font-medium">{brand.name} ({brand.ticker})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">目前 AI 能見度分數</span>
              <span className={`font-bold font-mono ${brand.score >= 60 ? "text-green-400" : brand.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                {brand.score} / 100
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>您的姓名</Label>
            <Input placeholder="王小明" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>公司名稱</Label>
            <Input placeholder="XX股份有限公司" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>商務電子信箱</Label>
            <Input type="email" placeholder="name@company.com.tw" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <Button type="submit" className="w-full" disabled={claim.isPending}>
            {claim.isPending ? "提交中..." : "申請品牌入駐 →"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">提交後 24 小時內回覆 · 不收取任何費用</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScoreExplorer({ brand, onClose, onClaim }: { brand: TaiwanBrand; onClose: () => void; onClaim: () => void }) {
  const dimensions = [
    { key: "knowledgeGraph", label: "知識圖譜覆蓋", weight: "35%", value: brand.knowledgeGraph, color: "bg-blue-500" },
    { key: "aiCitation", label: "AI 引述率", weight: "30%", value: brand.aiCitation, color: "bg-primary" },
    { key: "semanticSearch", label: "語義搜尋排名", weight: "20%", value: brand.semanticSearch, color: "bg-purple-500" },
    { key: "multimodal", label: "多模態存在感", weight: "15%", value: brand.multimodal, color: "bg-orange-500" },
  ];

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <div className="font-bold text-sm">{brand.name}</div>
          <div className="text-xs text-muted-foreground font-mono">{brand.nameEn} · {brand.ticker}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="flex flex-col items-center gap-2">
          <ScoreGauge score={brand.score} />
          <Badge variant="outline" className={INDUSTRY_COLORS[brand.industry]}>{INDUSTRY_LABELS[brand.industry]}</Badge>
          <div className="flex items-center gap-1.5 text-sm">
            {brand.weekChange > 0 && <><TrendingUp className="h-3.5 w-3.5 text-green-400" /><span className="text-green-400 font-mono">+{brand.weekChange} 本週</span></>}
            {brand.weekChange < 0 && <><TrendingDown className="h-3.5 w-3.5 text-red-400" /><span className="text-red-400 font-mono">{brand.weekChange} 本週</span></>}
            {brand.weekChange === 0 && <><Minus className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">本週持平</span></>}
          </div>
        </div>

        <div className="text-xs text-muted-foreground leading-relaxed">{brand.description}</div>

        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">四維度評分拆解</div>
          {dimensions.map((d) => (
            <div key={d.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{d.label} <span className="text-muted-foreground">({d.weight})</span></span>
                <span className="font-mono font-bold">{d.value}</span>
              </div>
              <ScoreBar value={d.value} color={d.color} />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">企業資訊</div>
          {[
            { label: "員工人數", value: brand.employees },
            { label: "市值規模", value: brand.marketCap },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>

        {!brand.claimed ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground">此品牌尚未入駐。AI 能見度可提升，競爭者可能正在追趕。</div>
            </div>
            <Button size="sm" className="w-full" onClick={onClaim}>申請品牌入駐 →</Button>
          </div>
        ) : (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-center">
            <div className="text-xs text-green-400 font-medium">✓ 品牌已入駐管理中</div>
          </div>
        )}
      </div>

      {brand.website && (
        <div className="p-4 border-t border-border">
          <a href={brand.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
            <ExternalLink className="h-3 w-3" />
            {brand.website.replace("https://", "")}
          </a>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [industry, setIndustry] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<TaiwanBrand | null>(null);
  const [claimBrand, setClaimBrand] = useState<TaiwanBrand | null>(null);
  const { data: brands = [], isLoading } = useRankings(industry);
  const { data: stats } = useRankingStats();

  const filtered = brands.filter(
    (b) =>
      !search ||
      b.name.includes(search) ||
      b.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      b.ticker.includes(search)
  );

  const statCards = stats
    ? [
        { label: "追蹤品牌數", value: stats.total, sub: "台灣上市櫃企業", icon: Building2, color: "text-primary" },
        { label: "平均 AI 能見度", value: `${stats.avgScore}`, sub: "/ 100 分", icon: Eye, color: "text-cyan-400" },
        { label: "本週上升", value: stats.rising, sub: "品牌分數成長", icon: TrendingUp, color: "text-green-400" },
        { label: "本週下滑", value: stats.falling, sub: "品牌分數下降", icon: TrendingDown, color: "text-red-400" },
      ]
    : [];

  return (
    <AppLayout>
      <div className="flex flex-col gap-0 -mx-6 -mt-6">
        <Ticker brands={brands} />

        <div className="px-6 pt-6 pb-0 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">台灣品牌 AI 能見度指數</h1>
              <p className="text-muted-foreground text-sm mt-1">
                即時追蹤 {stats?.total ?? "—"} 間台灣上市櫃企業在 ChatGPT、Claude、Gemini 等 AI 系統中的品牌存在感與引述排名。
              </p>
            </div>
            <div className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-center">
              <div className="text-red-400 text-xs font-medium">⚠ 警示</div>
              <div className="text-xs text-muted-foreground mt-0.5 max-w-[180px]">
                超過 <span className="text-red-400 font-bold">512 個</span> 台灣品牌<br />在 AI 世界幾乎不存在
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statCards.map((c) => (
                <div key={c.label} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{c.label}</span>
                    <c.icon className={`h-4 w-4 ${c.color}`} />
                  </div>
                  <div className={`text-2xl font-bold font-mono ${c.color}`}>{c.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.key}
                onClick={() => setIndustry(ind.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  industry === ind.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-transparent"
                }`}
              >
                {ind.label}
              </button>
            ))}
            <div className="ml-auto relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="搜尋品牌、股票代號..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm w-52"
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-card/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card/50 border-b border-border">
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-12">排名</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">品牌</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden md:table-cell">產業</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">AI 能見度分數</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">本週變動</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium w-24">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((brand, idx) => (
                    <tr
                      key={brand.id}
                      className="border-b border-border/50 hover:bg-card/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedBrand(brand)}
                    >
                      <td className="px-4 py-3.5">
                        <span className={`font-mono font-bold text-sm ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md bg-card border border-border flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {brand.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-medium">{brand.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{brand.ticker}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <Badge variant="outline" className={`text-xs ${INDUSTRY_COLORS[brand.industry]}`}>
                          {INDUSTRY_LABELS[brand.industry]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`font-mono font-bold text-base ${brand.score >= 70 ? "text-green-400" : brand.score >= 50 ? "text-yellow-400" : brand.score >= 30 ? "text-orange-400" : "text-red-400"}`}>
                            {brand.score}
                          </span>
                          <div className="w-20">
                            <ScoreBar
                              value={brand.score}
                              color={brand.score >= 70 ? "bg-green-500" : brand.score >= 50 ? "bg-yellow-500" : brand.score >= 30 ? "bg-orange-500" : "bg-red-500"}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                        {brand.weekChange > 0 && (
                          <span className="text-green-400 font-mono text-xs flex items-center justify-end gap-0.5">
                            <TrendingUp className="h-3 w-3" />+{brand.weekChange}
                          </span>
                        )}
                        {brand.weekChange < 0 && (
                          <span className="text-red-400 font-mono text-xs flex items-center justify-end gap-0.5">
                            <TrendingDown className="h-3 w-3" />{brand.weekChange}
                          </span>
                        )}
                        {brand.weekChange === 0 && (
                          <span className="text-muted-foreground font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedBrand(brand); }}>
                            <ChevronRight className="h-3 w-3" />
                            詳情
                          </Button>
                          {!brand.claimed && (
                            <Button size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setClaimBrand(brand); }}>
                              申請
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                        沒有符合條件的品牌
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedBrand && (
        <ScoreExplorer
          brand={selectedBrand}
          onClose={() => setSelectedBrand(null)}
          onClaim={() => { setClaimBrand(selectedBrand); setSelectedBrand(null); }}
        />
      )}

      {claimBrand && <ClaimModal brand={claimBrand} onClose={() => setClaimBrand(null)} />}
    </AppLayout>
  );
}

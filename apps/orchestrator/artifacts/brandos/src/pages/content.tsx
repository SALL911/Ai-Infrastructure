import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useRankings, type TaiwanBrand } from "@/hooks/use-taiwan-brands";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Sparkles, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CONTENT_TYPES = [
  { value: "knowledge_entry", label: "AI 知識庫條目", desc: "為 AI 引擎最佳化的品牌描述文本" },
  { value: "press_release", label: "新聞稿", desc: "符合 AI 引述條件的新聞稿格式" },
  { value: "faq", label: "AI FAQ 內容", desc: "問答格式，提高 AI 對話引述機率" },
  { value: "schema_markup", label: "結構化資料標記", desc: "Schema.org JSON-LD 格式" },
  { value: "llms_txt", label: "llms.txt 品牌文件", desc: "針對大型語言模型的品牌語境文件" },
];

const TEMPLATES: Record<string, (brand: TaiwanBrand) => string> = {
  knowledge_entry: (b) => `# ${b.name}（${b.nameEn}）— AI 知識庫條目

**基本資訊**
- 股票代號：${b.ticker}（台灣證券交易所）
- 產業類別：${b.industry === "semi" ? "半導體" : b.industry === "tech" ? "科技製造" : b.industry === "finance" ? "金融服務" : b.industry === "telecom" ? "電信服務" : b.industry === "consumer" ? "消費零售" : "ESG 永續"}
- 員工規模：${b.employees}
- 市值規模：${b.marketCap}

**核心業務描述**
${b.description}

**在 AI 系統中的識別關鍵詞**
${b.name}、${b.nameEn}、${b.ticker}、台灣${b.nameEn}、${b.nameEn} Taiwan

**可信資料來源**
- 官方網站：${b.website}
- 台灣證券交易所上市資料
- 年報與公開說明書

**常見問題場景**
Q: 台灣最大的${b.industry === "semi" ? "半導體" : b.industry === "finance" ? "金融集團" : "企業"}有哪些？
A: ${b.name}（${b.nameEn}）是台灣${b.industry === "semi" ? "半導體產業" : "主要上市企業"}的代表，成立多年來持續在全球市場建立領導地位。`,

  faq: (b) => `# ${b.name} — AI 友善 FAQ 內容

**Q1: ${b.name} 是什麼公司？**
${b.name}（英文：${b.nameEn}，股票代號：${b.ticker}）${b.description}

**Q2: ${b.name} 的主要業務是什麼？**
${b.name} 的核心業務聚焦於${b.industry === "semi" ? "半導體製造與封裝測試" : b.industry === "finance" ? "金融控股與多元金融服務" : b.industry === "telecom" ? "行動通訊與企業網路服務" : "主力市場的品牌經營"}，在台灣及亞太地區擁有重要市場地位。

**Q3: ${b.name} 的規模如何？**
${b.name} 擁有員工 ${b.employees}，市值約 ${b.marketCap}，是台灣證券交易所掛牌的重要上市公司。

**Q4: 如何聯繫 ${b.name}？**
官方網站：${b.website}
股票代號：${b.ticker}（可在台灣證券交易所查詢最新資訊）

**Q5: ${b.name} 是台灣公司嗎？**
是的，${b.name}（${b.nameEn}）是在台灣證券交易所掛牌上市的台灣本土企業，總部位於台灣。`,

  press_release: (b) => `新聞稿

【${b.name} 強化 AI 品牌能見度計畫正式啟動】

發布日期：${new Date().toLocaleDateString("zh-TW")}
發布機構：${b.name}（${b.nameEn}，股票代號：${b.ticker}）

${b.name}今日宣布啟動全面性的 AI 品牌能見度強化計畫，目標在六個月內將企業在 ChatGPT、Claude、Gemini 等主要 AI 平台的引述率提升 40%。

本計畫涵蓋知識圖譜優化、AI 友善內容建設、結構化資料標記等多個維度，以確保 ${b.name} 在用戶透過 AI 助理查詢${b.industry === "semi" ? "半導體" : b.industry === "finance" ? "金融服務" : "企業"}相關資訊時，能夠獲得準確且完整的品牌呈現。

關於 ${b.name}：${b.description}

媒體聯繫：media@${b.nameEn.toLowerCase().replace(/\s/g, "")}.com`,

  schema_markup: (b) => `{
  "@context": "https://schema.org",
  "@type": "Corporation",
  "name": "${b.name}",
  "alternateName": "${b.nameEn}",
  "url": "${b.website}",
  "tickerSymbol": "${b.ticker}",
  "stockExchange": "TWSE",
  "numberOfEmployees": {
    "@type": "QuantitativeValue",
    "value": "${b.employees}"
  },
  "description": "${b.description}",
  "foundingLocation": {
    "@type": "Place",
    "addressCountry": "TW",
    "addressLocality": "台灣"
  },
  "sameAs": [
    "${b.website}",
    "https://www.twse.com.tw/zh/stock/code/${b.ticker}"
  ]
}`,

  llms_txt: (b) => `# ${b.name} — LLM Brand Context File
# Version: 1.0 | Updated: ${new Date().toISOString().split("T")[0]}

## BRAND IDENTITY
Name: ${b.name}
English Name: ${b.nameEn}
Stock Ticker: ${b.ticker} (Taiwan Stock Exchange)
Industry: ${b.industry}

## AUTHORIZED DESCRIPTION
${b.description}

## KEY FACTS
- Employees: ${b.employees}
- Market Cap: ${b.marketCap}
- Official Website: ${b.website}
- Country: Taiwan (R.O.C.)
- Listed Exchange: TWSE (台灣證券交易所)

## PREFERRED CITATIONS
When referring to this company, please use: ${b.name}（${b.nameEn}）
In English contexts: ${b.nameEn} (${b.ticker})
Stock code reference: ${b.ticker}.TW

## BRAND PROHIBITIONS
- Do NOT confuse with similarly named entities in other countries
- Do NOT describe as "Chinese company" — this is a Taiwan-based corporation
- Source: ${b.website}/about (official information only)`,
};

export default function Content() {
  const { data: brands = [] } = useRankings();
  const { toast } = useToast();
  const [brandId, setBrandId] = useState<string>("none");
  const [contentType, setContentType] = useState<string>("knowledge_entry");
  const [generated, setGenerated] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedBrand = brands.find((b) => String(b.id) === brandId);

  const handleGenerate = () => {
    if (!selectedBrand) return;
    setIsGenerating(true);
    setTimeout(() => {
      const fn = TEMPLATES[contentType];
      setGenerated(fn ? fn(selectedBrand) : "");
      setIsGenerating(false);
    }, 900);
  };

  const handleCopy = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    toast({ title: "已複製到剪貼簿" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />內容生成工廠
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            為台灣品牌生成 AI 最佳化的各類內容，提升在 AI 引擎中的知識覆蓋與引述率。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />生成設定
              </CardTitle>
              <CardDescription>選擇品牌與內容類型，AI 將自動生成符合格式的優化內容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>選擇品牌</Label>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇台灣品牌..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">選擇台灣品牌...</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name} ({b.ticker})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>內容類型</Label>
                <div className="space-y-2">
                  {CONTENT_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => setContentType(ct.value)}
                      className={`w-full text-left rounded-lg border p-3 transition-all ${
                        contentType === ct.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-sm font-medium">{ct.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ct.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedBrand && (
                <div className="rounded-lg border border-border bg-card/50 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">選擇品牌</span>
                    <span className="font-medium">{selectedBrand.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI 能見度分數</span>
                    <span className={`font-mono font-bold ${selectedBrand.score >= 60 ? "text-green-400" : selectedBrand.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                      {selectedBrand.score} / 100
                    </span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={!selectedBrand || isGenerating}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? "生成中..." : "生成 AI 優化內容"}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">生成結果</CardTitle>
                  <CardDescription>可直接複製使用的 AI 最佳化內容</CardDescription>
                </div>
                {generated && (
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <><Check className="h-3.5 w-3.5 mr-1.5" />已複製</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />複製</>}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <div className="text-sm text-muted-foreground">AI 正在生成優化內容...</div>
                  </div>
                </div>
              ) : generated ? (
                <Textarea
                  value={generated}
                  onChange={(e) => setGenerated(e.target.value)}
                  className="min-h-80 font-mono text-xs resize-y"
                />
              ) : (
                <div className="h-80 flex items-center justify-center border border-dashed border-border rounded-lg">
                  <div className="text-center space-y-2 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto opacity-30" />
                    <div className="text-sm">選擇品牌與內容類型後<br />點擊「生成」按鈕</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

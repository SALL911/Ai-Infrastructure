import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Symcio — AI Visibility Intelligence",
  description:
    "Symcio = AI 時代的 SimilarWeb + SEMrush + Bloomberg。台灣第一個「AI 曝光可量化系統」、唯一「跨 ChatGPT/Gemini 品牌可見度指標」、全球第一個「AI 搜尋排名監測平台」。",
  metadataBase: new URL("https://symcio.tw"),
  openGraph: {
    title: "Symcio — AI Visibility Intelligence",
    description:
      "企業在 AI 裡的曝光、排名與影響力量化平台。",
    type: "website",
  },
};

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "全識股份有限公司",
  alternateName: ["Symcio", "全識", "BrandOS"],
  url: "https://symcio.tw",
  sameAs: [
    "https://www.wikidata.org/wiki/Q138922082",
    "https://github.com/sall911/symcio",
    "https://discord.gg/jGWJr2Sd",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ORGANIZATION_SCHEMA),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

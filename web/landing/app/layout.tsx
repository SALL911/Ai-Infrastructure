import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

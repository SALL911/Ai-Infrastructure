// Preview script — render the weekly digest HTML locally with seed items.
// Template MUST stay in sync with app/api/cron/weekly-digest/route.ts:renderDigestHtml.
// Run: node scripts/preview-digest.mjs > tmp/digest-preview.html

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../tmp/digest-preview.html");

const WEEK_ISO = "2026w22";

const ITEMS = [
  {
    slug: "eu-espr-dpp-2026-rollout-textile-batteries",
    title_zh: "EU ESPR 數位產品護照（DPP）2026 第一波正式上路：電池與紡織品先行",
    summary_zh:
      "歐盟《永續產品生態設計法規》(ESPR)的數位產品護照(Digital Product Passport)制度於 2026 年 Q2 進入第一波品類執行期，電池產品(含工業電池與電動車動力電池)率先強制揭露原料來源、碳足跡與可回收性結構化資料。",
    category: "esg",
    sdg_number: 12,
  },
  {
    slug: "csrd-wave2-listed-companies-fy2026-reporting",
    title_zh: "CSRD 第二波生效：歐盟上市櫃 2025 財年起須揭露 ESRS 完整 11 項標準",
    summary_zh:
      "歐盟《企業永續報告指令》(CSRD)第二波於 2026 年正式生效，適用所有 EU 上市公司(不分規模)，須依《歐洲永續報告準則》(ESRS)完整 12 項主題揭露，並通過第三方審計。台灣供應商若為歐盟上市公司之一階供應商，將被連動要求提供範疇 3 排放與 ESRS S1、ESRS E1 所需的結構化資料。",
    category: "esg",
    sdg_number: null,
  },
  {
    slug: "tnfd-banking-pilots-2026-asia-pacific",
    title_zh: "TNFD 進入金融業大規模試點：亞太區 14 家銀行公布自然相關財務揭露結果",
    summary_zh:
      "TNFD 宣布亞太區金融業早期採用者進入第二年成果發表階段，包括星展、滙豐、三井住友、台灣國泰世華等 14 家銀行依 LEAP 框架公布貸款組合的自然依賴度與衝擊評估，並提出未來三年的去除高風險貸款比例目標。",
    category: "tnfd",
    sdg_number: 15,
  },
  {
    slug: "ifrs-s2-apac-adoption-2026-hk-sg-jp",
    title_zh: "IFRS S2 氣候揭露在亞太進入強制期：港新日同步要求大型上市公司 2026 財年揭露",
    summary_zh:
      "繼歐盟 CSRD 與美國 SEC 氣候規則後，亞太三大金融中心於 2026 年同步要求 IFRS S2(氣候相關財務揭露)強制揭露：港交所要求所有主板、新加坡 SGX 要求市值前 100 大、日本 FSA 要求 Prime Market 公司。揭露範圍包含範疇 1/2/3 排放、轉型計畫、實體與轉型氣候風險的財務影響量化。",
    category: "esg",
    sdg_number: 13,
  },
  {
    slug: "tw-fsc-2027-sustainability-roadmap-update",
    title_zh: "金管會更新 2027 永續發展行動方案：上市櫃永續報告書揭露範圍擴大、第三方確信強化",
    summary_zh:
      "金管會公告 2027《公司治理 3.0 永續發展藍圖》第二階段更新：永續報告書編製範圍從實收資本 20 億元擴大至 10 億元以上(估納入 600 家)；IFRS S1/S2 自願 2026、強制 2028；第三方確信由有限確信提升至合理確信。",
    category: "esg",
    sdg_number: null,
  },
];

const TITLE = `Symcio ESG × SDG 週報 · ${WEEK_ISO.toUpperCase()}`;
const INTRO = `本週(${WEEK_ISO})Symcio 自動整理 ${ITEMS.length} 則全球 ESG / SDG / TNFD / 永續財務揭露重點，跨 2 個類別。以下是 BCI(品牌資本)視角的觀察。`;

function renderDigestHtml(title, intro, items, weekIso) {
  const itemsHtml = items
    .slice(0, 10)
    .map(
      (r) => `
      <div style="margin: 20px 0; padding: 16px; border-left: 3px solid #2A4D3A; background: #FAFAF9;">
        <p style="margin: 0 0 4px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #2A4D3A;">
          ${r.category.toUpperCase()}${r.sdg_number ? ` · SDG ${r.sdg_number}` : ""}
        </p>
        <h3 style="margin: 0 0 8px; font-size: 16px; color: #1A2E22;">
          <a href="https://www.symcio.tw/news/${r.slug}" style="color: #1A2E22; text-decoration: none;">${r.title_zh}</a>
        </h3>
        <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #4B5563;">${r.summary_zh.slice(0, 200)}${r.summary_zh.length > 200 ? "..." : ""}</p>
        <a href="https://www.symcio.tw/news/${r.slug}" style="display: inline-block; margin-top: 8px; font-family: monospace; font-size: 11px; color: #2A4D3A; text-decoration: none;">閱讀 BCI 視角 →</a>
      </div>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background: #F7F6F3; font-family: 'IBM Plex Sans', 'Noto Sans TC', -apple-system, sans-serif; color: #1A2E22;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #F7F6F3;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background: #FFFFFF; border: 1px solid #E5E2D9; border-radius: 12px;">
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 8px; font-family: monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #2A4D3A;">
                Symcio · ${weekIso.toUpperCase()}
              </p>
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #1A2E22;">
                ${title}
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.7; color: #4B5563;">
                ${intro}
              </p>

              ${itemsHtml}

              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E2D9;">
                <a href="https://www.symcio.tw/news" style="display: inline-block; padding: 12px 24px; background: #2A4D3A; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  完整週報 →
                </a>
              </div>

              <div style="margin-top: 24px; font-size: 11px; color: #6B7B6F; line-height: 1.7;">
                <p style="margin: 0 0 8px;">
                  Symcio · BrandOS · AI 能見度的量化標準
                </p>
                <p style="margin: 0;">
                  你訂閱了 Symcio ESG × SDG 週報。退訂請回信至
                  <a href="mailto:info@symcio.tw?subject=Unsubscribe" style="color: #2A4D3A;">info@symcio.tw</a>。
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

mkdirSync(dirname(OUT), { recursive: true });
const html = renderDigestHtml(TITLE, INTRO, ITEMS, WEEK_ISO);
writeFileSync(OUT, html, "utf8");
console.log(`✓ Wrote ${OUT}`);
console.log(`  ${html.length} bytes · ${ITEMS.length} items`);

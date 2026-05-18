/**
 * Per-platform audience adaptation rules.
 *
 * Each platform has its own audience norms:
 *   - tone (formal/casual/dry)
 *   - length (chars / lines)
 *   - hook style (question / number / quote)
 *   - hashtag etiquette
 *
 * These constants are consumed by lib/social/*.ts to render the same
 * news item into platform-appropriate copy.
 */

export interface DigestPostInput {
  title_zh: string;
  summary_zh: string;
  bci_perspective: string;
  category: string;
  sdg_number: number | null;
  tags: string[];
  url: string; // /news/[slug] full URL
  week_iso: string; // e.g. "2026w20"
}

export const SAFE_DISCLAIMER_SHORT =
  "觀察性指標,非投資 / 採購建議。";

export const SAFE_DISCLAIMER_LONG =
  "本內容由 Symcio AI 整理公開永續法規與報告生成,屬觀察性指標,不構成投資建議、採購建議、法律意見或品牌估值意見。";

/**
 * LinkedIn — B2B ESG / 永續長 / IR / CMO audience.
 *  - 280–600 chars optimal (long enough for credibility, short enough to read on feed)
 *  - Open with a number / specific date / regulation name (not "I think...")
 *  - End with a question to drive comments (engagement signal LinkedIn rewards)
 *  - 3-5 hashtags max, ESG/TNFD/IFRS-style not generic #business
 *  - NO emojis in body (looks unprofessional to this audience); 1 leading emoji OK
 */
export function renderLinkedInPost(d: DigestPostInput): string {
  const hashtags = buildHashtags(d, [
    "#ESG",
    "#永續報告",
    "#BrandCapital",
    "#AIVisibility",
  ]);
  const hook = extractHook(d.bci_perspective, d.summary_zh);

  return [
    `📊 ${d.title_zh}`,
    "",
    hook,
    "",
    `🔍 BCI 視角(F·V·E):`,
    d.bci_perspective.slice(0, 280) +
      (d.bci_perspective.length > 280 ? "…" : ""),
    "",
    `→ 完整文章: ${d.url}`,
    "",
    hashtags,
    "",
    `（${SAFE_DISCLAIMER_SHORT}）`,
  ].join("\n");
}

/**
 * Telegram — mixed Web3/ESG/policy audience.
 *  - Markdown supported (bold, italic, links).
 *  - Channel posts <500 chars perform best (readers skim).
 *  - 1-line tease + link to drive click-through.
 *  - 0-2 emojis max.
 */
export function renderTelegramPost(d: DigestPostInput): string {
  const tease = d.summary_zh.slice(0, 140) +
    (d.summary_zh.length > 140 ? "…" : "");
  return [
    `*${d.title_zh}*`,
    "",
    tease,
    "",
    `[閱讀 BCI 視角 →](${d.url})`,
    "",
    `_${SAFE_DISCLAIMER_SHORT}_`,
  ].join("\n");
}

/**
 * Discord — Symcio community (existing).
 *  - Embed with title + description + URL.
 *  - Add inline fields: 分類 / SDG / Tags.
 *  - Color coded by category (already in lib/news/discord.ts; we don't replace
 *    that here, just provide structured content if user wants enriched format).
 */
export function renderDiscordEmbed(d: DigestPostInput) {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "分類", value: d.category, inline: true },
  ];
  if (d.sdg_number != null) {
    fields.push({ name: "SDG", value: String(d.sdg_number), inline: true });
  }
  if (d.tags.length > 0) {
    fields.push({
      name: "Tags",
      value: d.tags.slice(0, 6).join(" · "),
      inline: false,
    });
  }
  return {
    title: d.title_zh.slice(0, 240),
    description:
      d.summary_zh.slice(0, 400) +
      "\n\n" +
      "**BCI 視角:** " +
      d.bci_perspective.slice(0, 600),
    url: d.url,
    color: categoryColor(d.category),
    fields,
    footer: { text: `Symcio · ${d.week_iso} · ${SAFE_DISCLAIMER_SHORT}` },
  };
}

/**
 * Mirror.xyz / Paragraph.xyz — Web3 thought leadership.
 *  - Long form (full article).
 *  - Title + subtitle + body + sources.
 *  - Stub for now; actual publishing requires wallet integration.
 */
export function renderWeb3Article(d: DigestPostInput): string {
  return [
    `# ${d.title_zh}`,
    `*Week ${d.week_iso} · ${d.category.toUpperCase()}${d.sdg_number ? ` · SDG ${d.sdg_number}` : ""}*`,
    "",
    "## 事實摘要",
    "",
    d.summary_zh,
    "",
    "## BCI 視角 · Brand Capital Index",
    "",
    d.bci_perspective,
    "",
    "---",
    "",
    `Tags: ${d.tags.join(", ")}`,
    "",
    `Source: ${d.url}`,
    "",
    `> ${SAFE_DISCLAIMER_LONG}`,
    "",
    "Symcio · BrandOS · AI 能見度的量化標準",
  ].join("\n");
}

// ---------- Helpers ----------

function extractHook(bci: string, summary: string): string {
  // Take first sentence (up to first 。 or 280 chars) of BCI perspective.
  const cut = bci.split("。")[0];
  if (cut && cut.length > 30 && cut.length < 200) return cut + "。";
  return summary.split("。")[0] + "。";
}

function buildHashtags(d: DigestPostInput, base: string[]): string {
  const fromCategory: Record<string, string[]> = {
    esg: ["#ESG"],
    sdg: ["#SDG"],
    tnfd: ["#TNFD", "#自然資本"],
    climate: ["#氣候揭露", "#ClimateDisclosure"],
    "brand-valuation": ["#品牌估值", "#BrandValuation"],
    "weekly-digest": ["#週報"],
  };
  const fromTags = d.tags
    .map((t) => {
      // Sanitize for hashtag use
      const clean = t.replace(/\s+/g, "").replace(/\//g, "");
      if (!clean) return null;
      return clean.startsWith("#") ? clean : `#${clean}`;
    })
    .filter((x): x is string => x !== null);

  const all = new Set<string>([
    ...base,
    ...(fromCategory[d.category] ?? []),
    ...fromTags,
  ]);
  return Array.from(all).slice(0, 6).join(" ");
}

function categoryColor(cat: string): number {
  // Decimal RGB for Discord embed.color
  const map: Record<string, number> = {
    esg: 0x2a4d3a,
    sdg: 0x2a8c5f,
    tnfd: 0x3b7ad9,
    climate: 0xd99a1f,
    "brand-valuation": 0x7a5c08,
    "weekly-digest": 0xd14848,
    other: 0x6b7b6f,
  };
  return map[cat] ?? 0x2a4d3a;
}

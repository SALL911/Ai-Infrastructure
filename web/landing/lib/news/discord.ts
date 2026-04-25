/**
 * Discord webhook poster for news items.
 *
 * Set DISCORD_NEWS_WEBHOOK_URL in env. Webhook is created in the Symcio Discord
 * server under the #news channel (Server Settings → Integrations → Webhooks).
 *
 * Uses Discord embeds for clean card formatting. One POST per news item
 * (Discord supports up to 10 embeds per message, but per-item posts keep
 * timestamps ordered correctly).
 */

export interface DiscordEmbed {
  title: string;
  url: string;
  description: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

const CATEGORY_COLORS: Record<string, number> = {
  sdg: 0x2dd4a0,            // excellent — SDG stays green
  tnfd: 0x378add,            // good — TNFD / nature capital
  esg: 0xc8f55a,             // accent — general ESG
  climate: 0xfbbf24,         // warning — climate
  "brand-valuation": 0xa855f7, // purple — finance
  other: 0x9ca3af,           // muted
};

export async function postToDiscord(embed: DiscordEmbed): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = process.env.DISCORD_NEWS_WEBHOOK_URL;
  if (!webhookUrl) {
    return { ok: false, error: "discord-not-configured" };
  }

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "Symcio News",
        avatar_url: "https://symcio.tw/favicon.svg",
        embeds: [embed],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return { ok: false, error: `discord HTTP ${resp.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Build an embed from a news_items row.
 *
 * Discord embed field limits:
 *   title ≤ 256 chars, description ≤ 4096, each field value ≤ 1024, total ≤ 6000.
 * We target way under these.
 */
export function buildNewsEmbed(row: {
  title_zh: string;
  summary_zh: string;
  bci_perspective: string | null;
  category: string;
  sdg_number: number | null;
  tags: string[] | null;
  source: string;
  source_url: string;
  slug: string;
}): DiscordEmbed {
  const color = CATEGORY_COLORS[row.category] ?? CATEGORY_COLORS.other;
  const newsUrl = `https://symcio.tw/news/${row.slug}?utm_source=discord&utm_medium=news&utm_campaign=daily_feed`;

  const fields: DiscordEmbed["fields"] = [];

  if (row.bci_perspective) {
    fields.push({
      name: "🎯 BCI 視角",
      value: clamp(row.bci_perspective, 1000),
    });
  }

  const metaParts: string[] = [];
  if (row.sdg_number) metaParts.push(`SDG ${row.sdg_number}`);
  metaParts.push(row.category.toUpperCase());
  if (row.tags && row.tags.length > 0) metaParts.push(row.tags.slice(0, 4).join(" · "));
  fields.push({
    name: "📊 分類",
    value: metaParts.join(" · "),
  });

  fields.push({
    name: "🔗 連結",
    value: `[Symcio 觀點](${newsUrl}) · [原文](${row.source_url})`,
  });

  return {
    title: clamp(row.title_zh, 256),
    url: newsUrl,
    description: clamp(row.summary_zh, 2000),
    color,
    fields,
    footer: { text: `Symcio · ${row.source}` },
    timestamp: new Date().toISOString(),
  };
}

function clamp(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

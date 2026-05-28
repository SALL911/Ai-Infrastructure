import { createClient } from "@/lib/supabase/server";

/**
 * Digest RSS feed — consumed by Beehiiv's RSS-to-Email automation.
 *
 * Why this exists: beehiiv's Send API (programmatic Create Post + send) is
 * Enterprise-only beta. On standard plans the supported path is RSS-to-Email:
 * beehiiv polls this feed and turns each new <item> into a sent post.
 *
 * Scope: weekly digests only (slug LIKE 'digest-%'). Individual daily news
 * items are intentionally excluded — one email per weekly issue, not per item.
 *
 * Graceful degrade: Supabase env missing or no digests yet → valid empty feed.
 */

export const revalidate = 1800; // 30 min — digests change weekly

const SITE = "https://www.symcio.tw";
const FEED_URL = `${SITE}/news/rss.xml`;

interface DigestRow {
  slug: string;
  title_zh: string;
  summary_zh: string;
  bci_perspective: string | null;
  published_at: string | null;
  created_at: string;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// RSS pubDate must be RFC-822.
function rfc822(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

function renderItem(row: DigestRow): string {
  const url = `${SITE}/news/${row.slug}`;
  const date = rfc822(row.published_at ?? row.created_at);
  // Body for the email: summary + BCI perspective. CDATA-wrapped HTML so
  // beehiiv ingests rich content, not just plain text.
  const bodyHtml =
    `<p>${xmlEscape(row.summary_zh)}</p>` +
    (row.bci_perspective
      ? `<h3>BCI 視角</h3><p>${xmlEscape(row.bci_perspective).replace(/\n/g, "<br/>")}</p>`
      : "") +
    `<p><a href="${url}">閱讀完整週報 →</a></p>`;

  return `    <item>
      <title>${xmlEscape(row.title_zh)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      <description>${xmlEscape(row.summary_zh)}</description>
      <content:encoded><![CDATA[${bodyHtml}]]></content:encoded>
    </item>`;
}

export async function GET() {
  let items: DigestRow[] = [];

  try {
    const sb = createClient();
    const { data } = await sb
      .from("news_items")
      .select("slug, title_zh, summary_zh, bci_perspective, published_at, created_at")
      .eq("status", "published")
      .like("slug", "digest-%")
      .order("created_at", { ascending: false })
      .limit(30);
    if (Array.isArray(data)) items = data as DigestRow[];
  } catch {
    // Supabase env not set (e.g. build time) — ship a valid empty feed.
  }

  const lastBuild = items[0]
    ? rfc822(items[0].published_at ?? items[0].created_at)
    : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Symcio ESG × SDG 週報 · BCI 視角</title>
    <link>${SITE}/news</link>
    <description>每週一整理全球 ESG / SDG / TNFD / 永續財務揭露重點,附 Brand Capital Index 視角解讀。</description>
    <language>zh-TW</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml"/>
${items.map(renderItem).join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}

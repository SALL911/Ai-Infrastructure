/**
 * Minimal RSS / Atom parser — no dependencies.
 *
 * Trade-off: hand-rolled regex parser. Handles ~95% of feeds correctly.
 * For XML-pathological feeds we can later swap in rss-parser (~30 kB).
 * Kept dep-free for edge runtime compatibility.
 */

export interface RssEntry {
  title: string;
  url: string;
  author?: string;
  publishedAt?: string;   // ISO8601
  description?: string;
  content?: string;
  guid?: string;
}

export async function fetchRss(
  feedUrl: string,
  timeoutMs = 15000,
): Promise<RssEntry[]> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const resp = await fetch(feedUrl, {
      headers: {
        "User-Agent": "SymcioNewsBot/1.0 (+https://symcio.tw)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: ac.signal,
      // Vercel edge cache — revalidate every 30 min regardless of cron cadence
      next: { revalidate: 1800 },
    });
    if (!resp.ok) throw new Error(`RSS fetch failed ${resp.status}: ${feedUrl}`);
    const xml = await resp.text();
    return parseFeed(xml);
  } finally {
    clearTimeout(t);
  }
}

export function parseFeed(xml: string): RssEntry[] {
  // Atom <entry> or RSS <item>
  const isAtom = /<feed[^>]*xmlns=["']http:\/\/www\.w3\.org\/2005\/Atom/.test(xml);
  const itemRegex = isAtom ? /<entry[\s\S]*?<\/entry>/g : /<item[\s\S]*?<\/item>/g;
  const chunks = xml.match(itemRegex) ?? [];
  return chunks.map((c) => (isAtom ? parseAtomEntry(c) : parseRssItem(c))).filter(
    (e): e is RssEntry => !!e,
  );
}

function parseRssItem(chunk: string): RssEntry | null {
  const title = extract(chunk, "title");
  const link = extract(chunk, "link");
  const guid = extract(chunk, "guid");
  const pub = extract(chunk, "pubDate");
  const author =
    extract(chunk, "dc:creator") ||
    extract(chunk, "author") ||
    undefined;
  const description = extract(chunk, "description");
  const content =
    extract(chunk, "content:encoded") ||
    description ||
    "";
  if (!title || !link) return null;
  return {
    title: decode(title),
    url: cleanUrl(link),
    author: author ? decode(author) : undefined,
    publishedAt: pub ? toIso(pub) : undefined,
    description: description ? decode(stripTags(description)) : undefined,
    content: content ? decode(stripTags(content)) : undefined,
    guid: guid ? decode(guid) : undefined,
  };
}

function parseAtomEntry(chunk: string): RssEntry | null {
  const title = extract(chunk, "title");
  // Atom <link href="..."> — attribute form
  const linkAttr =
    chunk.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)/i)?.[1] ||
    chunk.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1];
  const pub =
    extract(chunk, "published") ||
    extract(chunk, "updated") ||
    undefined;
  const authorName = chunk.match(/<author>[\s\S]*?<name>([^<]+)<\/name>/i)?.[1];
  const summary = extract(chunk, "summary");
  const content = extract(chunk, "content") || summary || "";
  const id = extract(chunk, "id");
  if (!title || !linkAttr) return null;
  return {
    title: decode(title),
    url: cleanUrl(linkAttr),
    author: authorName ? decode(authorName) : undefined,
    publishedAt: pub,
    description: summary ? decode(stripTags(summary)) : undefined,
    content: content ? decode(stripTags(content)) : undefined,
    guid: id ? decode(id) : undefined,
  };
}

/* -------- helpers -------- */

function extract(chunk: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = chunk.match(re);
  return m?.[1]?.trim();
}

function stripTags(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function cleanUrl(s: string): string {
  const stripped = stripTags(s).trim();
  // Some feeds wrap URL in CDATA only; stripTags already handles
  return stripped;
}

function toIso(dateStr: string): string | undefined {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/* -------- slug builder -------- */

export function slugify(source: string, title: string, publishedAt?: string): string {
  const datePrefix = publishedAt
    ? new Date(publishedAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${datePrefix}-${source}-${base || "untitled"}`;
}

/**
 * Notion sync helper — pushes news_items into "Symcio Newsletter Archive" DB.
 *
 * Used by /api/cron/fetch-news and /api/cron/weekly-digest as
 * fire-and-forget after a successful Supabase INSERT.
 *
 * Why direct Notion API instead of Composio:
 *   - one less abstraction layer when the action name / property format
 *     could vary across Composio versions
 *   - same fetch wrapper pattern as lib/email/resend.ts, lib/news/discord.ts
 *
 * Setup:
 *   1. notion.so/my-integrations → create Internal Integration → copy token
 *   2. Open "Symcio Newsletter Archive" DB → ··· menu → Connections →
 *      add your integration
 *   3. Set Vercel env vars:
 *        NOTION_TOKEN              = secret_xxx (integration token)
 *        NOTION_NEWS_ARCHIVE_DB_ID = f63835c3-3869-43de-ab6a-94f1d44e7df1
 *
 * Graceful degrade:
 *   - missing env → no-op, returns { ok: false, skipped: true }
 *   - Notion API error → returns { ok: false, error } (caller logs, doesn't throw)
 */

const NOTION_API = "https://api.notion.com/v1/pages";
const NOTION_VERSION = "2022-06-28";

// Default DB ID (created via Claude session 2026-05-18 under BrandOS™).
// Override via NOTION_NEWS_ARCHIVE_DB_ID env if you want to point elsewhere.
const DEFAULT_DB_ID = "f63835c3-3869-43de-ab6a-94f1d44e7df1";

export interface NotionSyncInput {
  slug: string;
  title_zh: string;
  summary_zh: string;
  bci_perspective: string | null;
  category: string;
  sdg_number: number | null;
  tags: string[] | null;
  source: string;
  published_at: string | null;
}

export interface NotionSyncResult {
  ok: boolean;
  page_id?: string;
  skipped?: boolean;
  error?: string;
}

const VALID_CATEGORIES = new Set([
  "esg",
  "sdg",
  "tnfd",
  "climate",
  "brand-valuation",
  "weekly-digest",
  "other",
]);

// Tags pre-defined in the Notion multi_select. Tags outside this set are dropped
// (Notion API can create new options on the fly but only if the integration has
// "Update content" permission AND we pass the right shape — keeping it strict
// is safer).
const VALID_TAGS = new Set([
  "TNFD",
  "IFRS S1",
  "IFRS S2",
  "CSRD",
  "ESPR",
  "DPP",
  "Scope 3",
  "biocredit",
  "品牌資本",
  "weekly-digest",
  "newsletter",
]);

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export async function syncToNotion(
  input: NotionSyncInput,
): Promise<NotionSyncResult> {
  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_NEWS_ARCHIVE_DB_ID ?? DEFAULT_DB_ID;
  if (!token) {
    return { ok: false, skipped: true, error: "NOTION_TOKEN not set" };
  }

  // Notion property values are heavily-typed. Map our flat row to the
  // expanded Notion shape.
  const properties: Record<string, unknown> = {
    "標題": {
      title: [{ text: { content: truncate(input.title_zh, 2000) } }],
    },
    "URL": {
      url: `https://www.symcio.tw/news/${input.slug}`,
    },
    "Slug": {
      rich_text: [{ text: { content: input.slug } }],
    },
    "來源": {
      rich_text: [{ text: { content: input.source } }],
    },
    "摘要": {
      rich_text: [{ text: { content: truncate(input.summary_zh, 2000) } }],
    },
  };

  if (VALID_CATEGORIES.has(input.category)) {
    properties["分類"] = { select: { name: input.category } };
  }

  if (input.sdg_number != null) {
    properties["SDG"] = { number: input.sdg_number };
  }

  if (input.published_at) {
    // Notion expects YYYY-MM-DD for date (no time) or full ISO for datetime
    properties["發布日期"] = {
      date: { start: input.published_at.slice(0, 10) },
    };
  }

  if (input.bci_perspective) {
    properties["BCI 視角"] = {
      rich_text: [
        { text: { content: truncate(input.bci_perspective, 2000) } },
      ],
    };
  }

  if (input.tags && input.tags.length > 0) {
    const filtered = input.tags
      .filter((t) => VALID_TAGS.has(t))
      .slice(0, 10)
      .map((name) => ({ name }));
    if (filtered.length > 0) {
      properties["標籤"] = { multi_select: filtered };
    }
  }

  try {
    const resp = await fetch(NOTION_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties,
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      return {
        ok: false,
        error: `notion HTTP ${resp.status}: ${text.slice(0, 200)}`,
      };
    }

    try {
      const parsed = JSON.parse(text) as { id?: string };
      return { ok: true, page_id: parsed.id };
    } catch {
      return { ok: true };
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Vercel Cron handler — daily ESG / SDG news fetch pipeline.
 *
 * Schedule: see vercel.json (runs daily at 09:00 Taipei = 01:00 UTC).
 *
 * Flow:
 *   1. Verify Vercel Cron signature (x-vercel-cron header) OR fallback to
 *      CRON_SECRET bearer for manual invocation.
 *   2. For each enabled RSS source, fetch + parse.
 *   3. Dedupe against news_items.source_url (seen within last 14 days).
 *   4. Claude summarize + tag each new item.
 *   5. Insert into Supabase news_items (status='published').
 *   6. Post to Discord webhook with UTM-tagged link back to symcio.tw.
 *
 * Protected — requires either:
 *   - Header `x-vercel-cron: 1` (Vercel platform sets this automatically), OR
 *   - Header `authorization: Bearer <CRON_SECRET>` (for manual curl/testing).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enabledSources, type NewsSource } from "@/lib/news/sources";
import { fetchRss, slugify, type RssEntry } from "@/lib/news/rss";
import { summarizeNews, type NewsSummary } from "@/lib/news/claude";
import { buildNewsEmbed, postToDiscord } from "@/lib/news/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Cron can take 2-5 min across 8 sources; bump default Vercel timeout
export const maxDuration = 300;

interface CronStats {
  sources_tried: number;
  entries_seen: number;
  entries_new: number;
  summarized: number;
  inserted: number;
  posted_to_discord: number;
  errors: string[];
  cache_hits: number;
  total_tokens_in: number;
  total_tokens_out: number;
  by_source: Record<string, { seen: number; new: number; errors: number }>;
}

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function authed(req: NextRequest): boolean {
  // Vercel's cron invocation sends this header automatically.
  if (req.headers.get("x-vercel-cron") === "1") return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;

  // Also allow ?secret= query param for browser/curl convenience
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sb = supabase();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "supabase-not-configured" },
      { status: 503 },
    );
  }

  const stats: CronStats = {
    sources_tried: 0,
    entries_seen: 0,
    entries_new: 0,
    summarized: 0,
    inserted: 0,
    posted_to_discord: 0,
    errors: [],
    cache_hits: 0,
    total_tokens_in: 0,
    total_tokens_out: 0,
    by_source: {},
  };

  // Load URLs seen in last 14 days — dedupe key
  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
  const { data: seenRows } = await sb
    .from("news_items")
    .select("source_url")
    .gte("created_at", since);
  const seenUrls = new Set((seenRows ?? []).map((r) => r.source_url as string));

  for (const source of enabledSources()) {
    stats.sources_tried++;
    stats.by_source[source.id] = { seen: 0, new: 0, errors: 0 };

    let entries: RssEntry[];
    try {
      entries = await fetchRss(source.url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      stats.errors.push(`[${source.id}] fetch: ${msg}`);
      stats.by_source[source.id].errors++;
      continue;
    }

    stats.by_source[source.id].seen = entries.length;
    stats.entries_seen += entries.length;

    const maxItems = source.max_items_per_run ?? 5;
    let processed = 0;

    for (const entry of entries) {
      if (processed >= maxItems) break;
      if (!entry.url || !entry.title) continue;
      if (seenUrls.has(entry.url)) continue;

      stats.entries_new++;
      stats.by_source[source.id].new++;

      // Summarize via Claude
      const result = await summarizeNews({
        title: entry.title,
        url: entry.url,
        description: entry.description,
        content: entry.content,
        publishedAt: entry.publishedAt,
        sourceLabel: source.label,
        sourceId: source.id,
      });

      if (!result.ok || !result.data) {
        stats.errors.push(`[${source.id}] summarize: ${result.error ?? "unknown"}`);
        stats.by_source[source.id].errors++;
        continue;
      }

      stats.summarized++;
      stats.total_tokens_in += result.tokens_in ?? 0;
      stats.total_tokens_out += result.tokens_out ?? 0;
      if ((result.cache_read ?? 0) > 0) stats.cache_hits++;

      // Insert into Supabase
      const summary: NewsSummary = result.data;
      const slug = slugify(source.id, summary.title_zh, entry.publishedAt);

      const insertRow = {
        source: source.id,
        source_url: entry.url,
        source_title: entry.title,
        source_author: entry.author ?? null,
        published_at: entry.publishedAt ?? null,
        category: summary.category,
        sdg_number: summary.sdg_number ?? source.sdg_number ?? null,
        slug,
        title_zh: summary.title_zh,
        summary_zh: summary.summary_zh,
        bci_perspective: summary.bci_perspective,
        tags: summary.tags,
        language: "zh-TW",
        ai_model: result.model ?? null,
        ai_tokens_in: result.tokens_in ?? null,
        ai_tokens_out: result.tokens_out ?? null,
        status: "published",
        published_to: [] as string[],
        raw_entry: entry,
      };

      const { data: inserted, error: insErr } = await sb
        .from("news_items")
        .insert(insertRow)
        .select("id, slug, title_zh, summary_zh, bci_perspective, category, sdg_number, tags, source, source_url")
        .maybeSingle();

      if (insErr) {
        stats.errors.push(`[${source.id}] db insert: ${insErr.message}`);
        stats.by_source[source.id].errors++;
        continue;
      }

      stats.inserted++;
      seenUrls.add(entry.url);
      processed++;

      // Push to Discord (best effort)
      if (inserted) {
        const embed = buildNewsEmbed(inserted);
        const dRes = await postToDiscord(embed);
        if (dRes.ok) {
          stats.posted_to_discord++;
          // Record the channel for audit trail
          await sb
            .from("news_items")
            .update({ published_to: ["website", "discord"] })
            .eq("id", inserted.id);
        } else {
          stats.errors.push(`[${source.id}] discord: ${dRes.error}`);
        }
      }

      // Gentle rate limit — Claude tier + RSS source politeness
      await sleep(500);
    }
  }

  return NextResponse.json({ ok: true, stats });
}

/** Allow POST too — some cron runners only support POST. */
export async function POST(req: NextRequest) {
  return GET(req);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

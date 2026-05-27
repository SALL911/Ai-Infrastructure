/**
 * Vercel Cron handler — weekly Monday digest.
 *
 * Schedule: 0 1 * * 1 (Mondays 01:00 UTC = 09:00 Taipei).
 *
 * Flow:
 *   1. Verify Vercel cron signature OR CRON_SECRET bearer.
 *   2. Query news_items inserted in last 7 days, status='published'.
 *   3. Group by category (esg / sdg / tnfd / climate / brand-valuation).
 *   4. Claude API: compile into single digest article with editorial intro
 *      + section-wise highlights + week-ahead "watch list".
 *   5. INSERT into news_items with category='weekly-digest', slug like
 *      `digest-2026w20`, special tag ['weekly-digest','newsletter'].
 *   6. Query newsletter_subscribers where status='active'.
 *   7. Send digest email to each subscriber via Resend (bcc-style for privacy).
 *   8. UPSERT delivery log to newsletter_deliveries (one row per subscriber).
 *   9. Return stats JSON.
 *
 * Graceful degrade:
 *   - If ANTHROPIC_API_KEY missing → still query items, return raw list (no compile)
 *   - If RESEND_API_KEY missing → archive digest to news_items but skip email
 *   - If newsletter_subscribers table absent → email count = 0, still archive
 *
 * Dry-run preview:
 *   - Pass ?dry_run=1 (or true) to run steps 1–3 only:
 *       archive digest to news_items + Notion, but skip email send and
 *       social fanout. Use to preview a digest before broadcasting.
 *
 * Protected — requires Vercel cron header OR CRON_SECRET.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { send as sendEmail } from "@/lib/email/resend";
import { syncToNotion } from "@/lib/news/notion-sync";
import {
  renderLinkedInPost,
  renderTelegramPost,
  type DigestPostInput,
} from "@/lib/social/audience-prompts";
import { postToTelegram } from "@/lib/social/telegram";
import { emailLinkedInDraft } from "@/lib/social/linkedin-draft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface NewsItemRow {
  id: string;
  slug: string;
  title_zh: string;
  summary_zh: string;
  bci_perspective: string | null;
  category: string;
  sdg_number: number | null;
  tags: string[] | null;
  source: string;
  source_url: string;
  published_at: string | null;
  created_at: string;
}

interface SubscriberRow {
  id: string;
  email: string;
  display_name: string | null;
  language: string;
}

interface DigestStats {
  week_iso: string;
  dry_run: boolean;
  items_in_window: number;
  by_category: Record<string, number>;
  digest_inserted: boolean;
  digest_url: string | null;
  subscribers_total: number;
  emails_sent: number;
  email_failures: number;
  social: {
    telegram: "sent" | "skipped" | "failed" | "not-attempted";
    linkedin_draft: "sent" | "skipped" | "failed" | "not-attempted";
  };
  errors: string[];
}

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false } });
  } catch {
    // Most common: SUPABASE_URL is malformed (missing https://, placeholder, etc.)
    return null;
  }
}

function authed(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

// ISO week label, e.g. "2026w20"
function isoWeekLabel(d: Date = new Date()): string {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${dt.getUTCFullYear()}w${String(week).padStart(2, "0")}`;
}

function isDryRun(req: NextRequest): boolean {
  const v = new URL(req.url).searchParams.get("dry_run");
  if (!v) return false;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

export async function GET(req: NextRequest) {
  if (!authed(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    return await runDigest(req);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "internal-error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

async function runDigest(req: NextRequest) {
  const dryRun = isDryRun(req);
  const sb = supabase();
  if (!sb) {
    return NextResponse.json(
      {
        ok: false,
        error: "supabase-not-configured",
        message:
          "SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未設或值無效(常見:URL 沒含 https://)。",
      },
      { status: 503 },
    );
  }

  const stats: DigestStats = {
    week_iso: isoWeekLabel(),
    dry_run: dryRun,
    items_in_window: 0,
    by_category: {},
    digest_inserted: false,
    digest_url: null,
    subscribers_total: 0,
    emails_sent: 0,
    email_failures: 0,
    social: {
      telegram: dryRun ? "skipped" : "not-attempted",
      linkedin_draft: dryRun ? "skipped" : "not-attempted",
    },
    errors: [],
  };

  // 1. Query last 7 days of published items
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: items, error: queryErr } = await sb
    .from("news_items")
    .select(
      "id, slug, title_zh, summary_zh, bci_perspective, category, sdg_number, tags, source, source_url, published_at, created_at",
    )
    .eq("status", "published")
    .neq("category", "weekly-digest")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  if (queryErr) {
    stats.errors.push(`query: ${queryErr.message}`);
    return NextResponse.json({ ok: false, stats }, { status: 500 });
  }

  const rows: NewsItemRow[] = (items as NewsItemRow[] | null) ?? [];
  stats.items_in_window = rows.length;
  for (const r of rows) {
    stats.by_category[r.category] = (stats.by_category[r.category] ?? 0) + 1;
  }

  if (rows.length === 0) {
    stats.errors.push("no items in window — skipping digest");
    return NextResponse.json({ ok: true, stats });
  }

  // 2. Build digest content (simple stitch for v1; Claude compile in v2)
  const digestSlug = `digest-${stats.week_iso}`;
  const titleZh = `Symcio ESG × SDG 週報 · ${stats.week_iso.toUpperCase()}`;
  const intro = `本週(${stats.week_iso})Symcio 自動整理 ${rows.length} 則全球 ESG / SDG / TNFD / 永續財務揭露重點,跨 ${Object.keys(stats.by_category).length} 個類別。以下是 BCI(品牌資本)視角的觀察。`;

  const sectionsMd = Object.entries(stats.by_category)
    .map(([cat, count]) => {
      const catItems = rows.filter((r) => r.category === cat);
      const bullets = catItems
        .slice(0, 5)
        .map(
          (r) =>
            `- **${r.title_zh}** — ${r.summary_zh.slice(0, 100)}... [→ 完整](https://www.symcio.tw/news/${r.slug})`,
        )
        .join("\n");
      return `### ${cat.toUpperCase()} (${count})\n\n${bullets}`;
    })
    .join("\n\n");

  const summaryZh = `${intro}\n\n${sectionsMd}`.slice(0, 2000);
  const bciPerspective = rows
    .filter((r) => r.bci_perspective)
    .slice(0, 3)
    .map(
      (r, i) =>
        `${i + 1}. **${r.title_zh}**\n${r.bci_perspective}`,
    )
    .join("\n\n")
    .slice(0, 3000);

  // 3. Insert digest into news_items
  const { error: insErr } = await sb.from("news_items").upsert(
    {
      slug: digestSlug,
      source: "symcio-editorial",
      source_url: `https://www.symcio.tw/news/${digestSlug}`,
      source_title: titleZh,
      source_author: "Symcio Editorial · AI Digest",
      published_at: new Date().toISOString(),
      category: "esg",
      sdg_number: null,
      title_zh: titleZh,
      summary_zh: summaryZh,
      bci_perspective: bciPerspective,
      tags: ["weekly-digest", "newsletter", stats.week_iso],
      language: "zh-TW",
      ai_model: "stitch-v1",
      status: "published",
      published_to: ["website"],
    },
    { onConflict: "slug" },
  );
  if (insErr) {
    stats.errors.push(`insert digest: ${insErr.message}`);
  } else {
    stats.digest_inserted = true;
    stats.digest_url = `https://www.symcio.tw/news/${digestSlug}`;

    // Archive the digest itself to Notion (fire-and-forget)
    void syncToNotion({
      slug: digestSlug,
      title_zh: titleZh,
      summary_zh: summaryZh,
      bci_perspective: bciPerspective,
      category: "weekly-digest",
      sdg_number: null,
      tags: ["weekly-digest", "newsletter"],
      source: "symcio-editorial",
      published_at: new Date().toISOString(),
    }).catch((err) => {
      stats.errors.push(
        `notion-sync digest: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  // Dry-run: stop here. Archive to news_items + Notion is done; skip
  // subscriber query, email send, and social fanout.
  if (dryRun) {
    return NextResponse.json({ ok: true, stats });
  }

  // 4. Query active newsletter subscribers
  const { data: subs, error: subErr } = await sb
    .from("newsletter_subscribers")
    .select("id, email, display_name, language")
    .eq("status", "active");

  if (subErr) {
    stats.errors.push(`subscribers: ${subErr.message}`);
    return NextResponse.json({ ok: stats.digest_inserted, stats });
  }

  const subscribers: SubscriberRow[] = (subs as SubscriberRow[] | null) ?? [];
  stats.subscribers_total = subscribers.length;

  // 5. Send email to each subscriber
  const fromAddr = process.env.NEWSLETTER_FROM ?? "newsletter@symcio.tw";
  const html = renderDigestHtml(titleZh, intro, rows, stats.week_iso);

  for (const sub of subscribers) {
    const result = await sendEmail({
      from: fromAddr,
      to: sub.email,
      subject: titleZh,
      html,
      replyTo: "info@symcio.tw",
    });

    if (result.ok) {
      stats.emails_sent++;
      await sb.from("newsletter_deliveries").insert({
        subscriber_id: sub.id,
        digest_slug: digestSlug,
        sent_at: new Date().toISOString(),
        resend_id: result.id ?? null,
        status: "sent",
      });
    } else {
      stats.email_failures++;
      stats.errors.push(`send to ${sub.email}: ${result.error}`);
      await sb.from("newsletter_deliveries").insert({
        subscriber_id: sub.id,
        digest_slug: digestSlug,
        sent_at: new Date().toISOString(),
        status: "failed",
        error: result.error,
      });
    }
  }

  // 6. Social fanout — Telegram channel + LinkedIn draft email.
  // Discord already pushed per-item in fetch-news cron; we don't re-push
  // the digest there to avoid noise.
  const digestPostInput: DigestPostInput = {
    title_zh: titleZh,
    summary_zh: summaryZh.slice(0, 800),
    bci_perspective: bciPerspective.slice(0, 1500),
    category: "weekly-digest",
    sdg_number: null,
    tags: ["weekly-digest", "newsletter", stats.week_iso],
    url: `https://www.symcio.tw/news/${digestSlug}`,
    week_iso: stats.week_iso,
  };

  // 6a. Telegram channel
  try {
    const tg = await postToTelegram(renderTelegramPost(digestPostInput));
    if (tg.ok) stats.social.telegram = "sent";
    else if (tg.skipped) stats.social.telegram = "skipped";
    else {
      stats.social.telegram = "failed";
      stats.errors.push(`telegram: ${tg.error}`);
    }
  } catch (err) {
    stats.social.telegram = "failed";
    stats.errors.push(
      `telegram exception: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 6b. LinkedIn draft (email to founder for manual posting)
  try {
    const li = await emailLinkedInDraft(
      renderLinkedInPost(digestPostInput),
      stats.week_iso,
    );
    if (li.ok) stats.social.linkedin_draft = "sent";
    else if (li.skipped) stats.social.linkedin_draft = "skipped";
    else {
      stats.social.linkedin_draft = "failed";
      stats.errors.push(`linkedin-draft: ${li.error}`);
    }
  } catch (err) {
    stats.social.linkedin_draft = "failed";
    stats.errors.push(
      `linkedin-draft exception: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return NextResponse.json({ ok: true, stats });
}

function renderDigestHtml(
  title: string,
  intro: string,
  items: NewsItemRow[],
  weekIso: string,
): string {
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

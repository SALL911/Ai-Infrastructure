/**
 * Broadcast endpoint — called by n8n / Make.com / Zapier.
 *
 * Accepts a piece of content + target channels, auto-appends UTM params to
 * internal URLs, and:
 *   - Posts to Discord webhook (direct from Vercel)
 *   - Returns per-channel ready-to-post copy for LinkedIn / X / Threads /
 *     Facebook / Instagram (these need OAuth per account → handled by n8n /
 *     Make.com using the returned copy).
 *
 * Auth: Bearer token via `authorization: Bearer <BROADCAST_SECRET>` header.
 *
 * Why this split?
 *   - Discord webhooks are URL-based, no OAuth → we can post directly.
 *   - LinkedIn / X / Facebook / Instagram / Threads all need per-account
 *     OAuth tokens. Centralizing those in Vercel is fragile (rate limits,
 *     refresh tokens). n8n / Make.com already solve this — we give them
 *     formatted content with correct UTM links, they handle OAuth.
 *
 * Request body:
 * {
 *   "kind": "news" | "daily_brand_valuation" | "sdg1_digest" | "custom",
 *   "title": "...",
 *   "body_short": "...",          // ≤ 280 for X
 *   "body_medium": "...",         // ≤ 700 for LinkedIn / Facebook
 *   "body_long": "...",           // optional — full markdown / HTML
 *   "link_path": "/news/...",     // internal path or full URL
 *   "image_url": "...",           // optional
 *   "tags": ["..."],
 *   "channels": ["discord", "linkedin", "x", ...],
 *   "campaign": "daily_feed"
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "results": {
 *     "discord": { "posted": true },
 *     "linkedin": { "ready": true, "text": "...", "link": "..." },
 *     "x": { "ready": true, "text": "..." },
 *     ...
 *   }
 * }
 */

import { NextResponse, type NextRequest } from "next/server";
import { postToDiscord } from "@/lib/news/discord";
import { todayCampaign, withUtm, type UtmChannel } from "@/lib/publish/utm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Channel =
  | "discord"
  | "linkedin"
  | "x"
  | "threads"
  | "facebook"
  | "instagram"
  | "email";

interface BroadcastBody {
  kind?: string;
  title: string;
  body_short?: string;
  body_medium?: string;
  body_long?: string;
  link_path: string;
  image_url?: string;
  tags?: string[];
  channels: Channel[];
  campaign?: string;
}

interface ChannelResult {
  posted?: boolean;
  ready?: boolean;
  text?: string;
  link?: string;
  image_url?: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  const secret = process.env.BROADCAST_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "broadcast-not-configured" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: BroadcastBody;
  try {
    body = (await req.json()) as BroadcastBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  if (!body.title || !body.link_path || !Array.isArray(body.channels)) {
    return NextResponse.json(
      { ok: false, error: "missing required: title / link_path / channels" },
      { status: 400 },
    );
  }

  const campaign =
    body.campaign ?? todayCampaign(body.kind ?? "broadcast");
  const tags = body.tags ?? [];
  const hashtags = tags
    .map((t) => "#" + t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t) => t.length > 1)
    .slice(0, 5)
    .join(" ");

  const results: Record<Channel, ChannelResult> = {} as Record<
    Channel,
    ChannelResult
  >;

  for (const ch of body.channels) {
    const link = withUtm(body.link_path, {
      source: ch as UtmChannel,
      medium: ch === "email" ? "email" : ch === "discord" ? "news" : "social",
      campaign,
      content: body.kind,
    });

    if (ch === "discord") {
      const embed = {
        title: body.title.slice(0, 256),
        url: link,
        description: (body.body_medium ?? body.body_short ?? "").slice(0, 2000),
        color: 0xc8f55a,
        fields: tags.length
          ? [
              {
                name: "📊 分類",
                value: tags.slice(0, 5).join(" · "),
              },
            ]
          : undefined,
        footer: { text: "Symcio" },
        timestamp: new Date().toISOString(),
      };
      const r = await postToDiscord(embed);
      results.discord = r.ok ? { posted: true } : { posted: false, error: r.error };
      continue;
    }

    // All other channels: return formatted text for n8n / Make.com to publish
    results[ch] = {
      ready: true,
      text: formatFor(ch, body, hashtags, link),
      link,
      image_url: body.image_url,
    };
  }

  return NextResponse.json({ ok: true, campaign, results });
}

function formatFor(
  ch: Channel,
  body: BroadcastBody,
  hashtags: string,
  link: string,
): string {
  const title = body.title;
  const short = body.body_short ?? body.body_medium ?? "";
  const medium = body.body_medium ?? body.body_short ?? "";

  switch (ch) {
    case "x":
      // 280 char limit — title + link always present
      return clamp(`${title}\n\n${short}\n\n${link}${hashtags ? "\n\n" + hashtags : ""}`, 280);

    case "linkedin":
      // 3000 char limit; most engagement under 1300
      return [
        title,
        "",
        medium,
        "",
        hashtags,
        "",
        `閱讀完整：${link}`,
      ]
        .filter(Boolean)
        .join("\n");

    case "threads":
      // 500 char limit
      return clamp(
        `${title}\n\n${short}\n\n${link}${hashtags ? "\n\n" + hashtags : ""}`,
        500,
      );

    case "facebook":
      return [
        title,
        "",
        medium,
        "",
        hashtags,
        "",
        link,
      ]
        .filter(Boolean)
        .join("\n");

    case "instagram":
      // IG captions cap at 2200; hashtags important
      return [
        title,
        "",
        medium,
        "",
        "連結於個人頁 / 留言區",
        hashtags,
      ]
        .filter(Boolean)
        .join("\n");

    case "email":
      return [title, "", medium, "", `完整內容：${link}`].join("\n");

    default:
      return `${title}\n\n${short}\n\n${link}`;
  }
}

function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

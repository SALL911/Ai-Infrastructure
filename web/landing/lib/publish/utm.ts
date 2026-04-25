/**
 * UTM-parameter builder for outbound links to symcio.tw from broadcast channels.
 *
 * Use this for every external post (LinkedIn / X / Discord / Threads /
 * Facebook / Instagram / Email) so GA4 attribution splits cleanly.
 */

export type UtmChannel =
  | "linkedin"
  | "x"
  | "discord"
  | "threads"
  | "facebook"
  | "instagram"
  | "medium"
  | "email"
  | "reddit"
  | "newsletter"
  | "cold-email"
  | "other";

export interface UtmParams {
  source: UtmChannel;
  medium: "social" | "email" | "news" | "content" | "paid";
  campaign: string;
  content?: string;
  term?: string;
}

export function withUtm(urlOrPath: string, utm: UtmParams): string {
  const base =
    urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")
      ? urlOrPath
      : "https://symcio.tw" + (urlOrPath.startsWith("/") ? urlOrPath : "/" + urlOrPath);

  const u = new URL(base);
  u.searchParams.set("utm_source", utm.source);
  u.searchParams.set("utm_medium", utm.medium);
  u.searchParams.set("utm_campaign", utm.campaign);
  if (utm.content) u.searchParams.set("utm_content", utm.content);
  if (utm.term) u.searchParams.set("utm_term", utm.term);
  return u.toString();
}

/**
 * Default campaign name from today's date, e.g. "daily_feed_2026-04-22".
 */
export function todayCampaign(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${prefix}_${y}-${m}-${day}`;
}

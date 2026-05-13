/**
 * Public CTA helper — routes high-touch inquiries (sales, demo, investor,
 * consulting) into the shared Typeform form `ZZYlfK7A` with a hidden
 * `topic` field for triage.
 *
 * Replaces direct mailto:sall@symcio.tw links so:
 *   - the founder's personal email isn't scraped from the public site
 *   - every inquiry lands in Supabase `leads` via the existing webhook
 *   - HubSpot / Notion sync picks it up via the daily Composio cron
 *
 * Topic gets carried as a Typeform hidden field. The webhook
 * (app/api/webhooks/typeform/route.ts) reads `hidden.topic` and:
 *   - persists it in the `leads.notes` column
 *   - skips the free-scan-request GitHub dispatch for non-scan topics
 *     (so an investor inquiry doesn't trigger an AI brand audit)
 *
 * Form ID is overridable via `NEXT_PUBLIC_TYPEFORM_CONTACT_FORM_ID` so
 * we can swap to a dedicated sales/investor form later without code change.
 *
 * Setup required (one-time, in Typeform admin):
 *   admin.typeform.com/form/ZZYlfK7A/create
 *   → 加 Hidden Field：`topic`
 *   → Publish
 */

const FORM_ID = process.env["NEXT_PUBLIC_TYPEFORM_CONTACT_FORM_ID"] || "ZZYlfK7A";

export type ContactTopic =
  | "professional_plan"   // 專業版方案 (NTD 100k/年)
  | "enterprise_demo"     // 企業版 Demo 預約
  | "consulting"          // 品牌 AI 可見度諮詢
  | "investor";           // 投資人洽詢

export function contactCtaUrl(topic: ContactTopic): string {
  return `https://form.typeform.com/to/${FORM_ID}#topic=${topic}`;
}

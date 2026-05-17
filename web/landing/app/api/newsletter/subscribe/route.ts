/**
 * Newsletter subscription endpoint.
 *
 * POST { email, display_name?, language? } → upsert into newsletter_subscribers.
 *
 * Behavior:
 *   - Validates email format (basic).
 *   - Upserts on email (re-subscription becomes 'active' again).
 *   - Returns { ok, status: 'active' | 'already-subscribed' } — never reveals if email
 *     was already in the DB to avoid email enumeration.
 *   - Fire-and-forgets a "welcome" email via Resend (graceful on failure).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { send as sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: { email?: string; display_name?: string; language?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "invalid-email" }, { status: 400 });
  }

  const displayName = (body.display_name ?? "").trim().slice(0, 120) || null;
  const language = (body.language ?? "zh-TW").slice(0, 10);

  const sb = supabase();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "supabase-not-configured" },
      { status: 503 },
    );
  }

  const { error } = await sb.from("newsletter_subscribers").upsert(
    {
      email,
      display_name: displayName,
      language,
      status: "active",
      source: "website",
      subscribed_at: new Date().toISOString(),
      unsubscribed_at: null,
    },
    { onConflict: "email" },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Fire-and-forget welcome email — don't block on it
  void sendEmail({
    from: process.env.NEWSLETTER_FROM ?? "newsletter@symcio.tw",
    to: email,
    subject: "歡迎訂閱 Symcio ESG × SDG 週報",
    html: welcomeHtml(displayName ?? email),
    replyTo: "info@symcio.tw",
  }).catch(() => {
    /* welcome email failure is non-fatal */
  });

  return NextResponse.json({ ok: true, status: "active" });
}

function welcomeHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="UTF-8"><title>歡迎訂閱 Symcio</title></head>
<body style="margin: 0; padding: 0; background: #F7F6F3; font-family: 'IBM Plex Sans', 'Noto Sans TC', sans-serif; color: #1A2E22;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #F7F6F3;">
    <tr>
      <td align="center" style="padding: 48px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background: #FFFFFF; border: 1px solid #E5E2D9; border-radius: 12px;">
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 8px; font-family: monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #2A4D3A;">
                Symcio · Welcome
              </p>
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #1A2E22;">
                ${name},歡迎加入 Symcio 週報。
              </h1>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.8; color: #4B5563;">
                你訂閱了 <strong>Symcio ESG × SDG 週報</strong>。每週一 09:00 (UTC+8) 寄出一封,
                整理當週全球 ESG / SDG / TNFD / 永續財務揭露重點,
                附 Brand Capital Index 視角(F · V · E 三軸)。
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.8; color: #4B5563;">
                第一封週報會在下個週一寄達。在此之前,可以先看本期已上線的 5 篇:
              </p>
              <a href="https://www.symcio.tw/news" style="display: inline-block; padding: 12px 24px; background: #2A4D3A; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                前往本期週報 →
              </a>
              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #E5E2D9; font-size: 11px; color: #6B7B6F; line-height: 1.7;">
                Symcio · BrandOS · AI 能見度的量化標準<br>
                退訂請回信至 <a href="mailto:info@symcio.tw?subject=Unsubscribe" style="color: #2A4D3A;">info@symcio.tw</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

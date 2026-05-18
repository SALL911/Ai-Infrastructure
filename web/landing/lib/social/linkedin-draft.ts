/**
 * LinkedIn draft delivery.
 *
 * Why no direct API: LinkedIn's posting API requires app approval (months)
 * + $0/mo tier is severely rate-limited. For weekly thought leadership,
 * the cheapest reliable path is: GENERATE the draft + EMAIL it to the
 * page owner who copy-pastes once a week. ~30 sec of manual work.
 *
 * This module renders the draft + sends to LINKEDIN_DRAFT_RECIPIENT (you).
 *
 * Setup:
 *   - Vercel env: LINKEDIN_DRAFT_RECIPIENT = sall@symcio.tw
 *   - Reuses RESEND_API_KEY (already used for newsletter)
 *
 * Graceful degrade: if recipient unset, skips silently.
 */

import { send as sendEmail } from "@/lib/email/resend";

export interface LinkedInDraftResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function emailLinkedInDraft(
  postBodyMarkdown: string,
  weekIso: string,
): Promise<LinkedInDraftResult> {
  const recipient = process.env.LINKEDIN_DRAFT_RECIPIENT;
  if (!recipient) {
    return { ok: false, skipped: true, error: "linkedin-recipient-not-set" };
  }

  const subject = `[LinkedIn Draft] Symcio ${weekIso} 週報貼文`;
  const html = renderDraftEmailHtml(postBodyMarkdown, weekIso);

  const result = await sendEmail({
    from: process.env.NEWSLETTER_FROM ?? "newsletter@symcio.tw",
    to: recipient,
    subject,
    html,
    replyTo: "info@symcio.tw",
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

function renderDraftEmailHtml(body: string, weekIso: string): string {
  // Escape body for HTML <pre>; preserve newlines.
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="UTF-8"><title>LinkedIn Draft ${weekIso}</title></head>
<body style="margin:0;padding:32px 16px;background:#F7F6F3;font-family:'IBM Plex Sans','Noto Sans TC',sans-serif;color:#1A2E22;">
  <table width="640" cellpadding="0" cellspacing="0" border="0" align="center" style="background:#FFFFFF;border:1px solid #E5E2D9;border-radius:12px;">
    <tr><td style="padding:32px;">
      <p style="margin:0 0 8px;font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#2A4D3A;">Symcio · LinkedIn Draft</p>
      <h1 style="margin:0 0 24px;font-size:20px;color:#1A2E22;">${weekIso} 週報 LinkedIn 貼文草稿</h1>

      <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#4B5563;">
        以下是依本週週報內容自動生成的 LinkedIn 貼文。Copy 整段內文,貼到
        <a href="https://www.linkedin.com/post/new" style="color:#2A4D3A;">linkedin.com/post/new</a> 即可。
        圖片建議用本週週報 hero(可直接抓 /news 對應文章的 og:image)。
      </p>

      <div style="background:#FAFAF9;border:1px solid #E5E2D9;border-radius:8px;padding:20px;font-family:'IBM Plex Sans',sans-serif;font-size:14px;line-height:1.7;color:#1A2E22;white-space:pre-wrap;">${escaped}</div>

      <p style="margin:24px 0 0;font-size:12px;color:#6B7B6F;">
        建議發文時段:**週二/三/四 09:00 或 17:00 台灣時間**(LinkedIn 在地最佳互動窗)。
      </p>

      <p style="margin:24px 0 0;padding-top:24px;border-top:1px solid #E5E2D9;font-size:11px;color:#6B7B6F;line-height:1.7;">
        Symcio · BrandOS · 自動化每週生成此 LinkedIn 草稿 ·
        若不再需要,請至 Vercel env 移除 LINKEDIN_DRAFT_RECIPIENT。
      </p>
    </td></tr>
  </table>
</body></html>`;
}

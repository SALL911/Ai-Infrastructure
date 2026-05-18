/**
 * Telegram Bot API client — post to a public channel.
 *
 * Setup:
 *   1. In Telegram, talk to @BotFather → /newbot → get TELEGRAM_BOT_TOKEN
 *   2. Create a public channel (e.g. @symcio_esg) → add the bot as Admin with "post messages" permission
 *   3. Vercel env:
 *        TELEGRAM_BOT_TOKEN     = 123456:ABC-DEF...
 *        TELEGRAM_CHANNEL_ID    = @symcio_esg  (or numeric -100xxxxxxxxxx)
 *
 * Cost: completely free, no rate limit relevant to weekly posting.
 *
 * Graceful degrade: if env vars missing, returns { ok:false, skipped:true }
 * so caller can log without blocking.
 */

const API_BASE = "https://api.telegram.org";

export interface TelegramResult {
  ok: boolean;
  skipped?: boolean;
  message_id?: number;
  error?: string;
}

export async function postToTelegram(markdown: string): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !channel) {
    return { ok: false, skipped: true, error: "telegram-not-configured" };
  }

  try {
    const resp = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channel,
        text: markdown,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    });
    const text = await resp.text();
    if (!resp.ok) {
      return { ok: false, error: `telegram HTTP ${resp.status}: ${text.slice(0, 200)}` };
    }
    try {
      const parsed = JSON.parse(text) as {
        result?: { message_id?: number };
      };
      return { ok: true, message_id: parsed.result?.message_id };
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

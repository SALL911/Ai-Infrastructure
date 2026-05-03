import nodemailer, { Transporter } from 'nodemailer';
import { Lead } from './types';
import { scoreTier } from './scorer';

const LINE_COMMUNITY_URL =
    'https://line.me/ti/g2/2lDm8tJ9RCtjWCX43i39JR_rC-13eJkwyWnCrQ?utm_source=invitation&utm_medium=link_copy&utm_campaign=default';

export interface EmailConfig {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    password?: string;
    fromAddress?: string;
    internalRecipient?: string;
}

export interface WebhookConfig {
    slackUrl?: string;
    discordUrl?: string;
}

export interface NotificationResult {
    internalEmail: boolean;
    welcomeEmail: boolean;
    slack: boolean;
}

export class NotificationService {
    private mailer: Transporter | null;
    private emailConfig: EmailConfig;
    private webhookConfig: WebhookConfig;

    constructor(emailConfig: EmailConfig, webhookConfig: WebhookConfig) {
        this.emailConfig = emailConfig;
        this.webhookConfig = webhookConfig;
        this.mailer = this.buildMailer();
    }

    async notifyAll(lead: Lead): Promise<NotificationResult> {
        const [internalEmail, welcomeEmail, slack] = await Promise.all([
            this.sendInternalNotification(lead),
            this.sendWelcomeEmail(lead),
            this.sendSlackWebhook(lead),
        ]);

        return { internalEmail, welcomeEmail, slack };
    }

    private buildMailer(): Transporter | null {
        const { host, user, password } = this.emailConfig;
        if (!host || !user || !password) return null;

        return nodemailer.createTransport({
            host,
            port: this.emailConfig.port ?? 587,
            secure: this.emailConfig.secure ?? false,
            auth: { user, pass: password },
        });
    }

    private async sendInternalNotification(lead: Lead): Promise<boolean> {
        if (!this.mailer || !this.emailConfig.internalRecipient) return false;

        const tier = scoreTier(lead.score).toUpperCase();

        try {
            await this.mailer.sendMail({
                from: this.emailConfig.fromAddress || this.emailConfig.user,
                to: this.emailConfig.internalRecipient,
                subject: `[Symcio][${tier}] New Lead: ${lead.name} (${lead.score})`,
                text: this.buildInternalEmailText(lead),
            });
            return true;
        } catch (err) {
            console.error('Internal email failed:', err);
            return false;
        }
    }

    private async sendWelcomeEmail(lead: Lead): Promise<boolean> {
        if (!this.mailer) return false;

        try {
            await this.mailer.sendMail({
                from: this.emailConfig.fromAddress || this.emailConfig.user,
                to: lead.email,
                subject: '歡迎加入 Symcio BrandOS™ — 你的品牌基礎建設之旅',
                html: this.buildWelcomeEmailHtml(lead),
                text: this.buildWelcomeEmailText(lead),
            });
            return true;
        } catch (err) {
            console.error('Welcome email failed:', err);
            return false;
        }
    }

    private async sendSlackWebhook(lead: Lead): Promise<boolean> {
        const url = this.webhookConfig.slackUrl || this.webhookConfig.discordUrl;
        if (!url) return false;

        const isDiscord = Boolean(this.webhookConfig.discordUrl);
        const tier = scoreTier(lead.score).toUpperCase();
        const summary =
            `🔥 *New ${tier} Lead* — ${lead.name} (${lead.score}/100)\n` +
            `• Email: ${lead.email}\n` +
            `• Company: ${lead.company || 'N/A'}\n` +
            `• Source: ${lead.source}\n` +
            `• CRM: ${lead.crmId || 'pending'}`;

        const payload = isDiscord
            ? { content: summary }
            : { text: summary, mrkdwn: true };

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            return res.ok;
        } catch (err) {
            console.error('Webhook failed:', err);
            return false;
        }
    }

    private buildInternalEmailText(lead: Lead): string {
        return [
            `New lead captured in Symcio Growth System`,
            ``,
            `Name:       ${lead.name}`,
            `Email:      ${lead.email}`,
            `Phone:      ${lead.phone || '-'}`,
            `Company:    ${lead.company || '-'}`,
            `Job title:  ${lead.jobTitle || '-'}`,
            `Website:    ${lead.websiteUrl || '-'}`,
            `Source:     ${lead.source}`,
            `Score:      ${lead.score} (${scoreTier(lead.score)})`,
            `CRM ID:     ${lead.crmId || 'pending'}`,
            ``,
            `Message:`,
            lead.message || '(none)',
            ``,
            `Score breakdown:`,
            ...lead.scoreBreakdown.reasons.map((r) => `  - ${r}`),
        ].join('\n');
    }

    private buildWelcomeEmailText(lead: Lead): string {
        return [
            `Hi ${lead.name}，`,
            ``,
            `感謝你對 Symcio BrandOS™ 品牌基礎建設的興趣！`,
            ``,
            `我們已經收到你的資料，接下來會盡快跟你聯絡。`,
            `在那之前，歡迎加入我們的 Line 社群，搶先獲得品牌 AI 能見度的第一手內容：`,
            LINE_COMMUNITY_URL,
            ``,
            `— Symcio Team`,
        ].join('\n');
    }

    private buildWelcomeEmailHtml(lead: Lead): string {
        return `
<!doctype html>
<html lang="zh-Hant">
<body style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
  <h2 style="margin:0 0 16px;">歡迎加入 Symcio BrandOS™</h2>
  <p>Hi ${escapeHtml(lead.name)}，</p>
  <p>感謝你對 <strong>Symcio BrandOS™ 品牌基礎建設</strong> 的興趣！我們已經收到你的資料，接下來會盡快與你聯絡。</p>
  <p>在那之前，歡迎加入我們的 Line 社群，搶先獲得「品牌在 AI 中的能見度」的第一手內容與案例：</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="${LINE_COMMUNITY_URL}"
       style="background:#06c755;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
      加入「BrandOS™ 品牌基礎建設」社群
    </a>
  </p>
  <p style="color:#666;font-size:13px;">— Symcio Team</p>
</body>
</html>`;
    }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

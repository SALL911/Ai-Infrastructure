import { randomUUID } from 'crypto';
import { config } from '../../config';
import { HubSpotClient } from './hubspotClient';
import { NotificationService } from './notifications';
import { scoreLead } from './scorer';
import { CaptureResult, Lead, LeadInput } from './types';
import { validateLead } from './validator';

export class LeadCapture {
    private hubspot: HubSpotClient;
    private notifier: NotificationService;
    private recentEmails: Map<string, number>;

    constructor() {
        this.hubspot = new HubSpotClient(config.hubspot.accessToken);
        this.notifier = new NotificationService(
            {
                host: config.email.host,
                port: config.email.port,
                secure: config.email.secure,
                user: config.email.user,
                password: config.email.password,
                fromAddress: config.email.fromAddress,
                internalRecipient: config.email.internalRecipient,
            },
            {
                slackUrl: config.webhooks.slackUrl,
                discordUrl: config.webhooks.discordUrl,
            }
        );
        this.recentEmails = new Map();
    }

    async captureLead(input: LeadInput): Promise<CaptureResult> {
        const validation = validateLead(input);
        if (!validation.valid) {
            return {
                success: false,
                duplicate: false,
                errors: validation.errors,
                crmSynced: false,
                notificationsSent: {
                    internalEmail: false,
                    welcomeEmail: false,
                    slack: false,
                },
            };
        }

        const normalizedInput: LeadInput = {
            ...input,
            email: validation.normalizedEmail,
        };

        const localDuplicate = this.isRecentDuplicate(validation.normalizedEmail);
        const breakdown = scoreLead(normalizedInput, validation);

        const lead: Lead = {
            ...normalizedInput,
            id: randomUUID(),
            score: breakdown.total,
            scoreBreakdown: breakdown,
            createdAt: new Date(),
        };

        let crmSynced = false;
        let crmDuplicate = false;
        if (this.hubspot.isEnabled()) {
            const crmResult = await this.hubspot.upsertContact(lead);
            crmSynced = crmResult.success;
            crmDuplicate = crmResult.duplicate;
            if (crmResult.contactId) lead.crmId = crmResult.contactId;
            if (crmResult.error) console.error('HubSpot sync:', crmResult.error);
        }

        const duplicate = localDuplicate || crmDuplicate;
        const notificationsSent = duplicate
            ? { internalEmail: false, welcomeEmail: false, slack: false }
            : await this.notifier.notifyAll(lead);

        this.recentEmails.set(validation.normalizedEmail, Date.now());
        this.pruneRecentEmails();

        return {
            success: true,
            lead,
            duplicate,
            errors: [],
            crmSynced,
            notificationsSent,
        };
    }

    private isRecentDuplicate(email: string): boolean {
        const ts = this.recentEmails.get(email);
        if (!ts) return false;
        return Date.now() - ts < 24 * 60 * 60 * 1000;
    }

    private pruneRecentEmails(): void {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const [email, ts] of this.recentEmails) {
            if (ts < cutoff) this.recentEmails.delete(email);
        }
    }
}

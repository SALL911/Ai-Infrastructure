import { Lead } from './types';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

export interface HubSpotSyncResult {
    success: boolean;
    contactId?: string;
    duplicate: boolean;
    error?: string;
}

export class HubSpotClient {
    private token: string;
    private enabled: boolean;

    constructor(token: string | undefined) {
        this.token = token || '';
        this.enabled = Boolean(this.token);
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    async findContactByEmail(email: string): Promise<string | null> {
        if (!this.enabled) return null;

        const res = await fetch(
            `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
            {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify({
                    filterGroups: [
                        {
                            filters: [
                                {
                                    propertyName: 'email',
                                    operator: 'EQ',
                                    value: email,
                                },
                            ],
                        },
                    ],
                    properties: ['email'],
                    limit: 1,
                }),
            }
        );

        if (!res.ok) {
            throw new Error(
                `HubSpot search failed (${res.status}): ${await res.text()}`
            );
        }

        const body = (await res.json()) as { results?: Array<{ id: string }> };
        return body.results && body.results.length > 0 ? body.results[0].id : null;
    }

    async upsertContact(lead: Lead): Promise<HubSpotSyncResult> {
        if (!this.enabled) {
            return {
                success: false,
                duplicate: false,
                error: 'HubSpot token not configured',
            };
        }

        try {
            const existingId = await this.findContactByEmail(lead.email);
            const properties = this.buildProperties(lead);

            if (existingId) {
                const res = await fetch(
                    `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${existingId}`,
                    {
                        method: 'PATCH',
                        headers: this.headers(),
                        body: JSON.stringify({ properties }),
                    }
                );

                if (!res.ok) {
                    return {
                        success: false,
                        duplicate: true,
                        error: `HubSpot update failed (${res.status}): ${await res.text()}`,
                    };
                }

                return { success: true, contactId: existingId, duplicate: true };
            }

            const res = await fetch(
                `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
                {
                    method: 'POST',
                    headers: this.headers(),
                    body: JSON.stringify({ properties }),
                }
            );

            if (!res.ok) {
                return {
                    success: false,
                    duplicate: false,
                    error: `HubSpot create failed (${res.status}): ${await res.text()}`,
                };
            }

            const body = (await res.json()) as { id: string };
            return { success: true, contactId: body.id, duplicate: false };
        } catch (err) {
            return {
                success: false,
                duplicate: false,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }

    private headers(): Record<string, string> {
        return {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
        };
    }

    private buildProperties(lead: Lead): Record<string, string> {
        const [firstname, ...rest] = lead.name.trim().split(/\s+/);
        const lastname = rest.join(' ');

        const properties: Record<string, string> = {
            email: lead.email,
            firstname: firstname || lead.name,
            lastname: lastname || '',
            hs_lead_status: this.tierToHubSpotStatus(lead.score),
            symcio_lead_score: String(lead.score),
            symcio_lead_source: lead.source,
        };

        if (lead.phone) properties.phone = lead.phone;
        if (lead.company) properties.company = lead.company;
        if (lead.jobTitle) properties.jobtitle = lead.jobTitle;
        if (lead.websiteUrl) properties.website = lead.websiteUrl;
        if (lead.message) properties.message = lead.message;
        if (lead.utm?.source) properties.hs_analytics_source = lead.utm.source;

        return properties;
    }

    private tierToHubSpotStatus(score: number): string {
        if (score >= 70) return 'OPEN_DEAL';
        if (score >= 40) return 'IN_PROGRESS';
        return 'NEW';
    }
}

export type LeadSource =
    | 'brand_ai_audit'
    | 'website_form'
    | 'landing_page'
    | 'linkedin'
    | 'referral'
    | 'line_community'
    | 'other';

export interface LeadInput {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    websiteUrl?: string;
    message?: string;
    source: LeadSource;
    utm?: {
        source?: string;
        medium?: string;
        campaign?: string;
    };
}

export interface Lead extends LeadInput {
    id: string;
    score: number;
    scoreBreakdown: ScoreBreakdown;
    createdAt: Date;
    crmId?: string;
}

export interface ScoreBreakdown {
    total: number;
    sourceScore: number;
    emailDomainScore: number;
    companyScore: number;
    completenessScore: number;
    reasons: string[];
}

export interface CaptureResult {
    success: boolean;
    lead?: Lead;
    duplicate: boolean;
    errors: string[];
    crmSynced: boolean;
    notificationsSent: {
        internalEmail: boolean;
        welcomeEmail: boolean;
        slack: boolean;
    };
}

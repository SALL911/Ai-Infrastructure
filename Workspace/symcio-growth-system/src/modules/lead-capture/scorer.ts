import { LeadInput, ScoreBreakdown } from './types';
import { ValidationResult } from './validator';

const SOURCE_WEIGHTS: Record<string, number> = {
    brand_ai_audit: 30,
    landing_page: 20,
    website_form: 15,
    linkedin: 25,
    referral: 35,
    line_community: 10,
    other: 5,
};

export function scoreLead(input: LeadInput, validation: ValidationResult): ScoreBreakdown {
    const reasons: string[] = [];

    const sourceScore = SOURCE_WEIGHTS[input.source] ?? 5;
    reasons.push(`Source "${input.source}" → +${sourceScore}`);

    let emailDomainScore = 0;
    if (validation.isBusinessEmail) {
        emailDomainScore = 25;
        reasons.push(`Business email domain (${validation.emailDomain}) → +25`);
    } else if (validation.isFreeProvider) {
        emailDomainScore = 5;
        reasons.push(`Free email provider → +5`);
    }

    let companyScore = 0;
    if (input.company && input.company.trim().length >= 2) {
        companyScore += 10;
        reasons.push('Company provided → +10');
    }
    if (input.jobTitle && input.jobTitle.trim().length >= 2) {
        companyScore += 5;
        reasons.push('Job title provided → +5');
    }
    if (input.websiteUrl && /^https?:\/\/.+\..+/.test(input.websiteUrl)) {
        companyScore += 10;
        reasons.push('Company website provided → +10');
    }

    let completenessScore = 0;
    if (input.phone) {
        completenessScore += 5;
        reasons.push('Phone provided → +5');
    }
    if (input.message && input.message.trim().length >= 20) {
        completenessScore += 10;
        reasons.push('Detailed message (≥20 chars) → +10');
    }

    const total = Math.min(
        100,
        sourceScore + emailDomainScore + companyScore + completenessScore
    );

    return {
        total,
        sourceScore,
        emailDomainScore,
        companyScore,
        completenessScore,
        reasons,
    };
}

export function scoreTier(total: number): 'hot' | 'warm' | 'cold' {
    if (total >= 70) return 'hot';
    if (total >= 40) return 'warm';
    return 'cold';
}

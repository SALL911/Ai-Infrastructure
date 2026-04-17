import { LeadInput } from './types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com',
    'guerrillamail.com',
    'tempmail.com',
    '10minutemail.com',
    'trashmail.com',
    'throwawaymail.com',
    'yopmail.com',
    'sharklasers.com',
    'getnada.com',
    'dispostable.com',
    'maildrop.cc',
    'mintemail.com',
    'fakeinbox.com',
]);

const FREE_EMAIL_DOMAINS = new Set([
    'gmail.com',
    'yahoo.com',
    'yahoo.com.tw',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'qq.com',
    '163.com',
    'protonmail.com',
    'live.com',
    'msn.com',
]);

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    normalizedEmail: string;
    emailDomain: string;
    isDisposable: boolean;
    isFreeProvider: boolean;
    isBusinessEmail: boolean;
}

export function validateLead(input: LeadInput): ValidationResult {
    const errors: string[] = [];
    const normalizedEmail = (input.email || '').trim().toLowerCase();

    if (!input.name || input.name.trim().length < 2) {
        errors.push('Name is required (at least 2 characters)');
    }

    if (!normalizedEmail) {
        errors.push('Email is required');
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
        errors.push('Email format is invalid');
    }

    const emailDomain = normalizedEmail.split('@')[1] || '';
    const isDisposable = DISPOSABLE_DOMAINS.has(emailDomain);
    const isFreeProvider = FREE_EMAIL_DOMAINS.has(emailDomain);
    const isBusinessEmail = Boolean(emailDomain) && !isDisposable && !isFreeProvider;

    if (isDisposable) {
        errors.push('Disposable email addresses are not accepted');
    }

    if (input.phone && !/^[+\d\s\-()]{6,20}$/.test(input.phone)) {
        errors.push('Phone format is invalid');
    }

    return {
        valid: errors.length === 0,
        errors,
        normalizedEmail,
        emailDomain,
        isDisposable,
        isFreeProvider,
        isBusinessEmail,
    };
}

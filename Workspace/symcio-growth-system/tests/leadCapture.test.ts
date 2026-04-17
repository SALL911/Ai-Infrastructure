import { scoreLead, scoreTier } from '../src/modules/lead-capture/scorer';
import { validateLead } from '../src/modules/lead-capture/validator';
import { LeadCapture } from '../src/modules/lead-capture/capture';
import { LeadInput } from '../src/modules/lead-capture/types';

describe('validateLead', () => {
    test('accepts a well-formed business lead', () => {
        const result = validateLead({
            name: 'Alice Wang',
            email: 'alice@acme.co',
            source: 'brand_ai_audit',
        });
        expect(result.valid).toBe(true);
        expect(result.isBusinessEmail).toBe(true);
        expect(result.normalizedEmail).toBe('alice@acme.co');
    });

    test('rejects disposable email', () => {
        const result = validateLead({
            name: 'Bob',
            email: 'bob@mailinator.com',
            source: 'website_form',
        });
        expect(result.valid).toBe(false);
        expect(result.isDisposable).toBe(true);
        expect(result.errors).toContain('Disposable email addresses are not accepted');
    });

    test('rejects malformed email and short name', () => {
        const result = validateLead({
            name: 'A',
            email: 'not-an-email',
            source: 'other',
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    test('detects free-provider email', () => {
        const result = validateLead({
            name: 'Charlie',
            email: 'charlie@gmail.com',
            source: 'linkedin',
        });
        expect(result.valid).toBe(true);
        expect(result.isFreeProvider).toBe(true);
        expect(result.isBusinessEmail).toBe(false);
    });
});

describe('scoreLead', () => {
    test('business email + referral + full profile → hot tier', () => {
        const input: LeadInput = {
            name: 'Dana Lee',
            email: 'dana@enterprise.co',
            phone: '+886912345678',
            company: 'Enterprise Co',
            jobTitle: 'CMO',
            websiteUrl: 'https://enterprise.co',
            message: 'We want to run the BrandOS audit for our three sub-brands.',
            source: 'referral',
        };
        const v = validateLead(input);
        const s = scoreLead(input, v);
        expect(s.total).toBeGreaterThanOrEqual(70);
        expect(scoreTier(s.total)).toBe('hot');
    });

    test('free email + low-value source → cold tier', () => {
        const input: LeadInput = {
            name: 'Eve',
            email: 'eve@gmail.com',
            source: 'other',
        };
        const v = validateLead(input);
        const s = scoreLead(input, v);
        expect(scoreTier(s.total)).toBe('cold');
    });

    test('score caps at 100', () => {
        const input: LeadInput = {
            name: 'Frank Chen',
            email: 'frank@bigcorp.com',
            phone: '0912345678',
            company: 'BigCorp',
            jobTitle: 'CEO',
            websiteUrl: 'https://bigcorp.com',
            message: 'Interested in enterprise licensing for 12 brands immediately.',
            source: 'referral',
        };
        const v = validateLead(input);
        const s = scoreLead(input, v);
        expect(s.total).toBeLessThanOrEqual(100);
    });
});

describe('LeadCapture (integrations disabled)', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.HUBSPOT_ACCESS_TOKEN;
        delete process.env.SMTP_HOST;
        delete process.env.SLACK_WEBHOOK_URL;
        delete process.env.DISCORD_WEBHOOK_URL;
        jest.resetModules();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('returns validation errors for invalid input', async () => {
        const { LeadCapture: LC } = require('../src/modules/lead-capture/capture');
        const capture = new LC();
        const result = await capture.captureLead({
            name: '',
            email: 'bad',
            source: 'website_form',
        });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test('captures a valid lead and flags local duplicate on second submit', async () => {
        const { LeadCapture: LC } = require('../src/modules/lead-capture/capture');
        const capture = new LC();
        const input = {
            name: 'Grace Hopper',
            email: 'grace@navy.mil',
            source: 'brand_ai_audit' as const,
        };
        const first = await capture.captureLead(input);
        expect(first.success).toBe(true);
        expect(first.duplicate).toBe(false);
        expect(first.lead?.score).toBeGreaterThan(0);
        expect(first.crmSynced).toBe(false);

        const second = await capture.captureLead(input);
        expect(second.success).toBe(true);
        expect(second.duplicate).toBe(true);
        expect(second.notificationsSent.internalEmail).toBe(false);
    });
});

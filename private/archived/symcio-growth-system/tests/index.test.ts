import { DataCollector } from '../src/modules/data-collection/collector';
import { BrandScorer } from '../src/modules/scoring-engine/scorer';
import { ReportGenerator } from '../src/modules/report-generation/generator';
import { LeadCapture } from '../src/modules/lead-capture/capture';
import { BrandAIAuditor } from '../src/modules/brand-ai-audit/auditor';

describe('Symcio Growth System Tests', () => {
    let dataCollector: DataCollector;
    let brandScorer: BrandScorer;
    let reportGenerator: ReportGenerator;
    let leadCapture: LeadCapture;
    let brandAIAuditor: BrandAIAuditor;

    beforeEach(() => {
        dataCollector = new DataCollector();
        brandScorer = new BrandScorer();
        reportGenerator = new ReportGenerator({ summary: 'test', details: [] });
        leadCapture = new LeadCapture();
        brandAIAuditor = new BrandAIAuditor();
    });

    test('DataCollector should collect queries and fetch AI responses', async () => {
        const query = { text: 'What is the brand perception?' } as any;
        dataCollector.collectQuery(query);
        const response = await dataCollector.fetchAIResponse('test');
        expect(response).toBeDefined();
    });

    test('BrandScorer should calculate score correctly', () => {
        const score = brandScorer.calculateScore({} as any);
        expect(typeof score).toBe('number');
    });

    test('ReportGenerator should generate a report', () => {
        const report = reportGenerator.generateReport();
        expect(report).toBeDefined();
    });

    test('LeadCapture should capture a valid lead', async () => {
        const result = await leadCapture.captureLead({
            name: 'John Doe',
            email: 'john@example.com',
            source: 'website_form',
        });
        expect(result.success).toBe(true);
        expect(result.lead?.id).toBeDefined();
    });

    test('BrandAIAuditor should perform an audit', async () => {
        const auditResult = await brandAIAuditor.performAudit({
            id: 'q1',
            text: 'probe',
            createdAt: new Date(),
        });
        expect(auditResult).toBeDefined();
    });
});

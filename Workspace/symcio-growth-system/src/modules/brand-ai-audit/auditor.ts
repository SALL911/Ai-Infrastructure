import { DataCollector } from '../data-collection/collector';
import { Query, AIResponse } from '../data-collection/types';
import { BrandScorer } from '../scoring-engine/scorer';
import { ReportGenerator, Report } from '../report-generation/generator';
import { AuditResult } from './types';

export class BrandAIAuditor {
    private dataCollector: DataCollector;
    private brandScorer: BrandScorer;

    constructor() {
        this.dataCollector = new DataCollector();
        this.brandScorer = new BrandScorer();
    }

    public async performAudit(query: Query): Promise<AuditResult> {
        this.dataCollector.collectQuery(query);
        const aiResponse: AIResponse = await this.dataCollector.fetchAIResponse(query.text);
        const score = this.brandScorer.calculateScore(aiResponse);

        return {
            score,
            details: aiResponse.responseText,
        };
    }

    public getAuditReport(auditResult: AuditResult): Report {
        const generator = new ReportGenerator({
            summary: `Audit score: ${auditResult.score}`,
            details: [auditResult.details],
        });
        return generator.generateReport();
    }
}

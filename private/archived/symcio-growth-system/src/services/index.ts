import { DataCollector } from '../modules/data-collection/collector';
import { BrandScorer } from '../modules/scoring-engine/scorer';
import { ReportGenerator } from '../modules/report-generation/generator';
import { LeadCapture } from '../modules/lead-capture/capture';
import { BrandAIAuditor } from '../modules/brand-ai-audit/auditor';
import { Query } from '../modules/data-collection/types';
import { LeadInput } from '../modules/lead-capture/types';
import { ReportData } from '../modules/report-generation/generator';

export const collectData = async (query: Query) => {
    const collector = new DataCollector();
    collector.collectQuery(query);
    return collector.fetchAIResponse(query.text);
};

export const scoreData = (aiResponse: unknown) => {
    const scorer = new BrandScorer();
    return scorer.calculateScore(aiResponse);
};

export const generateReport = (reportData: ReportData) => {
    const generator = new ReportGenerator(reportData);
    return generator.generateReport();
};

export const captureLead = async (leadData: LeadInput) => {
    const leadCapture = new LeadCapture();
    return leadCapture.captureLead(leadData);
};

export const performAudit = async (query: Query) => {
    const auditor = new BrandAIAuditor();
    return auditor.performAudit(query);
};

import { Request, Response } from 'express';
import { DataCollector } from '../modules/data-collection/collector';
import { BrandScorer } from '../modules/scoring-engine/scorer';
import { ReportGenerator } from '../modules/report-generation/generator';
import { LeadCapture } from '../modules/lead-capture/capture';
import { BrandAIAuditor } from '../modules/brand-ai-audit/auditor';

const dataCollector = new DataCollector();
const brandScorer = new BrandScorer();
const leadCapture = new LeadCapture();
const brandAIAuditor = new BrandAIAuditor();

export const handleDataCollection = async (req: Request, res: Response) => {
    try {
        const query = req.body;
        dataCollector.collectQuery(query);
        const aiResponse = await dataCollector.fetchAIResponse(query?.text || '');
        res.status(200).json(aiResponse);
    } catch (error) {
        res.status(500).json({ error: 'Error collecting data' });
    }
};

export const handleScoring = async (req: Request, res: Response) => {
    try {
        const score = brandScorer.calculateScore(req.body);
        res.status(200).json(score);
    } catch (error) {
        res.status(500).json({ error: 'Error calculating score' });
    }
};

export const handleReportGeneration = async (req: Request, res: Response) => {
    try {
        const generator = new ReportGenerator(req.body);
        const report = generator.generateReport();
        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ error: 'Error generating report' });
    }
};

export const handleLeadCapture = async (req: Request, res: Response) => {
    try {
        const result = await leadCapture.captureLead(req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.status(result.duplicate ? 200 : 201).json(result);
    } catch (error) {
        console.error('capture-lead error:', error);
        res.status(500).json({ error: 'Error capturing lead' });
    }
};

export const handleBrandAIAudit = async (req: Request, res: Response) => {
    try {
        const auditResults = await brandAIAuditor.performAudit(req.body);
        res.status(200).json(auditResults);
    } catch (error) {
        res.status(500).json({ error: 'Error performing audit' });
    }
};

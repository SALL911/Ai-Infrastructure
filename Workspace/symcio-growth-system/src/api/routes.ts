import { Router } from 'express';
import { DataCollector } from '../modules/data-collection/collector';
import { BrandScorer } from '../modules/scoring-engine/scorer';
import { ReportGenerator } from '../modules/report-generation/generator';
import { LeadCapture } from '../modules/lead-capture/capture';
import { BrandAIAuditor } from '../modules/brand-ai-audit/auditor';

const router = Router();

const dataCollector = new DataCollector();
const brandScorer = new BrandScorer();
const leadCapture = new LeadCapture();
const brandAIAuditor = new BrandAIAuditor();

router.post('/collect-data', async (req, res) => {
    try {
        const query = req.body;
        dataCollector.collectQuery(query);
        const aiResponse = await dataCollector.fetchAIResponse(query?.text || '');
        res.status(200).json(aiResponse);
    } catch (error) {
        res.status(500).json({ error: 'Error collecting data' });
    }
});

router.post('/score-brand', async (req, res) => {
    try {
        const score = brandScorer.calculateScore(req.body);
        res.status(200).json(score);
    } catch (error) {
        res.status(500).json({ error: 'Error scoring brand' });
    }
});

router.post('/generate-report', async (req, res) => {
    try {
        const generator = new ReportGenerator(req.body);
        const report = generator.generateReport();
        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ error: 'Error generating report' });
    }
});

router.post('/capture-lead', async (req, res) => {
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
});

router.post('/perform-audit', async (req, res) => {
    try {
        const auditResults = await brandAIAuditor.performAudit(req.body);
        res.status(200).json(auditResults);
    } catch (error) {
        res.status(500).json({ error: 'Error performing audit' });
    }
});

export default router;

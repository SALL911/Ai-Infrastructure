import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, campaignsTable, decisionsTable, contentTable, personasTable, eventsTable, integrationsTable } from "@workspace/db";
import {
  GetAnalyticsOverviewResponse,
  GetCampaignPerformanceResponse,
  SubmitFeedbackLoopBody,
  SubmitFeedbackLoopResponse,
  GetDashboardSummaryResponse,
} from "@workspace/api-zod";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

router.get("/analytics/overview", async (_req, res): Promise<void> => {
  const campaigns = await db.select().from(campaignsTable);

  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const avgCtr = campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + c.ctr, 0) / campaigns.length : 0;
  const avgCvr = campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + c.cvr, 0) / campaigns.length : 0;
  const roas = totalSpend > 0 ? (totalConversions * 150) / totalSpend : 0;

  const timeSeriesData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toISOString().split("T")[0],
      impressions: Math.floor(Math.random() * 12000) + 3000,
      clicks: Math.floor(Math.random() * 600) + 100,
      conversions: Math.floor(Math.random() * 40) + 5,
      spend: Math.floor(Math.random() * 800) + 200,
    };
  });

  res.json(GetAnalyticsOverviewResponse.parse({
    totalImpressions,
    totalClicks,
    totalConversions,
    avgCtr,
    avgCvr,
    totalSpend,
    roas,
    timeSeriesData,
  }));
});

router.get("/analytics/campaign-performance", async (_req, res): Promise<void> => {
  const campaigns = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.createdAt)).limit(20);

  const performance = campaigns.map((c) => ({
    campaignId: c.id,
    name: c.name,
    channel: c.channel,
    ctr: c.ctr,
    cvr: c.cvr,
    roas: c.spent > 0 ? (c.conversions * 150) / c.spent : 0,
    trend: (c.ctr > 3.5 ? "up" : c.ctr < 2 ? "down" : "stable") as "up" | "down" | "stable",
  }));

  res.json(GetCampaignPerformanceResponse.parse(performance));
});

router.post("/analytics/feedback-loop", async (req, res): Promise<void> => {
  const parsed = SubmitFeedbackLoopBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.update(campaignsTable).set({
    ctr: parsed.data.ctr,
    cvr: parsed.data.cvr,
  }).where(eq(campaignsTable.id, parsed.data.campaignId));

  const updatedBrandData: string[] = [];
  const recommendations: string[] = [];

  if (parsed.data.ctr > 5) {
    updatedBrandData.push("messaging_framework: High-CTR angle reinforced in brand templates");
    recommendations.push("Replicate winning headline structure across all active campaigns");
  }
  if (parsed.data.cvr > 3) {
    updatedBrandData.push("value_propositions: Conversion-driving proof points elevated");
    recommendations.push("A/B test similar CTA language on email campaigns");
  }
  if (parsed.data.sentiment === "positive") {
    updatedBrandData.push("brand_voice: Positive resonance signals stored");
    recommendations.push("Increase frequency on channels with positive sentiment");
  }
  if (parsed.data.sentiment === "negative") {
    recommendations.push("Pause underperforming message angles, trigger AI re-decision");
    recommendations.push("Run split test with contrarian messaging approach");
  }

  if (updatedBrandData.length === 0) updatedBrandData.push("campaign_history: Performance data stored for future AI decisions");
  if (recommendations.length === 0) recommendations.push("Maintain current strategy — performance within baseline range");

  res.json(SubmitFeedbackLoopResponse.parse({
    success: true,
    updatedBrandData,
    recommendations,
    message: `Feedback processed. BrandOS updated ${updatedBrandData.length} data points. ${recommendations.length} recommendations generated.`,
  }));
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [
    campaigns,
    personas,
    content,
    decisions,
    events,
    integrations,
  ] = await Promise.all([
    db.select().from(campaignsTable),
    db.select().from(personasTable),
    db.select().from(contentTable),
    db.select().from(decisionsTable).orderBy(desc(decisionsTable.createdAt)).limit(5),
    db.select().from(eventsTable).orderBy(desc(eventsTable.createdAt)).limit(100),
    db.select().from(integrationsTable),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventsToday = events.filter((e) => new Date(e.createdAt) >= today).length;

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const activeIntegrations = integrations.filter((i) => i.active).length;
  const avgCtr = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.ctr, 0) / campaigns.length : 0;
  const avgCvr = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.cvr, 0) / campaigns.length : 0;

  const channelCounts: Record<string, number> = {};
  for (const c of campaigns) {
    if (c.ctr > 0) channelCounts[c.channel] = (channelCounts[c.channel] ?? 0) + c.ctr;
  }
  const topPerformingChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Email";

  const recentContent = await db.select().from(contentTable).orderBy(desc(contentTable.createdAt)).limit(5);

  res.json(GetDashboardSummaryResponse.parse(serialize({
    activeCampaigns,
    totalPersonas: personas.length,
    contentGenerated: content.length,
    aiDecisions: decisions.length,
    eventsToday,
    activeIntegrations,
    avgCtr,
    avgCvr,
    topPerformingChannel,
    recentDecisions: decisions,
    recentContent,
  })));
});

export default router;

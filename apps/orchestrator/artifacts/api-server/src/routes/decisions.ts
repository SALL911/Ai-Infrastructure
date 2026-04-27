import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, decisionsTable } from "@workspace/db";
import {
  ListDecisionsResponse,
  CreateDecisionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const strategyOptions = [
  { strategy: "Retargeting Campaign", messagingAngle: "Social Proof & FOMO", channels: ["Google Ads", "Facebook Ads"], reasoning: "High-intent signal detected. Deploy retargeting with urgency messaging to close the loop." },
  { strategy: "Lead Nurture Sequence", messagingAngle: "Educational Value", channels: ["Email", "LinkedIn"], reasoning: "User in consideration phase. Multi-touch nurture with value demonstration reduces sales cycle." },
  { strategy: "Activation Campaign", messagingAngle: "Quick Win Demonstration", channels: ["Email", "In-App"], reasoning: "Critical onboarding window. Push user to first value moment within 48 hours." },
  { strategy: "Upsell & Expansion", messagingAngle: "Upgrade Value Ladder", channels: ["Email", "CRM"], reasoning: "Buyer conversion confirmed. Trigger expansion sequence after honeymoon period." },
  { strategy: "Brand Awareness Push", messagingAngle: "Thought Leadership", channels: ["LinkedIn", "Twitter", "Podcast"], reasoning: "Top-of-funnel gap identified. Increase brand recall with content authority signals." },
  { strategy: "Referral Campaign", messagingAngle: "Community & Belonging", channels: ["Email", "Social"], reasoning: "High NPS detected. Convert brand advocates into referral pipeline." },
];

router.get("/decisions", async (_req, res): Promise<void> => {
  const decisions = await db.select().from(decisionsTable).orderBy(desc(decisionsTable.createdAt)).limit(50);
  res.json(ListDecisionsResponse.parse(decisions));
});

router.post("/decisions", async (req, res): Promise<void> => {
  const parsed = CreateDecisionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const opt = strategyOptions[Math.floor(Math.random() * strategyOptions.length)];
  const confidence = 0.72 + Math.random() * 0.25;

  const [decision] = await db.insert(decisionsTable).values({
    trigger: parsed.data.trigger,
    strategy: opt.strategy,
    messagingAngle: opt.messagingAngle,
    channels: opt.channels,
    confidence,
    reasoning: parsed.data.context ? `Context: ${parsed.data.context}. ${opt.reasoning}` : opt.reasoning,
    status: "active",
  }).returning();

  res.status(201).json(decision);
});

export default router;

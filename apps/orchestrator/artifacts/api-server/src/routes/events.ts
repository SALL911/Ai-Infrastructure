import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, eventsTable, decisionsTable, contentTable, campaignsTable, personasTable } from "@workspace/db";
import {
  ListEventsResponse,
  CreateEventBody,
  SimulateEventBody,
  SimulateEventResponse,
  GetEventsSummaryResponse,
} from "@workspace/api-zod";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

const strategyMap: Record<string, { strategy: string; messagingAngle: string; channels: string[]; reasoning: string }> = {
  page_visit: {
    strategy: "Retargeting Campaign",
    messagingAngle: "Social Proof & FOMO",
    channels: ["Google Ads", "Facebook Ads"],
    reasoning: "User visited product page — high intent signal. Deploy retargeting with urgency-based messaging.",
  },
  download: {
    strategy: "Lead Nurture Sequence",
    messagingAngle: "Educational Value",
    channels: ["Email", "LinkedIn"],
    reasoning: "Asset download signals research phase. Begin 5-touch nurture sequence with case studies.",
  },
  signup: {
    strategy: "Activation Campaign",
    messagingAngle: "Quick Win Demonstration",
    channels: ["Email", "In-App"],
    reasoning: "New signup — critical 48-hour activation window. Push to first value moment immediately.",
  },
  purchase: {
    strategy: "Upsell & Expansion",
    messagingAngle: "Upgrade Value Ladder",
    channels: ["Email", "CRM"],
    reasoning: "Buyer signal confirmed. Trigger upsell sequence after 7-day honeymoon period.",
  },
  engagement: {
    strategy: "Referral Campaign",
    messagingAngle: "Community & Belonging",
    channels: ["Email", "Social"],
    reasoning: "High engagement score detected. User is a potential advocate — trigger referral program.",
  },
  cart_abandon: {
    strategy: "Cart Recovery",
    messagingAngle: "Urgency + Incentive",
    channels: ["Email", "SMS", "Retargeting"],
    reasoning: "Cart abandonment with 2-hour delay. Deploy 3-step recovery: reminder, social proof, discount.",
  },
};

const contentMap: Record<string, { type: string; title: string; body: string; subject?: string; cta: string }> = {
  page_visit: {
    type: "ad_copy",
    title: "Retargeting Ad — Product Page Visitor",
    body: "Still thinking it over? Join 5,000+ teams who chose BrandOS to 10x their marketing ROI. Limited spots available this quarter.",
    cta: "Claim Your Spot",
  },
  download: {
    type: "email",
    title: "Lead Nurture Email — Resource Downloader",
    subject: "Your next step after downloading [Resource Name]",
    body: "Thanks for grabbing the guide. Here's what high-growth teams do in the first 30 days: [3 specific action items with data]. Want to see how we implement this for companies like yours?",
    cta: "Book a 20-Minute Strategy Call",
  },
  signup: {
    type: "email",
    title: "Activation Email — New Signup",
    subject: "Your BrandOS is ready. Here's your 5-minute setup.",
    body: "You're 5 minutes from your first AI-generated campaign. Step 1: Upload your brand voice. Step 2: Define one persona. Step 3: Simulate your first workflow. Most teams see their first insight within 15 minutes.",
    cta: "Complete Setup Now",
  },
  purchase: {
    type: "email",
    title: "Upsell Email — Recent Buyer",
    subject: "You're on the Growth plan. Here's what Pro unlocks.",
    body: "Your first 30 days showed [X% improvement]. Teams on Pro see an additional 40% lift in campaign ROI. Here's exactly what changes with the upgrade.",
    cta: "Upgrade to Pro",
  },
  engagement: {
    type: "social_post",
    title: "Referral Campaign — High Engagement User",
    body: "Our top users are building marketing engines, not campaigns. Share BrandOS with your network and earn 3 months free for every team you bring in.",
    cta: "Get Your Referral Link",
  },
  cart_abandon: {
    type: "email",
    title: "Cart Recovery Email — Abandoned Checkout",
    subject: "Your cart is expiring in 2 hours",
    body: "You were this close. Your cart with [Product Name] is reserved for the next 2 hours. 847 teams joined this month — don't miss the momentum.",
    cta: "Complete My Order",
  },
};

router.get("/events", async (req, res): Promise<void> => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
  const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.createdAt)).limit(limit);
  res.json(ListEventsResponse.parse(serialize(events)));
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [event] = await db.insert(eventsTable).values(parsed.data).returning();
  res.status(201).json(serialize(event));
});

router.post("/events/simulate", async (req, res): Promise<void> => {
  const parsed = SimulateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { eventType, personaId } = parsed.data;

  let persona: { name: string } | undefined;
  if (personaId) {
    const found = await db.select().from(personasTable).where(sql`${personasTable.id} = ${personaId}`).limit(1);
    if (found.length > 0) persona = found[0];
  }

  const userId = persona ? `user_${persona.name.toLowerCase().replace(/\s+/g, "_")}` : `user_sim_${Date.now()}`;

  const [event] = await db.insert(eventsTable).values({
    type: eventType,
    userId,
    page: `/${eventType.replace("_", "-")}`,
    metadata: { simulated: true, personaId: personaId ?? null },
    triggeredAction: strategyMap[eventType]?.strategy ?? "Automated Response",
  }).returning();

  const decisionData = strategyMap[eventType] ?? {
    strategy: "General Campaign",
    messagingAngle: "Brand Awareness",
    channels: ["Email", "Social"],
    reasoning: "Default response to user signal.",
  };

  const [decision] = await db.insert(decisionsTable).values({
    trigger: `${eventType} event detected`,
    strategy: decisionData.strategy,
    messagingAngle: decisionData.messagingAngle,
    channels: decisionData.channels,
    confidence: 0.82 + Math.random() * 0.15,
    reasoning: decisionData.reasoning,
    status: "active",
  }).returning();

  const contentData = contentMap[eventType] ?? {
    type: "ad_copy",
    title: `${decisionData.strategy} Content`,
    body: "Compelling marketing message tailored to your audience.",
    cta: "Learn More",
  };

  const [content] = await db.insert(contentTable).values({
    type: contentData.type,
    title: contentData.title,
    body: contentData.body,
    subject: contentData.subject,
    cta: contentData.cta,
    channel: decisionData.channels[0] ?? "Email",
    personaId: personaId,
    decisionId: decision.id,
    status: "ready",
  }).returning();

  const [campaign] = await db.insert(campaignsTable).values({
    name: `${decisionData.strategy} — ${new Date().toLocaleDateString()}`,
    status: "active",
    channel: decisionData.channels[0] ?? "Email",
    budget: 1500 + Math.floor(Math.random() * 3500),
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cvr: 0,
    startDate: new Date().toISOString().split("T")[0],
  }).returning();

  const result = {
    event,
    decision,
    content,
    campaign,
    message: `Workflow simulated: ${eventType} → ${decisionData.strategy} → ${contentData.type} → Campaign activated`,
  };

  res.json(SimulateEventResponse.parse(serialize(result)));
});

router.get("/events/summary", async (_req, res): Promise<void> => {
  const events = await db.select().from(eventsTable);

  const byType: Record<string, number> = {};
  for (const e of events) {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
  }

  const recent = await db.select().from(eventsTable).orderBy(desc(eventsTable.createdAt)).limit(10);

  res.json(GetEventsSummaryResponse.parse(serialize({
    total: events.length,
    byType,
    recentActivity: recent,
  })));
});

export default router;

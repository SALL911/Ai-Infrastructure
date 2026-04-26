import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, contentTable } from "@workspace/db";
import {
  ListContentResponse,
  GenerateContentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const contentTemplates: Record<string, { title: string; body: string; subject?: string; cta: string }[]> = {
  ad_copy: [
    { title: "Performance Max Ad — Growth Angle", body: "Stop spending 3x more for half the results. BrandOS AI builds your full marketing engine in minutes, not months. 5,000+ teams already switched.", cta: "Start Free Trial" },
    { title: "Brand Awareness Ad — Authority Signal", body: "Your competitors are using AI to outmarket you. BrandOS gives your team the same intelligence edge — without the data science team.", cta: "See How It Works" },
  ],
  email: [
    { title: "Cold Outreach — Pain Point Lead", subject: "Why your marketing feels like guessing", body: "Most marketing decisions are still made by gut feeling. BrandOS changes that — every campaign decision is backed by real behavioral data, AI reasoning, and feedback loops that actually learn.", cta: "Book a Demo" },
    { title: "Nurture Email — Case Study", subject: "[Company] went from 2.1% to 8.7% CVR in 30 days", body: "Here's the exact playbook: 1) Unified their brand voice across all channels. 2) Built 3 distinct personas. 3) Triggered AI campaign sequences based on behavior. Results: 315% CVR improvement.", cta: "Download the Full Case Study" },
  ],
  landing_page: [
    { title: "Lead Gen Landing Page — Problem/Solution", body: "HEADLINE: Your Marketing Runs on Guesswork. Ours Runs on AI.\n\nSUBHEAD: BrandOS connects your brand data, customer signals, and AI decision-making into one automated marketing engine.\n\nPROBLEM: Most teams waste 60% of their budget on misaligned messaging, wrong channels, and content that doesn't convert.\n\nSOLUTION: BrandOS uses real-time behavioral data to trigger the right message, to the right persona, at the right moment — automatically.", cta: "Get Early Access" },
  ],
  script: [
    { title: "60-Second Sales Script — Discovery Call", body: "Opening: 'Before I tell you about BrandOS, I want to understand your current setup. When your team creates a campaign, how do you decide what to say and where to run it?'\n\nPain Agitation: 'So you're essentially starting from scratch each time. That means your best campaign learnings aren't feeding into the next one.'\n\nValue Bridge: 'BrandOS creates a living brand intelligence layer — every campaign result feeds back into your strategy automatically.'\n\nClose: 'Would it be worth 15 minutes to see how teams like yours cut campaign creation time by 80%?'", cta: "Download Full Script Deck" },
  ],
  social_post: [
    { title: "LinkedIn Thought Leadership Post", body: "The marketing teams winning in 2025 have one thing in common:\n\nThey stopped treating every campaign as a standalone project.\n\nInstead, they built a brand intelligence system where:\n→ Every visitor signal triggers an AI decision\n→ Every piece of content is persona-matched\n→ Every result feeds back into the strategy\n\nThat's BrandOS. That's the difference between marketing and a marketing engine.", cta: "Learn More" },
  ],
};

router.get("/content", async (_req, res): Promise<void> => {
  const content = await db.select().from(contentTable).orderBy(desc(contentTable.createdAt)).limit(50);
  res.json(ListContentResponse.parse(content));
});

router.post("/content", async (req, res): Promise<void> => {
  const parsed = GenerateContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const templates = contentTemplates[parsed.data.type] ?? contentTemplates.ad_copy;
  const template = templates[Math.floor(Math.random() * templates.length)];

  const [content] = await db.insert(contentTable).values({
    type: parsed.data.type,
    title: template.title,
    body: template.body,
    subject: template.subject,
    cta: template.cta,
    channel: parsed.data.channel,
    personaId: parsed.data.personaId,
    decisionId: parsed.data.decisionId,
    status: "ready",
  }).returning();

  res.status(201).json(content);
});

export default router;

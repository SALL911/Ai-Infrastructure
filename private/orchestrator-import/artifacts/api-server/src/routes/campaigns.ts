import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, campaignsTable } from "@workspace/db";
import {
  ListCampaignsResponse,
  CreateCampaignBody,
  UpdateCampaignParams,
  UpdateCampaignBody,
  UpdateCampaignResponse,
} from "@workspace/api-zod";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

router.get("/campaigns", async (_req, res): Promise<void> => {
  const campaigns = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.createdAt));
  res.json(ListCampaignsResponse.parse(serialize(campaigns)));
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [campaign] = await db.insert(campaignsTable).values({
    name: parsed.data.name,
    channel: parsed.data.channel,
    budget: parsed.data.budget,
    status: "draft",
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cvr: 0,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
  }).returning();
  res.status(201).json(serialize(campaign));
});

router.put("/campaigns/:id", async (req, res): Promise<void> => {
  const params = UpdateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [campaign] = await db.update(campaignsTable).set(parsed.data).where(eq(campaignsTable.id, params.data.id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(UpdateCampaignResponse.parse(serialize(campaign)));
});

export default router;

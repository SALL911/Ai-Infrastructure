import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, brandTable } from "@workspace/db";
import {
  GetBrandResponse,
  UpdateBrandBody,
  UpdateBrandResponse,
} from "@workspace/api-zod";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

router.get("/brand", async (req, res): Promise<void> => {
  const brands = await db.select().from(brandTable).limit(1);
  if (brands.length === 0) {
    const [brand] = await db.insert(brandTable).values({
      name: "BrandOS",
      tagline: "AI-Powered Marketing Infrastructure",
      voice: "Confident, data-driven, and empowering",
      tone: "Professional yet approachable",
      primaryColor: "#6366f1",
      messagingFramework: "Problem-Agitate-Solve with data-backed proof points",
      valuePropositions: ["AI automation at scale", "Real-time decision making", "Unified marketing intelligence"],
      targetMarket: "B2B SaaS growth teams and digital marketers",
    }).returning();
    res.json(GetBrandResponse.parse(serialize(brand)));
    return;
  }
  res.json(GetBrandResponse.parse(serialize(brands[0])));
});

router.put("/brand", async (req, res): Promise<void> => {
  const parsed = UpdateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const brands = await db.select().from(brandTable).limit(1);
  let brand;
  if (brands.length === 0) {
    const [created] = await db.insert(brandTable).values({
      name: parsed.data.name ?? "BrandOS",
      tagline: parsed.data.tagline ?? "",
      voice: parsed.data.voice ?? "",
      tone: parsed.data.tone ?? "",
      primaryColor: parsed.data.primaryColor ?? "#6366f1",
      messagingFramework: parsed.data.messagingFramework ?? "",
      valuePropositions: parsed.data.valuePropositions ?? [],
      targetMarket: parsed.data.targetMarket ?? "",
    }).returning();
    brand = created;
  } else {
    const [updated] = await db.update(brandTable).set(parsed.data).where(eq(brandTable.id, brands[0].id)).returning();
    brand = updated;
  }
  res.json(UpdateBrandResponse.parse(serialize(brand)));
});

export default router;

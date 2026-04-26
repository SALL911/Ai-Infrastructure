import { Router, type IRouter } from "express";
import { eq, desc, asc, sql } from "drizzle-orm";
import { db, taiwanBrandsTable } from "@workspace/db";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

router.get("/rankings", async (req, res): Promise<void> => {
  const { industry, limit, sort } = req.query;
  let query = db.select().from(taiwanBrandsTable);
  const conditions: ReturnType<typeof eq>[] = [];
  if (industry && industry !== "all") {
    conditions.push(eq(taiwanBrandsTable.industry, String(industry)));
  }
  const results = await db
    .select()
    .from(taiwanBrandsTable)
    .where(industry && industry !== "all" ? eq(taiwanBrandsTable.industry, String(industry)) : undefined)
    .orderBy(sort === "asc" ? asc(taiwanBrandsTable.score) : desc(taiwanBrandsTable.score))
    .limit(limit ? parseInt(String(limit), 10) : 50);
  res.json(serialize(results));
});

router.get("/rankings/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [brand] = await db.select().from(taiwanBrandsTable).where(eq(taiwanBrandsTable.id, id)).limit(1);
  if (!brand) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }
  res.json(serialize(brand));
});

router.post("/rankings/:id/claim", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { company, email, name } = req.body;
  if (isNaN(id) || !email) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [brand] = await db
    .update(taiwanBrandsTable)
    .set({ claimed: true, claimedBy: email, updatedAt: new Date() })
    .where(eq(taiwanBrandsTable.id, id))
    .returning();
  if (!brand) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }
  res.json({
    success: true,
    message: `品牌申請成功！我們的團隊將在 24 小時內與您聯繫。`,
    brand: serialize(brand),
  });
});

router.get("/rankings/stats/summary", async (_req, res): Promise<void> => {
  const brands = await db.select().from(taiwanBrandsTable);
  const total = brands.length;
  const avgScore = total > 0 ? Math.round(brands.reduce((s, b) => s + b.score, 0) / total) : 0;
  const rising = brands.filter((b) => b.weekChange > 0).length;
  const falling = brands.filter((b) => b.weekChange < 0).length;
  const claimed = brands.filter((b) => b.claimed).length;
  const byIndustry = brands.reduce<Record<string, number>>((acc, b) => {
    acc[b.industry] = (acc[b.industry] ?? 0) + 1;
    return acc;
  }, {});
  const topBrands = brands.sort((a, b) => b.score - a.score).slice(0, 5).map((b) => ({
    id: b.id, name: b.name, score: b.score, industry: b.industry, weekChange: b.weekChange,
  }));
  res.json(serialize({ total, avgScore, rising, falling, claimed, byIndustry, topBrands }));
});

export default router;

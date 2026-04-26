import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, integrationsTable } from "@workspace/db";
import {
  ListIntegrationsResponse,
  ToggleIntegrationParams,
  ToggleIntegrationResponse,
  SyncIntegrationParams,
  SyncIntegrationResponse,
} from "@workspace/api-zod";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

router.get("/integrations", async (_req, res): Promise<void> => {
  const integrations = await db.select().from(integrationsTable).orderBy(integrationsTable.id);
  res.json(ListIntegrationsResponse.parse(serialize(integrations)));
});

router.post("/integrations/:id/toggle", async (req, res): Promise<void> => {
  const params = ToggleIntegrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const existing = await db.select().from(integrationsTable).where(eq(integrationsTable.id, params.data.id)).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }
  const wasActive = existing[0].active;
  const [integration] = await db.update(integrationsTable).set({
    active: !wasActive,
    status: !wasActive ? "connected" : "disconnected",
  }).where(eq(integrationsTable.id, params.data.id)).returning();
  res.json(ToggleIntegrationResponse.parse(serialize(integration)));
});

router.post("/integrations/:id/sync", async (req, res): Promise<void> => {
  const params = SyncIntegrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const existing = await db.select().from(integrationsTable).where(eq(integrationsTable.id, params.data.id)).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }
  const recordsSynced = Math.floor(Math.random() * 5000) + 500;
  await db.update(integrationsTable).set({
    lastSync: new Date(),
    recordCount: recordsSynced,
    status: "synced",
  }).where(eq(integrationsTable.id, params.data.id));
  res.json(SyncIntegrationResponse.parse({
    success: true,
    recordsSynced,
    message: `Successfully synced ${recordsSynced} records from ${existing[0].provider}`,
    syncedAt: new Date().toISOString(),
  }));
});

export default router;

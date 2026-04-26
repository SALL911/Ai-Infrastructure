import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, personasTable } from "@workspace/db";
import {
  ListPersonasResponse,
  CreatePersonaBody,
  UpdatePersonaParams,
  UpdatePersonaBody,
  UpdatePersonaResponse,
  DeletePersonaParams,
} from "@workspace/api-zod";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

router.get("/personas", async (_req, res): Promise<void> => {
  const personas = await db.select().from(personasTable).orderBy(personasTable.createdAt);
  res.json(ListPersonasResponse.parse(serialize(personas)));
});

router.post("/personas", async (req, res): Promise<void> => {
  const parsed = CreatePersonaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [persona] = await db.insert(personasTable).values({
    name: parsed.data.name,
    role: parsed.data.role,
    age: parsed.data.age ?? "",
    segment: parsed.data.segment ?? "",
    painPoints: parsed.data.painPoints ?? [],
    goals: parsed.data.goals ?? [],
    channels: parsed.data.channels ?? [],
    engagementScore: parsed.data.engagementScore ?? 0,
  }).returning();
  res.status(201).json(serialize(persona));
});

router.put("/personas/:id", async (req, res): Promise<void> => {
  const params = UpdatePersonaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePersonaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [persona] = await db.update(personasTable).set(parsed.data).where(eq(personasTable.id, params.data.id)).returning();
  if (!persona) {
    res.status(404).json({ error: "Persona not found" });
    return;
  }
  res.json(UpdatePersonaResponse.parse(serialize(persona)));
});

router.delete("/personas/:id", async (req, res): Promise<void> => {
  const params = DeletePersonaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [persona] = await db.delete(personasTable).where(eq(personasTable.id, params.data.id)).returning();
  if (!persona) {
    res.status(404).json({ error: "Persona not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;

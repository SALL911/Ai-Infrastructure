import { pgTable, text, serial, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const personasTable = pgTable("personas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  age: text("age").notNull().default(""),
  painPoints: text("pain_points").array().notNull().default([]),
  goals: text("goals").array().notNull().default([]),
  channels: text("channels").array().notNull().default([]),
  segment: text("segment").notNull().default(""),
  engagementScore: real("engagement_score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPersonaSchema = createInsertSchema(personasTable).omit({ id: true, createdAt: true });
export type InsertPersona = z.infer<typeof insertPersonaSchema>;
export type Persona = typeof personasTable.$inferSelect;

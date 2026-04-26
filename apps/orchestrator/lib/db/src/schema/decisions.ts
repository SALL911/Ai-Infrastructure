import { pgTable, text, serial, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const decisionsTable = pgTable("ai_decisions", {
  id: serial("id").primaryKey(),
  trigger: text("trigger").notNull(),
  strategy: text("strategy").notNull(),
  messagingAngle: text("messaging_angle").notNull(),
  channels: text("channels").array().notNull().default([]),
  confidence: real("confidence").notNull().default(0.8),
  reasoning: text("reasoning").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDecisionSchema = createInsertSchema(decisionsTable).omit({ id: true, createdAt: true });
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type AiDecision = typeof decisionsTable.$inferSelect;

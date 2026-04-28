import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentTable = pgTable("generated_content", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  subject: text("subject"),
  cta: text("cta"),
  channel: text("channel").notNull(),
  personaId: integer("persona_id"),
  decisionId: integer("decision_id"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContentSchema = createInsertSchema(contentTable).omit({ id: true, createdAt: true });
export type InsertContent = z.infer<typeof insertContentSchema>;
export type GeneratedContent = typeof contentTable.$inferSelect;

import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandTable = pgTable("brand", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  voice: text("voice").notNull().default(""),
  tone: text("tone").notNull().default(""),
  primaryColor: text("primary_color").notNull().default("#6366f1"),
  messagingFramework: text("messaging_framework").notNull().default(""),
  valuePropositions: text("value_propositions").array().notNull().default([]),
  targetMarket: text("target_market").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBrandSchema = createInsertSchema(brandTable).omit({ id: true, updatedAt: true });
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brandTable.$inferSelect;

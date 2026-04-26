import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("brand_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  userId: text("user_id").notNull(),
  page: text("page").notNull(),
  metadata: jsonb("metadata").default({}),
  triggeredAction: text("triggered_action"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type BrandEvent = typeof eventsTable.$inferSelect;

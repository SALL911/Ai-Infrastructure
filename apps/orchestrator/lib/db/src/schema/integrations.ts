import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const integrationsTable = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  active: boolean("active").notNull().default(false),
  lastSync: timestamp("last_sync", { withTimezone: true }),
  recordCount: integer("record_count").notNull().default(0),
  status: text("status").notNull().default("disconnected"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIntegrationSchema = createInsertSchema(integrationsTable).omit({ id: true, createdAt: true });
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrationsTable.$inferSelect;

import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const taiwanBrandsTable = pgTable("taiwan_brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  ticker: text("ticker").notNull(),
  industry: text("industry").notNull(),
  score: integer("score").notNull().default(0),
  weekChange: integer("week_change").notNull().default(0),
  status: text("status").notNull().default("stable"),
  description: text("description").notNull().default(""),
  website: text("website").notNull().default(""),
  employees: text("employees").notNull().default(""),
  marketCap: text("market_cap").notNull().default(""),
  knowledgeGraph: integer("knowledge_graph").notNull().default(0),
  aiCitation: integer("ai_citation").notNull().default(0),
  semanticSearch: integer("semantic_search").notNull().default(0),
  multimodal: integer("multimodal").notNull().default(0),
  claimed: boolean("claimed").notNull().default(false),
  claimedBy: text("claimed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TaiwanBrand = typeof taiwanBrandsTable.$inferSelect;
export type InsertTaiwanBrand = typeof taiwanBrandsTable.$inferInsert;

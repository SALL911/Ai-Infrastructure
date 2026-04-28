import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// orchestrator 共用既有 Symcio Supabase project（19 張表），drizzle-kit
// 預設會 introspect 整個 public schema 撞到不認得的 RLS / custom type
// 就 bail。用 tablesFilter 限定只管自己這 8 張，跟 Symcio 主表解耦。
export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  tablesFilter: [
    "brand",
    "personas",
    "brand_events",
    "ai_decisions",
    "generated_content",
    "campaigns",
    "integrations",
    "taiwan_brands",
  ],
});

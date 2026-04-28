import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "../drizzle");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

console.log(`Applying migrations from ${migrationsFolder}...`);
await migrate(db, { migrationsFolder });
console.log("Migrations applied.");
await pool.end();

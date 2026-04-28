import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Diagnostic: print the URL parts (NOT the password) so we can verify
// the secret actually has the format we think it has.
try {
  const u = new URL(process.env.DATABASE_URL);
  console.log("Connecting:", {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port,
    username: u.username,
    pathname: u.pathname,
    passwordLength: u.password.length,
  });
} catch (e) {
  console.error("DATABASE_URL is not a valid URL:", (e as Error).message);
  console.error("First 30 chars:", process.env.DATABASE_URL.slice(0, 30));
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "../drizzle");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

console.log(`Applying migrations from ${migrationsFolder}...`);
await migrate(db, { migrationsFolder });
console.log("Migrations applied.");
await pool.end();

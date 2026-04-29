// Vercel Serverless catch-all for /api/*. Plain ESM JS so @vercel/node
// does NOT invoke tsc on it (the previous .ts version failed with
// "Emit skipped" because the import chain reached workspace packages
// that export .ts via the `workspace` customCondition, which tsc under
// Vercel can't resolve).
//
// We import the pre-built bundle produced by the api-server's esbuild
// step (artifacts/api-server/dist/app.mjs). That file is fully bundled
// JS — no further TypeScript or workspace-resolution happens at deploy
// time. Express's `app` instance is itself a (req, res) handler.
import app from "../artifacts/api-server/dist/app.mjs";

export default app;

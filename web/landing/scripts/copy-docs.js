#!/usr/bin/env node
/**
 * Build-time helper: copy the repo's /docs/*.md into web/landing/.docs-cache/
 * before next build runs. Why:
 *
 * Vercel's "Root Directory" setting (web/landing) sandboxes the build context.
 * On some runs, files at ../../docs are accessible at build time (and were
 * during local testing), but in others Vercel restricts the resolution and
 * the SSG generator silently fails — yielding /docs 404 in production.
 *
 * Copying to a path inside the project root makes the read deterministic.
 * The cache directory is gitignored; this script regenerates it every build.
 */

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(PROJECT_ROOT, "..", "..");
const SRC = path.join(REPO_ROOT, "docs");
const DEST = path.join(PROJECT_ROOT, ".docs-cache");

function main() {
  if (!fs.existsSync(SRC)) {
    console.warn(`[copy-docs] source missing: ${SRC} — skipping`);
    return;
  }

  fs.mkdirSync(DEST, { recursive: true });

  // Clean stale .md files (keep .gitkeep / README if present)
  for (const f of fs.readdirSync(DEST)) {
    if (f.endsWith(".md")) fs.rmSync(path.join(DEST, f));
  }

  let copied = 0;
  for (const f of fs.readdirSync(SRC)) {
    if (!f.endsWith(".md")) continue;
    fs.copyFileSync(path.join(SRC, f), path.join(DEST, f));
    copied++;
  }

  console.log(`[copy-docs] copied ${copied} markdown files → .docs-cache/`);
}

main();

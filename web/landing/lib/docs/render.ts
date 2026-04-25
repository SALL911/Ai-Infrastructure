/**
 * Markdown → sanitized HTML rendering for /docs.
 *
 * Runs at build time (or on first SSR) since /docs pages are dynamic = force-static.
 * Uses unified/remark pipeline:
 *   gray-matter  → pulls YAML frontmatter (title/description)
 *   remark       → markdown AST
 *   remark-gfm   → tables, strikethrough, task lists
 *   remark-html  → serialize AST to HTML with sanitize=true
 */

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

export interface RenderedDoc {
  title: string | null;
  description: string | null;
  html: string;
  word_count: number;
  updated_at: string | null;
}

// Resolve docs from two locations, in order:
//   1. web/landing/.docs-cache/  ← populated by scripts/copy-docs.js prebuild
//      (Vercel-safe: always inside the project root)
//   2. ../../docs/                ← repo-root/docs (works locally; may fail
//      under Vercel's "Root Directory" sandbox on some builds)
const DOCS_CACHE = path.resolve(process.cwd(), ".docs-cache");
const DOCS_REPO_ROOT = path.resolve(process.cwd(), "..", "..", "docs");

async function readDoc(filename: string): Promise<{
  raw: string;
  stats: import("fs").Stats;
} | null> {
  for (const dir of [DOCS_CACHE, DOCS_REPO_ROOT]) {
    try {
      const abs = path.join(dir, filename);
      const raw = await fs.readFile(abs, "utf-8");
      const stats = await fs.stat(abs);
      return { raw, stats };
    } catch {
      continue;
    }
  }
  return null;
}

export async function loadDoc(filename: string): Promise<RenderedDoc | null> {
  try {
    const found = await readDoc(filename);
    if (!found) return null;
    const { raw, stats } = found;

    const { data, content } = matter(raw);
    const processed = await remark()
      .use(remarkGfm)
      .use(remarkHtml, { sanitize: true })
      .process(content);

    return {
      title: (data.title as string | undefined) ?? extractH1(content),
      description: (data.description as string | undefined) ?? null,
      html: String(processed),
      word_count: content.trim().length,
      updated_at: stats.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

function extractH1(md: string): string | null {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

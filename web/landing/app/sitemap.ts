import type { MetadataRoute } from "next";
import { DOCS_REGISTRY } from "@/lib/docs/registry";
import { FAQ_CATEGORIES } from "@/lib/faq-data";
import { createClient } from "@/lib/supabase/server";

/**
 * Dynamic sitemap — replaces the hand-maintained public/sitemap.xml.
 *
 * Includes:
 *   - Static marketing routes
 *   - All FAQ categories (5)
 *   - All public docs (DOCS_REGISTRY)
 *   - All published news items (last 200)
 *
 * Skipped:
 *   - Auth + dashboard pages (logged-in only)
 *   - API routes
 *   - /reset-password etc. (recovery-only, no SEO value)
 */

export const revalidate = 3600; // re-build hourly

const SITE = "https://symcio.tw";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1.0, lastModified: now },
    { url: `${SITE}/audit`, changeFrequency: "weekly", priority: 0.9, lastModified: now },
    { url: `${SITE}/news`, changeFrequency: "daily", priority: 0.9, lastModified: now },
    { url: `${SITE}/pricing`, changeFrequency: "monthly", priority: 0.9, lastModified: now },
    { url: `${SITE}/docs`, changeFrequency: "weekly", priority: 0.9, lastModified: now },
    { url: `${SITE}/tools`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${SITE}/tools/brand-check`, changeFrequency: "monthly", priority: 0.8, lastModified: now },
    { url: `${SITE}/tools/entity-builder`, changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: `${SITE}/schema-generator`, changeFrequency: "monthly", priority: 0.6, lastModified: now },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.8, lastModified: now },
    { url: `${SITE}/llms.txt`, changeFrequency: "monthly", priority: 0.4, lastModified: now },
  ];

  const faqRoutes: MetadataRoute.Sitemap = FAQ_CATEGORIES.map((cat) => ({
    url: `${SITE}/faq/${cat.key}`,
    changeFrequency: "monthly",
    priority: 0.7,
    lastModified: now,
  }));

  const docRoutes: MetadataRoute.Sitemap = DOCS_REGISTRY.map((d) => ({
    url: `${SITE}/docs/${d.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
    lastModified: now,
  }));

  // News routes — query Supabase for published items if configured.
  let newsRoutes: MetadataRoute.Sitemap = [];
  try {
    const sb = createClient();
    const { data } = await sb
      .from("news_items")
      .select("slug, published_at, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200);

    if (Array.isArray(data)) {
      newsRoutes = data.map((n) => ({
        url: `${SITE}/news/${n.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
        lastModified: new Date(
          (n.published_at as string | null) ??
            (n.created_at as string | null) ??
            now,
        ),
      }));
    }
  } catch {
    // Supabase env not set during build — skip news routes; static sitemap
    // still ships.
  }

  return [...staticRoutes, ...faqRoutes, ...docRoutes, ...newsRoutes];
}

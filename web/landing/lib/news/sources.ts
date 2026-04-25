/**
 * ESG / SDG / brand-valuation RSS feed registry.
 *
 * Add new sources here. Each source is fetched once per cron run by
 * /api/cron/fetch-news. Dedupe is by source_url (unique constraint).
 */

export interface NewsSource {
  id: string;                          // stable slug, never changes
  label: string;                       // human-readable name
  url: string;                         // RSS / Atom feed URL
  category: "esg" | "sdg" | "tnfd" | "brand-valuation" | "climate";
  sdg_number?: number;                 // 1–17 if SDG-specific
  language: string;                    // feed primary language
  max_items_per_run?: number;          // default 5
  enabled: boolean;
}

export const NEWS_SOURCES: NewsSource[] = [
  // ---------- SDG / 聯合國 ----------
  {
    id: "un-sdg",
    label: "UN News — Sustainable Development Goals",
    url: "https://news.un.org/feed/subscribe/en/news/topic/sustainable-development-goals/feed",
    category: "sdg",
    language: "en",
    max_items_per_run: 5,
    enabled: true,
  },
  {
    id: "sdg-knowledge-hub",
    label: "SDG Knowledge Hub (IISD)",
    url: "https://sdg.iisd.org/feed/",
    category: "sdg",
    language: "en",
    max_items_per_run: 5,
    enabled: true,
  },

  // ---------- SDG 1 終結貧窮（專頻） ----------
  {
    id: "un-sdg-poverty",
    label: "UN News — Poverty (SDG 1)",
    url: "https://news.un.org/feed/subscribe/en/news/topic/poverty/feed",
    category: "sdg",
    sdg_number: 1,
    language: "en",
    max_items_per_run: 8,
    enabled: true,
  },

  // ---------- TNFD / 自然資本 ----------
  {
    id: "tnfd",
    label: "TNFD — Taskforce on Nature-related Financial Disclosures",
    url: "https://tnfd.global/news/feed/",
    category: "tnfd",
    language: "en",
    max_items_per_run: 5,
    enabled: true,
  },

  // ---------- 永續報告標準 ----------
  {
    id: "gri",
    label: "Global Reporting Initiative (GRI)",
    url: "https://www.globalreporting.org/news/rss/",
    category: "esg",
    language: "en",
    max_items_per_run: 3,
    enabled: true,
  },
  {
    id: "ifrs-sustainability",
    label: "IFRS Foundation — Sustainability",
    url: "https://www.ifrs.org/news-and-events/rss-feeds/?rssFeed=Sustainability",
    category: "esg",
    language: "en",
    max_items_per_run: 3,
    enabled: true,
  },

  // ---------- 氣候揭露 ----------
  {
    id: "cdp",
    label: "CDP — Climate Disclosure Project",
    url: "https://www.cdp.net/en/articles.rss",
    category: "climate",
    language: "en",
    max_items_per_run: 3,
    enabled: true,
  },

  // ---------- 財經 / 品牌估值 ----------
  {
    id: "reuters-sustainable-business",
    label: "Reuters — Sustainable Business",
    url: "https://www.reutersagency.com/feed/?best-topics=sustainable-business",
    category: "brand-valuation",
    language: "en",
    max_items_per_run: 3,
    enabled: true,
  },
];

export function enabledSources(): NewsSource[] {
  return NEWS_SOURCES.filter((s) => s.enabled);
}

export function sourceById(id: string): NewsSource | undefined {
  return NEWS_SOURCES.find((s) => s.id === id);
}

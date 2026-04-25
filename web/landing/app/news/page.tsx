import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "每日 ESG × SDG 新聞 · BCI 視角 — Symcio",
  description:
    "Symcio AI 每日整理全球 ESG / SDG / TNFD / 永續財務揭露新聞，附上 Brand Capital Index 視角解讀。跨 UN / TNFD / GRI / CDP / IFRS 等權威來源。",
};

export const dynamic = "force-dynamic";
export const revalidate = 600; // 10 min

interface NewsRow {
  id: string;
  slug: string;
  title_zh: string;
  summary_zh: string;
  category: string;
  sdg_number: number | null;
  tags: string[] | null;
  source: string;
  published_at: string | null;
  created_at: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  sdg: "SDG",
  tnfd: "TNFD",
  esg: "ESG",
  climate: "氣候",
  "brand-valuation": "品牌估值",
  other: "其他",
};

const CATEGORY_COLOR: Record<string, string> = {
  sdg: "bg-excellent/15 text-excellent border-excellent/30",
  tnfd: "bg-good/15 text-good border-good/30",
  esg: "bg-accent/15 text-accent border-accent/30",
  climate: "bg-warning/15 text-warning border-warning/30",
  "brand-valuation": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  other: "bg-line text-muted border-line-soft",
};

export default async function NewsIndexPage({
  searchParams,
}: {
  searchParams: { category?: string; sdg?: string };
}) {
  const sb = createClient();

  let query = sb
    .from("news_items")
    .select(
      "id, slug, title_zh, summary_zh, category, sdg_number, tags, source, published_at, created_at",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  if (searchParams.category) {
    query = query.eq("category", searchParams.category);
  }
  if (searchParams.sdg) {
    const n = parseInt(searchParams.sdg, 10);
    if (!Number.isNaN(n)) query = query.eq("sdg_number", n);
  }

  const { data: rows, error } = await query;
  const list = (rows as NewsRow[] | null) ?? [];

  const activeCat = searchParams.category;
  const activeSdg = searchParams.sdg;

  return (
    <main className="min-h-screen bg-ink text-white">
      <Navigation />

      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
            Symcio · 每日新聞 × BCI 視角
          </p>
          <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">
            AI 整理的 ESG / SDG 新聞
            <br />
            附 Brand Capital 解讀
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted md:text-lg">
            每日自動抓取 UN News、TNFD、GRI、CDP、IFRS Foundation、Reuters
            Sustainable Business 等來源，Claude AI 整理成繁中摘要 +
            Symcio BCI 視角。方法論開源於 GitHub。
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <FilterChip active={!activeCat && !activeSdg} href="/news" label="全部" />
            <FilterChip
              active={activeCat === "sdg"}
              href="/news?category=sdg"
              label="SDG"
            />
            <FilterChip
              active={activeCat === "tnfd"}
              href="/news?category=tnfd"
              label="TNFD"
            />
            <FilterChip
              active={activeCat === "climate"}
              href="/news?category=climate"
              label="氣候"
            />
            <FilterChip
              active={activeCat === "brand-valuation"}
              href="/news?category=brand-valuation"
              label="品牌估值"
            />
            <FilterChip
              active={activeSdg === "1"}
              href="/news?sdg=1"
              label="SDG1 終結貧窮"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-5xl px-6 py-12">
          {error && (
            <div className="rounded-card border border-danger/40 bg-danger/10 p-5 text-sm text-danger">
              載入失敗：{error.message}
            </div>
          )}

          {list.length === 0 ? (
            <div className="rounded-card border border-dashed border-line-soft bg-surface p-12 text-center">
              <p className="text-muted">目前沒有符合條件的新聞。每日 09:00 台北時間自動更新。</p>
              <div className="mt-6">
                <Link
                  href="/news"
                  className="font-mono text-xs text-accent no-underline"
                >
                  查看全部 →
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {list.map((n) => (
                <Link
                  key={n.id}
                  href={`/news/${n.slug}`}
                  className="group rounded-card border border-line bg-surface p-6 no-underline transition hover:border-accent"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[1px] ${
                        CATEGORY_COLOR[n.category] ?? CATEGORY_COLOR.other
                      }`}
                    >
                      {CATEGORY_LABEL[n.category] ?? n.category}
                    </span>
                    {n.sdg_number && (
                      <span className="rounded-full border border-excellent/30 bg-excellent/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[1px] text-excellent">
                        SDG {n.sdg_number}
                      </span>
                    )}
                    <span className="font-mono text-[11px] text-muted">
                      {n.source}
                    </span>
                    <span className="font-mono text-[11px] text-muted-dim">
                      {formatDate(n.published_at ?? n.created_at)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-white group-hover:text-accent">
                    {n.title_zh}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {n.summary_zh}
                  </p>
                  {n.tags && n.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {n.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-line-soft px-2 py-0.5 font-mono text-[10px] text-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 font-mono text-xs text-accent group-hover:translate-x-1 transition-transform">
                    閱讀 BCI 視角 →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

function FilterChip({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 font-mono text-xs no-underline transition ${
        active
          ? "border-accent bg-accent text-ink"
          : "border-line-soft text-muted hover:border-accent hover:text-accent"
      }`}
    >
      {label}
    </Link>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

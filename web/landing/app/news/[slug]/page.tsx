import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: { slug: string };
}

export const dynamic = "force-dynamic";
export const revalidate = 600;

interface NewsDetail {
  id: string;
  slug: string;
  title_zh: string;
  summary_zh: string;
  bci_perspective: string | null;
  category: string;
  sdg_number: number | null;
  tags: string[] | null;
  source: string;
  source_url: string;
  source_title: string;
  source_author: string | null;
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

async function loadItem(slug: string): Promise<NewsDetail | null> {
  const sb = createClient();
  const { data } = await sb
    .from("news_items")
    .select(
      "id, slug, title_zh, summary_zh, bci_perspective, category, sdg_number, tags, source, source_url, source_title, source_author, published_at, created_at",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as NewsDetail | null) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await loadItem(params.slug);
  if (!item) return { title: "新聞不存在 — Symcio" };
  return {
    title: `${item.title_zh} — Symcio BCI 視角`,
    description: item.summary_zh.slice(0, 160),
    openGraph: {
      title: item.title_zh,
      description: item.summary_zh.slice(0, 200),
      type: "article",
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const item = await loadItem(params.slug);
  if (!item) notFound();

  const date = formatDate(item.published_at ?? item.created_at);

  return (
    <main className="min-h-screen bg-ink text-white">
      <Navigation />

      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <nav className="mb-8">
          <Link
            href="/news"
            className="font-mono text-xs text-muted hover:text-accent no-underline"
          >
            ← 所有新聞
          </Link>
        </nav>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[1px] text-accent">
            {CATEGORY_LABEL[item.category] ?? item.category}
          </span>
          {item.sdg_number && (
            <span className="rounded-full border border-excellent/30 bg-excellent/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[1px] text-excellent">
              SDG {item.sdg_number}
            </span>
          )}
          <span className="font-mono text-[11px] text-muted">
            {item.source}
          </span>
          {date && (
            <span className="font-mono text-[11px] text-muted-dim">· {date}</span>
          )}
        </div>

        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">
          {item.title_zh}
        </h1>

        <section className="mt-10">
          <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-[2px] text-accent">
            事實摘要
          </h2>
          <p className="text-base leading-[1.85] text-white md:text-lg">
            {item.summary_zh}
          </p>
        </section>

        {item.bci_perspective && (
          <section className="mt-10 rounded-card border-l-2 border-accent bg-surface p-6">
            <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-[2px] text-accent">
              BCI 視角 · Symcio
            </h2>
            <p className="text-base leading-[1.85] text-white">
              {item.bci_perspective}
            </p>
            <p className="mt-4 font-mono text-[11px] text-muted-dim">
              由 Claude AI 依循 Symcio BCI 方法論生成 ·{" "}
              <Link
                href="/about"
                className="text-accent no-underline hover:underline"
              >
                關於 BCI
              </Link>
            </p>
          </section>
        )}

        {item.tags && item.tags.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-line-soft px-2.5 py-1 font-mono text-[11px] text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 rounded-card border border-line bg-surface p-6">
          <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-[2px] text-accent">
            原始新聞
          </h2>
          <p className="text-sm font-semibold text-white">{item.source_title}</p>
          {item.source_author && (
            <p className="mt-1 text-xs text-muted">{item.source_author}</p>
          )}
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block font-mono text-xs text-accent no-underline hover:underline"
          >
            開啟原文 →
          </a>
        </section>

        <section className="mt-12 grid gap-3 md:grid-cols-3">
          <Link
            href="/audit"
            className="group rounded-card border border-line bg-surface p-5 no-underline transition hover:border-accent"
          >
            <div className="font-mono text-[11px] uppercase tracking-[1.5px] text-accent">
              想測自己的品牌？
            </div>
            <div className="mt-2 font-bold text-white">免費 BCI 診斷</div>
            <div className="mt-2 font-mono text-xs text-accent">
              3 分鐘 · PDF →
            </div>
          </Link>
          <Link
            href="/faq/esg"
            className="group rounded-card border border-line bg-surface p-5 no-underline transition hover:border-accent"
          >
            <div className="font-mono text-[11px] uppercase tracking-[1.5px] text-accent">
              延伸閱讀
            </div>
            <div className="mt-2 font-bold text-white">ESG FAQ</div>
            <div className="mt-2 font-mono text-xs text-accent">
              TNFD / IFRS →
            </div>
          </Link>
          <a
            href="https://discord.gg/jGWJr2Sd"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-card border border-line bg-surface p-5 no-underline transition hover:border-accent"
          >
            <div className="font-mono text-[11px] uppercase tracking-[1.5px] text-accent">
              社群
            </div>
            <div className="mt-2 font-bold text-white">Discord</div>
            <div className="mt-2 font-mono text-xs text-accent">
              #news 頻道 →
            </div>
          </a>
        </section>
      </article>

      <Footer />
    </main>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

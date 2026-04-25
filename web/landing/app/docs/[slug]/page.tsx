import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOCS_REGISTRY, findDoc } from "@/lib/docs/registry";
import { loadDoc } from "@/lib/docs/render";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return DOCS_REGISTRY.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = findDoc(params.slug);
  if (!entry) return { title: "文件不存在 — Symcio" };
  const rendered = await loadDoc(entry.filename);
  return {
    title: `${entry.label} — Symcio Docs`,
    description:
      rendered?.description ||
      entry.summary ||
      `Symcio BrandOS ${entry.section} 文件：${entry.label}`,
    openGraph: {
      title: entry.label,
      description: rendered?.description || entry.summary,
      type: "article",
    },
  };
}

export const dynamicParams = false;

export default async function DocPage({ params }: Props) {
  const entry = findDoc(params.slug);
  if (!entry) notFound();

  const rendered = await loadDoc(entry.filename);
  if (!rendered) {
    return (
      <div>
        <h1 className="text-3xl font-extrabold">{entry.label}</h1>
        <p className="mt-6 rounded-card border border-danger/40 bg-danger/10 p-5 text-sm text-danger">
          找不到 <code>docs/{entry.filename}</code>。請檢查 repo 是否同步。
        </p>
        <Link
          href="/docs"
          className="mt-6 inline-block font-mono text-xs text-accent no-underline"
        >
          ← 回到目錄
        </Link>
      </div>
    );
  }

  const idx = DOCS_REGISTRY.findIndex((d) => d.slug === params.slug);
  const prev = idx > 0 ? DOCS_REGISTRY[idx - 1] : null;
  const next = idx < DOCS_REGISTRY.length - 1 ? DOCS_REGISTRY[idx + 1] : null;

  return (
    <div>
      <Link
        href="/docs"
        className="font-mono text-xs text-muted hover:text-accent no-underline"
      >
        ← 所有文件
      </Link>

      <div className="mt-6 flex items-center gap-2">
        <span className="rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[1px] text-accent">
          {entry.section}
        </span>
        {rendered.updated_at && (
          <span className="font-mono text-[11px] text-muted-dim">
            · 更新於 {rendered.updated_at.slice(0, 10)}
          </span>
        )}
      </div>

      <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">
        {entry.label}
      </h1>

      {entry.summary && (
        <p className="mt-3 text-base text-muted md:text-lg">{entry.summary}</p>
      )}

      <div
        className="docs-content mt-10"
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />

      <div className="mt-16 flex flex-col justify-between gap-3 border-t border-line pt-6 md:flex-row">
        {prev ? (
          <Link
            href={`/docs/${prev.slug}`}
            className="rounded-card border border-line-soft px-4 py-3 text-sm no-underline transition hover:border-accent"
          >
            <div className="font-mono text-[11px] text-muted-dim">← 上一篇</div>
            <div className="mt-0.5 text-white">{prev.label}</div>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/docs/${next.slug}`}
            className="rounded-card border border-line-soft px-4 py-3 text-sm no-underline transition hover:border-accent md:text-right"
          >
            <div className="font-mono text-[11px] text-muted-dim">下一篇 →</div>
            <div className="mt-0.5 text-white">{next.label}</div>
          </Link>
        )}
      </div>

      <div className="mt-8 rounded-card border border-line bg-surface p-5 text-xs text-muted">
        <p>
          這份文件自動從 GitHub repo 同步。修正或建議請開 PR：{" "}
          <a
            href={`https://github.com/SALL911/BrandOS-Infrastructure/blob/main/docs/${entry.filename}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent no-underline"
          >
            編輯這頁 →
          </a>
        </p>
      </div>
    </div>
  );
}

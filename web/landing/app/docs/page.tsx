import Link from "next/link";
import type { Metadata } from "next";
import { DOCS_REGISTRY, SECTIONS } from "@/lib/docs/registry";

export const metadata: Metadata = {
  title: "Symcio Docs — BCI 方法論 / 部署指南 / 設計系統",
  description:
    "Symcio BrandOS 完整文件。BCI 品牌資本指數方法論、系統架構、部署步驟、設計系統、API 文件 — 一次看齊。",
  openGraph: {
    title: "Symcio Docs",
    description: "BCI 方法論 · 產品架構 · 部署指南 · 發展策略",
    type: "website",
  },
};

export default function DocsIndex() {
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold md:text-4xl">Symcio 文件</h1>
        <p className="mt-3 text-base text-muted md:text-lg">
          BCI 方法論、產品架構、部署步驟、發展策略 — 全部開源文件。本站自動從
          repo 的{" "}
          <code className="font-mono text-accent">/docs</code> 目錄讀取 markdown
          渲染。
        </p>
      </header>

      <div className="space-y-10">
        {SECTIONS.map((section) => {
          const items = DOCS_REGISTRY.filter((d) => d.section === section);
          if (items.length === 0) return null;
          return (
            <section key={section}>
              <h2 className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[2px] text-accent">
                {section}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/docs/${item.slug}`}
                    className="group rounded-card border border-line bg-surface p-5 no-underline transition hover:border-accent"
                  >
                    <h3 className="text-base font-bold text-white group-hover:text-accent">
                      {item.label}
                    </h3>
                    {item.summary && (
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {item.summary}
                      </p>
                    )}
                    <div className="mt-3 font-mono text-[11px] text-accent">
                      閱讀 →
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-16 rounded-card border border-line bg-surface p-6 text-sm text-muted">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
          為什麼開源文件？
        </p>
        <p className="mt-3">
          Symcio 的護城河是 BCI 權重向量（閉源）與四引擎跨平台資料集（專有）。
          方法論、公式、設計系統、架構 — 這些是類別定義 （AI Visibility
          Intelligence / AVI）的一部分。公開反而強化 Symcio 是 AVI 品類定義者的
          地位。
        </p>
      </div>
    </div>
  );
}

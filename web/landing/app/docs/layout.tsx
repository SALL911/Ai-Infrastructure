import Link from "next/link";
import type { ReactNode } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { DOCS_REGISTRY, SECTIONS } from "@/lib/docs/registry";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-ink text-white">
      <Navigation />

      <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
        <div className="grid gap-10 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <aside className="md:sticky md:top-20 md:self-start">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-accent">
              Symcio · Docs
            </p>
            <nav className="space-y-6 text-sm">
              {SECTIONS.map((section) => {
                const items = DOCS_REGISTRY.filter(
                  (d) => d.section === section,
                );
                if (items.length === 0) return null;
                return (
                  <div key={section}>
                    <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[2px] text-muted">
                      {section}
                    </div>
                    <ul className="space-y-1.5 border-l border-line pl-3">
                      {items.map((item) => (
                        <li key={item.slug}>
                          <Link
                            href={`/docs/${item.slug}`}
                            className="block text-sm leading-snug text-muted hover:text-accent no-underline"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </nav>

            <div className="mt-8 rounded-card border border-line bg-surface p-4 text-xs text-muted">
              <p>
                原始文件在{" "}
                <a
                  href="https://github.com/SALL911/BrandOS-Infrastructure/tree/main/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent no-underline"
                >
                  GitHub
                </a>
                ，隨 repo 更新。
              </p>
            </div>
          </aside>

          {/* Content */}
          <article className="min-w-0">{children}</article>
        </div>
      </div>

      <Footer />
    </main>
  );
}

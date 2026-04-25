"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LINKS: { href: string; label: string }[] = [
  { href: "/audit", label: "診斷" },
  { href: "/news", label: "新聞" },
  { href: "/pricing", label: "方案" },
  { href: "/docs", label: "文件" },
  { href: "/faq/enterprise", label: "FAQ" },
  { href: "/tools", label: "工具" },
  { href: "/about", label: "關於" },
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) setAuthed(!!user);

        supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setAuthed(!!session?.user);
        });
      } catch {
        // Supabase not configured — treat as unauthed, CTA is Discord
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 no-underline"
          onClick={() => setOpen(false)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-mono text-xl font-extrabold text-ink">
            S
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-base font-bold text-white">Symcio</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              BrandOS
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-muted hover:text-accent no-underline"
            >
              {l.label}
            </Link>
          ))}

          {authed === true ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-white hover:text-accent no-underline"
              >
                Dashboard
              </Link>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-card border border-line-soft px-4 py-2 text-sm font-semibold text-white hover:border-accent hover:text-accent"
                >
                  登出
                </button>
              </form>
            </>
          ) : authed === false ? (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-white hover:text-accent no-underline"
              >
                登入
              </Link>
              <Link
                href="/signup"
                className="rounded-card bg-accent px-4 py-2 text-sm font-semibold text-ink no-underline hover:scale-[1.02] transition"
              >
                免費註冊
              </Link>
            </>
          ) : null}
        </nav>

        <button
          type="button"
          aria-label="開啟選單"
          aria-expanded={open}
          onClick={() => setOpen((s) => !s)}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-soft text-white"
        >
          <span className="sr-only">menu</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {open ? (
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M3 6h14M3 10h14M3 14h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-line md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-card px-3 py-3 text-sm text-white no-underline hover:bg-surface"
              >
                {l.label}
              </Link>
            ))}

            {authed === true ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-card px-3 py-3 text-sm font-semibold text-white no-underline hover:bg-surface"
                >
                  Dashboard
                </Link>
                <form action="/auth/logout" method="post" className="mt-1">
                  <button
                    type="submit"
                    className="w-full rounded-card border border-line-soft px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    登出
                  </button>
                </form>
              </>
            ) : authed === false ? (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-card px-3 py-3 text-sm font-semibold text-white no-underline hover:bg-surface"
                >
                  登入
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-card bg-accent px-4 py-3 text-center text-sm font-semibold text-ink no-underline"
                >
                  免費註冊
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}

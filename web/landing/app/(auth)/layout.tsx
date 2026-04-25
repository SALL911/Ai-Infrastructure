import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-ink text-white">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-3 no-underline"
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
          <Link
            href="/"
            className="font-mono text-xs text-muted hover:text-accent no-underline"
          >
            ← 返回首頁
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Footer } from "@/components/Footer";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/history", label: "診斷歷史" },
  { href: "/dashboard/settings", label: "帳號設定" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  // Load member profile (created by DB trigger on first signup)
  const { data: member } = await supabase
    .from("members")
    .select("display_name, email, plan, avatar_url, audits_used_this_month, monthly_audit_quota")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    member?.display_name || user.email?.split("@")[0] || "Member";
  const email = member?.email || user.email || "";
  const plan = member?.plan || "free";
  const used = member?.audits_used_this_month ?? 0;
  const quota = member?.monthly_audit_quota ?? 3;

  return (
    <main className="min-h-screen bg-ink text-white">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-mono text-xl font-extrabold text-ink">
              S
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-base font-bold text-white">Symcio</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                Dashboard
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right text-sm md:block">
              <div className="font-semibold text-white">{displayName}</div>
              <div className="font-mono text-[11px] text-muted">
                {email} · {plan}
              </div>
            </div>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-card border border-line-soft px-4 py-2 text-xs font-semibold text-white hover:border-accent hover:text-accent"
              >
                登出
              </button>
            </form>
          </div>
        </div>

        <nav className="border-t border-line">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap px-4 py-3 text-sm text-muted hover:text-accent no-underline"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Quota pill */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
              歡迎回來 · {plan}
            </div>
            <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">
              {displayName}
            </h1>
          </div>
          <div className="rounded-card border border-line bg-surface px-5 py-3">
            <div className="font-mono text-[11px] uppercase tracking-[1.5px] text-muted">
              本月配額
            </div>
            <div className="mt-1 font-mono text-sm font-bold">
              {used} <span className="text-muted">/ {quota}</span>
            </div>
          </div>
        </div>

        {children}
      </div>

      <Footer />
    </main>
  );
}

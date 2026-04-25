import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Symcio BrandOS",
  description: "會員中心 — 查看 BCI 歷史、品牌追蹤、AI 行銷建議。",
};

export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  brand_name_zh: string;
  bci_total: number;
  tier: string;
  created_at: string;
}

const TIER_COLOR: Record<string, string> = {
  excellent: "#2dd4a0",
  good: "#378ADD",
  warning: "#fbbf24",
  danger: "#f87171",
};

const TIER_LABEL: Record<string, string> = {
  excellent: "優秀",
  good: "良好",
  warning: "需改善",
  danger: "危險",
};

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: recent } = await supabase
    .from("audit_history")
    .select("id, brand_name_zh, bci_total, tier, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const list = (recent as AuditRow[] | null) ?? [];
  const total = list.length;
  const avgBci =
    list.length > 0
      ? Math.round(
          list.reduce((s, r) => s + (r.bci_total || 0), 0) / list.length,
        )
      : null;
  const topBrand =
    list.length > 0
      ? [...list].sort((a, b) => b.bci_total - a.bci_total)[0]
      : null;

  return (
    <div className="space-y-10">
      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="最近 BCI 診斷數"
          value={total.toString()}
          hint={total === 0 ? "跑第一次診斷開始累積" : "近 5 筆紀錄"}
        />
        <StatCard
          label="近期平均 BCI"
          value={avgBci !== null ? avgBci.toString() : "—"}
          hint="跨所有最近診斷品牌"
        />
        <StatCard
          label="最高分品牌"
          value={topBrand?.brand_name_zh ?? "—"}
          hint={
            topBrand
              ? `BCI ${topBrand.bci_total} · ${TIER_LABEL[topBrand.tier] ?? topBrand.tier}`
              : "還沒有紀錄"
          }
        />
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-[2px] text-accent">
          快速操作
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/audit"
            className="group rounded-card border border-line bg-surface p-6 no-underline transition hover:border-accent"
          >
            <div className="text-3xl">🎯</div>
            <h3 className="mt-3 text-lg font-bold text-white">新增 BCI 診斷</h3>
            <p className="mt-2 text-sm text-muted">
              3 分鐘跑一次。結果自動存進你的歷史。
            </p>
            <div className="mt-4 font-mono text-xs text-accent group-hover:translate-x-1 transition-transform">
              開始 →
            </div>
          </Link>

          <Link
            href="/dashboard/history"
            className="group rounded-card border border-line bg-surface p-6 no-underline transition hover:border-accent"
          >
            <div className="text-3xl">📊</div>
            <h3 className="mt-3 text-lg font-bold text-white">查看歷史</h3>
            <p className="mt-2 text-sm text-muted">
              所有品牌診斷時序 + 匯出。
            </p>
            <div className="mt-4 font-mono text-xs text-accent group-hover:translate-x-1 transition-transform">
              前往 →
            </div>
          </Link>

          <Link
            href="/pricing"
            className="group rounded-card border border-line bg-surface p-6 no-underline transition hover:border-accent"
          >
            <div className="text-3xl">🔓</div>
            <h3 className="mt-3 text-lg font-bold text-white">升級方案</h3>
            <p className="mt-2 text-sm text-muted">
              Pro 每月 30 次 / Enterprise 無限 + API。
            </p>
            <div className="mt-4 font-mono text-xs text-accent group-hover:translate-x-1 transition-transform">
              查看 →
            </div>
          </Link>
        </div>
      </section>

      {/* Recent audits */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[2px] text-accent">
            最近診斷（5 筆）
          </h2>
          {total > 0 && (
            <Link
              href="/dashboard/history"
              className="font-mono text-xs text-muted hover:text-accent no-underline"
            >
              查看全部 →
            </Link>
          )}
        </div>

        {list.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-soft bg-surface p-10 text-center">
            <p className="text-muted">
              還沒有診斷紀錄。
              <Link
                href="/audit"
                className="ml-2 text-accent no-underline hover:underline"
              >
                開始第一次 →
              </Link>
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2 text-left font-mono text-[11px] uppercase tracking-[1.5px] text-muted">
                <tr>
                  <th className="px-5 py-3">品牌</th>
                  <th className="px-5 py-3">BCI</th>
                  <th className="px-5 py-3">評等</th>
                  <th className="px-5 py-3">日期</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-line last:border-b-0 hover:bg-surface-2"
                  >
                    <td className="px-5 py-3.5 font-semibold text-white">
                      {r.brand_name_zh}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-base font-bold">
                      {r.bci_total}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase"
                        style={{
                          background:
                            TIER_COLOR[r.tier] ?? TIER_COLOR["warning"],
                          color:
                            r.tier === "good" || r.tier === "danger"
                              ? "#fff"
                              : "#0a0a0a",
                        }}
                      >
                        {TIER_LABEL[r.tier] ?? r.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted">
                      {new Date(r.created_at).toLocaleString("zh-TW", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <div className="font-mono text-[11px] uppercase tracking-[1.5px] text-muted">
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl font-bold text-white">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "診斷歷史 — Symcio Dashboard",
  description: "你的 BCI 品牌資本指數完整歷史紀錄。",
};

export const dynamic = "force-dynamic";

interface HistoryRow {
  id: string;
  brand_name_zh: string;
  brand_name_en: string | null;
  industry: string;
  bci_total: number;
  fbv_score: number | null;
  ncv_score: number | null;
  aiv_score: number | null;
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

export default async function HistoryPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("audit_history")
    .select(
      "id, brand_name_zh, brand_name_en, industry, bci_total, fbv_score, ncv_score, aiv_score, tier, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const list = (data as HistoryRow[] | null) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">診斷歷史</h2>
          <p className="mt-1 text-sm text-muted">
            所有 BCI 診斷時序紀錄（最多 200 筆）。
          </p>
        </div>
        <Link
          href="/audit"
          className="rounded-card bg-accent px-5 py-2.5 text-sm font-bold text-ink no-underline hover:scale-[1.02] transition"
        >
          + 新增診斷
        </Link>
      </div>

      {error && (
        <div className="rounded-card border border-danger/40 bg-danger/10 p-5 text-sm text-danger">
          載入失敗：{error.message}
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-soft bg-surface p-12 text-center">
          <div className="text-4xl">📊</div>
          <h3 className="mt-4 text-lg font-bold text-white">
            還沒有診斷紀錄
          </h3>
          <p className="mt-2 text-sm text-muted">
            跑第一次 BCI 診斷 — 結果會自動存到這裡，可以持續追蹤品牌分數變化。
          </p>
          <Link
            href="/audit"
            className="mt-6 inline-block rounded-card bg-accent px-6 py-3 text-sm font-bold text-ink no-underline hover:scale-[1.02] transition"
          >
            開始第一次診斷 →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="min-w-full text-sm">
            <thead className="border-b border-line bg-surface-2 text-left font-mono text-[11px] uppercase tracking-[1.5px] text-muted">
              <tr>
                <th className="px-5 py-3">品牌</th>
                <th className="px-5 py-3">產業</th>
                <th className="px-5 py-3">BCI</th>
                <th className="px-5 py-3">FBV</th>
                <th className="px-5 py-3">NCV</th>
                <th className="px-5 py-3">AIV</th>
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
                    {r.brand_name_en && (
                      <div className="font-mono text-[11px] text-muted-dim">
                        {r.brand_name_en}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-muted">{r.industry}</td>
                  <td className="px-5 py-3.5 font-mono text-base font-bold text-white">
                    {r.bci_total}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-sm text-muted">
                    {r.fbv_score ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-sm text-muted">
                    {r.ncv_score ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-sm text-muted">
                    {r.aiv_score ?? "—"}
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

      {list.length > 0 && (
        <div className="text-center font-mono text-xs text-muted">
          顯示最近 {list.length} 筆 · 更早紀錄可透過 API 匯出（Pro+）
        </div>
      )}
    </div>
  );
}

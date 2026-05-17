"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function NewsletterSubscribe() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const displayName = String(form.get("display_name") ?? "").trim();

    if (!email) {
      setStatus("error");
      setError("請填寫 Email");
      return;
    }

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          display_name: displayName || undefined,
          language: "zh-TW",
        }),
      });
      const data: { ok: boolean; error?: string } = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "訂閱失敗");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-8 rounded-card border border-accent bg-accent-soft p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          ✓ 訂閱成功
        </p>
        <p className="mt-2 text-sm text-ink">
          歡迎信已寄出。下週一 09:00 (UTC+8) 你會收到第一封 ESG × SDG 週報。
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-card border border-line bg-surface p-6"
    >
      <p className="font-mono text-xs uppercase tracking-widest text-accent">
        訂閱週報 · ESG × SDG Weekly Digest
      </p>
      <p className="mt-2 text-sm text-muted">
        每週一 09:00 (UTC+8) 收到本期重點 + BCI 視角整理。不轉售名單。
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          name="display_name"
          placeholder="姓名(選填)"
          className="rounded-card border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder-muted-dim focus:border-accent focus:outline-none"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="you@company.com"
          className="rounded-card border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder-muted-dim focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dim disabled:opacity-50"
        >
          {status === "submitting" ? "送出中..." : "訂閱"}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-3 text-xs text-danger">錯誤: {error}</p>
      )}
    </form>
  );
}

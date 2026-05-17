"use client";

/**
 * Typeform embed for /tools/brand-check and /about contact block.
 *
 * Form ZZYlfK7A — submissions hit /api/webhooks/typeform via Typeform's
 * own webhook infrastructure. Form ID overridable via
 * NEXT_PUBLIC_TYPEFORM_FREE_SCAN_ID env.
 *
 * Loading strategy: Next.js <Script strategy="afterInteractive"> places
 * the loader script during hydration, before the embed div is interactive
 * — Typeform's MutationObserver attaches reliably.
 *
 * Fallback: if no iframe renders within FALLBACK_DELAY_MS (form deleted,
 * Typeform script blocked by adblock, network issue), show a manual
 * contact block so the page is never blank white.
 */

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const FORM_ID =
  process.env.NEXT_PUBLIC_TYPEFORM_FREE_SCAN_ID ?? "ZZYlfK7A";
const FALLBACK_DELAY_MS = 4000;

export function TypeformEmbed() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Poll for the iframe Typeform injects into our container.
    // If it doesn't appear within FALLBACK_DELAY_MS, show fallback UI.
    const start = Date.now();
    const id = window.setInterval(() => {
      const node = containerRef.current;
      if (node && node.querySelector("iframe")) {
        window.clearInterval(id);
        setShowFallback(false);
        return;
      }
      if (Date.now() - start > FALLBACK_DELAY_MS) {
        window.clearInterval(id);
        setShowFallback(true);
      }
    }, 300);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="w-full">
      <Script
        src="https://embed.typeform.com/next/embed.js"
        strategy="afterInteractive"
      />
      <div
        ref={containerRef}
        data-tf-live={FORM_ID}
        data-tf-opacity="100"
        data-tf-iframe-props="title=Symcio Free Scan"
        data-tf-transitive-search-params
        data-tf-medium="snippet"
        style={{ width: "100%", height: "70vh", minHeight: 520 }}
      />

      {showFallback && (
        <div className="mt-4 rounded-card border border-line bg-surface p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            表單暫時無法載入
          </p>
          <p className="mt-2 text-sm text-muted">
            Typeform 嵌入暫時打不開(可能瀏覽器擋了第三方腳本、表單在維護、
            或 form ID 失效)。兩種替代路徑:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink">
            <li>
              · 直接到{" "}
              <a
                href={`https://form.typeform.com/to/${FORM_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline"
              >
                Typeform 原頁面填寫
              </a>
            </li>
            <li>
              · 來信{" "}
              <a
                href="mailto:info@symcio.tw?subject=Free%20Scan%20%E7%94%B3%E8%AB%8B"
                className="text-accent underline"
              >
                info@symcio.tw
              </a>
              ,我們會手動把你加進掃描佇列
            </li>
          </ul>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[1px] text-muted-dim">
            Debug: form_id = {FORM_ID}
          </p>
        </div>
      )}
    </div>
  );
}

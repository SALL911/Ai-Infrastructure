#!/usr/bin/env node
// Smoke test for the Typeform webhook handler. Generates a fake Typeform
// payload (hidden.topic configurable), signs it with the same HMAC-SHA256
// scheme Typeform uses, POSTs it to the webhook, and prints the response.
//
// Usage:
//   # against local dev server (pnpm --filter @symcio/landing dev)
//   TYPEFORM_WEBHOOK_SECRET=<secret> node scripts/smoke-typeform-webhook.mjs --topic investor
//
//   # against production
//   TYPEFORM_WEBHOOK_SECRET=<prod-secret> \
//   WEBHOOK_URL=https://symcio.tw/api/webhooks/typeform \
//   node scripts/smoke-typeform-webhook.mjs --topic investor
//
// Topics to exercise (each maps to a different code path):
//   - free_scan        → fires the free-scan-request GitHub dispatch
//   - investor         → high-touch, dispatch SKIPPED
//   - enterprise_demo  → high-touch, dispatch SKIPPED
//   - consulting       → high-touch, dispatch SKIPPED
//   - professional_plan → high-touch, dispatch SKIPPED
//
// What success looks like:
//   - HTTP 200 from the webhook
//   - Response body: { ok: true, lead_id: "...", warnings: [] }
//   - In Supabase `leads` table: a new row with
//       source = "typeform-ZZYlfK7A-<topic>"
//       notes contains "topic=<topic>"
//   - For high-touch topics: the GitHub Actions tab should show NO new
//     "free-scan-request" dispatch (whereas free_scan should fire one)

import crypto from "node:crypto";
import process from "node:process";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

const topic = args.topic ?? "free_scan";
const url = process.env.WEBHOOK_URL ?? "http://localhost:3000/api/webhooks/typeform";
const secret = process.env.TYPEFORM_WEBHOOK_SECRET;

if (!secret) {
  console.error("✗ TYPEFORM_WEBHOOK_SECRET env var is required.");
  console.error("  Set it to the same value configured in Vercel + Typeform admin.");
  process.exit(1);
}

const payload = {
  event_id: `smoke-${Date.now()}`,
  event_type: "form_response",
  form_response: {
    form_id: "ZZYlfK7A",
    token: `smoke-token-${Date.now()}`,
    submitted_at: new Date().toISOString(),
    hidden: { topic },
    answers: [
      {
        field: { id: "f1", ref: "brand_name", type: "short_text" },
        type: "text",
        text: `Smoke Test (${topic})`,
      },
      {
        field: { id: "f2", ref: "email", type: "email" },
        type: "email",
        email: `smoke+${topic}@example.invalid`,
      },
      {
        field: { id: "f3", ref: "industry", type: "multiple_choice" },
        type: "choice",
        choice: { label: "Technology / SaaS" },
      },
    ],
  },
};

const rawBody = JSON.stringify(payload);
const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");

console.log(`→ POST ${url}`);
console.log(`  topic=${topic}, form_id=ZZYlfK7A, email=smoke+${topic}@example.invalid`);

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Typeform-Signature": `sha256=${signature}`,
  },
  body: rawBody,
});

const responseText = await res.text();
console.log(`← HTTP ${res.status}`);
console.log(responseText);

if (!res.ok) process.exit(2);

let body;
try {
  body = JSON.parse(responseText);
} catch {
  console.error("✗ response is not JSON");
  process.exit(3);
}

const expected = topic === "free_scan" ? "free-scan-request fired" : "free-scan-request SKIPPED";
console.log(`\nExpected behaviour for topic=${topic}: ${expected}`);
console.log(
  "Verify in Supabase: SELECT id, source, notes FROM leads ORDER BY created_at DESC LIMIT 5;",
);
console.log("If high-touch, verify NO new run appeared in GitHub Actions → GEO Audit.");

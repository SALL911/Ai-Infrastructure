import Stripe from "stripe";

/**
 * Lazy Stripe client — returns null when STRIPE_SECRET_KEY is missing.
 * Callers must handle the null case (usually: return a friendly error to UI).
 */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
    appInfo: {
      name: "Symcio AI Visibility",
      url: "https://symcio.tw",
    },
  });
}

/* ============ One-time products ============ */

export const STRIPE_PRODUCTS = {
  audit: {
    name: "AI Visibility Audit",
    description:
      "20 prompts × 4 AI engines + competitor map + improvement PDF. Delivered within 24 hours.",
    amount: 29900,
    currency: "usd",
  },
  optimization: {
    name: "AI Visibility Optimization",
    description:
      "Audit + 90-day ranking tracking + implementation support.",
    amount: 199900,
    currency: "usd",
  },
} as const;

export type StripeProduct = keyof typeof STRIPE_PRODUCTS;

/* ============ Subscription plans ============ */

/**
 * Pro / Enterprise recurring plans. Actual Stripe Price IDs live in env vars
 * — one plan can have distinct monthly / yearly / currency Price IDs.
 * SUBSCRIPTION_PLANS is the canonical catalog that maps our internal key
 * to the env var that holds its Price ID.
 */
export const SUBSCRIPTION_PLANS = {
  pro_monthly: {
    name: "Professional · Monthly",
    description:
      "每月 30 次 BCI 完整報告 + 5 個競品追蹤 + GEO 實體建置 + 季度策略會議",
    monthly_audit_quota: 30,
    plan: "pro" as const,
    env_price_id: "STRIPE_PRICE_PRO_MONTHLY",
  },
  pro_yearly: {
    name: "Professional · Yearly",
    description:
      "年繳享 2 個月優惠。每月 30 次 BCI 完整報告 + 5 個競品追蹤 + GEO 實體建置",
    monthly_audit_quota: 30,
    plan: "pro" as const,
    env_price_id: "STRIPE_PRICE_PRO_YEARLY",
  },
  enterprise_yearly: {
    name: "Enterprise · Yearly",
    description:
      "無限次 BCI · ESG/TNFD 自動化 · Brand Capital API · 175% 抵稅支援 · 專屬顧問",
    monthly_audit_quota: 9999,
    plan: "enterprise" as const,
    env_price_id: "STRIPE_PRICE_ENTERPRISE_YEARLY",
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

export function getSubscriptionPriceId(key: SubscriptionPlanKey): string | null {
  const plan = SUBSCRIPTION_PLANS[key];
  return process.env[plan.env_price_id] || null;
}

export function priceIdToPlan(priceId: string | null | undefined): {
  key: SubscriptionPlanKey;
  plan: "pro" | "enterprise";
  quota: number;
} | null {
  if (!priceId) return null;
  for (const [k, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (process.env[plan.env_price_id] === priceId) {
      return {
        key: k as SubscriptionPlanKey,
        plan: plan.plan,
        quota: plan.monthly_audit_quota,
      };
    }
  }
  return null;
}

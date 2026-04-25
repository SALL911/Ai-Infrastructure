import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getStripe,
  getSubscriptionPriceId,
  STRIPE_PRODUCTS,
  SUBSCRIPTION_PLANS,
  type StripeProduct,
  type SubscriptionPlanKey,
} from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://symcio.tw";

const PRODUCT_KEYS = ["audit", "optimization"] as const;
const PLAN_KEYS = [
  "pro_monthly",
  "pro_yearly",
  "enterprise_yearly",
] as const;

const QuerySchema = z.object({
  // one-time | subscription
  mode: z.enum(["payment", "subscription"]).default("payment"),
  product: z.enum(PRODUCT_KEYS).optional(),
  plan: z.enum(PLAN_KEYS).optional(),
  email: z.string().email().optional(),
  brand: z.string().trim().max(200).optional(),
});

type CheckoutParams = z.infer<typeof QuerySchema>;

async function createSession(
  params: CheckoutParams,
): Promise<{ url: string | null; error?: string }> {
  const stripe = getStripe();
  if (!stripe) return { url: null, error: "stripe-not-configured" };

  if (params.mode === "subscription") {
    return createSubscriptionSession(params);
  }
  return createOneTimeSession(params);
}

async function createOneTimeSession(
  params: CheckoutParams,
): Promise<{ url: string | null; error?: string }> {
  const stripe = getStripe()!;
  const productKey: StripeProduct = params.product ?? "audit";
  const product = STRIPE_PRODUCTS[productKey];
  const priceId =
    productKey === "audit"
      ? process.env.STRIPE_AUDIT_PRICE_ID
      : process.env.STRIPE_OPTIMIZATION_PRICE_ID;

  const lineItems = priceId
    ? [{ price: priceId, quantity: 1 as const }]
    : [
        {
          quantity: 1 as const,
          price_data: {
            currency: product.currency,
            unit_amount: product.amount,
            product_data: {
              name: product.name,
              description: product.description,
            },
          },
        },
      ];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${ORIGIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ORIGIN}/checkout/cancel`,
      customer_email: params.email,
      allow_promotion_codes: true,
      metadata: {
        mode: "payment",
        product: productKey,
        brand: params.brand || "",
        source: "symcio.tw",
      },
      payment_intent_data: {
        metadata: {
          product: productKey,
          brand: params.brand || "",
        },
      },
    });
    return { url: session.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { url: null, error: `stripe: ${msg}` };
  }
}

async function createSubscriptionSession(
  params: CheckoutParams,
): Promise<{ url: string | null; error?: string }> {
  const stripe = getStripe()!;
  const planKey: SubscriptionPlanKey = params.plan ?? "pro_monthly";
  const plan = SUBSCRIPTION_PLANS[planKey];
  const priceId = getSubscriptionPriceId(planKey);

  if (!priceId) {
    return {
      url: null,
      error: `missing-price-id: set ${plan.env_price_id} in Vercel env`,
    };
  }

  // Link to member if signed in — reuse / create Stripe customer keeps
  // portal + recurring state tied to one member row.
  let memberId: string | null = null;
  let customerId: string | null = null;
  let memberEmail: string | undefined = params.email;

  try {
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) {
      memberId = user.id;
      memberEmail = memberEmail || user.email || undefined;

      const { data: memberRow } = await sb
        .from("members")
        .select("stripe_customer_id, email, display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (memberRow?.stripe_customer_id) {
        customerId = memberRow.stripe_customer_id as string;
      } else if (memberEmail) {
        const created = await stripe.customers.create({
          email: memberEmail,
          name: (memberRow?.display_name as string) || undefined,
          metadata: { member_id: user.id },
        });
        customerId = created.id;
        await sb
          .from("members")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      }
    }
  } catch {
    // Unauthed or supabase unavailable — let Stripe create the customer.
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${ORIGIN}/dashboard?upgraded=1`,
      cancel_url: `${ORIGIN}/pricing?canceled=1`,
      allow_promotion_codes: true,
      customer: customerId ?? undefined,
      customer_email: customerId ? undefined : memberEmail,
      client_reference_id: memberId ?? undefined,
      metadata: {
        mode: "subscription",
        plan: planKey,
        plan_name: plan.plan,
        member_id: memberId || "",
        brand: params.brand || "",
        source: "symcio.tw",
      },
      subscription_data: {
        metadata: {
          plan: planKey,
          plan_name: plan.plan,
          member_id: memberId || "",
        },
      },
    });
    return { url: session.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { url: null, error: `stripe: ${msg}` };
  }
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    mode: url.searchParams.get("mode") || "payment",
    product: url.searchParams.get("product") || undefined,
    plan: url.searchParams.get("plan") || undefined,
    email: url.searchParams.get("email") || undefined,
    brand: url.searchParams.get("brand") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid-params" },
      { status: 400 },
    );
  }
  const { url: checkoutUrl, error } = await createSession(parsed.data);
  if (!checkoutUrl) {
    return NextResponse.json({ ok: false, error }, { status: 503 });
  }
  return NextResponse.redirect(checkoutUrl, { status: 303 });
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }
  const parsed = QuerySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid-body" },
      { status: 400 },
    );
  }
  const { url, error } = await createSession(parsed.data);
  if (!url) {
    return NextResponse.json({ ok: false, error }, { status: 503 });
  }
  return NextResponse.json({ ok: true, url });
}

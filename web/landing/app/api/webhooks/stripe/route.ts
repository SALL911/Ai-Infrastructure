import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/client";
import { fireRepositoryDispatch } from "@/lib/github/dispatch";
import { send as sendEmail, renderAuditConfirmation } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook handler.
 *
 * Signature verification REQUIRES the raw request body (not JSON-parsed).
 * Next.js App Router provides the raw text via req.text() — that's the path
 * we use.
 *
 * Events handled:
 *   - checkout.session.completed → insert order to Supabase `orders`
 *
 * Future events (left as TODO for Phase 2):
 *   - invoice.payment_succeeded (for subscriptions)
 *   - payment_intent.payment_failed (retry logic)
 */

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<{ ok: boolean; error?: string; warnings: string[] }> {
  const warnings: string[] = [];
  const sb = supabaseAdmin();

  const metadata = session.metadata ?? {};
  const email = session.customer_email ?? session.customer_details?.email ?? null;
  const amountTotal = session.amount_total ?? 0;
  const priceUsd = amountTotal / 100;
  const product: "audit" | "optimization" =
    metadata.product === "optimization" ? "optimization" : "audit";
  const brandName = metadata.brand || "Unknown";

  let orderId: string | null = null;
  let brandId: string | null = null;

  // 1. Supabase: persist order + update lead status.
  if (sb) {
    if (brandName && brandName !== "Unknown") {
      const { data } = await sb
        .from("brands")
        .select("id")
        .eq("name", brandName)
        .maybeSingle();
      brandId = data?.id ?? null;
    }

    const { data: inserted, error } = await sb
      .from("orders")
      .insert({
        brand_id: brandId,
        product,
        price: priceUsd,
        payment_status: "paid",
        delivery_status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message, warnings };
    }
    orderId = inserted?.id ?? null;

    if (email) {
      await sb
        .from("leads")
        .update({ status: "converted" })
        .eq("email", email);
    }
  } else {
    warnings.push("supabase-not-configured");
  }

  // 2. GitHub repository_dispatch → triggers geo-audit.yml to run real audit.
  const dispatchResp = await fireRepositoryDispatch({
    eventType: "paid-audit",
    clientPayload: {
      brand_name: brandName,
      brand_domain: metadata.brand_domain || "",
      brand_industry: metadata.brand_industry || "technology",
      product,
      order_id: orderId,
      customer_email: email,
      stripe_session_id: session.id,
    },
  });
  if (!dispatchResp.ok) warnings.push(`dispatch: ${dispatchResp.error}`);

  // 3. Confirmation email via Resend.
  if (email) {
    const from = process.env.RESEND_FROM_ADDRESS || "Symcio <info@symcio.tw>";
    const { subject, html } = renderAuditConfirmation({
      brandName,
      customerEmail: email,
      product,
    });
    const emailResp = await sendEmail({
      from,
      to: email,
      subject,
      html,
      replyTo: "info@symcio.tw",
    });
    if (!emailResp.ok) warnings.push(`resend: ${emailResp.error}`);
  } else {
    warnings.push("no-customer-email");
  }

  return { ok: true, warnings };
}

export async function POST(req: Request): Promise<Response> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    return NextResponse.json(
      { ok: false, error: "stripe-webhook-not-configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "missing-signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `signature-verification-failed: ${msg}` },
      { status: 400 },
    );
  }

  // Replay protection — subscription_events UNIQUE on stripe_event_id
  const sb = supabaseAdmin();
  if (sb) {
    const { data: dup } = await sb
      .from("subscription_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
    if (dup) {
      return NextResponse.json({
        ok: true,
        event: event.type,
        replay: true,
      });
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const mode = session.mode;
        if (mode === "subscription") {
          await handleSubscriptionCheckout(session);
          await recordEvent(event, session);
        } else {
          const result = await handleCheckoutCompleted(session);
          await recordEvent(event, session);
          if (!result.ok) {
            return NextResponse.json(
              { ok: false, error: result.error },
              { status: 500 },
            );
          }
        }
        return NextResponse.json({ ok: true, event: event.type });
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(sub);
        await recordEvent(event, null, sub);
        return NextResponse.json({ ok: true, event: event.type });
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoice(event.type, invoice);
        await recordEvent(event, null, null, invoice);
        return NextResponse.json({ ok: true, event: event.type });
      }

      default:
        return NextResponse.json({
          ok: true,
          event: event.type,
          handled: false,
        });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] handler threw", event.type, msg);
    return NextResponse.json(
      { ok: false, event: event.type, error: msg },
      { status: 500 },
    );
  }
}

/* ============ Subscription handlers ============ */

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const sb = supabaseAdmin();
  if (!sb) return;

  const memberId =
    (session.metadata?.member_id as string | undefined) ||
    (session.client_reference_id as string | undefined);
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!memberId || !customerId || !subscriptionId) {
    console.warn(
      "[stripe-webhook] subscription checkout missing linkage",
      { memberId, customerId, subscriptionId },
    );
    return;
  }

  // Attach Stripe IDs immediately; subscription.updated will fill status.
  await sb
    .from("members")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    })
    .eq("id", memberId);
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const sb = supabaseAdmin();
  if (!sb) return;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price.id ?? null;

  const { priceIdToPlan } = await import("@/lib/stripe/client");
  const mapped = priceIdToPlan(priceId);

  const plan = sub.status === "active" || sub.status === "trialing"
    ? mapped?.plan ?? "pro"
    : "free";
  const quota = sub.status === "active" || sub.status === "trialing"
    ? mapped?.quota ?? 30
    : 3;

  // Stripe API 2026-03-25 moved current_period_end onto subscription items.
  const periodEndSeconds = sub.items.data[0]?.current_period_end;
  const currentPeriodEnd =
    typeof periodEndSeconds === "number"
      ? new Date(periodEndSeconds * 1000).toISOString()
      : null;

  // Locate member by Stripe customer ID (set during checkout).
  const { data: member } = await sb
    .from("members")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!member) {
    console.warn(
      "[stripe-webhook] no member for customer",
      customerId,
      "event for",
      sub.id,
    );
    return;
  }

  await sb
    .from("members")
    .update({
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
      subscription_price_id: priceId,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      plan,
      monthly_audit_quota: quota,
    })
    .eq("id", member.id);
}

async function handleInvoice(
  eventType: string,
  invoice: Stripe.Invoice,
) {
  // No-op for now — subscription_events logs it for review.
  // Future: send receipt / dunning email on payment_failed.
  if (eventType === "invoice.payment_failed") {
    console.warn(
      "[stripe-webhook] payment failed for customer",
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id,
      "invoice",
      invoice.id,
    );
  }
}

async function recordEvent(
  event: Stripe.Event,
  session: Stripe.Checkout.Session | null,
  subscription: Stripe.Subscription | null = null,
  invoice: Stripe.Invoice | null = null,
) {
  const sb = supabaseAdmin();
  if (!sb) return;

  const customerId =
    (session &&
      (typeof session.customer === "string"
        ? session.customer
        : session.customer?.id)) ||
    (subscription &&
      (typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id)) ||
    (invoice &&
      (typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id)) ||
    null;

  const subscriptionId =
    (session &&
      (typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id)) ||
    subscription?.id ||
    null;

  const memberId = customerId
    ? (
        await sb
          .from("members")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()
      ).data?.id ?? null
    : null;

  await sb
    .from("subscription_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      member_id: memberId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status:
        subscription?.status ||
        invoice?.status ||
        (session?.payment_status as string | null) ||
        null,
      amount_total:
        session?.amount_total ??
        invoice?.amount_paid ??
        null,
      currency:
        session?.currency ??
        invoice?.currency ??
        null,
      raw_event: event,
    });
}

/**
 * Stripe customer portal — lets members manage their own subscription
 * (cancel, swap plan, update payment method, see invoices) without us
 * writing custom UI. Redirect URL from Stripe; we just bounce to it.
 *
 * Auth: must be signed-in member with stripe_customer_id already set.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://symcio.tw";

async function redirectToPortal(): Promise<Response> {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "stripe-not-configured" },
      { status: 503 },
    );
  }

  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${ORIGIN}/login?next=${encodeURIComponent("/dashboard/settings")}`,
      { status: 303 },
    );
  }

  const { data: member } = await sb
    .from("members")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!member?.stripe_customer_id) {
    // No subscription yet — send them to pricing instead of Stripe.
    return NextResponse.redirect(`${ORIGIN}/pricing?no_subscription=1`, {
      status: 303,
    });
  }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: member.stripe_customer_id as string,
      return_url: `${ORIGIN}/dashboard/settings`,
    });
    return NextResponse.redirect(portal.url, { status: 303 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `stripe-portal: ${msg}` },
      { status: 500 },
    );
  }
}

export async function GET(_req: NextRequest) {
  return redirectToPortal();
}
export async function POST(_req: NextRequest) {
  return redirectToPortal();
}

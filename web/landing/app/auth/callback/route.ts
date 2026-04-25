/**
 * OAuth callback handler.
 *
 * Supabase redirects the user back to this URL with a `code` query param
 * after successful Google (or other) OAuth consent. We exchange it for a
 * session, set cookies, then bounce to the protected page.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=missing-code`, request.url),
    );
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error.message)}`,
          request.url,
        ),
      );
    }
    return NextResponse.redirect(new URL(next, request.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "callback-failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, request.url),
    );
  }
}

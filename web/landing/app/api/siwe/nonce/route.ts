import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { nonceCookieHeader } from "@/lib/wallet/siwe-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SIWE 訊息裡必填的 nonce：防重放。server 發 → cookie 存 → client 收到後
// 把同一個 nonce 放進要簽的 message，server 驗簽時比對 cookie。
export async function GET() {
  const nonce = randomBytes(16).toString("hex");
  return NextResponse.json(
    { nonce },
    { headers: { "Set-Cookie": nonceCookieHeader(nonce) } },
  );
}

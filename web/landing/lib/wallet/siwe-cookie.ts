/**
 * SIWE 驗證結果的 HMAC-signed cookie。
 *
 * 流程：/api/siwe/verify 驗完簽章後，把 { address, ens, exp } HMAC 簽進 cookie。
 * 之後 /api/schema 讀這個 cookie 取出已驗證的 wallet，不用再簽一次。
 *
 * 安全假設：
 * - HttpOnly + SameSite=Lax，前端 JS 拿不到（只有同 origin 的 API 能讀）
 * - 30 分鐘 TTL，避免攻擊者拿到 cookie 長期冒用
 * - HMAC-SHA-256，只要 SIWE_COOKIE_SECRET 沒外洩就沒人能偽造
 */
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "symcio_wallet";
const MAX_AGE_SECONDS = 30 * 60;

interface Payload {
  address: string;
  ens: string;
  exp: number; // unix ms
}

function secret(): string {
  const s = process.env.SIWE_COOKIE_SECRET;
  if (!s || s.length < 32) {
    // Dev fallback：印警告但不爆，讓本機開發可以繞過。prod 部署前必設。
    if (process.env.NODE_ENV === "production") {
      throw new Error("SIWE_COOKIE_SECRET must be set (32+ chars) in production.");
    }
    return "dev-only-insecure-secret-please-set-SIWE_COOKIE_SECRET-in-env";
  }
  return s;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function encodeWalletCookie(address: string, ens: string): string {
  const payload: Payload = {
    address,
    ens,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = sign(body);
  return `${body}.${mac}`;
}

export function decodeWalletCookie(raw: string | undefined): Payload | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  try {
    const expected = Buffer.from(sign(body));
    const received = Buffer.from(mac);
    if (expected.length !== received.length) return null;
    if (!timingSafeEqual(expected, received)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(payload.address)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function walletCookieHeader(value: string): string {
  const attrs = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    `Max-Age=${MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}

export { COOKIE_NAME as WALLET_COOKIE_NAME };

export const NONCE_COOKIE = "symcio_siwe_nonce";

export function nonceCookieHeader(nonce: string): string {
  const attrs = [
    `${NONCE_COOKIE}=${nonce}`,
    "Path=/",
    `Max-Age=${10 * 60}`,  // 10 分鐘內要完成 sign
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}

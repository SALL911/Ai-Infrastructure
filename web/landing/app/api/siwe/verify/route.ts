import { NextResponse } from "next/server";
import { z } from "zod";
import { SiweMessage } from "siwe";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import {
  NONCE_COOKIE,
  encodeWalletCookie,
  walletCookieHeader,
} from "@/lib/wallet/siwe-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  message: z.string().min(1).max(8000),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

// ENS 查詢只在 mainnet 上有意義（Base 上沒官方 ENS resolver）
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http("https://cloudflare-eth.com"),
});

export async function POST(req: Request): Promise<NextResponse> {
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((i) => i.message).join(", ") : "bad body";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  // 從 cookie 取出上一步 /api/siwe/nonce 發的 nonce
  const cookieNonce = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${NONCE_COOKIE}=`))
    ?.split("=")[1];

  if (!cookieNonce) {
    return NextResponse.json(
      { ok: false, error: "nonce missing; call /api/siwe/nonce first" },
      { status: 400 },
    );
  }

  // 驗簽
  let siwe: SiweMessage;
  try {
    siwe = new SiweMessage(parsed.message);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid SIWE message format" }, { status: 400 });
  }

  const result = await siwe.verify({
    signature: parsed.signature,
    nonce: cookieNonce,
    domain: req.headers.get("host") ?? undefined,
  });
  if (!result.success) {
    return NextResponse.json(
      { ok: false, error: result.error?.type || "signature verification failed" },
      { status: 401 },
    );
  }

  const address = siwe.address.toLowerCase() as `0x${string}`;

  // ENS 反查：失敗不擋流程，只當 best-effort
  let ens = "";
  try {
    const name = await ensClient.getEnsName({ address: address as `0x${string}` });
    if (name) ens = name;
  } catch {
    // swallow：ENS lookup 不是 critical path
  }

  const cookieValue = encodeWalletCookie(address, ens);

  return NextResponse.json(
    { ok: true, address, ens },
    {
      headers: {
        // 同時覆蓋 nonce cookie（用過即作廢）與寫入 wallet-verified cookie
        "Set-Cookie": [
          walletCookieHeader(cookieValue),
          `${NONCE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
        ].join(", "),
      },
    },
  );
}

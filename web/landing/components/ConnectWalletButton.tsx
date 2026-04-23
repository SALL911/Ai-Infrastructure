"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";
import { SiweMessage } from "siwe";
import { SIWE_DOMAIN, SIWE_URI } from "@/lib/wallet/config";

export interface WalletIdentity {
  address: `0x${string}`;
  ens: string;
}

type State = "idle" | "connecting" | "signing" | "verifying" | "verified" | "error";

export function ConnectWalletButton({
  onVerified,
}: {
  onVerified: (id: WalletIdentity | null) => void;
}) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<WalletIdentity | null>(null);

  // 錢包斷開 → 同步清掉驗證狀態
  useEffect(() => {
    if (!isConnected && identity) {
      setIdentity(null);
      setState("idle");
      onVerified(null);
    }
  }, [isConnected, identity, onVerified]);

  async function handleConnect() {
    setError(null);
    const injectedConnector = connectors.find((c) => c.id === "injected") ?? injected();
    try {
      setState("connecting");
      await connect({ connector: injectedConnector });
      // 狀態會經 useEffect 更新為 isConnected=true
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "錢包連接失敗");
    }
  }

  async function handleSign() {
    if (!address) {
      setError("請先 connect wallet");
      return;
    }
    setError(null);
    try {
      setState("signing");
      // 1. 拿 nonce
      const nonceResp = await fetch("/api/siwe/nonce", { credentials: "include" });
      const { nonce } = (await nonceResp.json()) as { nonce: string };
      if (!nonce) throw new Error("nonce 取得失敗");

      // 2. 組 SIWE message
      const siwe = new SiweMessage({
        domain: typeof window !== "undefined" ? window.location.host : SIWE_DOMAIN,
        address,
        statement:
          "Sign in to claim your brand on Symcio. This signature is free and does not trigger any on-chain transaction.",
        uri: typeof window !== "undefined" ? window.location.origin : SIWE_URI,
        version: "1",
        chainId: chainId ?? 1,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const message = siwe.prepareMessage();

      // 3. 錢包簽
      const signature = await signMessageAsync({ message });

      // 4. 後端驗
      setState("verifying");
      const verifyResp = await fetch("/api/siwe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message, signature }),
      });
      const data = (await verifyResp.json()) as {
        ok: boolean;
        address?: string;
        ens?: string;
        error?: string;
      };
      if (!verifyResp.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${verifyResp.status}`);
      }

      const verified: WalletIdentity = {
        address: data.address as `0x${string}`,
        ens: data.ens || "",
      };
      setIdentity(verified);
      setState("verified");
      onVerified(verified);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "簽章驗證失敗");
    }
  }

  function handleDisconnect() {
    disconnect();
    setIdentity(null);
    setState("idle");
    setError(null);
    onVerified(null);
  }

  const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

  return (
    <div className="border border-line bg-white p-4">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        Web3 品牌認領（選填）
      </p>
      <p className="mt-2 text-xs text-muted">
        若品牌有 ENS / 鏈上錢包，簽一次訊息即可把 Etherscan 與 ENS 連結自動加進 JSON-LD 的{" "}
        <code>sameAs</code>，強化 AI 引擎對你的實體辨識。簽章免費，不會觸發任何鏈上交易。
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!isConnected && (
          <button
            type="button"
            onClick={handleConnect}
            disabled={state === "connecting"}
            className="border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
          >
            {state === "connecting" ? "連接中…" : "Connect Wallet"}
          </button>
        )}
        {isConnected && state !== "verified" && (
          <>
            <button
              type="button"
              onClick={handleSign}
              disabled={state === "signing" || state === "verifying"}
              className="border border-ink bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent/90 disabled:opacity-50"
            >
              {state === "signing"
                ? "請在錢包簽章…"
                : state === "verifying"
                  ? "驗證中…"
                  : "Sign to Verify Ownership"}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="border border-line px-3 py-2 text-xs text-muted hover:text-ink"
            >
              Disconnect
            </button>
          </>
        )}
        {state === "verified" && identity && (
          <>
            <span className="inline-flex items-center border border-accent bg-accent/10 px-3 py-1 text-xs">
              ✓ {identity.ens || short(identity.address)}
            </span>
            <button
              type="button"
              onClick={handleDisconnect}
              className="border border-line px-3 py-1 text-xs text-muted hover:text-ink"
            >
              更換錢包
            </button>
          </>
        )}
      </div>

      {isConnected && address && state !== "verified" && (
        <p className="mt-3 text-xs text-muted">
          目前錢包：<span className="font-mono">{short(address)}</span>
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-600">錯誤：{error}</p>
      )}
    </div>
  );
}

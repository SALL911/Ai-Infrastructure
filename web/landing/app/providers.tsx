"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wallet/config";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // 每個 browser tab 一個 QueryClient instance（避免在 server 與 client 共用狀態）
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

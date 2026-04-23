/**
 * wagmi config。Step 1 只做 SIWE 登入 + ENS lookup；Base 鏈放在清單裡
 * 是為了 Step 2（crypto checkout on Base）鋪路，現在不會實際使用。
 *
 * RPC 都選免費且無須 API key 的公共節點。後續若 rate-limit 再換 Alchemy。
 */
import { createConfig, http } from "wagmi";
import { mainnet, base } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [mainnet, base],
  // injected() 會偵測 MetaMask / Rabby / Brave Wallet / Coinbase Wallet 等注入錢包。
  // Step 1 不接 WalletConnect：多數 Web3 品牌主用 MetaMask 桌面，先跑通核心流程。
  connectors: [injected()],
  transports: {
    [mainnet.id]: http("https://cloudflare-eth.com"),
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
});

export const SIWE_DOMAIN = "symcio.tw";
export const SIWE_URI = "https://symcio.tw";

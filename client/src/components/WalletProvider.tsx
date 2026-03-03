import { useMemo, useState, useEffect, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
} from "@solana-mobile/wallet-adapter-mobile";

const MAINNET_FALLBACK = "https://api.mainnet-beta.solana.com";

interface Props {
  children: ReactNode;
  authToken?: string | null;
}

export default function WalletProvider({ children, authToken }: Props) {
  const network = WalletAdapterNetwork.Mainnet;
  const [endpoint, setEndpoint] = useState(MAINNET_FALLBACK);

  useEffect(() => {
    if (!authToken) return;
    fetch("/api/solana/rpc-url", { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then(data => { if (data.rpcUrl) setEndpoint(data.rpcUrl); })
      .catch(() => {});
  }, [authToken]);

  const wallets = useMemo(
    () => [
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: "Neon Dugout",
          uri: typeof window !== "undefined" ? window.location.origin : undefined,
          icon: "/logo-neon-dugout.png",
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: "mainnet-beta",
      }),
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

const WALLET_OPTIONS = [
  { name: "Phantom", icon: "👻", id: "phantom" },
  { name: "Solflare", icon: "🌟", id: "solflare" },
  { name: "Backpack", icon: "🎒", id: "backpack" },
  { name: "Seeker", icon: "📱", id: "seeker" },
] as const;

type LoginStatus = "disconnected" | "connecting" | "connected" | "signing" | "verifying" | "error";

export default function LoginPage() {
  const { publicKey, signMessage, select, wallets, connect, connected, connecting } = useWallet();
  const { walletAddress, loginWithSignature } = useGameStore();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<LoginStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      navigate("/");
    }
  }, [walletAddress, navigate]);

  useEffect(() => {
    if (connected && publicKey && status === "connecting") {
      handleSign();
    }
  }, [connected, publicKey, status]);

  const handleWalletSelect = async (walletId: string) => {
    setError(null);
    setSelectedWallet(walletId);
    setStatus("connecting");

    const wallet = wallets.find(
      (w) => w.adapter.name.toLowerCase().includes(walletId)
    );

    if (!wallet) {
      setError(`${walletId} wallet not detected. Please install it and refresh.`);
      setStatus("error");
      return;
    }

    try {
      select(wallet.adapter.name);
      await connect();
    } catch (err: any) {
      if (err?.message?.includes("rejected")) {
        setError("Connection cancelled. Try again.");
      } else {
        setError(err?.message || "Failed to connect wallet.");
      }
      setStatus("error");
    }
  };

  const handleSign = async () => {
    if (!publicKey || !signMessage) return;

    const walletAddr = publicKey.toBase58();
    setStatus("signing");
    setError(null);

    try {
      const challengeRes = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: walletAddr }),
      });
      const { message } = await challengeRes.json();

      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      setStatus("verifying");

      const signatureBase64 = btoa(
        Array.from(signature).map(b => String.fromCharCode(b)).join('')
      );

      const result = await loginWithSignature(walletAddr, signatureBase64, message);

      if (result.success) {
        navigate("/");
      } else {
        setError(result.error || "Verification failed. Please try again.");
        setStatus("error");
      }
    } catch (err: any) {
      if (err?.message?.includes("rejected") || err?.message?.includes("cancelled")) {
        setError("Signature cancelled. Try again.");
      } else {
        setError(err?.message || "Authentication failed.");
      }
      setStatus("error");
    }
  };

  if (walletAddress) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0f0f2e] to-[#1a0a2e] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h1
            data-testid="login-title"
            className="font-['Orbitron'] text-3xl font-bold tracking-wider mb-2"
            style={{
              color: "#06b6d4",
              textShadow: "0 0 20px rgba(6,182,212,0.6), 0 0 40px rgba(6,182,212,0.3)",
            }}
          >
            GRIDIRON GHOSTS
          </h1>
          <p className="font-['VT323'] text-lg text-gray-400">
            Connect your wallet to enter the league
          </p>
        </div>

        {(status === "disconnected" || status === "error") && (
          <div className="w-full flex flex-col gap-3">
            {WALLET_OPTIONS.map((wallet) => (
              <button
                key={wallet.id}
                data-testid={`btn-wallet-${wallet.id}`}
                onClick={() => handleWalletSelect(wallet.id)}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-lg border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(6,182,212,0.05)",
                  borderColor:
                    selectedWallet === wallet.id
                      ? "#06b6d4"
                      : "rgba(6,182,212,0.2)",
                  boxShadow:
                    selectedWallet === wallet.id
                      ? "0 0 15px rgba(6,182,212,0.3)"
                      : "none",
                }}
              >
                <span className="text-2xl">{wallet.icon}</span>
                <span className="font-['Orbitron'] text-sm text-white tracking-wide">
                  {wallet.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {status === "connecting" && (
          <div className="w-full text-center">
            <div
              className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
              style={{ borderColor: "#06b6d4", borderTopColor: "transparent" }}
            />
            <p className="font-['VT323'] text-lg text-cyan-400" data-testid="text-login-status">
              Connecting to {selectedWallet}...
            </p>
          </div>
        )}

        {status === "signing" && (
          <div className="w-full text-center">
            <div
              className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
              style={{ borderColor: "#ec4899", borderTopColor: "transparent" }}
            />
            <p className="font-['VT323'] text-lg text-pink-400" data-testid="text-login-status">
              Waiting for wallet approval...
            </p>
            {publicKey && (
              <p className="font-['VT323'] text-sm text-gray-500 mt-2" data-testid="text-wallet-address">
                {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
              </p>
            )}
          </div>
        )}

        {status === "verifying" && (
          <div className="w-full text-center">
            <div
              className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
              style={{ borderColor: "#22c55e", borderTopColor: "transparent" }}
            />
            <p className="font-['VT323'] text-lg text-green-400" data-testid="text-login-status">
              Verifying signature...
            </p>
          </div>
        )}

        {error && (
          <div className="w-full text-center">
            <p
              className="font-['VT323'] text-lg mb-4"
              style={{ color: "#ef4444", textShadow: "0 0 10px rgba(239,68,68,0.5)" }}
              data-testid="text-login-error"
            >
              {error}
            </p>
            <Button
              onClick={() => {
                setStatus("disconnected");
                setError(null);
                setSelectedWallet(null);
              }}
              className="font-['Orbitron'] text-xs tracking-wider px-6 py-2"
              style={{
                background: "rgba(6,182,212,0.2)",
                borderColor: "#06b6d4",
                color: "#06b6d4",
              }}
              variant="outline"
            >
              TRY AGAIN
            </Button>
          </div>
        )}

        {connected && publicKey && status === "error" && (
          <Button
            data-testid="btn-sign-message"
            onClick={handleSign}
            className="font-['Orbitron'] text-xs tracking-wider px-8 py-3 mt-2"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #ec4899)",
              color: "white",
            }}
          >
            SIGN TO VERIFY
          </Button>
        )}
      </div>

      <div className="absolute bottom-6 text-center">
        <p className="font-['Press_Start_2P'] text-[8px] text-gray-600">
          v1.2.0 // SOLANA SEEKER READY
        </p>
      </div>
    </div>
  );
}

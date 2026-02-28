import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/images/logo-neon-dugout.png";
import bgLoginImg from "@/assets/images/bg-login.png";

const WALLET_OPTIONS = [
  { name: "Seeker", icon: "📱", id: "seeker", matchNames: ["mobile wallet adapter", "seeker", "solana mobile", "solana mobile wallet adapter", "solana mobile stack"] },
  { name: "Phantom", icon: "👻", id: "phantom", matchNames: ["phantom"] },
  { name: "Solflare", icon: "🌟", id: "solflare", matchNames: ["solflare"] },
  { name: "Backpack", icon: "🎒", id: "backpack", matchNames: ["backpack"] },
] as const;

type LoginStatus = "disconnected" | "connecting" | "connected" | "signing" | "verifying" | "error";

export default function LoginPage() {
  const { publicKey, signMessage, select, wallets, connect, connected, connecting, wallet, disconnect } = useWallet();
  const { walletAddress, loginWithSignature } = useGameStore();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<LoginStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const attemptIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detectedWalletIds = useMemo(() => {
    const detected = new Set<string>();
    for (const w of wallets) {
      const adapterName = w.adapter.name.toLowerCase();
      for (const opt of WALLET_OPTIONS) {
        if (opt.matchNames.some(mn => adapterName.includes(mn))) {
          detected.add(opt.id);
        }
      }
    }
    return detected;
  }, [wallets]);

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      navigate("/");
    }
  }, [walletAddress, navigate]);

  useEffect(() => {
    if (!wallet || status !== "connecting" || connected || connecting) return;

    const currentAttempt = attemptIdRef.current;
    clearPendingTimeout();

    timeoutRef.current = setTimeout(() => {
      if (attemptIdRef.current === currentAttempt) {
        setError("Connection timed out. The wallet did not respond. Make sure the wallet app is open and try again.");
        setStatus("error");
      }
    }, 30000);

    connect()
      .then(() => {
        if (attemptIdRef.current === currentAttempt) {
          clearPendingTimeout();
        }
      })
      .catch((err: any) => {
        if (attemptIdRef.current !== currentAttempt) return;
        clearPendingTimeout();
        if (err?.message?.includes("rejected")) {
          setError("Connection cancelled. Try again.");
        } else {
          setError(err?.message || "Failed to connect wallet.");
        }
        setStatus("error");
      });

    return () => clearPendingTimeout();
  }, [wallet, status, connected, connecting]);

  useEffect(() => {
    if (connected && publicKey && status === "connecting") {
      clearPendingTimeout();
      handleSign();
    }
  }, [connected, publicKey, status]);

  const findAdapter = (walletId: string) => {
    const opt = WALLET_OPTIONS.find(o => o.id === walletId);
    if (!opt) return null;
    return wallets.find(w => {
      const name = w.adapter.name.toLowerCase();
      return opt.matchNames.some(mn => name.includes(mn));
    }) || null;
  };

  const handleWalletSelect = async (walletId: string) => {
    setError(null);
    setSelectedWallet(walletId);
    attemptIdRef.current += 1;
    clearPendingTimeout();
    setStatus("connecting");

    const found = findAdapter(walletId);

    if (!found) {
      if (walletId === "seeker") {
        setError("Seeker wallet not detected. Make sure you're using the Seeker's built-in browser or have the Seeker wallet app installed.");
      } else {
        setError(`${walletId} wallet not detected. Please install it and refresh.`);
      }
      setStatus("error");
      return;
    }

    try {
      if (connected) {
        await disconnect();
      }
    } catch {}

    select(found.adapter.name);
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={bgLoginImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div className="absolute inset-0 opacity-[0.07]">
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
        <div className="text-center flex flex-col items-center">
          <img
            src={logoImg}
            alt="Neon Dugout"
            data-testid="img-logo"
            className="w-28 h-28 mb-4 drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]"
          />
          <h1
            data-testid="login-title"
            className="font-['Orbitron'] text-3xl font-bold tracking-wider mb-2"
            style={{
              color: "#06b6d4",
              textShadow: "0 0 20px rgba(6,182,212,0.6), 0 0 40px rgba(6,182,212,0.3)",
            }}
          >
            NEON DUGOUT
          </h1>
          <p className="font-['VT323'] text-lg text-gray-400">
            Connect your wallet to enter the league
          </p>
        </div>

        {(status === "disconnected" || status === "error") && (
          <div className="w-full flex flex-col gap-3">
            {WALLET_OPTIONS.map((wallet) => {
              const isDetected = detectedWalletIds.has(wallet.id);
              return (
                <button
                  key={wallet.id}
                  data-testid={`btn-wallet-${wallet.id}`}
                  onClick={() => handleWalletSelect(wallet.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-lg border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: isDetected
                      ? "rgba(6,182,212,0.1)"
                      : "rgba(6,182,212,0.03)",
                    borderColor:
                      selectedWallet === wallet.id
                        ? "#06b6d4"
                        : isDetected
                          ? "rgba(6,182,212,0.35)"
                          : "rgba(6,182,212,0.12)",
                    boxShadow:
                      selectedWallet === wallet.id
                        ? "0 0 15px rgba(6,182,212,0.3)"
                        : "none",
                    opacity: isDetected ? 1 : 0.55,
                  }}
                >
                  <span className="text-2xl">{wallet.icon}</span>
                  <span className="font-['Orbitron'] text-sm text-white tracking-wide flex-1 text-left">
                    {wallet.name}
                  </span>
                  {isDetected && (
                    <span data-testid={`badge-detected-${wallet.id}`} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                      DETECTED
                    </span>
                  )}
                </button>
              );
            })}
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
          v1.14.2 // SOLANA SEEKER READY
        </p>
      </div>
    </div>
  );
}

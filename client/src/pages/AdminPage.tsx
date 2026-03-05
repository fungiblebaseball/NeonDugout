import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/lib/store";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Coins, Trash2, Play, Trophy, RotateCcw, AlertTriangle, ChevronDown, ChevronUp, MessageSquare, Send, ExternalLink, TrendingUp, Lock, Wallet } from "lucide-react";
import { useState, useEffect } from "react";

interface TrainingConfig {
  id: number;
  gameType: string;
  rewardAttributes: string[];
  rewardAmount: number;
  minScoreForReward: number;
  maxBoostPerSeason: number;
  rewardTarget: string;
  rewardTargetRole: string | null;
}

interface TokenEconomyStats {
  totalSupply: number;
  lockedInMarket: number;
  circulatingSupply: number;
  totalPurchasedTokens: number;
  totalClaimedTokens: number;
  treasuryLamports: string;
  chartData: { date: string; claimed: number; purchased: number }[];
}

interface TokenConfigData {
  claimAmount: number;
  claimIntervalHours: number;
  merchantWallet: string | null;
}

interface MatchData {
  id: number;
  day: number;
  played: boolean;
  homeTeamId: number;
  awayTeamId: number;
  matchType: string;
}

interface TacticCoefficient {
  id: number;
  layer: string;
  tacticValue: string;
  hr: number;
  xbh: number;
  single: number;
  bb: number;
  so: number;
  go: number;
  fo: number;
  tacSt: number;
}

interface AdminMessage {
  id: number;
  message: string;
  targetType: string;
  targetValue: string | null;
  createdAt: string;
  active: boolean;
}

interface TeamData {
  id: number;
  name: string;
  league: string;
  series: string;
}

const ALL_ATTRIBUTES = ["pow", "con", "spd", "eye", "vel", "ctl", "mov", "sta", "def"];
const ALL_POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

const GAME_LABELS: Record<string, string> = {
  eye_drill: "Eye Drill",
  batting_practice: "Batting Practice",
  pitch_control: "Pitch Control",
};

function CollapsibleSection({
  title,
  defaultOpen,
  children,
  testId,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
  testId: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-6" data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        data-testid={`toggle-${testId}`}
        className="flex items-center justify-between w-full text-left mb-4"
      >
        <h2 className="text-sm text-gray-400 uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
          {title}
        </h2>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && children}
    </div>
  );
}

export default function AdminPage() {
  const { token, user } = useGameStore();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate("/");
    }
  }, [user, navigate]);

  const { data: configs, isLoading } = useQuery<TrainingConfig[]>({
    queryKey: ["admin-training-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/training-config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load configs");
      return res.json();
    },
    enabled: !!token && !!user?.isAdmin,
  });

  const { data: tokenConfig } = useQuery<TokenConfigData>({
    queryKey: ["admin-token-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/token-config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load token config");
      return res.json();
    },
    enabled: !!token && !!user?.isAdmin,
  });

  const { data: economyStats } = useQuery<TokenEconomyStats>({
    queryKey: ["admin-token-economy-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/token-economy-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load economy stats");
      return res.json();
    },
    enabled: !!token && !!user?.isAdmin,
    refetchInterval: 30000,
  });

  const { data: allMatches } = useQuery<MatchData[]>({
    queryKey: ["matches-all"],
    queryFn: async () => {
      const res = await fetch("/api/matches");
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  if (!user?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-black text-white pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/")} data-testid="button-back" className="text-cyan-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-widest uppercase" style={{ fontFamily: "Orbitron, sans-serif" }}>
          Admin Panel
        </h1>
      </div>

      <CollapsibleSection title="Match Day Control" defaultOpen={true} testId="section-match-day">
        <GameDayCard allMatches={allMatches || []} token={token!} queryClient={queryClient} />
      </CollapsibleSection>

      <CollapsibleSection title="Token Economy Config" defaultOpen={true} testId="section-token-economy">
        {economyStats && <TokenEconomyDashboard stats={economyStats} />}
        {tokenConfig && (
          <TokenConfigCard config={tokenConfig} token={token!} queryClient={queryClient} />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Training Reward Config" defaultOpen={false} testId="section-training-reward">
        {isLoading && <p className="text-gray-500 text-sm">Loading...</p>}
        <div className="space-y-4">
          {configs?.map((config) => (
            <ConfigCard key={config.id} config={config} token={token!} queryClient={queryClient} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Tactic Coefficients" defaultOpen={false} testId="section-tactic-coefficients">
        <TacticCoefficientsCard token={token!} queryClient={queryClient} />
      </CollapsibleSection>

      <CollapsibleSection title="Messaging" defaultOpen={false} testId="section-messaging">
        <MessagingCard token={token!} queryClient={queryClient} />
      </CollapsibleSection>

      <CollapsibleSection title="Token Packages (SOL Purchase)" defaultOpen={false} testId="section-token-packages">
        <TokenPackagesCard token={token!} queryClient={queryClient} />
      </CollapsibleSection>

      <CollapsibleSection title="Purchase History" defaultOpen={false} testId="section-purchase-history">
        <PurchaseHistoryCard token={token!} />
      </CollapsibleSection>
    </div>
  );
}

function GameDayCard({
  allMatches,
  token,
  queryClient,
}: {
  allMatches: MatchData[];
  token: string;
  queryClient: any;
}) {
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  const unplayedDays = Array.from(new Set(allMatches.filter(m => !m.played).map(m => m.day))).sort((a, b) => a - b);
  const nextDay = unplayedDays.length > 0 ? unplayedDays[0] : null;
  const matchesForNextDay = nextDay ? allMatches.filter(m => m.day === nextDay && !m.played).length : 0;
  const seasonFinished = allMatches.length > 0 && unplayedDays.length === 0;

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const simulateDay = async () => {
    if (!nextDay) return;
    setSimulating(true);
    setSimResult(null);
    try {
      if (nextDay >= 13) {
        await fetch("/api/update-playoff-matchups", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      const res = await fetch("/api/simulate-day", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ day: nextDay }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimResult(`Day ${nextDay}: ${data.matchesSimulated} matches simulated`);
      } else {
        setSimResult(data.message || "Simulation failed");
      }
      queryClient.invalidateQueries({ queryKey: ["matches-all"] });
      queryClient.invalidateQueries({ queryKey: ["teams-all"] });
    } catch (err) {
      setSimResult("Simulation failed");
    }
    setSimulating(false);
  };

  const startNewSeason = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await fetch("/api/new-season", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.seasonId) {
        setSimResult(`New season ${data.seasonId} started!`);
        queryClient.invalidateQueries({ queryKey: ["matches-all"] });
        queryClient.invalidateQueries({ queryKey: ["teams-all"] });
        queryClient.invalidateQueries({ queryKey: ["current-season"] });
      } else {
        setSimResult(data.message || "Failed to start new season");
      }
    } catch (err) {
      setSimResult("Failed to start new season");
    }
    setSimulating(false);
  };

  const resetSeason = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 5000);
      return;
    }
    setSimulating(true);
    setSimResult(null);
    setConfirmReset(false);
    try {
      const res = await fetch("/api/admin/reset-season", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSimResult(data.message || "Season reset!");
        queryClient.invalidateQueries({ queryKey: ["matches-all"] });
        queryClient.invalidateQueries({ queryKey: ["teams-all"] });
        queryClient.invalidateQueries({ queryKey: ["current-season"] });
      } else {
        setSimResult(data.message || "Reset failed");
      }
    } catch (err) {
      setSimResult("Reset failed");
    }
    setSimulating(false);
  };

  const wipeDatabase = async () => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      setTimeout(() => setConfirmWipe(false), 5000);
      return;
    }
    setSimulating(true);
    setSimResult(null);
    setConfirmWipe(false);
    try {
      const res = await fetch("/api/admin/wipe-database", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSimResult(data.message || "Database wiped!");
        window.location.href = "/login";
      } else {
        setSimResult(data.message || "Wipe failed");
      }
    } catch (err) {
      setSimResult("Wipe failed");
    }
    setSimulating(false);
  };

  return (
    <div className="bg-gray-900 border border-pink-500/30 rounded-xl p-4 space-y-4" data-testid="card-game-day">
      <div className="flex items-center gap-2">
        <Play className="w-4 h-4 text-pink-400" />
        <h3 className="text-sm font-bold tracking-wider text-pink-400" style={{ fontFamily: "Orbitron, sans-serif" }}>
          Match Day Simulation
        </h3>
      </div>

      <p className="text-[10px] text-gray-500 font-mono">
        Auto-runs daily at 00:00 CET. Use buttons below for manual control.
      </p>

      {seasonFinished ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-400 font-bold">Season Complete</span>
          </div>
          <button
            onClick={startNewSeason}
            disabled={simulating}
            data-testid="button-admin-new-season"
            className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_10px_rgba(34,211,238,0.3)] disabled:opacity-50 text-xs"
          >
            {simulating ? "GENERATING..." : "START NEW SEASON"}
          </button>
        </div>
      ) : nextDay ? (
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400 font-mono">Next: Day {nextDay}</span>
            <span className="text-gray-500 font-mono">{matchesForNextDay} matches</span>
          </div>
          <button
            onClick={simulateDay}
            disabled={simulating}
            data-testid="button-admin-simulate"
            className="w-full py-2 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_10px_rgba(236,72,153,0.3)] disabled:opacity-50 text-xs"
          >
            {simulating ? "SIMULATING..." : `SIMULATE DAY ${nextDay}`}
          </button>
        </div>
      ) : (
        <p className="text-gray-500 text-xs font-mono">No matches loaded</p>
      )}

      {simResult && (
        <p className="text-[10px] font-mono text-green-400 bg-green-900/20 border border-green-500/30 rounded px-2 py-1" data-testid="text-sim-result">
          {simResult}
        </p>
      )}

      <div className="border-t border-gray-700 pt-3 space-y-2">
        <button
          onClick={resetSeason}
          disabled={simulating}
          data-testid="button-admin-reset-season"
          className={`w-full py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
            confirmReset
              ? "bg-orange-600 hover:bg-orange-500 text-white animate-pulse"
              : "bg-orange-900/30 hover:bg-orange-900/50 text-orange-400 border border-orange-500/30"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <RotateCcw className="w-3 h-3" />
            {simulating ? "RESETTING..." : confirmReset ? "CONFIRM RESET SEASON" : "RESET & REGENERATE SEASON"}
          </div>
        </button>

        <button
          onClick={wipeDatabase}
          disabled={simulating}
          data-testid="button-admin-wipe-db"
          className={`w-full py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
            confirmWipe
              ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
              : "bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            {simulating ? "WIPING..." : confirmWipe ? "CONFIRM — ERASE ALL DATA" : "ERASE ALL DATA & RESET APP"}
          </div>
        </button>
      </div>
    </div>
  );
}

function TokenEconomyDashboard({ stats }: { stats: TokenEconomyStats }) {
  const treasurySol = (Number(stats.treasuryLamports) / 1_000_000_000).toFixed(4);
  const chartData = stats.chartData;
  const maxDayTotal = Math.max(1, ...chartData.map(d => d.claimed + d.purchased));

  return (
    <div className="space-y-4 mb-4" data-testid="token-economy-dashboard">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-900 border border-cyan-500/30 rounded-xl p-3 text-center" data-testid="stat-circulating">
          <TrendingUp className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Circulating</p>
          <p className="text-lg font-black text-cyan-400" style={{ fontFamily: "Orbitron, sans-serif" }} data-testid="text-circulating-supply">
            {stats.circulatingSupply.toLocaleString()}
          </p>
          <p className="text-[8px] text-gray-600 mt-0.5">of {stats.totalSupply.toLocaleString()} total</p>
        </div>
        <div className="bg-gray-900 border border-amber-500/30 rounded-xl p-3 text-center" data-testid="stat-locked">
          <Lock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Locked (Market)</p>
          <p className="text-lg font-black text-amber-400" style={{ fontFamily: "Orbitron, sans-serif" }} data-testid="text-locked-market">
            {stats.lockedInMarket.toLocaleString()}
          </p>
          <p className="text-[8px] text-gray-600 mt-0.5">in active listings</p>
        </div>
        <div className="bg-gray-900 border border-emerald-500/30 rounded-xl p-3 text-center" data-testid="stat-treasury">
          <Wallet className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Treasury</p>
          <p className="text-lg font-black text-emerald-400" style={{ fontFamily: "Orbitron, sans-serif" }} data-testid="text-treasury">
            {treasurySol}
          </p>
          <p className="text-[8px] text-gray-600 mt-0.5">SOL received</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-900/60 border border-cyan-500/20 rounded-lg p-2 text-center">
          <p className="text-[9px] text-gray-500 uppercase tracking-wider">Claimed</p>
          <p className="text-sm font-bold text-cyan-300" data-testid="text-total-claimed">{stats.totalClaimedTokens.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900/60 border border-pink-500/20 rounded-lg p-2 text-center">
          <p className="text-[9px] text-gray-500 uppercase tracking-wider">Purchased (SOL)</p>
          <p className="text-sm font-bold text-pink-300" data-testid="text-total-purchased">{stats.totalPurchasedTokens.toLocaleString()}</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Supply Growth (Last 30 Days)</p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[9px] text-cyan-400"><span className="w-2 h-2 rounded-sm bg-cyan-500 inline-block" /> Claimed</span>
              <span className="flex items-center gap-1 text-[9px] text-pink-400"><span className="w-2 h-2 rounded-sm bg-pink-500 inline-block" /> SOL</span>
            </div>
          </div>
          <div className="flex items-end gap-[2px] h-28" data-testid="chart-supply-growth">
            {chartData.map((d, i) => {
              const claimedH = (d.claimed / maxDayTotal) * 100;
              const purchasedH = (d.purchased / maxDayTotal) * 100;
              const dateLabel = d.date.slice(5);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-[8px] text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    {dateLabel}: {d.claimed}c + {d.purchased}p
                  </div>
                  <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                    <div className="w-full bg-pink-500/80 rounded-t-sm transition-all" style={{ height: `${purchasedH}%`, minHeight: d.purchased > 0 ? '2px' : '0' }} />
                    <div className="w-full bg-cyan-500/80 rounded-b-sm transition-all" style={{ height: `${claimedH}%`, minHeight: d.claimed > 0 ? '2px' : '0' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[7px] text-gray-600">{chartData[0]?.date.slice(5)}</span>
            <span className="text-[7px] text-gray-600">{chartData[chartData.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      )}

      {chartData.length === 0 && (
        <div className="bg-gray-900 border border-gray-700/30 rounded-xl p-4 text-center">
          <p className="text-[10px] text-gray-500 font-mono">No supply events recorded yet. Chart will appear after first claim or purchase.</p>
        </div>
      )}
    </div>
  );
}

function TokenConfigCard({
  config,
  token,
  queryClient,
}: {
  config: TokenConfigData;
  token: string;
  queryClient: any;
}) {
  const [claimAmount, setClaimAmount] = useState(config.claimAmount);
  const [intervalHours, setIntervalHours] = useState(config.claimIntervalHours);
  const [merchantWallet, setMerchantWallet] = useState(config.merchantWallet || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setClaimAmount(config.claimAmount);
    setIntervalHours(config.claimIntervalHours);
    setMerchantWallet(config.merchantWallet || "");
  }, [config]);

  const handleSave = async () => {
    if (merchantWallet && (merchantWallet.length < 32 || merchantWallet.length > 44)) {
      setWalletError("Invalid Solana address (32-44 chars)");
      return;
    }
    setWalletError("");
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/token-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ claimAmount, claimIntervalHours: intervalHours, merchantWallet: merchantWallet || null }),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-token-config"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 5000);
      return;
    }
    setResetting(true);
    try {
      await fetch("/api/admin/reset-tokens", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ["token-balance"] });
      setConfirmReset(false);
    } catch {}
    setResetting(false);
  };

  return (
    <div className="bg-gray-900 border border-amber-500/30 rounded-xl p-4 space-y-4" data-testid="card-token-config">
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold tracking-wider text-amber-400" style={{ fontFamily: "Orbitron, sans-serif" }}>
          Token Claim Settings
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Tokens per Claim (X)</label>
          <input
            type="number"
            value={claimAmount}
            onChange={(e) => setClaimAmount(parseInt(e.target.value) || 0)}
            min={1}
            max={1000}
            data-testid="input-claim-amount"
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Interval Hours (Y)</label>
          <input
            type="number"
            value={intervalHours}
            onChange={(e) => setIntervalHours(parseInt(e.target.value) || 1)}
            min={1}
            max={168}
            data-testid="input-claim-interval"
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-3 h-3 text-emerald-400" />
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Merchant Wallet (SOL receiver)</label>
        </div>
        <input
          type="text"
          value={merchantWallet}
          onChange={(e) => { setMerchantWallet(e.target.value.trim()); setWalletError(""); }}
          placeholder="Solana address (falls back to env if empty)"
          data-testid="input-merchant-wallet"
          className={`w-full bg-gray-800 border rounded px-2 py-1.5 text-xs text-white font-mono ${
            walletError ? "border-red-500" : "border-gray-700"
          }`}
        />
        {walletError && <p className="text-[9px] text-red-400 mt-0.5">{walletError}</p>}
        {!merchantWallet && <p className="text-[8px] text-gray-600 mt-0.5">Using environment variable fallback</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          data-testid="button-save-token-config"
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-cyan-500 disabled:opacity-50 transition-colors"
        >
          <Save className="w-3 h-3" />
          {saving ? "Saving..." : saved ? "Saved!" : "Save"}
        </button>

        <button
          onClick={handleReset}
          disabled={resetting}
          data-testid="button-reset-treasury"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors ${
            confirmReset
              ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
              : "bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30"
          }`}
        >
          <Trash2 className="w-3 h-3" />
          {resetting ? "Resetting..." : confirmReset ? "CONFIRM RESET" : "Reset Treasury"}
        </button>
      </div>
    </div>
  );
}

function ConfigCard({
  config,
  token,
  queryClient,
}: {
  config: TrainingConfig;
  token: string;
  queryClient: any;
}) {
  const [rewardAttributes, setRewardAttributes] = useState(config.rewardAttributes);
  const [rewardAmount, setRewardAmount] = useState(config.rewardAmount);
  const [minScore, setMinScore] = useState(config.minScoreForReward);
  const [maxBoost, setMaxBoost] = useState(config.maxBoostPerSeason);
  const [rewardTarget, setRewardTarget] = useState(config.rewardTarget || "random");
  const [rewardTargetRole, setRewardTargetRole] = useState(config.rewardTargetRole || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/admin/training-config/${config.gameType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          rewardAttributes,
          rewardAmount,
          minScoreForReward: minScore,
          maxBoostPerSeason: maxBoost,
          rewardTarget,
          rewardTargetRole: rewardTarget === "role" ? rewardTargetRole : null,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-training-config"] });
      queryClient.invalidateQueries({ queryKey: ["training-configs"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const toggleAttr = (attr: string) => {
    setRewardAttributes((prev) =>
      prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr]
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3" data-testid={`card-config-${config.gameType}`}>
      <h3 className="text-sm font-bold tracking-wider text-cyan-400" style={{ fontFamily: "Orbitron, sans-serif" }}>
        {GAME_LABELS[config.gameType] || config.gameType}
      </h3>

      <div>
        <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Reward Attributes</label>
        <div className="flex flex-wrap gap-1">
          {ALL_ATTRIBUTES.map((attr) => (
            <button
              key={attr}
              onClick={() => toggleAttr(attr)}
              data-testid={`toggle-attr-${config.gameType}-${attr}`}
              className={`px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider transition-colors ${
                rewardAttributes.includes(attr)
                  ? "bg-pink-500/30 text-pink-300 border border-pink-500/50"
                  : "bg-gray-800 text-gray-500 border border-gray-700"
              }`}
            >
              {attr}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Reward Target</label>
        <div className="flex gap-1">
          {[
            { value: "random", label: "Random Player" },
            { value: "role", label: "Specific Role" },
            { value: "team", label: "Entire Team" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRewardTarget(opt.value)}
              data-testid={`toggle-target-${config.gameType}-${opt.value}`}
              className={`px-2 py-1 text-[10px] rounded font-bold tracking-wider transition-colors ${
                rewardTarget === opt.value
                  ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                  : "bg-gray-800 text-gray-500 border border-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {rewardTarget === "role" && (
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Target Position</label>
          <div className="flex flex-wrap gap-1">
            {ALL_POSITIONS.map((pos) => (
              <button
                key={pos}
                onClick={() => setRewardTargetRole(pos)}
                data-testid={`toggle-role-${config.gameType}-${pos}`}
                className={`px-2 py-1 text-[10px] rounded font-bold tracking-wider transition-colors ${
                  rewardTargetRole === pos
                    ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                    : "bg-gray-800 text-gray-500 border border-gray-700"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Reward Amt</label>
          <input
            type="number"
            value={rewardAmount}
            onChange={(e) => setRewardAmount(parseInt(e.target.value) || 0)}
            min={0}
            max={10}
            data-testid={`input-reward-${config.gameType}`}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Min Score</label>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
            min={0}
            max={1000}
            data-testid={`input-minscore-${config.gameType}`}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Max/Season</label>
          <input
            type="number"
            value={maxBoost}
            onChange={(e) => setMaxBoost(parseInt(e.target.value) || 0)}
            min={1}
            max={100}
            data-testid={`input-maxboost-${config.gameType}`}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        data-testid={`button-save-${config.gameType}`}
        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-cyan-500 disabled:opacity-50 transition-colors"
      >
        <Save className="w-3 h-3" />
        {saving ? "Saving..." : saved ? "Saved!" : "Save"}
      </button>
    </div>
  );
}

function TacticCoefficientsCard({
  token,
  queryClient,
}: {
  token: string;
  queryClient: any;
}) {
  const { data: coefficients, isLoading } = useQuery<TacticCoefficient[]>({
    queryKey: ["admin-tactic-coefficients"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tactic-coefficients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load coefficients");
      return res.json();
    },
    enabled: !!token,
  });

  const [localCoeffs, setLocalCoeffs] = useState<TacticCoefficient[]>([]);
  const [savingLayer, setSavingLayer] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (coefficients) {
      setLocalCoeffs(coefficients);
    }
  }, [coefficients]);

  const layers = [
    { id: "batter_approach", label: "Batter Approach" },
    { id: "pitcher_style", label: "Pitcher Style" },
    { id: "attack_style", label: "Attack Style" },
    { id: "offensive_attack", label: "Offensive Attack" },
    { id: "defense_counter_infield", label: "Defense Counter Infield" },
    { id: "defense_counter_outfield", label: "Defense Counter Outfield" },
    { id: "defense_setup", label: "Defense Setup" },
  ];

  const handleInputChange = (id: number, field: keyof TacticCoefficient, value: string) => {
    const numValue = Math.min(30, Math.max(-30, parseInt(value) || 0));
    setLocalCoeffs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: numValue } : c))
    );
  };

  const handleSaveLayer = async (layer: string) => {
    setSavingLayer(layer);
    try {
      const layerCoeffs = localCoeffs.filter((c) => c.layer === layer);
      await Promise.all(
        layerCoeffs.map((c) =>
          fetch(`/api/admin/tactic-coefficients/${c.layer}/${c.tacticValue}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              hr: c.hr,
              xbh: c.xbh,
              single: c.single,
              bb: c.bb,
              so: c.so,
              go: c.go,
              fo: c.fo,
              tacSt: c.tacSt,
            }),
          })
        )
      );
      queryClient.invalidateQueries({ queryKey: ["admin-tactic-coefficients"] });
    } catch (err) {
      console.error("Failed to save coefficients", err);
    }
    setSavingLayer(null);
  };

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    try {
      await fetch("/api/admin/reset-tactic-coefficients", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ["admin-tactic-coefficients"] });
      setConfirmReset(false);
    } catch (err) {
      console.error("Failed to reset coefficients", err);
    }
  };

  if (isLoading) return <p className="text-gray-500 text-sm">Loading coefficients...</p>;

  const getTextColor = (val: number) => {
    if (val > 0) return "text-green-400";
    if (val < 0) return "text-red-400";
    return "text-gray-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          data-testid="button-reset-coefficients"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            confirmReset
              ? "bg-red-600 text-white animate-pulse"
              : "bg-red-900/30 text-red-400 border border-red-500/30 hover:bg-red-900/50"
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          {confirmReset ? "CONFIRM RESET" : "RESET TO DEFAULTS"}
        </button>
      </div>

      {layers.map((layer) => (
        <div
          key={layer.id}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-4"
          data-testid={`card-tactic-layer-${layer.id}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wider text-cyan-400" style={{ fontFamily: "Orbitron, sans-serif" }}>
              {layer.label}
            </h3>
            <button
              onClick={() => handleSaveLayer(layer.id)}
              disabled={savingLayer === layer.id}
              data-testid={`button-save-coefficients-${layer.id}`}
              className="flex items-center gap-2 px-4 py-1.5 bg-cyan-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-cyan-500 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3 h-3" />
              {savingLayer === layer.id ? "SAVING..." : "SAVE LAYER"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  <th className="py-2 px-1">Tactic</th>
                  <th className="py-2 px-1">HR</th>
                  <th className="py-2 px-1">XBH</th>
                  <th className="py-2 px-1">1B</th>
                  <th className="py-2 px-1">BB</th>
                  <th className="py-2 px-1">SO</th>
                  <th className="py-2 px-1">GO</th>
                  <th className="py-2 px-1">FO</th>
                  <th className="py-2 px-1">ST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {localCoeffs
                  .filter((c) => c.layer === layer.id)
                  .map((coeff) => (
                    <tr key={coeff.id} className="text-xs">
                      <td className="py-2 px-1 font-bold text-gray-400 capitalize">{coeff.tacticValue.replace(/_/g, " ")}</td>
                      {["hr", "xbh", "single", "bb", "so", "go", "fo", "tacSt"].map((field) => (
                        <td key={field} className="py-1 px-1">
                          <input
                            type="number"
                            value={coeff[field as keyof TacticCoefficient]}
                            onChange={(e) => handleInputChange(coeff.id, field as keyof TacticCoefficient, e.target.value)}
                            min={-30}
                            max={30}
                            data-testid={`input-coeff-${layer.id}-${coeff.tacticValue}-${field}`}
                            className={`w-12 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-center font-mono ${getTextColor(coeff[field as keyof TacticCoefficient] as number)}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessagingCard({
  token,
  queryClient,
}: {
  token: string;
  queryClient: any;
}) {
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetValue, setTargetValue] = useState("");
  const [sending, setSending] = useState(false);

  const { data: messages } = useQuery<AdminMessage[]>({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const res = await fetch("/api/admin/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: teams } = useQuery<TeamData[]>({
    queryKey: ["teams-all"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to load teams");
      return res.json();
    },
    enabled: !!token,
  });

  const leagues = teams ? Array.from(new Set(teams.map(t => t.league))).sort() : [];
  const seriesList = teams ? Array.from(new Set(teams.map(t => t.series))).sort() : [];
  const teamNames = teams ? teams.map(t => t.name).sort() : [];

  useEffect(() => {
    setTargetValue("");
  }, [targetType]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: message.trim(),
          targetType,
          targetValue: targetType === "all" ? null : targetValue || null,
        }),
      });
      setMessage("");
      setTargetType("all");
      setTargetValue("");
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    } catch {}
    setSending(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/admin/messages/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    } catch {}
  };

  const targetTypeOptions = [
    { value: "all", label: "Tutti" },
    { value: "league", label: "Lega" },
    { value: "series", label: "Serie" },
    { value: "team", label: "Team" },
  ];

  const getTargetValueOptions = (): string[] => {
    switch (targetType) {
      case "league": return leagues;
      case "series": return seriesList;
      case "team": return teamNames;
      default: return [];
    }
  };

  const targetValueOptions = getTargetValueOptions();
  const activeMessages = messages?.filter(m => m.active) || [];

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-4 space-y-4" data-testid="card-messaging">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold tracking-wider text-purple-400" style={{ fontFamily: "Orbitron, sans-serif" }}>
            Send Message
          </h3>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            rows={3}
            data-testid="input-message-text"
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white resize-none"
            placeholder="Write a short message..."
          />
          <p className="text-[10px] text-gray-600 text-right">{message.length}/200</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Target Type</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              data-testid="select-target-type"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            >
              {targetTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {targetType !== "all" && (
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Target Value</label>
              <select
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                data-testid="select-target-value"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              >
                <option value="">-- Select --</option>
                {targetValueOptions.map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          data-testid="button-send-message"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-purple-500 disabled:opacity-50 transition-colors"
        >
          <Send className="w-3 h-3" />
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      {activeMessages.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3" data-testid="card-active-messages">
          <h3 className="text-sm font-bold tracking-wider text-gray-400" style={{ fontFamily: "Orbitron, sans-serif" }}>
            Active Messages ({activeMessages.length})
          </h3>
          <div className="space-y-2">
            {activeMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start justify-between gap-2 bg-gray-800/50 border border-gray-700 rounded-lg p-3"
                data-testid={`message-item-${msg.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white break-words">{msg.message}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] text-purple-400 font-mono uppercase">
                      {targetTypeOptions.find(t => t.value === msg.targetType)?.label || msg.targetType}
                    </span>
                    {msg.targetValue && (
                      <span className="text-[10px] text-cyan-400 font-mono">{msg.targetValue}</span>
                    )}
                    {msg.createdAt && (
                      <span className="text-[10px] text-gray-600 font-mono">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(msg.id)}
                  data-testid={`button-delete-message-${msg.id}`}
                  className="text-red-400 hover:text-red-300 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TokenPkgData {
  id: number;
  tokens: number;
  priceLamports: string;
  label: string;
  active: boolean;
  sortOrder: number;
}

function TokenPackagesCard({ token, queryClient }: { token: string; queryClient: any }) {
  const { data: packages = [], isLoading } = useQuery<TokenPkgData[]>({
    queryKey: ['admin-token-packages'],
    queryFn: async () => {
      const res = await fetch('/api/admin/token-packages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ tokens: 0, priceSol: '', label: '', active: true, sortOrder: 0 });
  const [newForm, setNewForm] = useState({ tokens: '', priceSol: '', label: '' });
  const [saving, setSaving] = useState(false);

  const solToLamports = (sol: string) => String(Math.round(parseFloat(sol) * 1_000_000_000));
  const lamportsToSol = (lamports: string) => (parseInt(lamports) / 1_000_000_000).toString();

  const startEdit = (pkg: TokenPkgData) => {
    setEditId(pkg.id);
    setEditForm({ tokens: pkg.tokens, priceSol: lamportsToSol(pkg.priceLamports), label: pkg.label, active: pkg.active, sortOrder: pkg.sortOrder });
  };

  const handleSave = async () => {
    if (editId === null) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/token-packages/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tokens: editForm.tokens, priceLamports: solToLamports(editForm.priceSol), label: editForm.label, active: editForm.active, sortOrder: editForm.sortOrder }),
      });
      queryClient.invalidateQueries({ queryKey: ['admin-token-packages'] });
      setEditId(null);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/admin/token-packages/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    queryClient.invalidateQueries({ queryKey: ['admin-token-packages'] });
  };

  const handleAdd = async () => {
    const tokens = parseInt(newForm.tokens);
    const priceSol = parseFloat(newForm.priceSol);
    if (!tokens || !priceSol || !newForm.label) return;
    setSaving(true);
    try {
      await fetch('/api/admin/token-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tokens, priceLamports: solToLamports(newForm.priceSol), label: newForm.label, sortOrder: packages.length + 1 }),
      });
      queryClient.invalidateQueries({ queryKey: ['admin-token-packages'] });
      setNewForm({ tokens: '', priceSol: '', label: '' });
    } finally { setSaving(false); }
  };

  if (isLoading) return <div className="text-gray-500 font-mono text-xs">Loading...</div>;

  return (
    <div className="space-y-3">
      {packages.map(pkg => (
        <div key={pkg.id} data-testid={`token-package-${pkg.id}`} className="rounded-lg border border-cyan-500/20 bg-black/40 p-3">
          {editId === pkg.id ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input data-testid="input-edit-tokens" type="number" value={editForm.tokens} onChange={e => setEditForm(f => ({ ...f, tokens: parseInt(e.target.value) || 0 }))} className="w-20 bg-black border border-cyan-500/30 rounded px-2 py-1 text-xs font-mono text-cyan-200" placeholder="Tokens" />
                <input data-testid="input-edit-price-sol" type="text" value={editForm.priceSol} onChange={e => setEditForm(f => ({ ...f, priceSol: e.target.value }))} className="w-20 bg-black border border-cyan-500/30 rounded px-2 py-1 text-xs font-mono text-cyan-200" placeholder="SOL" />
                <input data-testid="input-edit-sort" type="number" value={editForm.sortOrder} onChange={e => setEditForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="w-12 bg-black border border-cyan-500/30 rounded px-2 py-1 text-xs font-mono text-cyan-200" placeholder="#" />
              </div>
              <input data-testid="input-edit-label" type="text" value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} className="w-full bg-black border border-cyan-500/30 rounded px-2 py-1 text-xs font-mono text-cyan-200" placeholder="Label" />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs font-mono text-gray-400">
                  <input type="checkbox" checked={editForm.active} onChange={e => setEditForm(f => ({ ...f, active: e.target.checked }))} /> Active
                </label>
                <button data-testid="button-save-package" onClick={handleSave} disabled={saving} className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-[9px] uppercase rounded">
                  <Save className="w-3 h-3 inline mr-1" />{saving ? '...' : 'SAVE'}
                </button>
                <button onClick={() => setEditId(null)} className="px-3 py-1 border border-gray-600 text-gray-400 font-mono text-[9px] uppercase rounded">CANCEL</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-cyan-200">{pkg.label}</div>
                <div className="text-[10px] font-mono text-gray-500">
                  {pkg.tokens} tokens · {lamportsToSol(pkg.priceLamports)} SOL · Order #{pkg.sortOrder} · {pkg.active ? '✅ Active' : '❌ Inactive'}
                </div>
              </div>
              <div className="flex gap-1">
                <button data-testid={`button-edit-package-${pkg.id}`} onClick={() => startEdit(pkg)} className="px-2 py-1 border border-cyan-500/30 text-cyan-400 font-mono text-[9px] uppercase rounded hover:bg-cyan-500/10">EDIT</button>
                <button data-testid={`button-delete-package-${pkg.id}`} onClick={() => handleDelete(pkg.id)} className="px-2 py-1 border border-red-500/30 text-red-400 font-mono text-[9px] uppercase rounded hover:bg-red-500/10">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="rounded-lg border border-emerald-500/20 bg-black/40 p-3 space-y-2">
        <div className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider">Add Package</div>
        <div className="flex gap-2">
          <input data-testid="input-new-tokens" type="number" value={newForm.tokens} onChange={e => setNewForm(f => ({ ...f, tokens: e.target.value }))} className="w-20 bg-black border border-emerald-500/30 rounded px-2 py-1 text-xs font-mono text-emerald-200" placeholder="Tokens" />
          <input data-testid="input-new-price-sol" type="text" value={newForm.priceSol} onChange={e => setNewForm(f => ({ ...f, priceSol: e.target.value }))} className="w-20 bg-black border border-emerald-500/30 rounded px-2 py-1 text-xs font-mono text-emerald-200" placeholder="SOL" />
        </div>
        <input data-testid="input-new-label" type="text" value={newForm.label} onChange={e => setNewForm(f => ({ ...f, label: e.target.value }))} className="w-full bg-black border border-emerald-500/30 rounded px-2 py-1 text-xs font-mono text-emerald-200" placeholder="Label (es: 500 Tokens – 0.1 SOL)" />
        <button data-testid="button-add-package" onClick={handleAdd} disabled={saving || !newForm.tokens || !newForm.priceSol || !newForm.label} className="px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] uppercase rounded disabled:opacity-40">
          ADD PACKAGE
        </button>
      </div>
    </div>
  );
}

interface MarketPurchase {
  id: number;
  playerId: number;
  playerName: string;
  playerPositions: string[];
  sellerWallet: string;
  buyerWallet: string;
  price: number;
  soldAt: string | null;
  listedAt: string;
}

interface TokenPurchaseRecord {
  id: number;
  walletAddress: string;
  tokens: number;
  priceLamports: string;
  txSignature: string | null;
  confirmedAt: string | null;
}

function PurchaseHistoryCard({ token }: { token: string }) {
  const [tab, setTab] = useState<"market" | "sol">("market");

  const { data: marketHistory = [], isLoading: loadingMarket } = useQuery<MarketPurchase[]>({
    queryKey: ["admin-purchase-history-market"],
    queryFn: async () => {
      const res = await fetch("/api/admin/purchase-history/market", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: tokenHistory = [], isLoading: loadingTokens } = useQuery<TokenPurchaseRecord[]>({
    queryKey: ["admin-purchase-history-tokens"],
    queryFn: async () => {
      const res = await fetch("/api/admin/purchase-history/tokens", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const truncateWallet = (w: string) => w ? `${w.slice(0, 4)}...${w.slice(-4)}` : "—";
  const lamportsToSol = (l: string) => (parseInt(l) / 1_000_000_000).toFixed(4);
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() + " " + new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-3" data-testid="card-purchase-history">
      <div className="flex gap-1">
        <button
          onClick={() => setTab("market")}
          data-testid="tab-market-purchases"
          className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-t transition-colors ${
            tab === "market" ? "bg-pink-500/20 text-pink-300 border border-pink-500/40 border-b-0" : "bg-gray-900 text-gray-500 border border-gray-700"
          }`}
        >
          Market ({marketHistory.length})
        </button>
        <button
          onClick={() => setTab("sol")}
          data-testid="tab-sol-purchases"
          className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-t transition-colors ${
            tab === "sol" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 border-b-0" : "bg-gray-900 text-gray-500 border border-gray-700"
          }`}
        >
          SOL Purchases ({tokenHistory.length})
        </button>
      </div>

      {tab === "market" && (
        <div className="bg-gray-900 border border-pink-500/20 rounded-b-xl rounded-tr-xl p-3">
          {loadingMarket ? (
            <p className="text-gray-500 text-xs font-mono">Loading...</p>
          ) : marketHistory.length === 0 ? (
            <p className="text-gray-500 text-xs font-mono">No market purchases yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="text-gray-500 uppercase border-b border-gray-700">
                    <th className="text-left py-1 px-1">Player</th>
                    <th className="text-left py-1 px-1">Buyer</th>
                    <th className="text-left py-1 px-1">Seller</th>
                    <th className="text-right py-1 px-1">Price</th>
                    <th className="text-right py-1 px-1">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {marketHistory.map((p) => (
                    <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50" data-testid={`market-purchase-${p.id}`}>
                      <td className="py-1.5 px-1 text-pink-300">{p.playerName}</td>
                      <td className="py-1.5 px-1 text-cyan-300">{truncateWallet(p.buyerWallet)}</td>
                      <td className="py-1.5 px-1 text-gray-400">{truncateWallet(p.sellerWallet)}</td>
                      <td className="py-1.5 px-1 text-right text-amber-300">{p.price} T</td>
                      <td className="py-1.5 px-1 text-right text-gray-500">{formatDate(p.soldAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "sol" && (
        <div className="bg-gray-900 border border-cyan-500/20 rounded-b-xl rounded-tl-xl p-3">
          {loadingTokens ? (
            <p className="text-gray-500 text-xs font-mono">Loading...</p>
          ) : tokenHistory.length === 0 ? (
            <p className="text-gray-500 text-xs font-mono">No SOL purchases yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="text-gray-500 uppercase border-b border-gray-700">
                    <th className="text-left py-1 px-1">Wallet</th>
                    <th className="text-right py-1 px-1">Tokens</th>
                    <th className="text-right py-1 px-1">SOL</th>
                    <th className="text-left py-1 px-1">Tx</th>
                    <th className="text-right py-1 px-1">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenHistory.map((p) => (
                    <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50" data-testid={`sol-purchase-${p.id}`}>
                      <td className="py-1.5 px-1 text-cyan-300">{truncateWallet(p.walletAddress)}</td>
                      <td className="py-1.5 px-1 text-right text-amber-300">{p.tokens}</td>
                      <td className="py-1.5 px-1 text-right text-green-300">{lamportsToSol(p.priceLamports)}</td>
                      <td className="py-1.5 px-1">
                        {p.txSignature ? (
                          <a
                            href={`https://solscan.io/tx/${p.txSignature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`link-tx-${p.id}`}
                            className="text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                          >
                            {p.txSignature.slice(0, 8)}...
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-right text-gray-500">{formatDate(p.confirmedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

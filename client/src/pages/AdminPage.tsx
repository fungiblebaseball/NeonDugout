import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/lib/store";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Coins, Trash2, Play, Trophy, RotateCcw, AlertTriangle } from "lucide-react";
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

interface TokenConfigData {
  claimAmount: number;
  claimIntervalHours: number;
}

interface MatchData {
  id: number;
  day: number;
  played: boolean;
  homeTeamId: number;
  awayTeamId: number;
  matchType: string;
}

const ALL_ATTRIBUTES = ["pow", "con", "spd", "eye", "vel", "ctl", "mov", "sta", "def"];
const ALL_POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

const GAME_LABELS: Record<string, string> = {
  eye_drill: "Eye Drill",
  batting_practice: "Batting Practice",
  pitch_control: "Pitch Control",
};

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

      <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: "Orbitron, sans-serif" }}>
        Match Day Control
      </h2>

      <GameDayCard allMatches={allMatches || []} token={token!} queryClient={queryClient} />

      <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-4 mt-8" style={{ fontFamily: "Orbitron, sans-serif" }}>
        Token Economy Config
      </h2>

      {tokenConfig && (
        <TokenConfigCard config={tokenConfig} token={token!} queryClient={queryClient} />
      )}

      <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-4 mt-8" style={{ fontFamily: "Orbitron, sans-serif" }}>
        Training Reward Config
      </h2>

      {isLoading && <p className="text-gray-500 text-sm">Loading...</p>}

      <div className="space-y-4">
        {configs?.map((config) => (
          <ConfigCard key={config.id} config={config} token={token!} queryClient={queryClient} />
        ))}
      </div>
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

  const unplayedDays = [...new Set(allMatches.filter(m => !m.played).map(m => m.day))].sort((a, b) => a - b);
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setClaimAmount(config.claimAmount);
    setIntervalHours(config.claimIntervalHours);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/token-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ claimAmount, claimIntervalHours: intervalHours }),
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

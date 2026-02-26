import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/lib/store";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Coins, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface TrainingConfig {
  id: number;
  gameType: string;
  rewardAttributes: string[];
  rewardAmount: number;
  minScoreForReward: number;
  maxBoostPerSeason: number;
}

interface TokenConfigData {
  claimAmount: number;
  claimIntervalHours: number;
}

const ALL_ATTRIBUTES = ["pow", "con", "spd", "eye", "vel", "ctl", "mov", "sta", "def"];

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/admin/training-config/${config.gameType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rewardAttributes, rewardAmount, minScoreForReward: minScore, maxBoostPerSeason: maxBoost }),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-training-config"] });
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

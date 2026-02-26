import { useState, useCallback, useRef, useEffect } from "react";
import { useGameStore } from "@/lib/store";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

const TOTAL_ROUNDS = 10;
const AREA_WIDTH = 300;
const AREA_HEIGHT = 400;
const TARGET_SIZE = 50;

type Phase = "start" | "playing" | "waiting" | "result";

interface RoundResult {
  reactionTime: number;
}

export default function EyeDrillGame() {
  const { token } = useGameStore();
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("start");
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
  const [showTarget, setShowTarget] = useState(false);
  const startTimeRef = useRef(0);
  const timerRef = useRef<any>(null);

  const [finalScore, setFinalScore] = useState(0);
  const [rankPosition, setRankPosition] = useState(0);
  const [rewardInfo, setRewardInfo] = useState<{ playerName: string; attribute: string; amount: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const spawnTarget = useCallback(() => {
    const x = Math.floor(Math.random() * (AREA_WIDTH - TARGET_SIZE));
    const y = Math.floor(Math.random() * (AREA_HEIGHT - TARGET_SIZE));
    setTargetPos({ x, y });

    const delay = 500 + Math.random() * 2000;
    timerRef.current = setTimeout(() => {
      setShowTarget(true);
      startTimeRef.current = performance.now();
    }, delay);
  }, []);

  const startGame = () => {
    setPhase("playing");
    setRound(1);
    setResults([]);
    setShowTarget(false);
    spawnTarget();
  };

  const handleTargetClick = () => {
    if (!showTarget) return;
    const reactionTime = Math.round(performance.now() - startTimeRef.current);
    const newResults = [...results, { reactionTime }];
    setResults(newResults);
    setShowTarget(false);

    if (newResults.length >= TOTAL_ROUNDS) {
      submitResult(newResults);
    } else {
      setRound(newResults.length + 1);
      spawnTarget();
    }
  };

  const submitResult = async (allResults: RoundResult[]) => {
    setPhase("result");
    setSubmitting(true);

    const avgTime = Math.round(allResults.reduce((s, r) => s + r.reactionTime, 0) / allResults.length);
    const score = Math.max(0, Math.min(1000, Math.round(1000 - (avgTime - 150) * 2)));

    setFinalScore(score);

    try {
      const res = await fetch("/api/training/result", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gameType: "eye_drill",
          score,
          rawData: { avgReactionTime: avgTime, rounds: allResults },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRankPosition(data.rankPosition);
        setRewardInfo({
          playerName: data.rewardPlayer.name,
          attribute: data.rewardAttribute.toUpperCase(),
          amount: data.rewardAmount,
        });
      }
    } catch (err) {
      console.error("Failed to submit result:", err);
    }
    setSubmitting(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const avgTime = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.reactionTime, 0) / results.length)
    : 0;

  return (
    <div className="min-h-screen bg-black text-white pb-24 px-4 pt-6 flex flex-col items-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/training")} data-testid="button-back" className="text-cyan-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold tracking-widest uppercase" style={{ fontFamily: "Orbitron, sans-serif" }}>
            Eye Drill
          </h1>
        </div>

        {phase === "start" && (
          <div className="text-center space-y-6 mt-12">
            <div className="text-6xl">👁️</div>
            <p className="text-gray-400 text-sm" style={{ fontFamily: "VT323, monospace" }}>
              A baseball will appear at random positions. Tap it as fast as you can!
            </p>
            <p className="text-gray-500 text-xs">{TOTAL_ROUNDS} rounds</p>
            <button
              onClick={startGame}
              data-testid="button-start-game"
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              Start Drill
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Round {round}/{TOTAL_ROUNDS}</span>
              {results.length > 0 && <span>Avg: {avgTime}ms</span>}
            </div>
            <div
              className="relative rounded-xl border-2 border-gray-700 bg-gray-900 overflow-hidden mx-auto"
              style={{ width: AREA_WIDTH, height: AREA_HEIGHT }}
              data-testid="area-game"
            >
              {!showTarget && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-gray-600 text-sm animate-pulse" style={{ fontFamily: "VT323, monospace" }}>
                    Wait for it...
                  </span>
                </div>
              )}
              {showTarget && (
                <button
                  onClick={handleTargetClick}
                  data-testid="button-target"
                  className="absolute transition-none cursor-pointer"
                  style={{
                    left: targetPos.x,
                    top: targetPos.y,
                    width: TARGET_SIZE,
                    height: TARGET_SIZE,
                    fontSize: TARGET_SIZE * 0.8,
                    lineHeight: `${TARGET_SIZE}px`,
                    textAlign: "center",
                  }}
                >
                  ⚾
                </button>
              )}
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="text-center space-y-5 mt-8">
            <h2 className="text-lg font-bold tracking-wider text-cyan-400" style={{ fontFamily: "Orbitron, sans-serif" }}>
              DRILL COMPLETE
            </h2>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
              <div>
                <span className="text-gray-500 text-xs uppercase">Avg Reaction Time</span>
                <p className="text-2xl font-bold text-white" data-testid="text-avg-time">{avgTime}ms</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase">Score</span>
                <p className="text-3xl font-bold text-pink-400" data-testid="text-score">{finalScore}</p>
              </div>
              {rankPosition > 0 && (
                <div>
                  <span className="text-gray-500 text-xs uppercase">Global Rank</span>
                  <p className="text-xl font-bold text-cyan-400" data-testid="text-rank">#{rankPosition}</p>
                </div>
              )}
            </div>

            {rewardInfo && rewardInfo.amount > 0 && (
              <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-500/30 rounded-xl p-4">
                <p className="text-amber-400 text-xs uppercase tracking-wider font-bold">Reward Earned</p>
                <p className="text-white text-sm mt-1" style={{ fontFamily: "VT323, monospace" }} data-testid="text-reward">
                  {rewardInfo.playerName}: {rewardInfo.attribute} +{rewardInfo.amount}
                </p>
              </div>
            )}

            {rewardInfo && rewardInfo.amount === 0 && (
              <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider">Score too low for reward</p>
              </div>
            )}

            {submitting && <p className="text-gray-500 text-xs animate-pulse">Submitting...</p>}

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={startGame}
                data-testid="button-retry"
                className="px-6 py-2 bg-cyan-600 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-cyan-500 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => navigate("/training")}
                data-testid="button-back-to-training"
                className="px-6 py-2 bg-gray-700 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from "react";
import { useGameStore } from "@/lib/store";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

const TOTAL_PITCHES = 10;
const ZONE_WIDTH = 280;
const SWEET_SPOT_WIDTH = 42;
const BALL_SIZE = 24;

type Phase = "start" | "playing" | "swung" | "result";

interface PitchResult {
  accuracy: number;
  distance: number;
}

export default function BattingPracticeGame() {
  const { token } = useGameStore();
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("start");
  const [pitch, setPitch] = useState(0);
  const [results, setResults] = useState<PitchResult[]>([]);
  const [ballX, setBallX] = useState(0);
  const [ballMoving, setBallMoving] = useState(false);
  const [lastHitLabel, setLastHitLabel] = useState("");
  const animRef = useRef<number>(0);
  const ballRef = useRef(0);
  const speedRef = useRef(2);

  const [finalScore, setFinalScore] = useState(0);
  const [rankPosition, setRankPosition] = useState(0);
  const [rewardInfo, setRewardInfo] = useState<{ playerName: string; attribute: string; amount: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sweetSpotCenter = ZONE_WIDTH / 2;
  const sweetSpotLeft = sweetSpotCenter - SWEET_SPOT_WIDTH / 2;

  const startPitch = useCallback(() => {
    ballRef.current = 0;
    setBallX(0);
    setBallMoving(true);
    speedRef.current = 1.5 + Math.random() * 2.5;

    const animate = () => {
      ballRef.current += speedRef.current;
      if (ballRef.current >= ZONE_WIDTH) {
        ballRef.current = 0;
      }
      setBallX(ballRef.current);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
  }, []);

  const startGame = () => {
    setPhase("playing");
    setPitch(1);
    setResults([]);
    setLastHitLabel("");
    startPitch();
  };

  const handleSwing = () => {
    if (!ballMoving) return;
    cancelAnimationFrame(animRef.current);
    setBallMoving(false);

    const currentX = ballRef.current;
    const distFromCenter = Math.abs(currentX - sweetSpotCenter);
    const maxDist = ZONE_WIDTH / 2;
    const accuracy = Math.max(0, Math.round((1 - distFromCenter / maxDist) * 100));

    let label = "MISS";
    if (distFromCenter <= SWEET_SPOT_WIDTH / 2) label = "PERFECT!";
    else if (distFromCenter <= SWEET_SPOT_WIDTH) label = "GREAT";
    else if (distFromCenter <= SWEET_SPOT_WIDTH * 2) label = "GOOD";
    else if (accuracy > 30) label = "OK";
    setLastHitLabel(label);

    const newResults = [...results, { accuracy, distance: distFromCenter }];
    setResults(newResults);
    setPhase("swung");

    setTimeout(() => {
      if (newResults.length >= TOTAL_PITCHES) {
        submitResult(newResults);
      } else {
        setPitch(newResults.length + 1);
        setPhase("playing");
        setLastHitLabel("");
        startPitch();
      }
    }, 800);
  };

  const submitResult = async (allResults: PitchResult[]) => {
    setPhase("result");
    setSubmitting(true);

    const avgAccuracy = Math.round(allResults.reduce((s, r) => s + r.accuracy, 0) / allResults.length);
    const score = Math.min(1000, Math.round(avgAccuracy * 10));
    setFinalScore(score);

    try {
      const res = await fetch("/api/training/result", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gameType: "batting_practice",
          score,
          rawData: { avgAccuracy, rounds: allResults },
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
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const avgAcc = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.accuracy, 0) / results.length)
    : 0;

  return (
    <div className="min-h-screen bg-black text-white pb-24 px-4 pt-6 flex flex-col items-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/training")} data-testid="button-back" className="text-cyan-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold tracking-widest uppercase" style={{ fontFamily: "Orbitron, sans-serif" }}>
            Batting Practice
          </h1>
        </div>

        {phase === "start" && (
          <div className="text-center space-y-6 mt-12">
            <div className="text-6xl">🏏</div>
            <p className="text-gray-400 text-sm" style={{ fontFamily: "VT323, monospace" }}>
              A ball moves across the strike zone. Tap SWING when it's in the sweet spot!
            </p>
            <p className="text-gray-500 text-xs">{TOTAL_PITCHES} pitches</p>
            <button
              onClick={startGame}
              data-testid="button-start-game"
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:opacity-90"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              Start Practice
            </button>
          </div>
        )}

        {(phase === "playing" || phase === "swung") && (
          <div className="space-y-4 mt-4">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Pitch {pitch}/{TOTAL_PITCHES}</span>
              {results.length > 0 && <span>Avg: {avgAcc}%</span>}
            </div>

            <div className="relative mx-auto" style={{ width: ZONE_WIDTH, height: 80 }}>
              <div className="absolute inset-0 rounded-lg border-2 border-gray-700 bg-gray-900 overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-green-500/20 border-x border-green-500/50"
                  style={{ left: sweetSpotLeft, width: SWEET_SPOT_WIDTH }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 transition-none"
                  style={{
                    left: ballX - BALL_SIZE / 2,
                    width: BALL_SIZE,
                    height: BALL_SIZE,
                    fontSize: BALL_SIZE,
                    lineHeight: `${BALL_SIZE}px`,
                  }}
                  data-testid="ball"
                >
                  ⚾
                </div>
              </div>
            </div>

            {lastHitLabel && (
              <p
                className={`text-center text-lg font-bold tracking-wider ${
                  lastHitLabel === "PERFECT!" ? "text-green-400" :
                  lastHitLabel === "GREAT" ? "text-cyan-400" :
                  lastHitLabel === "GOOD" ? "text-yellow-400" :
                  lastHitLabel === "OK" ? "text-orange-400" : "text-red-400"
                }`}
                style={{ fontFamily: "Orbitron, sans-serif" }}
                data-testid="text-hit-label"
              >
                {lastHitLabel}
              </p>
            )}

            <button
              onClick={handleSwing}
              disabled={phase === "swung"}
              data-testid="button-swing"
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg font-bold text-lg uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              ⚡ SWING
            </button>
          </div>
        )}

        {phase === "result" && (
          <div className="text-center space-y-5 mt-8">
            <h2 className="text-lg font-bold tracking-wider text-cyan-400" style={{ fontFamily: "Orbitron, sans-serif" }}>
              PRACTICE COMPLETE
            </h2>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
              <div>
                <span className="text-gray-500 text-xs uppercase">Avg Accuracy</span>
                <p className="text-2xl font-bold text-white" data-testid="text-avg-accuracy">{avgAcc}%</p>
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
                className="px-6 py-2 bg-cyan-600 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-cyan-500"
              >
                Retry
              </button>
              <button
                onClick={() => navigate("/training")}
                data-testid="button-back-to-training"
                className="px-6 py-2 bg-gray-700 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-gray-600"
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

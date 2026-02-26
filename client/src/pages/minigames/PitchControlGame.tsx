import { useState, useCallback, useRef, useEffect } from "react";
import { useGameStore } from "@/lib/store";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

const TOTAL_ROUNDS = 10;
const GRID_SIZE = 3;
const CELL_SIZE = 80;
const TIME_LIMIT = 1500;

type Phase = "start" | "playing" | "result";

interface RoundResult {
  correct: boolean;
  responseTime: number;
}

export default function PitchControlGame() {
  const { token } = useGameStore();
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("start");
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [targetCell, setTargetCell] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [tapped, setTapped] = useState(false);
  const startTimeRef = useRef(0);
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const [finalScore, setFinalScore] = useState(0);
  const [rankPosition, setRankPosition] = useState(0);
  const [rewardInfo, setRewardInfo] = useState<{ playerName: string; attribute: string; amount: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const spawnTarget = useCallback(() => {
    const cell = Math.floor(Math.random() * GRID_SIZE * GRID_SIZE);
    setTargetCell(cell);
    setTapped(false);
    setTimeLeft(TIME_LIMIT);
    startTimeRef.current = performance.now();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 50));
    }, 50);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
      handleTimeout();
    }, TIME_LIMIT);
  }, []);

  const handleTimeout = useCallback(() => {
    setTapped(true);
    setResults((prev) => {
      const newResults = [...prev, { correct: false, responseTime: TIME_LIMIT }];
      if (newResults.length >= TOTAL_ROUNDS) {
        setTimeout(() => submitResult(newResults), 300);
      } else {
        setTimeout(() => {
          setRound(newResults.length + 1);
          spawnTarget();
        }, 500);
      }
      return newResults;
    });
  }, [spawnTarget]);

  const startGame = () => {
    setPhase("playing");
    setRound(1);
    setResults([]);
    spawnTarget();
  };

  const handleCellClick = (cellIndex: number) => {
    if (tapped) return;
    setTapped(true);
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);

    const responseTime = Math.round(performance.now() - startTimeRef.current);
    const correct = cellIndex === targetCell;

    const newResults = [...results, { correct, responseTime }];
    setResults(newResults);

    setTimeout(() => {
      if (newResults.length >= TOTAL_ROUNDS) {
        submitResult(newResults);
      } else {
        setRound(newResults.length + 1);
        spawnTarget();
      }
    }, 500);
  };

  const submitResult = async (allResults: RoundResult[]) => {
    setPhase("result");
    setSubmitting(true);

    const correctCount = allResults.filter((r) => r.correct).length;
    const accuracy = Math.round((correctCount / allResults.length) * 100);
    const avgTime = Math.round(
      allResults.filter((r) => r.correct).reduce((s, r) => s + r.responseTime, 0) /
        Math.max(1, correctCount)
    );
    const speedBonus = allResults.filter((r) => r.correct && r.responseTime < 500).length * 50;
    const score = Math.min(1000, correctCount * 100 + speedBonus);
    setFinalScore(score);

    try {
      const res = await fetch("/api/training/result", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gameType: "pitch_control",
          score,
          rawData: { accuracy, avgTime, correctCount, speedBonus, rounds: allResults },
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
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    };
  }, []);

  const correctCount = results.filter((r) => r.correct).length;

  const zoneLabels = ["↖ HIGH IN", "↑ HIGH", "↗ HIGH OUT", "← IN", "● CENTER", "→ OUT", "↙ LOW IN", "↓ LOW", "↘ LOW OUT"];

  return (
    <div className="min-h-screen bg-black text-white pb-24 px-4 pt-6 flex flex-col items-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/training")} data-testid="button-back" className="text-cyan-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold tracking-widest uppercase" style={{ fontFamily: "Orbitron, sans-serif" }}>
            Pitch Control
          </h1>
        </div>

        {phase === "start" && (
          <div className="text-center space-y-6 mt-12">
            <div className="text-6xl">🎯</div>
            <p className="text-gray-400 text-sm" style={{ fontFamily: "VT323, monospace" }}>
              A target zone lights up in the catcher's frame. Tap the correct zone before time runs out!
            </p>
            <p className="text-gray-500 text-xs">{TOTAL_ROUNDS} rounds — {TIME_LIMIT / 1000}s per pitch</p>
            <button
              onClick={startGame}
              data-testid="button-start-game"
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:opacity-90"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              Start Drill
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-3 mt-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Round {round}/{TOTAL_ROUNDS}</span>
              <span>{correctCount}/{results.length} correct</span>
            </div>

            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all bg-gradient-to-r from-green-400 to-red-500"
                style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
              />
            </div>

            <div
              className="grid gap-1 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                width: GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * 4,
              }}
              data-testid="grid-game"
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const isTarget = i === targetCell;
                const wasCorrect = tapped && isTarget && results[results.length - 1]?.correct;
                const wasMiss = tapped && isTarget && !results[results.length - 1]?.correct;
                return (
                  <button
                    key={i}
                    onClick={() => handleCellClick(i)}
                    disabled={tapped}
                    data-testid={`button-cell-${i}`}
                    className={`rounded-lg border-2 flex items-center justify-center text-[10px] font-bold uppercase transition-all ${
                      isTarget && !tapped
                        ? "border-amber-400 bg-amber-500/30 text-amber-300 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                        : wasCorrect
                        ? "border-green-400 bg-green-500/30 text-green-300"
                        : wasMiss
                        ? "border-red-400 bg-red-500/30 text-red-300"
                        : "border-gray-700 bg-gray-900 text-gray-600 hover:border-gray-500"
                    }`}
                    style={{ width: CELL_SIZE, height: CELL_SIZE, fontFamily: "VT323, monospace" }}
                  >
                    {zoneLabels[i]}
                  </button>
                );
              })}
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
                <span className="text-gray-500 text-xs uppercase">Accuracy</span>
                <p className="text-2xl font-bold text-white" data-testid="text-accuracy">
                  {correctCount}/{TOTAL_ROUNDS} ({Math.round((correctCount / TOTAL_ROUNDS) * 100)}%)
                </p>
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

import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "@/lib/store";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Eye, Target, Crosshair } from "lucide-react";

interface TrainingResult {
  id: number;
  score: number;
  gameType: string;
  createdAt: string;
}

const games = [
  {
    id: "eye_drill",
    name: "EYE DRILL",
    icon: Eye,
    description: "React fast! Click the ball as soon as it appears. Tests reflexes and visual tracking.",
    reward: "EYE",
    color: "from-pink-500 to-rose-600",
    href: "/training/eye-drill",
  },
  {
    id: "batting_practice",
    name: "BATTING PRACTICE",
    icon: Target,
    description: "Swing at the perfect moment! Hit the ball in the sweet spot for maximum contact.",
    reward: "CON / POW",
    color: "from-cyan-500 to-blue-600",
    href: "/training/batting",
  },
  {
    id: "pitch_control",
    name: "PITCH CONTROL",
    icon: Crosshair,
    description: "Hit the target zone! Place your pitch precisely where the catcher calls it.",
    reward: "CTL",
    color: "from-amber-500 to-orange-600",
    href: "/training/pitch-control",
  },
];

export default function TrainingPage() {
  const { token } = useGameStore();
  const [, navigate] = useLocation();

  const bestScores = useQuery({
    queryKey: ["training-best-scores"],
    queryFn: async () => {
      const results: Record<string, number> = {};
      for (const game of games) {
        try {
          const res = await fetch(`/api/training/history/${game.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data: TrainingResult[] = await res.json();
            if (data.length > 0) {
              results[game.id] = Math.max(...data.map((d) => d.score));
            }
          }
        } catch {}
      }
      return results;
    },
    enabled: !!token,
  });

  return (
    <div className="min-h-screen bg-black text-white pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/")} data-testid="button-back" className="text-cyan-400 hover:text-cyan-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-widest uppercase" style={{ fontFamily: "Orbitron, sans-serif" }}>
          Training Center
        </h1>
      </div>

      <p className="text-gray-400 text-sm mb-6" style={{ fontFamily: "VT323, monospace" }}>
        Complete drills to boost your players' attributes. Higher scores = better rewards.
      </p>

      <div className="space-y-4">
        {games.map((game) => {
          const best = bestScores.data?.[game.id];
          return (
            <Link key={game.id} href={game.href} data-testid={`card-training-${game.id}`}>
              <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${game.color} flex-shrink-0`}>
                    <game.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {game.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "VT323, monospace" }}>
                      {game.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] uppercase tracking-wider text-pink-400 font-bold">
                        Reward: {game.reward}
                      </span>
                      {best !== undefined && (
                        <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold" data-testid={`text-best-${game.id}`}>
                          Best: {best}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-600 text-lg">▶</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "@/lib/store";
import PageTip from "@/components/PageTip";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Eye, Target, Crosshair, Dumbbell } from "lucide-react";

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
    borderColor: "border-pink-500/40",
    activeBg: "bg-pink-950/30",
    glow: "shadow-[0_0_15px_rgba(236,72,153,0.2)]",
    iconBg: "bg-gradient-to-br from-pink-500 to-rose-600",
    textColor: "text-pink-400",
    rewardColor: "text-pink-300",
    href: "/training/eye-drill",
  },
  {
    id: "batting_practice",
    name: "BATTING PRACTICE",
    icon: Target,
    description: "Swing at the perfect moment! Hit the ball in the sweet spot for maximum contact.",
    reward: "CON / POW",
    borderColor: "border-cyan-500/40",
    activeBg: "bg-cyan-950/30",
    glow: "shadow-[0_0_15px_rgba(34,211,238,0.2)]",
    iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600",
    textColor: "text-cyan-400",
    rewardColor: "text-cyan-300",
    href: "/training/batting",
  },
  {
    id: "pitch_control",
    name: "PITCH CONTROL",
    icon: Crosshair,
    description: "Hit the target zone! Place your pitch precisely where the catcher calls it.",
    reward: "CTL",
    borderColor: "border-amber-500/40",
    activeBg: "bg-amber-950/30",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.2)]",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
    textColor: "text-amber-400",
    rewardColor: "text-amber-300",
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
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-amber-900/30 to-black border-b border-amber-500/20 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} data-testid="button-back" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Dumbbell className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black uppercase text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Training Center
            </h1>
            <p className="text-xs font-mono text-amber-200/60 mt-0.5">Play minigames to boost your players' attributes</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider px-1">
          Higher scores = better attribute rewards
        </p>

        {games.map((game) => {
          const best = bestScores.data?.[game.id];
          return (
            <Link key={game.id} href={game.href} data-testid={`card-training-${game.id}`}>
              <div className={`relative overflow-hidden rounded-xl border ${game.borderColor} ${game.activeBg} ${game.glow} p-5 hover:brightness-110 transition-all cursor-pointer`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${game.iconBg} flex-shrink-0 shadow-lg`}>
                    <game.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-black text-base tracking-wider ${game.textColor}`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
                      {game.name}
                    </h3>
                    <p className="text-xs font-mono text-gray-500 mt-1.5 leading-relaxed">
                      {game.description}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className={`text-[10px] uppercase tracking-wider ${game.rewardColor} font-bold font-mono bg-white/5 px-2 py-0.5 rounded`}>
                        Reward: {game.reward}
                      </span>
                      {best !== undefined && (
                        <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold font-mono bg-cyan-400/10 px-2 py-0.5 rounded" data-testid={`text-best-${game.id}`}>
                          Best: {best}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`${game.textColor} text-lg font-bold`}>▶</div>
                </div>
              </div>
            </Link>
          );
        })}
      </main>
      <PageTip route="/training" message="Play minigames to boost player stats. Rewards depend on your score." />
    </div>
  );
}

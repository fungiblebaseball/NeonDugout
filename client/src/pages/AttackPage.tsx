import { useGameStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { AttackStyle } from "@/lib/types";

const ATTACK_OPTIONS: { value: AttackStyle; label: string; desc: string; icon: string }[] = [
  { value: 'bunt', label: 'BUNT PRIORITY', desc: 'Small ball strategy. Sacrifice hits to advance runners. Lower risk, lower reward.', icon: '◇' },
  { value: 'hit_and_run', label: 'HIT & RUN', desc: 'Aggressive base running. Runners go on pitch, batter must make contact. High risk.', icon: '⚡' },
  { value: 'neutral', label: 'NEUTRAL', desc: 'Balanced approach. Let batters decide based on count and situation.', icon: '⬡' },
  { value: 'swing_on_sight', label: 'SWING ON SIGHT', desc: 'Maximum aggression. Hack at everything. High power, low discipline.', icon: '💥' },
];

export default function AttackPage() {
  const { team, walletAddress } = useGameStore();
  const queryClient = useQueryClient();

  const { data: saved } = useQuery({
    queryKey: ['tactics', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tactics/${team!.id}`);
      return res.json();
    },
    enabled: !!team,
  });

  const [attackStyle, setAttackStyle] = useState<AttackStyle>('neutral');

  useEffect(() => {
    if (saved?.attackStyle) {
      setAttackStyle(saved.attackStyle as AttackStyle);
    }
  }, [saved]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/tactics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team!.id,
          attackStyle,
          infieldPosition: saved?.infieldPosition || 'neutral',
          outfieldPosition: saved?.outfieldPosition || 'neutral',
        }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tactics'] }),
  });

  if (!walletAddress || !team) {
    return <div className="min-h-screen bg-black p-6 flex items-center justify-center text-center text-pink-500 font-mono text-xl uppercase tracking-widest">ACCESS DENIED</div>;
  }

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-cyan-900/30 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Attack Tactics
        </h1>
        <p className="text-xs font-mono text-cyan-200/60 mt-1">{team.name}</p>
      </header>

      <main className="p-4 space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2">OFFENSIVE STRATEGY</h2>
          <p className="text-[10px] font-mono text-gray-500">Select your team's offensive approach for all games</p>

          {ATTACK_OPTIONS.map(opt => (
            <button
              key={opt.value}
              data-testid={`button-attack-${opt.value}`}
              onClick={() => setAttackStyle(opt.value)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                attackStyle === opt.value
                  ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                  : 'border-gray-800 bg-gray-950/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{opt.icon}</span>
                <span className={`font-black text-lg ${attackStyle === opt.value ? 'text-cyan-400' : 'text-gray-400'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>
                  {opt.label}
                </span>
                {attackStyle === opt.value && (
                  <span className="ml-auto text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">ACTIVE</span>
                )}
              </div>
              <p className="text-xs font-mono text-gray-500 leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>

        <button
          data-testid="button-save-attack"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50"
        >
          {saveMutation.isPending ? "SAVING..." : "SAVE TACTICS"}
        </button>
      </main>
    </div>
  );
}

import { useGameStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { InfieldPosition, OutfieldPosition } from "@/lib/types";

const INFIELD_OPTIONS: { value: InfieldPosition; label: string; desc: string }[] = [
  { value: 'short', label: 'SHORT (IN)', desc: 'Infielders play shallow. Better for slow grounders and bunts. Weaker against line drives.' },
  { value: 'neutral', label: 'NEUTRAL', desc: 'Standard depth. Balanced coverage for all hit types.' },
  { value: 'deep', label: 'DEEP (BACK)', desc: 'Infielders play deep. Better range on hard grounders. Weaker against bunts and slow rollers.' },
];

const OUTFIELD_OPTIONS: { value: OutfieldPosition; label: string; desc: string }[] = [
  { value: 'short', label: 'SHORT (IN)', desc: 'Outfielders play shallow. Better for bloops and singles. Risk of balls going over their heads.' },
  { value: 'neutral', label: 'NEUTRAL', desc: 'Standard depth. Balanced coverage for all fly balls.' },
  { value: 'deep', label: 'DEEP (BACK)', desc: 'Outfielders play deep. Better for deep fly balls and extra-base hits. More singles will drop.' },
];

export default function DefensePage() {
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

  const [infieldPosition, setInfieldPosition] = useState<InfieldPosition>('neutral');
  const [outfieldPosition, setOutfieldPosition] = useState<OutfieldPosition>('neutral');

  useEffect(() => {
    if (saved) {
      setInfieldPosition((saved.infieldPosition as InfieldPosition) || 'neutral');
      setOutfieldPosition((saved.outfieldPosition as OutfieldPosition) || 'neutral');
    }
  }, [saved]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/tactics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team!.id,
          attackStyle: saved?.attackStyle || 'neutral',
          infieldPosition,
          outfieldPosition,
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
      <header className="p-6 bg-gradient-to-b from-pink-900/30 to-black border-b border-pink-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Defense Tactics
        </h1>
        <p className="text-xs font-mono text-pink-200/60 mt-1">{team.name}</p>
      </header>

      <main className="p-4 space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-mono text-cyan-500 border-b border-cyan-500/30 pb-2">INFIELD POSITIONING</h2>
          {INFIELD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              data-testid={`button-infield-${opt.value}`}
              onClick={() => setInfieldPosition(opt.value)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                infieldPosition === opt.value
                  ? 'border-pink-400 bg-pink-950/30 shadow-[0_0_15px_rgba(236,72,153,0.2)]'
                  : 'border-gray-800 bg-gray-950/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-black text-base ${infieldPosition === opt.value ? 'text-pink-400' : 'text-gray-400'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>
                  {opt.label}
                </span>
                {infieldPosition === opt.value && (
                  <span className="text-xs font-mono text-pink-400 bg-pink-400/10 px-2 py-1 rounded">ACTIVE</span>
                )}
              </div>
              <p className="text-xs font-mono text-gray-500 leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2">OUTFIELD POSITIONING</h2>
          {OUTFIELD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              data-testid={`button-outfield-${opt.value}`}
              onClick={() => setOutfieldPosition(opt.value)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                outfieldPosition === opt.value
                  ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                  : 'border-gray-800 bg-gray-950/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-black text-base ${outfieldPosition === opt.value ? 'text-cyan-400' : 'text-gray-400'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>
                  {opt.label}
                </span>
                {outfieldPosition === opt.value && (
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">ACTIVE</span>
                )}
              </div>
              <p className="text-xs font-mono text-gray-500 leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>

        <button
          data-testid="button-save-defense"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full py-4 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] disabled:opacity-50"
        >
          {saveMutation.isPending ? "SAVING..." : "SAVE DEFENSE"}
        </button>
      </main>
    </div>
  );
}

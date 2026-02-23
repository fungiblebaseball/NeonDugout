import { useGameStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { AttackStyle, BatterApproach, OffensiveAttack } from "@/lib/types";

const ATTACK_OPTIONS: { value: AttackStyle; label: string; desc: string; icon: string; effects: { label: string; value: string; color: string }[] }[] = [
  {
    value: 'bunt',
    label: 'BUNT PRIORITY',
    desc: 'Sacrifice hits to advance runners. Contact-focused small ball.',
    icon: '◇',
    effects: [
      { label: 'Singles', value: '+15%', color: 'text-green-400' },
      { label: 'Extra-base hits', value: '-20%', color: 'text-red-400' },
      { label: 'Home runs', value: '-20%', color: 'text-red-400' },
      { label: 'Ground outs', value: '+10%', color: 'text-red-400' },
    ],
  },
  {
    value: 'hit_and_run',
    label: 'HIT & RUN',
    desc: 'Runners go on pitch, batter must make contact. High risk, high reward.',
    icon: '⚡',
    effects: [
      { label: 'Singles', value: '+15%', color: 'text-green-400' },
      { label: 'Extra-base hits', value: '-15%', color: 'text-red-400' },
      { label: 'Home runs', value: '-25%', color: 'text-red-400' },
      { label: 'Strikeouts', value: '+5%', color: 'text-red-400' },
    ],
  },
  {
    value: 'neutral',
    label: 'NEUTRAL',
    desc: 'Balanced approach. No modifiers applied — pure skill vs skill.',
    icon: '⬡',
    effects: [
      { label: 'All probabilities', value: 'BASE', color: 'text-gray-400' },
    ],
  },
  {
    value: 'swing_on_sight',
    label: 'SWING ON SIGHT',
    desc: 'Maximum aggression. Hack at everything for power.',
    icon: '💥',
    effects: [
      { label: 'Extra-base hits', value: '+20%', color: 'text-green-400' },
      { label: 'Home runs', value: '+15%', color: 'text-green-400' },
      { label: 'Strikeouts', value: '+20%', color: 'text-red-400' },
      { label: 'Fly outs', value: '+10%', color: 'text-red-400' },
    ],
  },
];

const BATTER_APPROACH_OPTIONS: { value: BatterApproach; label: string; desc: string; icon: string; beats: string; losesTo: string }[] = [
  {
    value: 'power',
    label: 'POWER',
    desc: 'Swing for the fences. Best barrel contact on breaking balls.',
    icon: '🔥',
    beats: 'Movement',
    losesTo: 'Command',
  },
  {
    value: 'contact',
    label: 'CONTACT',
    desc: 'Put the ball in play consistently. Precise bat control.',
    icon: '🎯',
    beats: 'Command',
    losesTo: 'Velocity',
  },
  {
    value: 'patient',
    label: 'PATIENT',
    desc: 'Work the count, draw walks, wait for mistakes.',
    icon: '👁️',
    beats: 'Velocity',
    losesTo: 'Movement',
  },
];

const OFFENSIVE_ATTACK_OPTIONS: { value: OffensiveAttack; label: string; desc: string; icon: string; beats: string; losesTo: string }[] = [
  {
    value: 'aggressive',
    label: 'AGGRESSIVE',
    desc: 'Big leads, frequent steals, always take the extra base.',
    icon: '⚡',
    beats: 'Protective defense',
    losesTo: 'Aggressive defense',
  },
  {
    value: 'balanced',
    label: 'BALANCED',
    desc: 'Standard jumps, situational steals, advance on sure hits.',
    icon: '⚖️',
    beats: 'Aggressive defense',
    losesTo: 'Protective defense',
  },
  {
    value: 'conservative',
    label: 'CONSERVATIVE',
    desc: 'Small leads, delayed steals, cautious hit-and-run.',
    icon: '🛡️',
    beats: '—',
    losesTo: 'Aggressive defense',
  },
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
  const [batterApproach, setBatterApproach] = useState<BatterApproach>('contact');
  const [offensiveAttack, setOffensiveAttack] = useState<OffensiveAttack>('balanced');

  useEffect(() => {
    if (saved) {
      if (saved.attackStyle) setAttackStyle(saved.attackStyle as AttackStyle);
      if (saved.batterApproach) setBatterApproach(saved.batterApproach as BatterApproach);
      if (saved.offensiveAttack) setOffensiveAttack(saved.offensiveAttack as OffensiveAttack);
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
          batterApproach,
          offensiveAttack,
          infieldPosition: saved?.infieldPosition || 'neutral',
          outfieldPosition: saved?.outfieldPosition || 'neutral',
          pitcherStyle: saved?.pitcherStyle || 'command',
          defenseSetup: saved?.defenseSetup || 'balanced',
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
          <p className="text-[10px] font-mono text-gray-500">Each strategy applies probability modifiers to at-bat outcomes</p>

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
              <p className="text-xs font-mono text-gray-500 leading-relaxed mb-3">{opt.desc}</p>
              <div className="grid grid-cols-2 gap-1">
                {opt.effects.map((eff, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-black/30">
                    <span className="text-[9px] font-mono text-gray-500">{eff.label}</span>
                    <span className={`text-[10px] font-mono font-bold ${eff.color}`}>{eff.value}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-mono text-purple-400 border-b border-purple-500/30 pb-2">BATTER APPROACH</h2>
          <p className="text-[10px] font-mono text-gray-500">RPS matchup vs opponent's Pitcher Style — buffs/debuffs on top of base probabilities</p>

          {BATTER_APPROACH_OPTIONS.map(opt => (
            <button
              key={opt.value}
              data-testid={`button-batter-${opt.value}`}
              onClick={() => setBatterApproach(opt.value)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                batterApproach === opt.value
                  ? 'border-purple-400 bg-purple-950/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                  : 'border-gray-800 bg-gray-950/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{opt.icon}</span>
                <span className={`font-black text-lg ${batterApproach === opt.value ? 'text-purple-400' : 'text-gray-400'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>
                  {opt.label}
                </span>
                {batterApproach === opt.value && (
                  <span className="ml-auto text-xs font-mono text-purple-400 bg-purple-400/10 px-2 py-1 rounded">ACTIVE</span>
                )}
              </div>
              <p className="text-xs font-mono text-gray-500 leading-relaxed mb-2">{opt.desc}</p>
              <div className="flex gap-4">
                <span className="text-[10px] font-mono text-green-400">▲ Beats: {opt.beats}</span>
                <span className="text-[10px] font-mono text-red-400">▼ Weak vs: {opt.losesTo}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-mono text-orange-400 border-b border-orange-500/30 pb-2">OFFENSIVE ATTACK</h2>
          <p className="text-[10px] font-mono text-gray-500">RPS matchup vs opponent's Defense Setup — buffs/debuffs on base running and extra bases</p>

          {OFFENSIVE_ATTACK_OPTIONS.map(opt => (
            <button
              key={opt.value}
              data-testid={`button-offensive-${opt.value}`}
              onClick={() => setOffensiveAttack(opt.value)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                offensiveAttack === opt.value
                  ? 'border-orange-400 bg-orange-950/30 shadow-[0_0_15px_rgba(251,146,60,0.2)]'
                  : 'border-gray-800 bg-gray-950/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{opt.icon}</span>
                <span className={`font-black text-lg ${offensiveAttack === opt.value ? 'text-orange-400' : 'text-gray-400'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>
                  {opt.label}
                </span>
                {offensiveAttack === opt.value && (
                  <span className="ml-auto text-xs font-mono text-orange-400 bg-orange-400/10 px-2 py-1 rounded">ACTIVE</span>
                )}
              </div>
              <p className="text-xs font-mono text-gray-500 leading-relaxed mb-2">{opt.desc}</p>
              <div className="flex gap-4">
                <span className="text-[10px] font-mono text-green-400">▲ Beats: {opt.beats}</span>
                <span className="text-[10px] font-mono text-red-400">▼ Weak vs: {opt.losesTo}</span>
              </div>
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

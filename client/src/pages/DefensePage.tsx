import { useGameStore } from "@/lib/store";
import PageTip from "@/components/PageTip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { InfieldPosition, OutfieldPosition, DefenseSetup } from "@/lib/types";

interface TacticCoefficient {
  id: number;
  layer: string;
  tacticValue: string;
  hr: number;
  xbh: number;
  single: number;
  bb: number;
  so: number;
  go: number;
  fo: number;
  tacSt: number;
}

const COEFF_KEYS = ['hr', 'xbh', 'single', 'bb', 'so', 'go', 'fo', 'tacSt'] as const;
const COEFF_LABELS: Record<string, string> = { hr: 'HR', xbh: 'XBH', single: '1B', bb: 'BB', so: 'SO', go: 'GO', fo: 'FO', tacSt: 'STEAL' };

const INFIELD_OPTIONS: { value: InfieldPosition; label: string; desc: string; counters: string }[] = [
  { value: 'short', label: 'SHORT (IN)', desc: 'Infielders play shallow. Best against bunt strategy and slow grounders.', counters: 'Counters: BUNT PRIORITY' },
  { value: 'neutral', label: 'NEUTRAL', desc: 'Standard depth. Balanced coverage against gap hits.', counters: 'Counters: HIT & RUN' },
  { value: 'deep', label: 'DEEP (BACK)', desc: 'Infielders play deep. Better range on hard grounders and line drives.', counters: 'Counters: SWING ON SIGHT' },
];

const OUTFIELD_OPTIONS: { value: OutfieldPosition; label: string; desc: string; counters: string }[] = [
  { value: 'short', label: 'SHORT (IN)', desc: 'Outfielders play shallow. Better for bloops, singles and bunt hits.', counters: 'Counters: BUNT singles' },
  { value: 'neutral', label: 'NEUTRAL', desc: 'Standard depth. Balanced coverage for all fly balls.', counters: 'Counters: HIT & RUN' },
  { value: 'deep', label: 'DEEP (BACK)', desc: 'Outfielders play deep. Better for deep fly balls and power hits.', counters: 'Counters: SWING ON SIGHT' },
];

const DEFENSE_SETUP_OPTIONS: { value: DefenseSetup; label: string; desc: string; icon: string; beats: string; losesTo: string }[] = [
  {
    value: 'aggressive',
    label: 'AGGRESSIVE',
    desc: 'Infield in, quick to plate, pickoff heavy. Strong vs bunt/weak contact/aggressive runners.',
    icon: '⚔️',
    beats: 'Aggressive & Conservative offense',
    losesTo: 'Balanced offense',
  },
  {
    value: 'balanced',
    label: 'BALANCED',
    desc: 'Standard positioning, medium delivery. Neutral baseline for all situations.',
    icon: '⚖️',
    beats: '—',
    losesTo: '—',
  },
  {
    value: 'protective',
    label: 'PROTECTIVE',
    desc: 'Deep gaps, slow/deceptive holds. Strong vs fly/line drive and extra base situations.',
    icon: '🏰',
    beats: 'Balanced offense',
    losesTo: 'Aggressive offense',
  },
];

function coeffSummary(coefficients: TacticCoefficient[], layer: string, tacticValue: string): string {
  const coeff = coefficients.find(c => c.layer === layer && c.tacticValue === tacticValue);
  if (!coeff) return '';
  const parts = COEFF_KEYS
    .filter(k => coeff[k] !== 0)
    .map(k => `${COEFF_LABELS[k]}${coeff[k] > 0 ? '+' : ''}${coeff[k]}%`);
  return parts.length > 0 ? parts.join(', ') : '';
}

function CoeffBadges({ coefficients, layer, tacticValue }: { coefficients: TacticCoefficient[]; layer: string; tacticValue: string }) {
  const coeff = coefficients.find(c => c.layer === layer && c.tacticValue === tacticValue);
  if (!coeff) return null;

  const badges = COEFF_KEYS
    .filter(k => coeff[k] !== 0)
    .map(k => ({ key: k, val: coeff[k] }));

  if (badges.length === 0) return <span className="text-[9px] text-gray-500 font-mono">BASE</span>;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {badges.map(b => (
        <span
          key={b.key}
          data-testid={`badge-coeff-${layer}-${tacticValue}-${b.key}`}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${b.val > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
        >
          {COEFF_LABELS[b.key]} {b.val > 0 ? '+' : ''}{b.val}%
        </span>
      ))}
    </div>
  );
}

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
    refetchOnMount: 'always',
  });

  const { data: coefficients = [] } = useQuery<TacticCoefficient[]>({
    queryKey: ['tactic-coefficients'],
    queryFn: async () => {
      const res = await fetch('/api/tactic-coefficients');
      return res.json();
    },
    refetchOnMount: 'always',
  });

  const [infieldPosition, setInfieldPosition] = useState<InfieldPosition>('neutral');
  const [outfieldPosition, setOutfieldPosition] = useState<OutfieldPosition>('neutral');
  const [defenseSetup, setDefenseSetup] = useState<DefenseSetup>('balanced');

  const [infieldOpen, setInfieldOpen] = useState(true);
  const [outfieldOpen, setOutfieldOpen] = useState(true);
  const [setupOpen, setSetupOpen] = useState(true);

  useEffect(() => {
    if (saved) {
      setInfieldPosition((saved.infieldPosition as InfieldPosition) || 'neutral');
      setOutfieldPosition((saved.outfieldPosition as OutfieldPosition) || 'neutral');
      if (saved.defenseSetup) setDefenseSetup(saved.defenseSetup as DefenseSetup);
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
          defenseSetup,
          batterApproach: saved?.batterApproach || 'contact',
          offensiveAttack: saved?.offensiveAttack || 'balanced',
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
        <div className="space-y-2">
          <button
            data-testid="toggle-infield"
            onClick={() => setInfieldOpen(!infieldOpen)}
            className="w-full flex items-center justify-between text-sm font-mono text-cyan-500 border-b border-cyan-500/30 pb-2"
          >
            <span>INFIELD POSITIONING</span>
            {infieldOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {infieldOpen && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] font-mono text-gray-500">Each position counters specific offensive strategies</p>
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
                  <p className="text-[10px] font-mono text-cyan-500/70 mt-2">{opt.counters}</p>
                  {coefficients.length > 0 && (() => {
                    const summary = coeffSummary(coefficients, 'defense_counter_infield', opt.value);
                    return summary ? <p className="text-[9px] font-mono text-cyan-400/80 mt-1">Modifiers: {summary}</p> : null;
                  })()}
                  {coefficients.length > 0 && (
                    <CoeffBadges coefficients={coefficients} layer="defense_counter_infield" tacticValue={opt.value} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            data-testid="toggle-outfield"
            onClick={() => setOutfieldOpen(!outfieldOpen)}
            className="w-full flex items-center justify-between text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2"
          >
            <span>OUTFIELD POSITIONING</span>
            {outfieldOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {outfieldOpen && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] font-mono text-gray-500">Outfield depth affects fly ball coverage and power hits</p>
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
                  <p className="text-[10px] font-mono text-pink-500/70 mt-2">{opt.counters}</p>
                  {coefficients.length > 0 && (() => {
                    const summary = coeffSummary(coefficients, 'defense_counter_outfield', opt.value);
                    return summary ? <p className="text-[9px] font-mono text-cyan-400/80 mt-1">Modifiers: {summary}</p> : null;
                  })()}
                  {coefficients.length > 0 && (
                    <CoeffBadges coefficients={coefficients} layer="defense_counter_outfield" tacticValue={opt.value} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            data-testid="toggle-defense-setup"
            onClick={() => setSetupOpen(!setupOpen)}
            className="w-full flex items-center justify-between text-sm font-mono text-purple-400 border-b border-purple-500/30 pb-2"
          >
            <span>DEFENSE SETUP</span>
            {setupOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {setupOpen && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] font-mono text-gray-500">RPS matchup vs opponent's Offensive Attack — buffs/debuffs on fielding and base prevention</p>
              {DEFENSE_SETUP_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  data-testid={`button-defense-setup-${opt.value}`}
                  onClick={() => setDefenseSetup(opt.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    defenseSetup === opt.value
                      ? 'border-purple-400 bg-purple-950/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'border-gray-800 bg-gray-950/30 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{opt.icon}</span>
                    <span className={`font-black text-lg ${defenseSetup === opt.value ? 'text-purple-400' : 'text-gray-400'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>
                      {opt.label}
                    </span>
                    {defenseSetup === opt.value && (
                      <span className="ml-auto text-xs font-mono text-purple-400 bg-purple-400/10 px-2 py-1 rounded">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-500 leading-relaxed mb-2">{opt.desc}</p>
                  <div className="flex gap-4">
                    <span className="text-[10px] font-mono text-green-400">▲ Beats: {opt.beats}</span>
                    <span className="text-[10px] font-mono text-red-400">▼ Weak vs: {opt.losesTo}</span>
                  </div>
                  {coefficients.length > 0 && (() => {
                    const summary = coeffSummary(coefficients, 'defense_setup', opt.value);
                    return summary ? <p className="text-[9px] font-mono text-cyan-400/80 mt-1">Modifiers: {summary}</p> : null;
                  })()}
                  {coefficients.length > 0 && (
                    <CoeffBadges coefficients={coefficients} layer="defense_setup" tacticValue={opt.value} />
                  )}
                </button>
              ))}
            </div>
          )}
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
      <PageTip route="/defense" message="Configure infield/outfield positioning and defensive setup." />
    </div>
  );
}

import { useGameStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import type { AttackStyle, BatterApproach, OffensiveAttack, TacticSchedule, TacticSlot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";

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
}

const COEFF_KEYS = ['hr', 'xbh', 'single', 'bb', 'so', 'go', 'fo'] as const;
const COEFF_LABELS: Record<string, string> = { hr: 'HR', xbh: 'XBH', single: '1B', bb: 'BB', so: 'SO', go: 'GO', fo: 'FO' };

const ATTACK_OPTIONS: { value: AttackStyle; label: string; desc: string; icon: string }[] = [
  { value: 'bunt', label: 'BUNT', desc: 'Sacrifice hits to advance runners.', icon: '◇' },
  { value: 'hit_and_run', label: 'H&R', desc: 'Runners go on pitch.', icon: '⚡' },
  { value: 'neutral', label: 'NEUTRAL', desc: 'Balanced approach.', icon: '⬡' },
  { value: 'swing_on_sight', label: 'SWING', desc: 'Maximum aggression for power.', icon: '💥' },
];

const BATTER_APPROACH_OPTIONS: { value: BatterApproach; label: string; desc: string; icon: string; beats: string; losesTo: string }[] = [
  { value: 'power', label: 'POWER', desc: 'Swing for the fences.', icon: '🔥', beats: 'Movement', losesTo: 'Command' },
  { value: 'contact', label: 'CONTACT', desc: 'Put the ball in play.', icon: '🎯', beats: 'Command', losesTo: 'Velocity' },
  { value: 'patient', label: 'PATIENT', desc: 'Work the count.', icon: '👁️', beats: 'Velocity', losesTo: 'Movement' },
];

const OFFENSIVE_ATTACK_OPTIONS: { value: OffensiveAttack; label: string; desc: string; icon: string; beats: string; losesTo: string }[] = [
  { value: 'aggressive', label: 'AGGR', desc: 'Big leads, frequent steals.', icon: '⚡', beats: 'Protective', losesTo: 'Aggressive' },
  { value: 'balanced', label: 'BAL', desc: 'Standard situational running.', icon: '⚖️', beats: 'Aggressive', losesTo: 'Protective' },
  { value: 'conservative', label: 'CONS', desc: 'Small leads, cautious.', icon: '🛡️', beats: '—', losesTo: 'Aggressive' },
];

const DEFAULT_APPROACH_SCHEDULE: TacticSchedule = {
  primary: { value: 'contact', conditions: { maxInning: 5, maxStrikeouts: 5, maxRunsAllowed: 3, maxHitsAllowed: 5 } },
  secondary: { value: 'power', conditions: { maxInning: 8, maxStrikeouts: 10, maxRunsAllowed: 5, maxHitsAllowed: 10 } },
  optional: { value: 'patient', conditions: {} },
};

const DEFAULT_STYLE_SCHEDULE: TacticSchedule = {
  primary: { value: 'neutral', conditions: { maxInning: 5, maxStrikeouts: 5, maxRunsAllowed: 3, maxHitsAllowed: 5 } },
  secondary: { value: 'neutral', conditions: { maxInning: 8, maxStrikeouts: 10, maxRunsAllowed: 5, maxHitsAllowed: 10 } },
  optional: { value: 'neutral', conditions: {} },
};

const DEFAULT_OFFENSIVE_SCHEDULE: TacticSchedule = {
  primary: { value: 'balanced', conditions: { maxInning: 5, maxStrikeouts: 5, maxRunsAllowed: 3, maxHitsAllowed: 5 } },
  secondary: { value: 'balanced', conditions: { maxInning: 8, maxStrikeouts: 10, maxRunsAllowed: 5, maxHitsAllowed: 10 } },
  optional: { value: 'balanced', conditions: {} },
};

function CoeffBadges({ coefficients, layer, tacticValue }: { coefficients: TacticCoefficient[]; layer: string; tacticValue: string }) {
  const coeff = coefficients.find(c => c.layer === layer && c.tacticValue === tacticValue);
  if (!coeff) return null;

  const badges = COEFF_KEYS
    .filter(k => coeff[k] !== 0)
    .map(k => ({ key: k, val: coeff[k] }));

  if (badges.length === 0) return <span className="text-[9px] text-gray-500 font-mono">BASE</span>;

  return (
    <div className="flex flex-wrap gap-1">
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
    refetchOnMount: 'always',
  });

  const { data: coefficients = [] } = useQuery<TacticCoefficient[]>({
    queryKey: ['tactic-coefficients'],
    queryFn: async () => {
      const res = await fetch('/api/tactic-coefficients');
      return res.json();
    },
  });

  const [approachSchedule, setApproachSchedule] = useState<TacticSchedule>(DEFAULT_APPROACH_SCHEDULE);
  const [styleSchedule, setStyleSchedule] = useState<TacticSchedule>(DEFAULT_STYLE_SCHEDULE);
  const [offensiveSchedule, setOffensiveSchedule] = useState<TacticSchedule>(DEFAULT_OFFENSIVE_SCHEDULE);

  useEffect(() => {
    if (saved) {
      setApproachSchedule(saved.batterApproachSchedule || {
        primary: { value: saved.batterApproach || 'contact', conditions: DEFAULT_APPROACH_SCHEDULE.primary.conditions },
        secondary: DEFAULT_APPROACH_SCHEDULE.secondary,
        optional: DEFAULT_APPROACH_SCHEDULE.optional,
      });
      setStyleSchedule(saved.attackStyleSchedule || {
        primary: { value: saved.attackStyle || 'neutral', conditions: DEFAULT_STYLE_SCHEDULE.primary.conditions },
        secondary: DEFAULT_STYLE_SCHEDULE.secondary,
        optional: DEFAULT_STYLE_SCHEDULE.optional,
      });
      setOffensiveSchedule(saved.offensiveAttackSchedule || {
        primary: { value: saved.offensiveAttack || 'balanced', conditions: DEFAULT_OFFENSIVE_SCHEDULE.primary.conditions },
        secondary: DEFAULT_OFFENSIVE_SCHEDULE.secondary,
        optional: DEFAULT_OFFENSIVE_SCHEDULE.optional,
      });
    }
  }, [saved]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/tactics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team!.id,
          batterApproach: approachSchedule.primary.value,
          attackStyle: styleSchedule.primary.value,
          offensiveAttack: offensiveSchedule.primary.value,
          batterApproachSchedule: approachSchedule,
          attackStyleSchedule: styleSchedule,
          offensiveAttackSchedule: offensiveSchedule,
          infieldPosition: saved?.infieldPosition || 'neutral',
          outfieldPosition: saved?.outfieldPosition || 'neutral',
          defenseSetup: saved?.defenseSetup || 'balanced',
        }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tactics'] }),
  });

  const updateSchedule = (
    section: 'approach' | 'style' | 'offensive',
    slot: 'primary' | 'secondary' | 'optional',
    updates: Partial<TacticSlot>
  ) => {
    const setter = section === 'approach' ? setApproachSchedule : section === 'style' ? setStyleSchedule : setOffensiveSchedule;
    setter((prev: TacticSchedule) => ({
      ...prev,
      [slot]: { ...prev[slot], ...updates }
    }));
  };

  const updateCondition = (
    section: 'approach' | 'style' | 'offensive',
    slot: 'primary' | 'secondary',
    condition: keyof NonNullable<TacticSlot['conditions']>,
    val: number
  ) => {
    const setter = section === 'approach' ? setApproachSchedule : section === 'style' ? setStyleSchedule : setOffensiveSchedule;
    setter((prev: TacticSchedule) => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        conditions: { ...prev[slot].conditions, [condition]: val }
      }
    }));
  };

  if (!walletAddress || !team) {
    return <div className="min-h-screen bg-black p-6 flex items-center justify-center text-center text-pink-500 font-mono text-xl uppercase tracking-widest">ACCESS DENIED</div>;
  }

  const coeffLayer = (section: 'approach' | 'style' | 'offensive') => {
    if (section === 'approach') return 'batterApproach';
    if (section === 'style') return 'attackStyle';
    return 'offensiveAttack';
  };

  const getDesc = (section: 'approach' | 'style' | 'offensive', value: string) => {
    const all = section === 'approach' ? BATTER_APPROACH_OPTIONS : section === 'style' ? ATTACK_OPTIONS : OFFENSIVE_ATTACK_OPTIONS;
    return (all as { value: string; desc: string }[]).find(o => o.value === value)?.desc || '';
  };

  const renderTacticBox = (
    section: 'approach' | 'style' | 'offensive',
    slot: 'primary' | 'secondary' | 'optional',
    options: { value: string; label: string; icon: string }[],
    schedule: TacticSchedule
  ) => {
    const data = schedule[slot];
    const badgeColors = {
      primary: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
      secondary: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
      optional: "bg-gray-500/20 text-gray-400 border-gray-500/50"
    };

    const CONDITIONS = [
      { label: 'Max Inn', key: 'maxInning' as const, min: 1, max: 9 },
      { label: 'Max K', key: 'maxStrikeouts' as const, min: 1, max: 20 },
      { label: 'Max R', key: 'maxRunsAllowed' as const, min: 0, max: 10 },
      { label: 'Max H', key: 'maxHitsAllowed' as const, min: 1, max: 20 },
    ];

    return (
      <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Badge className={`uppercase font-black text-[10px] tracking-widest ${badgeColors[slot]}`}>
            {slot}
          </Badge>
          <div className="text-[10px] font-mono text-gray-500 uppercase">
            {slot === 'optional' ? 'Until End' : `Triggers ${slot === 'primary' ? 'Secondary' : 'Optional'}`}
          </div>
        </div>

        <ButtonGroup className="w-full">
          {options.map(opt => (
            <Button
              key={opt.value}
              size="sm"
              variant={data.value === opt.value ? "default" : "outline"}
              className={`flex-1 text-[10px] h-8 ${data.value === opt.value ? (slot === 'primary' ? 'bg-cyan-600 border-cyan-400' : slot === 'secondary' ? 'bg-yellow-600 border-yellow-400' : 'bg-gray-600 border-gray-400') : 'bg-transparent border-gray-800 text-gray-400'}`}
              data-testid={`button-schedule-${section}-${slot}-${opt.value}`}
              onClick={() => updateSchedule(section, slot, { value: opt.value })}
            >
              <span className="mr-1">{opt.icon}</span>
              {opt.label}
            </Button>
          ))}
        </ButtonGroup>

        <div className="text-[10px] text-gray-400 font-mono" data-testid={`text-desc-${section}-${slot}`}>
          {getDesc(section, data.value)}
        </div>

        {coefficients.length > 0 && (
          <CoeffBadges coefficients={coefficients} layer={coeffLayer(section)} tacticValue={data.value} />
        )}

        {slot !== 'optional' && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 border-t border-gray-800/60">
            <div className="col-span-2 text-[9px] font-mono text-gray-500 uppercase tracking-wider">Condition Limits</div>
            {CONDITIONS.map(cond => (
              <div key={cond.key} className="flex items-center justify-between gap-2">
                <label className="text-[9px] font-mono text-gray-400 whitespace-nowrap">{cond.label}</label>
                <input
                  type="number"
                  min={cond.min}
                  max={cond.max}
                  value={(data.conditions as any)[cond.key] ?? 0}
                  onChange={e => {
                    let v = parseInt(e.target.value, 10);
                    if (isNaN(v)) v = cond.min;
                    v = Math.max(cond.min, Math.min(cond.max, v));
                    updateCondition(section, slot as any, cond.key, v);
                  }}
                  data-testid={`input-${section}-${slot}-${cond.key}`}
                  className="w-14 h-6 text-center text-[10px] font-mono bg-black border border-gray-700 rounded text-cyan-400 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-cyan-900/30 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Attack Tactics
        </h1>
        <p className="text-xs font-mono text-cyan-200/60 mt-1">{team.name}</p>
      </header>

      <main className="p-4 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
            <h2 className="text-sm font-mono text-purple-400">1. BATTER APPROACH</h2>
            <div className="text-[10px] font-mono text-gray-500">RPS VS PITCHER STYLE</div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {renderTacticBox('approach', 'primary', BATTER_APPROACH_OPTIONS, approachSchedule)}
            {renderTacticBox('approach', 'secondary', BATTER_APPROACH_OPTIONS, approachSchedule)}
            {renderTacticBox('approach', 'optional', BATTER_APPROACH_OPTIONS, approachSchedule)}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-pink-500/30 pb-2">
            <h2 className="text-sm font-mono text-pink-500">2. OFFENSIVE STRATEGY</h2>
            <div className="text-[10px] font-mono text-gray-500">PROBABILITY MODIFIERS</div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {renderTacticBox('style', 'primary', ATTACK_OPTIONS, styleSchedule)}
            {renderTacticBox('style', 'secondary', ATTACK_OPTIONS, styleSchedule)}
            {renderTacticBox('style', 'optional', ATTACK_OPTIONS, styleSchedule)}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-orange-500/30 pb-2">
            <h2 className="text-sm font-mono text-orange-400">3. OFFENSIVE ATTACK</h2>
            <div className="text-[10px] font-mono text-gray-500">RPS VS DEFENSE SETUP</div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {renderTacticBox('offensive', 'primary', OFFENSIVE_ATTACK_OPTIONS, offensiveSchedule)}
            {renderTacticBox('offensive', 'secondary', OFFENSIVE_ATTACK_OPTIONS, offensiveSchedule)}
            {renderTacticBox('offensive', 'optional', OFFENSIVE_ATTACK_OPTIONS, offensiveSchedule)}
          </div>
        </section>

        <Button
          data-testid="button-save-attack"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full py-6 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50"
        >
          {saveMutation.isPending ? "SAVING..." : "COMMIT TACTICAL OVERRIDE"}
        </Button>
      </main>
    </div>
  );
}

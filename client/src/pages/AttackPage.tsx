import { useGameStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { AttackStyle, BatterApproach, OffensiveAttack, TacticSchedule, TacticSlot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ButtonGroup } from "@/components/ui/button-group";
import { ChevronDown, ChevronUp } from "lucide-react";

const ATTACK_OPTIONS: { value: AttackStyle; label: string; desc: string; icon: string; effects: { label: string; value: string; color: string }[] }[] = [
  {
    value: 'bunt',
    label: 'BUNT',
    desc: 'Sacrifice hits to advance runners.',
    icon: '◇',
    effects: [
      { label: 'Singles', value: '+15%', color: 'text-green-400' },
      { label: 'XBH', value: '-20%', color: 'text-red-400' },
    ],
  },
  {
    value: 'hit_and_run',
    label: 'H&R',
    desc: 'Runners go on pitch.',
    icon: '⚡',
    effects: [
      { label: 'Singles', value: '+15%', color: 'text-green-400' },
      { label: 'HR', value: '-25%', color: 'text-red-400' },
    ],
  },
  {
    value: 'neutral',
    label: 'NEUTRAL',
    desc: 'Balanced approach.',
    icon: '⬡',
    effects: [
      { label: 'All', value: 'BASE', color: 'text-gray-400' },
    ],
  },
  {
    value: 'swing_on_sight',
    label: 'SWING',
    desc: 'Maximum aggression for power.',
    icon: '💥',
    effects: [
      { label: 'XBH', value: '+20%', color: 'text-green-400' },
      { label: 'SO', value: '+20%', color: 'text-red-400' },
    ],
  },
];

const BATTER_APPROACH_OPTIONS: { value: BatterApproach; label: string; desc: string; icon: string; beats: string; losesTo: string }[] = [
  {
    value: 'power',
    label: 'POWER',
    desc: 'Swing for the fences.',
    icon: '🔥',
    beats: 'Movement',
    losesTo: 'Command',
  },
  {
    value: 'contact',
    label: 'CONTACT',
    desc: 'Put the ball in play.',
    icon: '🎯',
    beats: 'Command',
    losesTo: 'Velocity',
  },
  {
    value: 'patient',
    label: 'PATIENT',
    desc: 'Work the count.',
    icon: '👁️',
    beats: 'Velocity',
    losesTo: 'Movement',
  },
];

const OFFENSIVE_ATTACK_OPTIONS: { value: OffensiveAttack; label: string; desc: string; icon: string; beats: string; losesTo: string }[] = [
  {
    value: 'aggressive',
    label: 'AGGR',
    desc: 'Big leads, frequent steals.',
    icon: '⚡',
    beats: 'Protective',
    losesTo: 'Aggressive',
  },
  {
    value: 'balanced',
    label: 'BAL',
    desc: 'Standard situational running.',
    icon: '⚖️',
    beats: 'Aggressive',
    losesTo: 'Protective',
  },
  {
    value: 'conservative',
    label: 'CONS',
    desc: 'Small leads, cautious.',
    icon: '🛡️',
    beats: '—',
    losesTo: 'Aggressive',
  },
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

        {slot !== 'optional' && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full h-6 text-[9px] text-gray-500 flex items-center justify-between px-2 hover:bg-white/5">
                CONDITION LIMITS
                <ChevronDown className="w-3 h-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2 pb-1">
              {[
                { label: 'Max Inning', key: 'maxInning', min: 1, max: 9 },
                { label: 'Max K', key: 'maxStrikeouts', min: 1, max: 20 },
                { label: 'Max Runs', key: 'maxRunsAllowed', min: 0, max: 10 },
                { label: 'Max Hits', key: 'maxHitsAllowed', min: 1, max: 20 },
              ].map(cond => (
                <div key={cond.key} className="space-y-1.5 px-1">
                  <div className="flex justify-between text-[9px] font-mono text-gray-400">
                    <span>{cond.label}</span>
                    <span className="text-cyan-400">{(data.conditions as any)[cond.key] || 0}</span>
                  </div>
                  <Slider
                    value={[(data.conditions as any)[cond.key] || 0]}
                    min={cond.min}
                    max={cond.max}
                    step={1}
                    onValueChange={([val]) => updateCondition(section, slot as any, cond.key as any, val)}
                    data-testid={`slider-${section}-${slot}-${cond.key}`}
                  />
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
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
        {/* 1. BATTER APPROACH */}
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

        {/* 2. OFFENSIVE STRATEGY */}
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

        {/* 3. OFFENSIVE ATTACK */}
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


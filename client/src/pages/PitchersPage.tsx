import { useGameStore } from "@/lib/store";
import PageTip from "@/components/PageTip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PitcherStyle } from "@/lib/types";
import { useLocation } from "wouter";

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
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
            b.key === 'tacSt' ? 'bg-orange-500/20 text-orange-400' :
            b.val > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {COEFF_LABELS[b.key]} {b.val > 0 ? '+' : ''}{b.val}%
        </span>
      ))}
    </div>
  );
}

type PitcherRoles = { sp: number | null; r1: number | null; closer: number | null; nextSp: number | null };

interface PitcherRoleConfig {
  maxPitches: number;
  maxInnings: number;
  maxBb: number;
  maxEr: number;
  pitcherStyle: PitcherStyle;
}

interface SeasonStats {
  playerId: number;
  gamesPlayed: number;
  ip: number;
  pitcherH: number;
  er: number;
  pitcherBb: number;
  pitcherSo: number;
  pitchCount: number;
  gamesStarted: number;
  wins: number;
  losses: number;
  ab: number;
  hits: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
}

const ROLE_CONFIG = [
  { key: 'sp' as const, label: 'SP', fullLabel: 'STARTING PITCHER', color: 'pink', desc: 'Partente gara corrente', configKey: 'sp' as const },
  { key: 'r1' as const, label: 'R1', fullLabel: 'RELIEF 1', color: 'cyan', desc: 'Primo rilievo', configKey: 'r1' as const },
  { key: 'closer' as const, label: 'C', fullLabel: 'CLOSER', color: 'pink', desc: 'Chiusura / salvataggio', configKey: 'closer' as const },
  { key: 'nextSp' as const, label: '2P', fullLabel: 'NEXT STARTER', color: 'cyan', desc: 'Partente prossima gara (auto-rotato)', configKey: null },
];

const PITCHER_STYLE_OPTIONS: { value: PitcherStyle; label: string; icon: string; beats: string; losesTo: string }[] = [
  { value: 'velocity', label: 'VELOCITY', icon: '🔥', beats: 'Contact', losesTo: 'Patient' },
  { value: 'movement', label: 'MOVEMENT', icon: '🌀', beats: 'Patient', losesTo: 'Power' },
  { value: 'command', label: 'COMMAND', icon: '🎯', beats: 'Power', losesTo: 'Contact' },
];

const DEFAULT_CONFIGS: Record<string, PitcherRoleConfig> = {
  sp: { maxPitches: 100, maxInnings: 7, maxBb: 4, maxEr: 4, pitcherStyle: 'command' },
  r1: { maxPitches: 40, maxInnings: 9, maxBb: 4, maxEr: 3, pitcherStyle: 'command' },
  closer: { maxPitches: 30, maxInnings: 9, maxBb: 4, maxEr: 2, pitcherStyle: 'command' },
};

function PitcherSeasonLine({ stats }: { stats: SeasonStats | undefined }) {
  if (!stats || stats.ip === 0) return <span className="text-[9px] font-mono text-gray-600 italic">No season data</span>;
  const era = stats.ip > 0 ? ((stats.er / stats.ip) * 9).toFixed(2) : '0.00';
  const whip = stats.ip > 0 ? ((stats.pitcherH + stats.pitcherBb) / stats.ip).toFixed(2) : '0.00';
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
      <span className="text-[9px] font-mono text-gray-500">W/L <span className="text-green-400">{stats.wins}</span>/<span className="text-red-400">{stats.losses}</span></span>
      <span className="text-[9px] font-mono text-gray-500">ERA <span className="text-pink-400">{era}</span></span>
      <span className="text-[9px] font-mono text-gray-500">IP <span className="text-cyan-400">{stats.ip}</span></span>
      <span className="text-[9px] font-mono text-gray-500">SO <span className="text-cyan-400">{stats.pitcherSo}</span></span>
      <span className="text-[9px] font-mono text-gray-500">WHIP <span className="text-pink-400">{whip}</span></span>
      <span className="text-[9px] font-mono text-gray-500">GS <span className="text-cyan-400">{stats.gamesStarted}</span></span>
    </div>
  );
}

function SwitchConditionsPanel({
  config,
  onChange,
  roleLabel,
  coefficients,
}: {
  config: PitcherRoleConfig;
  onChange: (c: PitcherRoleConfig) => void;
  roleLabel: string;
  coefficients: TacticCoefficient[];
}) {
  return (
    <div className="space-y-4 mt-3 pt-3 border-t border-gray-800/50">
      <div className="space-y-1">
        <div className="flex justify-between">
          <label className="text-[10px] font-mono text-cyan-300 uppercase">Pitch Count</label>
          <span data-testid={`text-${roleLabel}-max-pitches`} className="text-[10px] font-mono text-pink-400 font-bold">{config.maxPitches}</span>
        </div>
        <Slider data-testid={`slider-${roleLabel}-max-pitches`} value={[config.maxPitches]} onValueChange={([v]) => onChange({ ...config, maxPitches: v })} min={10} max={100} step={5} className="py-1" />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <label className="text-[10px] font-mono text-cyan-300 uppercase">Innings Pitched</label>
          <span data-testid={`text-${roleLabel}-max-innings`} className="text-[10px] font-mono text-pink-400 font-bold">{config.maxInnings}</span>
        </div>
        <Slider data-testid={`slider-${roleLabel}-max-innings`} value={[config.maxInnings]} onValueChange={([v]) => onChange({ ...config, maxInnings: v })} min={0} max={9} step={1} className="py-1" />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <label className="text-[10px] font-mono text-cyan-300 uppercase">Base on Balls (BB)</label>
          <span data-testid={`text-${roleLabel}-max-bb`} className="text-[10px] font-mono text-pink-400 font-bold">{config.maxBb}</span>
        </div>
        <Slider data-testid={`slider-${roleLabel}-max-bb`} value={[config.maxBb]} onValueChange={([v]) => onChange({ ...config, maxBb: v })} min={1} max={10} step={1} className="py-1" />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <label className="text-[10px] font-mono text-cyan-300 uppercase">Earned Runs (ER)</label>
          <span data-testid={`text-${roleLabel}-max-er`} className="text-[10px] font-mono text-pink-400 font-bold">{config.maxEr}</span>
        </div>
        <Slider data-testid={`slider-${roleLabel}-max-er`} value={[config.maxEr]} onValueChange={([v]) => onChange({ ...config, maxEr: v })} min={1} max={10} step={1} className="py-1" />
      </div>

      <div className="pt-2 border-t border-gray-800/30">
        <p className="text-[9px] font-mono text-purple-400 uppercase mb-2">Pitcher Style (RPS)</p>
        <div className="grid grid-cols-3 gap-2">
          {PITCHER_STYLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              data-testid={`button-${roleLabel}-style-${opt.value}`}
              onClick={() => onChange({ ...config, pitcherStyle: opt.value })}
              className={`p-2 rounded-lg border text-center transition-all ${
                config.pitcherStyle === opt.value
                  ? 'border-purple-400 bg-purple-950/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                  : 'border-gray-800 bg-gray-950/30 hover:border-gray-600'
              }`}
            >
              <span className="text-lg block">{opt.icon}</span>
              <span className={`text-[8px] font-black block mt-1 ${config.pitcherStyle === opt.value ? 'text-purple-300' : 'text-gray-500'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>
                {opt.label}
              </span>
              <span className="text-[7px] font-mono text-green-500 block">▲{opt.beats}</span>
              <span className="text-[7px] font-mono text-red-500 block">▼{opt.losesTo}</span>
              {coefficients.length > 0 && (
                <CoeffBadges coefficients={coefficients} layer="pitcher_style" tacticValue={opt.value} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PitchersPage() {
  const { team, players, walletAddress } = useGameStore();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const pitchers = players.filter(p => p.positions.includes('P'));

  const { data: saved } = useQuery({
    queryKey: ['pitcher-rotation', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/pitcher-rotation/${team!.id}`);
      return res.json();
    },
    enabled: !!team,
    refetchOnMount: 'always',
  });

  const { data: teamStats } = useQuery<SeasonStats[]>({
    queryKey: ['team-stats', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/team/${team!.id}/stats`);
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

  const statsMap = new Map<number, SeasonStats>();
  if (teamStats) {
    for (const s of teamStats) statsMap.set(s.playerId, s);
  }

  const [roles, setRoles] = useState<PitcherRoles>({ sp: null, r1: null, closer: null, nextSp: null });
  const [pitcherConfigs, setPitcherConfigs] = useState<Record<string, PitcherRoleConfig>>({
    sp: { ...DEFAULT_CONFIGS.sp },
    r1: { ...DEFAULT_CONFIGS.r1 },
    closer: { ...DEFAULT_CONFIGS.closer },
  });
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (saved) {
      const savedRoles = saved.roles || { sp: null, r1: null, closer: null, nextSp: null };
      if (savedRoles.sp === null && saved.rotationOrder?.length > 0) {
        const order = saved.rotationOrder;
        savedRoles.sp = order[0] ?? null;
        savedRoles.r1 = order[1] ?? null;
        savedRoles.closer = order[2] ?? null;
        savedRoles.nextSp = order[3] ?? null;
      }
      setRoles(savedRoles);

      if (saved.pitcherConfigs) {
        setPitcherConfigs({
          sp: { ...DEFAULT_CONFIGS.sp, ...(saved.pitcherConfigs.sp || {}) },
          r1: { ...DEFAULT_CONFIGS.r1, ...(saved.pitcherConfigs.r1 || {}) },
          closer: { ...DEFAULT_CONFIGS.closer, ...(saved.pitcherConfigs.closer || {}) },
        });
      }
    } else if (pitchers.length > 0 && !roles.sp) {
      setRoles({
        sp: pitchers[0]?.id ?? null,
        r1: pitchers[1]?.id ?? null,
        closer: pitchers[2]?.id ?? null,
        nextSp: pitchers[3]?.id ?? null,
      });
    }
  }, [saved, pitchers.length]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rotationOrder = [roles.sp, roles.r1, roles.closer, roles.nextSp].filter((id): id is number => id !== null);
      const res = await fetch('/api/pitcher-rotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team!.id, rotationOrder, roles, pitcherConfigs }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitcher-rotation'] });
      queryClient.invalidateQueries({ queryKey: ['lineup'] });
    },
  });

  if (!walletAddress || !team) {
    return <div className="min-h-screen bg-black p-6 flex items-center justify-center text-center text-pink-500 font-mono text-xl uppercase tracking-widest">ACCESS DENIED</div>;
  }

  const getPlayer = (id: number | null) => id ? players.find(p => p.id === id) : undefined;

  const assignedRoleIds = new Set(Object.values(roles).filter((id): id is number => id !== null));

  const getAvailablePitchers = (currentRoleKey: keyof PitcherRoles) => {
    return pitchers.filter(p => !assignedRoleIds.has(p.id) || roles[currentRoleKey] === p.id);
  };

  const setRole = (roleKey: keyof PitcherRoles, value: string) => {
    const playerId = value === 'none' ? null : parseInt(value);
    setRoles(prev => ({ ...prev, [roleKey]: playerId }));
  };

  const toggleExpanded = (key: string) => {
    setExpandedRoles(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const bullpenPitchers = pitchers.filter(p => !assignedRoleIds.has(p.id));

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-pink-900/30 to-black border-b border-pink-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Pitching Staff
        </h1>
        <p className="text-xs font-mono text-pink-200/60 mt-1">{team.name}</p>
      </header>

      <main className="p-4 space-y-4">
        <h2 className="text-sm font-mono text-cyan-500 border-b border-cyan-500/30 pb-2">PITCHER SEQUENCE</h2>

        {ROLE_CONFIG.map(({ key, label, fullLabel, color, desc, configKey }) => {
          const assigned = getPlayer(roles[key]);
          const available = getAvailablePitchers(key);
          const borderColor = color === 'pink' ? 'border-pink-500/30' : 'border-cyan-500/30';
          const bgColor = color === 'pink' ? 'bg-pink-950/10' : 'bg-cyan-950/10';
          const badgeColor = color === 'pink' ? 'bg-pink-600 text-white' : 'bg-cyan-600 text-white';
          const labelColor = color === 'pink' ? 'text-pink-400' : 'text-cyan-400';
          const isExpanded = expandedRoles.has(key);
          const hasConfig = configKey !== null;

          return (
            <div key={key} data-testid={`pitcher-role-${key}`} className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}>
              <div
                className={`p-4 ${hasConfig ? 'cursor-pointer' : ''}`}
                onClick={() => hasConfig && toggleExpanded(key)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-black ${badgeColor}`} style={{fontFamily: "'Press Start 2P', cursive", fontSize: '10px'}}>
                    {label}
                  </span>
                  <div className="flex-1">
                    <span className={`text-xs font-bold uppercase ${labelColor}`} style={{fontFamily: "'Orbitron', sans-serif"}}>{fullLabel}</span>
                    <p className="text-[10px] font-mono text-gray-500">{desc}</p>
                  </div>
                  {hasConfig && (
                    <span className={`text-gray-500 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  )}
                </div>

                <Select
                  value={roles[key]?.toString() || undefined}
                  onValueChange={(val) => { setRole(key, val); }}
                >
                  <SelectTrigger
                    data-testid={`select-role-${key}`}
                    className="w-full bg-black border-gray-800 text-cyan-50 font-mono text-sm h-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue placeholder="-- SELECT PITCHER --" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-cyan-500/30 text-cyan-50 max-h-64">
                    <SelectItem value="none" className="text-gray-500 font-mono text-xs">-- EMPTY --</SelectItem>
                    {available.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()} className="font-mono text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {assigned && (
                  <div className="mt-3 px-1">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/player/${assigned.id}`); }} className="text-xs font-bold text-cyan-300 hover:text-cyan-100 underline underline-offset-2 mb-1 block">{assigned.name}</button>
                    <div className="flex gap-4">
                      <span className="text-[10px] font-mono text-gray-500">VEL <span className="text-pink-400 font-bold">{assigned.vel}</span></span>
                      <span className="text-[10px] font-mono text-gray-500">CTL <span className="text-cyan-400 font-bold">{assigned.ctl}</span></span>
                      <span className="text-[10px] font-mono text-gray-500">MOV <span className="text-pink-400 font-bold">{assigned.mov}</span></span>
                      <span className="text-[10px] font-mono text-gray-500">STA <span className="text-cyan-400 font-bold">{assigned.sta}</span></span>
                      <span className="text-[10px] font-mono text-gray-500">DEF <span className="text-cyan-400 font-bold">{assigned.def}</span></span>
                    </div>
                    <PitcherSeasonLine stats={statsMap.get(assigned.id)} />
                    {hasConfig && pitcherConfigs[configKey] && (
                      <div className="flex gap-2 mt-1">
                        <span className="text-[8px] font-mono text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">
                          {PITCHER_STYLE_OPTIONS.find(o => o.value === pitcherConfigs[configKey].pitcherStyle)?.icon} {pitcherConfigs[configKey].pitcherStyle.toUpperCase()}
                        </span>
                        <span className="text-[8px] font-mono text-gray-500">P:{pitcherConfigs[configKey].maxPitches} IP:{pitcherConfigs[configKey].maxInnings} BB:{pitcherConfigs[configKey].maxBb} ER:{pitcherConfigs[configKey].maxEr}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {hasConfig && isExpanded && configKey && (
                <div className="px-4 pb-4">
                  <SwitchConditionsPanel
                    config={pitcherConfigs[configKey]}
                    onChange={(c) => setPitcherConfigs(prev => ({ ...prev, [configKey]: c }))}
                    roleLabel={configKey}
                    coefficients={coefficients}
                  />
                </div>
              )}
            </div>
          );
        })}

        {bullpenPitchers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-mono text-gray-500 border-b border-gray-800 pb-2">BULLPEN ({bullpenPitchers.length})</h2>
            <div className="grid grid-cols-2 gap-2">
              {bullpenPitchers.map(p => (
                <div key={p.id} data-testid={`bullpen-pitcher-${p.id}`} className="p-3 border border-gray-800 rounded-lg bg-black/40">
                  <button onClick={() => navigate(`/player/${p.id}`)} className="text-xs font-bold text-gray-300 hover:text-cyan-300 truncate block underline underline-offset-2">{p.name}</button>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[9px] font-mono text-gray-600">V{p.vel}</span>
                    <span className="text-[9px] font-mono text-gray-600">C{p.ctl}</span>
                    <span className="text-[9px] font-mono text-gray-600">M{p.mov}</span>
                    <span className="text-[9px] font-mono text-gray-600">S{p.sta}</span>
                  </div>
                  <PitcherSeasonLine stats={statsMap.get(p.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          data-testid="button-save-rotation"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full py-4 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] disabled:opacity-50"
        >
          {saveMutation.isPending ? "SAVING..." : "SAVE PITCHING STAFF"}
        </button>
      </main>
      <PageTip route="/pitchers" message="Assign pitcher roles (SP, R1, Closer) and set switch conditions for each." />
    </div>
  );
}

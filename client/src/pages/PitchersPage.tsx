import { useGameStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PitcherStyle } from "@/lib/types";

type PitcherRoles = { sp: number | null; r1: number | null; closer: number | null; nextSp: number | null };

const ROLE_CONFIG = [
  { key: 'sp' as const, label: 'SP', fullLabel: 'STARTING PITCHER', color: 'pink', desc: 'Partente gara corrente' },
  { key: 'r1' as const, label: 'R1', fullLabel: 'RELIEF 1', color: 'cyan', desc: 'Primo rilievo' },
  { key: 'closer' as const, label: 'C', fullLabel: 'CLOSER', color: 'pink', desc: 'Chiusura / salvataggio' },
  { key: 'nextSp' as const, label: '2P', fullLabel: 'NEXT STARTER', color: 'cyan', desc: 'Partente prossima gara (auto-rotato)' },
];

const PITCHER_STYLE_OPTIONS: { value: PitcherStyle; label: string; desc: string; icon: string; beats: string; losesTo: string }[] = [
  {
    value: 'velocity',
    label: 'VELOCITY',
    desc: 'Pure heat. Overpower batters with fastballs and hard stuff.',
    icon: '🔥',
    beats: 'Contact approach',
    losesTo: 'Patient approach',
  },
  {
    value: 'movement',
    label: 'MOVEMENT',
    desc: 'Spin and deception. Break and change-up to fool timing.',
    icon: '🌀',
    beats: 'Patient approach',
    losesTo: 'Power approach',
  },
  {
    value: 'command',
    label: 'COMMAND',
    desc: 'Surgical precision. Paint corners and exploit weaknesses.',
    icon: '🎯',
    beats: 'Power approach',
    losesTo: 'Contact approach',
  },
];

export default function PitchersPage() {
  const { team, players, walletAddress } = useGameStore();
  const queryClient = useQueryClient();
  const pitchers = players.filter(p => p.positions.includes('P'));

  const { data: saved } = useQuery({
    queryKey: ['pitcher-rotation', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/pitcher-rotation/${team!.id}`);
      return res.json();
    },
    enabled: !!team,
  });

  const { data: savedTactics } = useQuery({
    queryKey: ['tactics', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tactics/${team!.id}`);
      return res.json();
    },
    enabled: !!team,
  });

  const [roles, setRoles] = useState<PitcherRoles>({ sp: null, r1: null, closer: null, nextSp: null });
  const [pitcherStyle, setPitcherStyle] = useState<PitcherStyle>('command');
  const [maxPitches, setMaxPitches] = useState(100);
  const [maxInnings, setMaxInnings] = useState(7);
  const [maxBb, setMaxBb] = useState(4);
  const [maxEr, setMaxEr] = useState(4);
  const [r1MaxPitches, setR1MaxPitches] = useState(40);
  const [r1MaxEr, setR1MaxEr] = useState(3);
  const [closerMaxPitches, setCloserMaxPitches] = useState(30);
  const [closerMaxEr, setCloserMaxEr] = useState(2);

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
      setMaxPitches(saved.maxPitches ?? 100);
      setMaxInnings(saved.maxInnings ?? 7);
      setMaxBb(saved.maxBb ?? 4);
      setMaxEr(saved.maxEr ?? 4);
      setR1MaxPitches(saved.r1MaxPitches ?? 40);
      setR1MaxEr(saved.r1MaxEr ?? 3);
      setCloserMaxPitches(saved.closerMaxPitches ?? 30);
      setCloserMaxEr(saved.closerMaxEr ?? 2);
    } else if (pitchers.length > 0 && !roles.sp) {
      setRoles({
        sp: pitchers[0]?.id ?? null,
        r1: pitchers[1]?.id ?? null,
        closer: pitchers[2]?.id ?? null,
        nextSp: pitchers[3]?.id ?? null,
      });
    }
  }, [saved, pitchers.length]);

  useEffect(() => {
    if (savedTactics?.pitcherStyle) {
      setPitcherStyle(savedTactics.pitcherStyle as PitcherStyle);
    }
  }, [savedTactics]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rotationOrder = [roles.sp, roles.r1, roles.closer, roles.nextSp].filter((id): id is number => id !== null);
      const [rotRes, tacRes] = await Promise.all([
        fetch('/api/pitcher-rotation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: team!.id, rotationOrder, roles, maxPitches, maxInnings, maxBb, maxEr, r1MaxPitches, r1MaxEr, closerMaxPitches, closerMaxEr }),
        }),
        fetch('/api/tactics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: team!.id,
            pitcherStyle,
            attackStyle: savedTactics?.attackStyle || 'neutral',
            infieldPosition: savedTactics?.infieldPosition || 'neutral',
            outfieldPosition: savedTactics?.outfieldPosition || 'neutral',
            batterApproach: savedTactics?.batterApproach || 'contact',
            offensiveAttack: savedTactics?.offensiveAttack || 'balanced',
            defenseSetup: savedTactics?.defenseSetup || 'balanced',
          }),
        }),
      ]);
      return rotRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitcher-rotation'] });
      queryClient.invalidateQueries({ queryKey: ['lineup'] });
      queryClient.invalidateQueries({ queryKey: ['tactics'] });
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

  const bullpenPitchers = pitchers.filter(p => !assignedRoleIds.has(p.id));

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-pink-900/30 to-black border-b border-pink-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Pitching Staff
        </h1>
        <p className="text-xs font-mono text-pink-200/60 mt-1">{team.name}</p>
      </header>

      <main className="p-4 space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-mono text-cyan-500 border-b border-cyan-500/30 pb-2">ROLE ASSIGNMENTS</h2>

          {ROLE_CONFIG.map(({ key, label, fullLabel, color, desc }) => {
            const assigned = getPlayer(roles[key]);
            const available = getAvailablePitchers(key);
            const borderColor = color === 'pink' ? 'border-pink-500/30' : 'border-cyan-500/30';
            const bgColor = color === 'pink' ? 'bg-pink-950/10' : 'bg-cyan-950/10';
            const badgeColor = color === 'pink' ? 'bg-pink-600 text-white' : 'bg-cyan-600 text-white';
            const labelColor = color === 'pink' ? 'text-pink-400' : 'text-cyan-400';

            return (
              <div key={key} data-testid={`pitcher-role-${key}`} className={`p-4 rounded-xl border ${borderColor} ${bgColor}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-black ${badgeColor}`} style={{fontFamily: "'Press Start 2P', cursive", fontSize: '10px'}}>
                    {label}
                  </span>
                  <div>
                    <span className={`text-xs font-bold uppercase ${labelColor}`} style={{fontFamily: "'Orbitron', sans-serif"}}>{fullLabel}</span>
                    <p className="text-[10px] font-mono text-gray-500">{desc}</p>
                  </div>
                </div>

                <Select
                  value={roles[key]?.toString() || undefined}
                  onValueChange={(val) => setRole(key, val)}
                >
                  <SelectTrigger data-testid={`select-role-${key}`} className="w-full bg-black border-gray-800 text-cyan-50 font-mono text-sm h-10">
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
                  <div className="flex gap-4 mt-3 px-1">
                    <span className="text-[10px] font-mono text-gray-500">VEL <span className="text-pink-400 font-bold">{assigned.vel}</span></span>
                    <span className="text-[10px] font-mono text-gray-500">CTL <span className="text-cyan-400 font-bold">{assigned.ctl}</span></span>
                    <span className="text-[10px] font-mono text-gray-500">MOV <span className="text-pink-400 font-bold">{assigned.mov}</span></span>
                    <span className="text-[10px] font-mono text-gray-500">STA <span className="text-cyan-400 font-bold">{assigned.sta}</span></span>
                    <span className="text-[10px] font-mono text-gray-500">DEF <span className="text-cyan-400 font-bold">{assigned.def}</span></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {bullpenPitchers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-mono text-gray-500 border-b border-gray-800 pb-2">BULLPEN ({bullpenPitchers.length})</h2>
            <div className="grid grid-cols-2 gap-2">
              {bullpenPitchers.map(p => (
                <div key={p.id} data-testid={`bullpen-pitcher-${p.id}`} className="p-3 border border-gray-800 rounded-lg bg-black/40">
                  <span className="text-xs font-bold text-gray-300 truncate block">{p.name}</span>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[9px] font-mono text-gray-600">V{p.vel}</span>
                    <span className="text-[9px] font-mono text-gray-600">C{p.ctl}</span>
                    <span className="text-[9px] font-mono text-gray-600">M{p.mov}</span>
                    <span className="text-[9px] font-mono text-gray-600">S{p.sta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-sm font-mono text-purple-400 border-b border-purple-500/30 pb-2">PITCHER STYLE</h2>
          <p className="text-[10px] font-mono text-gray-500">RPS matchup vs opponent's Batter Approach — buffs/debuffs on pitch outcomes</p>

          {PITCHER_STYLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              data-testid={`button-pitcher-style-${opt.value}`}
              onClick={() => setPitcherStyle(opt.value)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                pitcherStyle === opt.value
                  ? 'border-purple-400 bg-purple-950/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                  : 'border-gray-800 bg-gray-950/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{opt.icon}</span>
                <span className={`font-black text-lg ${pitcherStyle === opt.value ? 'text-purple-400' : 'text-gray-400'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>
                  {opt.label}
                </span>
                {pitcherStyle === opt.value && (
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

        <div className="space-y-5">
          <h2 className="text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2">SP SWITCH CONDITIONS</h2>
          <p className="text-[10px] font-mono text-gray-500">SP replaced by R1 when ANY condition is met</p>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-mono text-cyan-300">MAX PITCHES</label>
              <span data-testid="text-max-pitches" className="text-xs font-mono text-pink-400 font-bold">{maxPitches}</span>
            </div>
            <Slider data-testid="slider-max-pitches" value={[maxPitches]} onValueChange={([v]) => setMaxPitches(v)} min={50} max={150} step={5} className="py-2" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-mono text-cyan-300">MAX INNINGS</label>
              <span data-testid="text-max-innings" className="text-xs font-mono text-pink-400 font-bold">{maxInnings}</span>
            </div>
            <Slider data-testid="slider-max-innings" value={[maxInnings]} onValueChange={([v]) => setMaxInnings(v)} min={1} max={9} step={1} className="py-2" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-mono text-cyan-300">MAX WALKS (BB)</label>
              <span data-testid="text-max-bb" className="text-xs font-mono text-pink-400 font-bold">{maxBb}</span>
            </div>
            <Slider data-testid="slider-max-bb" value={[maxBb]} onValueChange={([v]) => setMaxBb(v)} min={1} max={10} step={1} className="py-2" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-mono text-cyan-300">MAX EARNED RUNS (ER)</label>
              <span data-testid="text-max-er" className="text-xs font-mono text-pink-400 font-bold">{maxEr}</span>
            </div>
            <Slider data-testid="slider-max-er" value={[maxEr]} onValueChange={([v]) => setMaxEr(v)} min={1} max={10} step={1} className="py-2" />
          </div>
        </div>

        <div className="space-y-5">
          <h2 className="text-sm font-mono text-cyan-500 border-b border-cyan-500/30 pb-2">R1 SWITCH CONDITIONS</h2>
          <p className="text-[10px] font-mono text-gray-500">R1 replaced by Closer when ANY condition is met</p>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-mono text-cyan-300">R1 MAX PITCHES</label>
              <span data-testid="text-r1-max-pitches" className="text-xs font-mono text-cyan-400 font-bold">{r1MaxPitches}</span>
            </div>
            <Slider data-testid="slider-r1-max-pitches" value={[r1MaxPitches]} onValueChange={([v]) => setR1MaxPitches(v)} min={15} max={80} step={5} className="py-2" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-mono text-cyan-300">R1 MAX EARNED RUNS (ER)</label>
              <span data-testid="text-r1-max-er" className="text-xs font-mono text-cyan-400 font-bold">{r1MaxEr}</span>
            </div>
            <Slider data-testid="slider-r1-max-er" value={[r1MaxEr]} onValueChange={([v]) => setR1MaxEr(v)} min={1} max={6} step={1} className="py-2" />
          </div>
        </div>

        <div className="space-y-5">
          <h2 className="text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2">CLOSER SWITCH CONDITIONS</h2>
          <p className="text-[10px] font-mono text-gray-500">Closer limit conditions (game ends or bullpen takes over)</p>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-mono text-cyan-300">CLOSER MAX PITCHES</label>
              <span data-testid="text-closer-max-pitches" className="text-xs font-mono text-pink-400 font-bold">{closerMaxPitches}</span>
            </div>
            <Slider data-testid="slider-closer-max-pitches" value={[closerMaxPitches]} onValueChange={([v]) => setCloserMaxPitches(v)} min={10} max={60} step={5} className="py-2" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-mono text-cyan-300">CLOSER MAX EARNED RUNS (ER)</label>
              <span data-testid="text-closer-max-er" className="text-xs font-mono text-pink-400 font-bold">{closerMaxEr}</span>
            </div>
            <Slider data-testid="slider-closer-max-er" value={[closerMaxEr]} onValueChange={([v]) => setCloserMaxEr(v)} min={1} max={5} step={1} className="py-2" />
          </div>
        </div>

        <button
          data-testid="button-save-rotation"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full py-4 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] disabled:opacity-50"
        >
          {saveMutation.isPending ? "SAVING..." : "SAVE PITCHING STAFF"}
        </button>
      </main>
    </div>
  );
}

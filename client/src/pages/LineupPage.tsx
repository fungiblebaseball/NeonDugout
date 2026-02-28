import { useGameStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { LineupPositions } from "@/lib/types";
import { useLocation } from "wouter";

interface SeasonStats {
  playerId: number;
  ab: number;
  hits: number;
  hr: number;
  rbi: number;
}

const FIELD_POSITIONS: LineupPositions[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

export default function LineupPage() {
  const { team, players, walletAddress } = useGameStore();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: teamStats } = useQuery<SeasonStats[]>({
    queryKey: ['team-stats', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/team/${team!.id}/stats`);
      return res.json();
    },
    enabled: !!team,
  });

  const statsMap = new Map<number, SeasonStats>();
  if (teamStats) {
    for (const s of teamStats) statsMap.set(s.playerId, s);
  }

  const getAvg = (playerId: number): string => {
    const s = statsMap.get(playerId);
    if (!s || s.ab === 0) return '---';
    return (s.hits / s.ab).toFixed(3).replace(/^0/, '');
  };

  const { data: savedLineup } = useQuery({
    queryKey: ['lineup', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/lineup/${team!.id}`);
      return res.json();
    },
    enabled: !!team,
    refetchOnMount: 'always',
  });

  const { data: pitcherRotation } = useQuery({
    queryKey: ['pitcher-rotation', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/pitcher-rotation/${team!.id}`);
      return res.json();
    },
    enabled: !!team,
    refetchOnMount: 'always',
  });

  const [fieldPositions, setFieldPositions] = useState<Record<string, number | null>>({});
  const [battingOrder, setBattingOrder] = useState<number[]>([]);
  const [useDH, setUseDH] = useState(false);
  const [dhPlayerId, setDhPlayerId] = useState<number | null>(null);

  const spId = pitcherRotation?.roles?.sp ?? null;

  useEffect(() => {
    if (savedLineup) {
      const fp = { ...(savedLineup.fieldPositions || {}) };
      setFieldPositions(fp);
      const savedOrder = savedLineup.battingOrder || [];
      setBattingOrder(savedOrder);
      if (fp['DH']) {
        setUseDH(true);
        setDhPlayerId(fp['DH']);
      }
    }
  }, [savedLineup]);

  useEffect(() => {
    if (!players.length) return;

    const fieldPlayerIds = Object.entries(fieldPositions)
      .filter(([k]) => k !== 'DH' && k !== 'P')
      .map(([, v]) => v)
      .filter(Boolean) as number[];

    const validIds = new Set([
      ...fieldPlayerIds,
      ...(useDH && dhPlayerId ? [dhPlayerId] : []),
      ...(!useDH && spId ? [spId] : []),
    ]);

    if (validIds.size === 0) return;

    setBattingOrder(prev => {
      const cleaned = prev.filter(id => validIds.has(id));
      const missing = Array.from(validIds).filter(id => !cleaned.includes(id));
      const merged = [...cleaned, ...missing].slice(0, 9);

      if (merged.length === prev.length && merged.every((id, i) => id === prev[i])) {
        return prev;
      }
      return merged;
    });
  }, [spId, fieldPositions, useDH, dhPlayerId, players]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fpToSave = { ...fieldPositions };
      if (spId) fpToSave['P'] = spId;
      if (useDH && dhPlayerId) {
        fpToSave['DH'] = dhPlayerId;
      } else {
        delete fpToSave['DH'];
      }
      const res = await fetch('/api/lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team!.id, fieldPositions: fpToSave, battingOrder }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lineup'] }),
  });

  if (!walletAddress || !team) {
    return <div className="min-h-screen bg-black p-6 flex items-center justify-center text-center text-pink-500 font-mono text-xl uppercase tracking-widest">ACCESS DENIED</div>;
  }

  const getPlayer = (id: number | null) => players.find(p => p.id === id);
  const spPlayer = getPlayer(spId);

  const assignField = (pos: string, playerIdStr: string) => {
    const playerId = playerIdStr === 'none' ? null : parseInt(playerIdStr);
    setFieldPositions(prev => ({ ...prev, [pos]: playerId }));
  };

  const moveBatter = (idx: number, direction: 'up' | 'down') => {
    const newOrder = [...battingOrder];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setBattingOrder(newOrder);
  };

  const allAssignedIds = new Set([
    ...Object.entries(fieldPositions).filter(([k]) => k !== 'DH' && k !== 'P').map(([, v]) => v).filter(Boolean),
    spId,
    useDH ? dhPlayerId : null,
  ].filter(Boolean) as number[]);

  const toggleDH = () => {
    if (useDH) {
      setUseDH(false);
      setDhPlayerId(null);
    } else {
      setUseDH(true);
    }
  };

  const assignDH = (val: string) => {
    const pid = val === 'none' ? null : parseInt(val);
    setDhPlayerId(pid);
  };

  const getBatterPosition = (playerId: number): string => {
    if (playerId === spId) return 'SP';
    if (useDH && playerId === dhPlayerId) return 'DH';
    for (const [pos, pid] of Object.entries(fieldPositions)) {
      if (pid === playerId && pos !== 'P' && pos !== 'DH') return pos;
    }
    return '?';
  };

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-cyan-900/30 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Lineup Manager
        </h1>
        <p className="text-xs font-mono text-cyan-200/60 mt-1">{team.name}</p>
      </header>

      <main className="p-4 space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2">FIELD POSITIONS</h2>

          <div data-testid="field-position-P" className="flex items-center gap-3 p-3 rounded-lg border border-pink-500/30 bg-pink-950/10">
            <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded border bg-pink-950/40 border-pink-500/40 text-pink-400 font-black" style={{fontFamily: "'Orbitron', sans-serif"}}>
              SP
            </div>
            <div className="flex-1 min-w-0">
              {spPlayer ? (
                <div className="py-2">
                  <span className="text-sm font-mono text-pink-100 block">{spPlayer.name}</span>
                  <span className="text-[10px] font-mono text-pink-400/60">Set via Pitching Staff page</span>
                </div>
              ) : (
                <span className="text-sm font-mono text-gray-500 py-2 block">No SP assigned - set in Pitching Staff</span>
              )}
            </div>
            {spPlayer && (
              <div className="flex flex-col gap-1 w-16 text-right shrink-0">
                <span className="text-[10px] font-mono text-gray-400">VEL <span className="text-pink-400 font-bold">{spPlayer.vel}</span></span>
                <span className="text-[10px] font-mono text-gray-400">CTL <span className="text-cyan-400 font-bold">{spPlayer.ctl}</span></span>
              </div>
            )}
          </div>

          {FIELD_POSITIONS.map(pos => {
            const assignedId = fieldPositions[pos] ?? null;
            const assignedPlayer = getPlayer(assignedId);

            return (
              <div key={pos} data-testid={`field-position-${pos}`} className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-950/50">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded border bg-cyan-950/40 border-cyan-500/40 text-cyan-400 font-black" style={{fontFamily: "'Orbitron', sans-serif"}}>
                  {pos}
                </div>
                <div className="flex-1 min-w-0">
                  <Select
                    value={assignedId?.toString() || undefined}
                    onValueChange={(val) => assignField(pos, val)}
                  >
                    <SelectTrigger data-testid={`select-position-${pos}`} className="w-full bg-black border-gray-800 text-cyan-50 font-mono text-sm h-10 truncate">
                      <SelectValue placeholder="EMPTY SLOT" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-950 border-cyan-500/30 text-cyan-50 max-h-64">
                      <SelectItem value="none" className="text-gray-500 font-mono text-xs">-- EMPTY --</SelectItem>
                      {players.filter(p => !p.positions.includes('P')).map(p => (
                        <SelectItem key={p.id} value={p.id.toString()} className="font-mono text-xs">
                          {p.name} <span className="text-gray-600 ml-1">[{p.positions.join(',')}]</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {assignedPlayer && (
                  <div className="flex flex-col gap-1 w-16 text-right shrink-0">
                    <span className="text-[10px] font-mono text-gray-400">POW <span className="text-pink-400 font-bold">{assignedPlayer.pow}</span></span>
                    <span className="text-[10px] font-mono text-gray-400">CON <span className="text-cyan-400 font-bold">{assignedPlayer.con}</span></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono text-cyan-500 border-b border-cyan-500/30 pb-2 flex-1">DESIGNATED HITTER (DH)</h2>
          </div>
          <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-gray-400">Use DH instead of pitcher batting</p>
              </div>
              <button
                data-testid="button-toggle-dh"
                onClick={toggleDH}
                className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${
                  useDH
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
                style={{fontFamily: "'Orbitron', sans-serif"}}
              >
                {useDH ? 'DH ON' : 'DH OFF'}
              </button>
            </div>
            {useDH && (
              <Select
                value={dhPlayerId?.toString() || undefined}
                onValueChange={assignDH}
              >
                <SelectTrigger data-testid="select-dh" className="w-full bg-black border-gray-800 text-cyan-50 font-mono text-sm h-10">
                  <SelectValue placeholder="SELECT DH PLAYER" />
                </SelectTrigger>
                <SelectContent className="bg-gray-950 border-cyan-500/30 text-cyan-50 max-h-64">
                  <SelectItem value="none" className="text-gray-500 font-mono text-xs">-- EMPTY --</SelectItem>
                  {players.filter(p => !p.positions.includes('P') && !allAssignedIds.has(p.id)).map(p => (
                    <SelectItem key={p.id} value={p.id.toString()} className="font-mono text-xs">
                      {p.name} <span className="text-gray-600 ml-1">[{p.positions.join(',')}]</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!useDH && spPlayer && (
              <p className="text-[10px] font-mono text-gray-600">SP ({spPlayer.name}) bats in lineup</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-mono text-cyan-500 border-b border-cyan-500/30 pb-2">BATTING ORDER (1-9)</h2>
          {battingOrder.length === 0 && (
            <p className="text-xs font-mono text-gray-600 text-center py-4">Assign field positions to populate batting order</p>
          )}
          {battingOrder.map((playerId, idx) => {
            const p = getPlayer(playerId);
            if (!p) return null;
            const pos = getBatterPosition(playerId);
            const isPitcher = playerId === spId;
            return (
              <div key={playerId} data-testid={`batting-order-${idx}`} className={`flex items-center gap-3 p-3 rounded-lg border ${isPitcher ? 'border-pink-500/20 bg-pink-950/10' : 'border-cyan-500/20 bg-cyan-950/10'}`}>
                <div className="w-8 h-8 shrink-0 bg-pink-950/40 flex items-center justify-center rounded text-pink-400 font-black text-lg" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '10px'}}>
                  #{idx + 1}
                </div>
                <span className={`text-[10px] font-mono w-8 shrink-0 ${isPitcher ? 'text-pink-400' : 'text-cyan-400'}`}>{pos}</span>
                <button onClick={() => navigate(`/player/${p.id}`)} className="flex-1 text-sm font-mono text-cyan-100 truncate text-left hover:text-cyan-300 underline underline-offset-2">{p.name}</button>
                <span className="text-[9px] font-mono text-gray-500 w-10 text-right">{getAvg(p.id)}</span>
                <div className="flex gap-1">
                  <button data-testid={`button-move-up-${idx}`} onClick={() => moveBatter(idx, 'up')} disabled={idx === 0} className="w-7 h-7 rounded bg-gray-800 text-cyan-400 disabled:opacity-20 hover:bg-cyan-900/50 text-xs font-bold">&#9650;</button>
                  <button data-testid={`button-move-down-${idx}`} onClick={() => moveBatter(idx, 'down')} disabled={idx === battingOrder.length - 1} className="w-7 h-7 rounded bg-gray-800 text-cyan-400 disabled:opacity-20 hover:bg-cyan-900/50 text-xs font-bold">&#9660;</button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          data-testid="button-save-lineup"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50"
        >
          {saveMutation.isPending ? "SAVING..." : "SAVE LINEUP"}
        </button>

        <div className="pt-4 space-y-4">
          <h2 className="text-sm font-mono text-gray-500 border-b border-gray-800 pb-2">BENCH</h2>
          <div className="grid grid-cols-2 gap-2">
            {players.filter(p => !allAssignedIds.has(p.id) && !p.positions.includes('P')).map(p => (
              <div key={p.id} data-testid={`bench-player-${p.id}`} className="p-3 border border-gray-800 rounded bg-black/40 flex flex-col justify-between">
                <button onClick={() => navigate(`/player/${p.id}`)} className="text-xs font-bold truncate text-gray-300 hover:text-cyan-300 mb-1 underline underline-offset-2 text-left">{p.name}</button>
                <div className="flex justify-between">
                  <span className="text-[10px] font-mono text-pink-500/70">{p.positions.join(', ')}</span>
                  <span className="text-[9px] font-mono text-gray-600">{getAvg(p.id)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

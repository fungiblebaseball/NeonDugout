import { useGameStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { LineupPositions } from "@/lib/types";

const FIELD_POSITIONS: LineupPositions[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

export default function LineupPage() {
  const { team, players, walletAddress } = useGameStore();
  const queryClient = useQueryClient();

  const { data: savedLineup } = useQuery({
    queryKey: ['lineup', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/lineup/${team!.id}`);
      return res.json();
    },
    enabled: !!team,
  });

  const [fieldPositions, setFieldPositions] = useState<Record<string, number | null>>({});
  const [battingOrder, setBattingOrder] = useState<number[]>([]);

  useEffect(() => {
    if (savedLineup) {
      setFieldPositions(savedLineup.fieldPositions || {});
      setBattingOrder(savedLineup.battingOrder || []);
    }
  }, [savedLineup]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team!.id, fieldPositions, battingOrder }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lineup'] }),
  });

  if (!walletAddress || !team) {
    return <div className="min-h-screen bg-black p-6 flex items-center justify-center text-center text-pink-500 font-mono text-xl uppercase tracking-widest">ACCESS DENIED</div>;
  }

  const getPlayer = (id: number | null) => players.find(p => p.id === id);

  const assignField = (pos: string, playerIdStr: string) => {
    const playerId = playerIdStr === 'none' ? null : parseInt(playerIdStr);
    const newPositions = { ...fieldPositions, [pos]: playerId };
    setFieldPositions(newPositions);

    if (playerId && !battingOrder.includes(playerId)) {
      const newOrder = [...battingOrder.filter(id => id !== fieldPositions[pos]), playerId];
      setBattingOrder(newOrder.slice(0, 9));
    }
  };

  const moveBatter = (idx: number, direction: 'up' | 'down') => {
    const newOrder = [...battingOrder];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setBattingOrder(newOrder);
  };

  const assignedIds = new Set(Object.values(fieldPositions).filter(Boolean));

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

          {FIELD_POSITIONS.map(pos => {
            const assignedId = fieldPositions[pos] ?? null;
            const assignedPlayer = getPlayer(assignedId);

            return (
              <div key={pos} data-testid={`field-position-${pos}`} className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-950/50">
                <div className="w-10 h-10 shrink-0 bg-cyan-950/40 flex items-center justify-center rounded border border-cyan-500/40 text-cyan-400 font-black" style={{fontFamily: "'Orbitron', sans-serif"}}>
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
                      {players.map(p => (
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
          <h2 className="text-sm font-mono text-cyan-500 border-b border-cyan-500/30 pb-2">BATTING ORDER (1-9)</h2>
          {battingOrder.length === 0 && (
            <p className="text-xs font-mono text-gray-600 text-center py-4">Assign field positions to populate batting order</p>
          )}
          {battingOrder.map((playerId, idx) => {
            const p = getPlayer(playerId);
            if (!p) return null;
            return (
              <div key={playerId} data-testid={`batting-order-${idx}`} className="flex items-center gap-3 p-3 rounded-lg border border-cyan-500/20 bg-cyan-950/10">
                <div className="w-8 h-8 shrink-0 bg-pink-950/40 flex items-center justify-center rounded text-pink-400 font-black text-lg" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '10px'}}>
                  #{idx + 1}
                </div>
                <span className="flex-1 text-sm font-mono text-cyan-100 truncate">{p.name}</span>
                <div className="flex gap-1">
                  <button data-testid={`button-move-up-${idx}`} onClick={() => moveBatter(idx, 'up')} disabled={idx === 0} className="w-7 h-7 rounded bg-gray-800 text-cyan-400 disabled:opacity-20 hover:bg-cyan-900/50 text-xs font-bold">▲</button>
                  <button data-testid={`button-move-down-${idx}`} onClick={() => moveBatter(idx, 'down')} disabled={idx === battingOrder.length - 1} className="w-7 h-7 rounded bg-gray-800 text-cyan-400 disabled:opacity-20 hover:bg-cyan-900/50 text-xs font-bold">▼</button>
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
          <h2 className="text-sm font-mono text-gray-500 border-b border-gray-800 pb-2">BENCH / BULLPEN</h2>
          <div className="grid grid-cols-2 gap-2">
            {players.filter(p => !assignedIds.has(p.id)).map(p => (
              <div key={p.id} data-testid={`bench-player-${p.id}`} className="p-3 border border-gray-800 rounded bg-black/40 flex flex-col justify-between">
                <span className="text-xs font-bold truncate text-gray-300 mb-1">{p.name}</span>
                <span className="text-[10px] font-mono text-pink-500/70">{p.positions.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

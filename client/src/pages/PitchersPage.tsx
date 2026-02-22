import { useGameStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

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

  const [rotationOrder, setRotationOrder] = useState<number[]>([]);
  const [maxPitches, setMaxPitches] = useState(100);
  const [maxInnings, setMaxInnings] = useState(7);
  const [maxBb, setMaxBb] = useState(4);
  const [maxEr, setMaxEr] = useState(4);

  useEffect(() => {
    if (saved) {
      setRotationOrder(saved.rotationOrder || []);
      setMaxPitches(saved.maxPitches ?? 100);
      setMaxInnings(saved.maxInnings ?? 7);
      setMaxBb(saved.maxBb ?? 4);
      setMaxEr(saved.maxEr ?? 4);
    } else if (pitchers.length > 0 && rotationOrder.length === 0) {
      setRotationOrder(pitchers.map(p => p.id));
    }
  }, [saved, pitchers.length]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/pitcher-rotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team!.id, rotationOrder, maxPitches, maxInnings, maxBb, maxEr }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pitcher-rotation'] }),
  });

  if (!walletAddress || !team) {
    return <div className="min-h-screen bg-black p-6 flex items-center justify-center text-center text-pink-500 font-mono text-xl uppercase tracking-widest">ACCESS DENIED</div>;
  }

  const movePitcher = (idx: number, direction: 'up' | 'down') => {
    const newOrder = [...rotationOrder];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setRotationOrder(newOrder);
  };

  const getPlayer = (id: number) => players.find(p => p.id === id);

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-pink-900/30 to-black border-b border-pink-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Pitcher Rotation
        </h1>
        <p className="text-xs font-mono text-pink-200/60 mt-1">{team.name}</p>
      </header>

      <main className="p-4 space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-mono text-cyan-500 border-b border-cyan-500/30 pb-2">ROTATION ORDER</h2>
          {rotationOrder.map((pid, idx) => {
            const p = getPlayer(pid);
            if (!p) return null;
            return (
              <div key={pid} data-testid={`pitcher-slot-${idx}`} className="flex items-center gap-3 p-3 rounded-lg border border-pink-500/20 bg-pink-950/10">
                <div className="w-8 h-8 shrink-0 bg-pink-950/40 flex items-center justify-center rounded text-pink-400 font-black" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '10px'}}>
                  SP{idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-mono text-cyan-100 truncate block">{p.name}</span>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[10px] font-mono text-gray-500">VEL <span className="text-pink-400">{p.vel}</span></span>
                    <span className="text-[10px] font-mono text-gray-500">CTL <span className="text-cyan-400">{p.ctl}</span></span>
                    <span className="text-[10px] font-mono text-gray-500">MOV <span className="text-pink-400">{p.mov}</span></span>
                    <span className="text-[10px] font-mono text-gray-500">STA <span className="text-cyan-400">{p.sta}</span></span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button data-testid={`button-pitcher-up-${idx}`} onClick={() => movePitcher(idx, 'up')} disabled={idx === 0} className="w-7 h-7 rounded bg-gray-800 text-pink-400 disabled:opacity-20 hover:bg-pink-900/50 text-xs font-bold">▲</button>
                  <button data-testid={`button-pitcher-down-${idx}`} onClick={() => movePitcher(idx, 'down')} disabled={idx === rotationOrder.length - 1} className="w-7 h-7 rounded bg-gray-800 text-pink-400 disabled:opacity-20 hover:bg-pink-900/50 text-xs font-bold">▼</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-5">
          <h2 className="text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2">SWITCH CONDITIONS</h2>
          <p className="text-[10px] font-mono text-gray-500">Pitcher will be pulled when ANY condition is met</p>

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

        <button
          data-testid="button-save-rotation"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full py-4 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] disabled:opacity-50"
        >
          {saveMutation.isPending ? "SAVING..." : "SAVE ROTATION"}
        </button>
      </main>
    </div>
  );
}

import { useGameStore } from "@/lib/store";
import { LineupPositions } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const POSITIONS: LineupPositions[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

export default function LineupPage() {
  const { team, players, lineup, assignToLineup, walletAddress } = useGameStore();

  if (!walletAddress) {
    return <div className="min-h-screen bg-black p-6 flex items-center justify-center text-center text-pink-500 font-mono text-xl uppercase tracking-widest">ACCESS DENIED</div>;
  }

  const getPlayer = (id: string | null) => players.find(p => p.id === id);

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-cyan-900/30 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Active Roster
        </h1>
        <p className="text-xs font-mono text-cyan-200/60 mt-1">{team?.name}</p>
      </header>

      <main className="p-4 space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2">STARTING 9</h2>
          
          {POSITIONS.map(pos => {
            const assignedPlayer = getPlayer(lineup[pos]);
            const eligiblePlayers = players; 

            return (
              <div key={pos} className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-950/50">
                <div className="w-10 h-10 shrink-0 bg-cyan-950/40 flex items-center justify-center rounded border border-cyan-500/40 text-cyan-400 font-black" style={{fontFamily: "'Orbitron', sans-serif"}}>
                  {pos}
                </div>
                
                <div className="flex-1 min-w-0">
                  <Select 
                    value={lineup[pos] || undefined} 
                    onValueChange={(val) => assignToLineup(pos, val === 'none' ? null : val)}
                  >
                    <SelectTrigger className="w-full bg-black border-gray-800 text-cyan-50 font-mono text-sm h-10 truncate">
                      <SelectValue placeholder="EMPTY SLOT" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-950 border-cyan-500/30 text-cyan-50 max-h-64">
                      <SelectItem value="none" className="text-gray-500 font-mono text-xs">-- EMPTY --</SelectItem>
                      {eligiblePlayers.map(p => (
                        <SelectItem key={p.id} value={p.id} className="font-mono text-xs">
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
        
        <div className="pt-4 space-y-4">
          <h2 className="text-sm font-mono text-gray-500 border-b border-gray-800 pb-2">BENCH / BULLPEN</h2>
          <div className="grid grid-cols-2 gap-2">
            {players.filter(p => !Object.values(lineup).includes(p.id)).map(p => (
              <div key={p.id} className="p-3 border border-gray-800 rounded bg-black/40 flex flex-col justify-between">
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

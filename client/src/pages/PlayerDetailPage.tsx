import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ArrowLeft, User } from "lucide-react";
import { Link } from "wouter";

interface PlayerData {
  id: number;
  name: string;
  teamId: number;
  positions: string[];
  pow: number;
  con: number;
  spd: number;
  eye: number;
  vel: number;
  ctl: number;
  mov: number;
  sta: number;
  def: number;
}

interface TeamData {
  id: number;
  name: string;
  division: string;
  primaryColor: string;
}

const statLabels: Record<string, string> = {
  pow: 'POWER',
  con: 'CONTACT',
  spd: 'SPEED',
  eye: 'EYE',
  vel: 'VELOCITY',
  ctl: 'CONTROL',
  mov: 'MOVEMENT',
  sta: 'STAMINA',
  def: 'DEFENSE',
};

const positionLabels: Record<string, string> = {
  P: 'Pitcher',
  C: 'Catcher',
  '1B': 'First Base',
  '2B': 'Second Base',
  '3B': 'Third Base',
  SS: 'Shortstop',
  LF: 'Left Field',
  CF: 'Center Field',
  RF: 'Right Field',
};

function statColor(val: number): string {
  if (val >= 80) return 'text-cyan-300';
  if (val >= 65) return 'text-green-400';
  if (val >= 50) return 'text-yellow-400';
  if (val >= 35) return 'text-orange-400';
  return 'text-red-400';
}

function statBarColor(val: number): string {
  if (val >= 80) return 'bg-cyan-400';
  if (val >= 65) return 'bg-green-500';
  if (val >= 50) return 'bg-yellow-500';
  if (val >= 35) return 'bg-orange-500';
  return 'bg-red-500';
}

function playerOverall(p: PlayerData): number {
  return Math.round((p.pow + p.con + p.spd + p.eye + p.vel + p.ctl + p.mov + p.sta + p.def) / 9);
}

export default function PlayerDetailPage() {
  const params = useParams<{ id: string }>();
  const playerId = parseInt(params.id || '0');

  const { data: player, isLoading } = useQuery<PlayerData>({
    queryKey: ['player', playerId],
    queryFn: async () => {
      const res = await fetch(`/api/player/${playerId}`);
      if (!res.ok) throw new Error('Player not found');
      return res.json();
    },
    enabled: playerId > 0,
  });

  const { data: allTeams = [] } = useQuery<TeamData[]>({
    queryKey: ['teams-all'],
    queryFn: async () => {
      const res = await fetch('/api/teams');
      return res.json();
    },
    enabled: !!player,
  });

  const team = allTeams.find(t => t.id === player?.teamId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-cyan-400 font-mono animate-pulse">LOADING PLAYER DATA...</span>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-black p-6 flex flex-col items-center justify-center text-center">
        <span className="text-pink-500 font-mono text-xl uppercase tracking-widest mb-4">PLAYER NOT FOUND</span>
        <button onClick={() => window.history.back()} className="text-cyan-400 font-mono text-sm underline">Go Back</button>
      </div>
    );
  }

  const overall = playerOverall(player);
  const statKeys = ['pow', 'con', 'spd', 'eye', 'vel', 'ctl', 'mov', 'sta', 'def'] as const;
  const battingAvg = Math.round((player.pow + player.con + player.spd + player.eye) / 4);
  const pitchingAvg = Math.round((player.vel + player.ctl + player.mov + player.sta) / 4);

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-4 bg-gradient-to-b from-cyan-900/30 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-md flex items-center gap-3">
        <button data-testid="button-back" onClick={() => window.history.back()} className="p-2 rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div>
          <h1 className="text-lg font-black uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
            Player Card
          </h1>
          <p className="text-[10px] font-mono text-cyan-200/60">#{player.id} — {team?.name || 'Unknown Team'}</p>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div data-testid="player-card" className="rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-br from-cyan-950/30 via-black to-pink-950/30 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.15)]">
          <div className="p-6 flex flex-col items-center">
            <div className="w-32 h-40 rounded-xl border-2 border-cyan-500/30 bg-gray-900/80 flex items-center justify-center mb-4 relative overflow-hidden">
              <User className="w-16 h-16 text-gray-700" />
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-cyan-900/30 to-transparent" />
              <span className="absolute bottom-1 text-[8px] font-mono text-gray-600">PHOTO SLOT</span>
            </div>

            <h2 data-testid="text-player-name" className="text-xl font-black uppercase text-cyan-300 tracking-wide" style={{fontFamily: "'Orbitron', sans-serif"}}>
              {player.name}
            </h2>

            <div className="flex items-center gap-3 mt-2">
              {player.positions.map(pos => (
                <span key={pos} className="px-2 py-0.5 bg-pink-500/20 border border-pink-500/40 rounded text-[10px] font-mono text-pink-300 uppercase">
                  {positionLabels[pos] || pos}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-6">
              <div className="text-center">
                <span className={`text-3xl font-black ${statColor(overall)}`} style={{fontFamily: "'Orbitron', sans-serif"}}>{overall}</span>
                <p className="text-[9px] font-mono text-gray-500">OVERALL</p>
              </div>
              <div className="h-10 w-px bg-gray-800" />
              <div className="text-center">
                <span className="text-lg font-bold text-cyan-400" style={{fontFamily: "'Orbitron', sans-serif"}}>{battingAvg}</span>
                <p className="text-[9px] font-mono text-gray-500">BAT AVG</p>
              </div>
              <div className="h-10 w-px bg-gray-800" />
              <div className="text-center">
                <span className="text-lg font-bold text-pink-400" style={{fontFamily: "'Orbitron', sans-serif"}}>{pitchingAvg}</span>
                <p className="text-[9px] font-mono text-gray-500">PITCH AVG</p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 space-y-2">
            <div className="flex items-center justify-between px-2 pb-1 border-b border-gray-800">
              <span className="text-[10px] font-mono text-gray-500">ATTRIBUTE</span>
              <span className="text-[10px] font-mono text-gray-500">VALUE</span>
            </div>

            {statKeys.map(key => {
              const val = player[key];
              return (
                <div key={key} className="flex items-center gap-2 px-2">
                  <span className="text-[10px] font-mono text-gray-400 w-16 uppercase">{statLabels[key]}</span>
                  <div className="flex-1 h-3 bg-gray-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${statBarColor(val)}`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                  <span className={`text-sm font-black w-8 text-right ${statColor(val)}`} style={{fontFamily: "'Orbitron', sans-serif"}}>{val}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-pink-500/30 bg-pink-950/10 p-4">
          <h3 className="text-xs font-mono text-pink-500 mb-3 uppercase">Career Averages</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-black/40 border border-gray-800">
              <span className="text-lg font-black text-cyan-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{overall}</span>
              <p className="text-[9px] font-mono text-gray-500">OVR</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-black/40 border border-gray-800">
              <span className="text-lg font-black text-cyan-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{battingAvg}</span>
              <p className="text-[9px] font-mono text-gray-500">BAT</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-black/40 border border-gray-800">
              <span className="text-lg font-black text-pink-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{pitchingAvg}</span>
              <p className="text-[9px] font-mono text-gray-500">PITCH</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-black/40 border border-gray-800">
              <span className="text-lg font-black text-gray-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{player.def}</span>
              <p className="text-[9px] font-mono text-gray-500">DEF</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-black/40 border border-gray-800">
              <span className="text-lg font-black text-gray-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{player.spd}</span>
              <p className="text-[9px] font-mono text-gray-500">SPD</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-black/40 border border-gray-800">
              <span className="text-lg font-black text-gray-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{player.sta}</span>
              <p className="text-[9px] font-mono text-gray-500">STA</p>
            </div>
          </div>
          <p className="text-[9px] font-mono text-gray-600 mt-3 text-center">Season 1 — No prior history</p>
        </div>
      </main>
    </div>
  );
}

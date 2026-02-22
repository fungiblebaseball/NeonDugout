import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface BatterStats {
  playerId: number;
  name: string;
  ab: number;
  hits: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  avg: string;
}

interface PitcherStats {
  playerId: number;
  name: string;
  ip: number;
  h: number;
  er: number;
  bb: number;
  so: number;
  pitchCount: number;
}

interface BoxScoreData {
  innings: number[];
  awayLine: number[];
  homeLine: number[];
  awayRHE: [number, number, number];
  homeRHE: [number, number, number];
}

interface MatchDetailData {
  id: number;
  matchId: number;
  boxScore: BoxScoreData;
  flavorTexts: string[];
  mvp: { name: string; reason: string };
  homeLineup: { playerIds: number[]; pitcherId: number };
  awayLineup: { playerIds: number[]; pitcherId: number };
  homeBatters: BatterStats[];
  awayBatters: BatterStats[];
  homePitcher: PitcherStats;
  awayPitcher: PitcherStats;
  homePitchers?: PitcherStats[];
  awayPitchers?: PitcherStats[];
}

interface MatchData {
  id: number;
  division: string;
  day: number;
  matchDate: string;
  homeTeamId: number;
  awayTeamId: number;
  played: boolean;
  homeScore: number | null;
  awayScore: number | null;
}

interface TeamData {
  id: number;
  name: string;
  division: string;
}

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const matchId = parseInt(params.id || '0');

  const { data: detail, isLoading: detailLoading } = useQuery<MatchDetailData>({
    queryKey: ['match-details', matchId],
    queryFn: async () => {
      const res = await fetch(`/api/match-details/${matchId}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: matchId > 0,
  });

  const { data: allMatches = [] } = useQuery<MatchData[]>({
    queryKey: ['matches-all'],
    queryFn: async () => {
      const res = await fetch('/api/matches');
      return res.json();
    },
  });

  const { data: allTeams = [] } = useQuery<TeamData[]>({
    queryKey: ['teams-all'],
    queryFn: async () => {
      const res = await fetch('/api/teams');
      return res.json();
    },
  });

  const match = allMatches.find(m => m.id === matchId);
  const teamMap = new Map(allTeams.map(t => [t.id, t]));
  const homeTeam = match ? teamMap.get(match.homeTeamId) : undefined;
  const awayTeam = match ? teamMap.get(match.awayTeamId) : undefined;

  if (detailLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-cyan-400 font-mono animate-pulse">LOADING MATCH DATA...</span>
      </div>
    );
  }

  if (!detail || !match) {
    return (
      <div className="min-h-screen bg-black p-6 flex flex-col items-center justify-center text-center">
        <span className="text-pink-500 font-mono text-xl uppercase tracking-widest mb-4">MATCH DETAILS NOT AVAILABLE</span>
        <Link href="/schedule" className="text-cyan-400 font-mono text-sm underline">Back to Schedule</Link>
      </div>
    );
  }

  const { boxScore } = detail;
  const winnerIsHome = (match.homeScore ?? 0) > (match.awayScore ?? 0);

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-4 bg-gradient-to-b from-cyan-900/30 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-md flex items-center gap-3">
        <Link href="/schedule">
          <button data-testid="button-back" className="p-2 rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-black uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
            Match Report
          </h1>
          <p className="text-[10px] font-mono text-cyan-200/60">Day {match.day} — {match.matchDate}</p>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="p-6 rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-950/20 to-cyan-950/20 text-center space-y-3">
          <div className="flex items-center justify-center gap-6">
            <div className={`text-right flex-1 ${!winnerIsHome ? 'opacity-60' : ''}`}>
              <p className="text-xs font-mono text-gray-500 uppercase">Home</p>
              <p data-testid="text-home-team" className="text-lg font-black text-cyan-400" style={{fontFamily: "'Orbitron', sans-serif"}}>{homeTeam?.name || 'Home'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span data-testid="text-home-score" className="text-4xl font-black text-cyan-300" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '24px'}}>{match.homeScore}</span>
              <span className="text-gray-600 text-lg">-</span>
              <span data-testid="text-away-score" className="text-4xl font-black text-pink-300" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '24px'}}>{match.awayScore}</span>
            </div>
            <div className={`text-left flex-1 ${winnerIsHome ? 'opacity-60' : ''}`}>
              <p className="text-xs font-mono text-gray-500 uppercase">Away</p>
              <p data-testid="text-away-team" className="text-lg font-black text-pink-400" style={{fontFamily: "'Orbitron', sans-serif"}}>{awayTeam?.name || 'Away'}</p>
            </div>
          </div>
          <span className="inline-block px-3 py-1 bg-pink-500/20 border border-pink-500/40 rounded text-[10px] font-mono text-pink-300 uppercase">FINAL</span>
        </div>

        <div className="overflow-x-auto">
          {(() => {
            const awayBB = detail.awayBatters?.reduce((sum, b) => sum + (b.bb || 0), 0) || 0;
            const homeBB = detail.homeBatters?.reduce((sum, b) => sum + (b.bb || 0), 0) || 0;
            const awaySO = detail.awayBatters?.reduce((sum, b) => sum + (b.so || 0), 0) || 0;
            const homeSO = detail.homeBatters?.reduce((sum, b) => sum + (b.so || 0), 0) || 0;
            return (
              <table data-testid="table-linescore" className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-2 text-gray-500 w-24">TEAM</th>
                    {boxScore.innings.map(i => (
                      <th key={i} className="p-2 text-gray-500 w-6 text-center">{i}</th>
                    ))}
                    <th className="p-2 text-cyan-500 text-center border-l border-gray-800">R</th>
                    <th className="p-2 text-pink-500 text-center">H</th>
                    <th className="p-2 text-gray-400 text-center">E</th>
                    <th className="p-2 text-yellow-500 text-center">BB</th>
                    <th className="p-2 text-cyan-500 text-center">K</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800/50">
                    <td className="p-2 text-pink-400 font-bold truncate max-w-[96px]">{awayTeam?.name?.split(' ').pop()}</td>
                    {boxScore.awayLine.map((r, i) => (
                      <td key={i} className={`p-2 text-center ${r > 0 ? 'text-pink-300 font-bold' : 'text-gray-600'}`}>{r}</td>
                    ))}
                    <td className="p-2 text-center text-cyan-300 font-bold border-l border-gray-800">{boxScore.awayRHE[0]}</td>
                    <td className="p-2 text-center text-pink-300">{boxScore.awayRHE[1]}</td>
                    <td className="p-2 text-center text-gray-400">{boxScore.awayRHE[2]}</td>
                    <td className="p-2 text-center text-yellow-400">{awayBB}</td>
                    <td className="p-2 text-center text-cyan-400">{awaySO}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-cyan-400 font-bold truncate max-w-[96px]">{homeTeam?.name?.split(' ').pop()}</td>
                    {boxScore.homeLine.map((r, i) => (
                      <td key={i} className={`p-2 text-center ${r > 0 ? 'text-cyan-300 font-bold' : 'text-gray-600'}`}>{r}</td>
                    ))}
                    <td className="p-2 text-center text-cyan-300 font-bold border-l border-gray-800">{boxScore.homeRHE[0]}</td>
                    <td className="p-2 text-center text-pink-300">{boxScore.homeRHE[1]}</td>
                    <td className="p-2 text-center text-gray-400">{boxScore.homeRHE[2]}</td>
                    <td className="p-2 text-center text-yellow-400">{homeBB}</td>
                    <td className="p-2 text-center text-cyan-400">{homeSO}</td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
        </div>

        {detail.flavorTexts.length > 0 && (
          <div className="space-y-2 p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10">
            <h3 className="text-sm font-mono text-cyan-500 mb-3">GAME REPORT</h3>
            {detail.flavorTexts.map((text, i) => (
              <p key={i} data-testid={`text-flavor-${i}`} className="text-xs font-mono text-gray-300 leading-relaxed border-l-2 border-pink-500/40 pl-3 py-1">
                {text}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <BatterStatsTable title={`${homeTeam?.name || 'Home'} Batting`} batters={detail.homeBatters} color="cyan" />
          <BatterStatsTable title={`${awayTeam?.name || 'Away'} Batting`} batters={detail.awayBatters} color="pink" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <PitcherStatsTable
            pitchers={detail.homePitchers || [detail.homePitcher]}
            team={homeTeam?.name || 'Home'}
            color="cyan"
          />
          <PitcherStatsTable
            pitchers={detail.awayPitchers || [detail.awayPitcher]}
            team={awayTeam?.name || 'Away'}
            color="pink"
          />
        </div>

        <div className="p-4 rounded-xl border border-pink-500/30 bg-pink-950/10 text-center">
          <p className="text-xs font-mono text-gray-500 mb-1">PLAYER OF THE GAME</p>
          <p data-testid="text-mvp" className="text-lg font-black text-pink-400" style={{fontFamily: "'Orbitron', sans-serif"}}>{detail.mvp.name}</p>
          <p className="text-xs font-mono text-gray-400 mt-1">{detail.mvp.reason}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/schedule">
            <button data-testid="button-back-schedule" className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-black uppercase tracking-wider rounded-xl transition-all text-sm" style={{fontFamily: "'Orbitron', sans-serif"}}>
              SCHEDULE
            </button>
          </Link>
          <Link href="/standings">
            <button data-testid="button-standings" className="w-full py-3 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 font-black uppercase tracking-wider rounded-xl transition-all text-sm" style={{fontFamily: "'Orbitron', sans-serif"}}>
              STANDINGS
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}

function BatterStatsTable({ title, batters, color }: { title: string; batters: BatterStats[]; color: 'cyan' | 'pink' }) {
  return (
    <div className="overflow-x-auto">
      <h3 className={`text-xs font-mono text-${color}-500 mb-2`}>{title}</h3>
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left p-1 text-gray-500">NAME</th>
            <th className="p-1 text-gray-500 text-center">AB</th>
            <th className="p-1 text-gray-500 text-center">H</th>
            <th className="p-1 text-gray-500 text-center">HR</th>
            <th className="p-1 text-gray-500 text-center">RBI</th>
            <th className="p-1 text-gray-500 text-center">BB</th>
            <th className="p-1 text-gray-500 text-center">SO</th>
            <th className="p-1 text-gray-500 text-center">AVG</th>
          </tr>
        </thead>
        <tbody>
          {batters.map(b => (
            <tr key={b.playerId} className="border-b border-gray-800/30">
              <td className={`p-1 text-${color}-300 truncate max-w-[80px]`}>
                <Link href={`/player/${b.playerId}`} className="hover:underline cursor-pointer">
                  {b.name}
                </Link>
              </td>
              <td className="p-1 text-center text-gray-400">{b.ab}</td>
              <td className="p-1 text-center text-gray-300">{b.hits}</td>
              <td className={`p-1 text-center ${b.hr > 0 ? 'text-pink-400 font-bold' : 'text-gray-600'}`}>{b.hr}</td>
              <td className={`p-1 text-center ${b.rbi > 0 ? 'text-cyan-400 font-bold' : 'text-gray-600'}`}>{b.rbi}</td>
              <td className="p-1 text-center text-gray-400">{b.bb}</td>
              <td className="p-1 text-center text-gray-400">{b.so}</td>
              <td className="p-1 text-center text-gray-300">{b.avg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PitcherStatsTable({ pitchers, team, color }: { pitchers: PitcherStats[]; team: string; color: 'cyan' | 'pink' }) {
  const borderColor = color === 'cyan' ? 'border-cyan-500/20' : 'border-pink-500/20';
  const bgColor = color === 'cyan' ? 'bg-cyan-950/10' : 'bg-pink-950/10';
  const textColor = color === 'cyan' ? 'text-cyan-400' : 'text-pink-400';

  return (
    <div className={`p-3 rounded-xl border ${borderColor} ${bgColor}`}>
      <p className="text-[10px] font-mono text-gray-500 mb-2">{team} Pitching</p>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-gray-500">
            <th className="text-left pb-1">Name</th>
            <th className="text-center pb-1">IP</th>
            <th className="text-center pb-1">H</th>
            <th className="text-center pb-1">ER</th>
            <th className="text-center pb-1">BB</th>
            <th className="text-center pb-1">K</th>
            <th className="text-center pb-1">PC</th>
          </tr>
        </thead>
        <tbody>
          {pitchers.map((p, i) => (
            <tr key={p.playerId || i} className="border-t border-gray-800/30" data-testid={`pitcher-row-${p.playerId || i}`}>
              <td className={`py-1 font-bold ${textColor} truncate max-w-[60px]`}>
                <Link href={`/player/${p.playerId}`} data-testid={`link-pitcher-${p.playerId}`}>
                  <span className="hover:underline cursor-pointer">{p.name}</span>
                </Link>
              </td>
              <td className="py-1 text-center text-gray-300">{p.ip}</td>
              <td className="py-1 text-center text-gray-300">{p.h}</td>
              <td className="py-1 text-center text-pink-400">{p.er}</td>
              <td className="py-1 text-center text-gray-300">{p.bb}</td>
              <td className="py-1 text-center text-cyan-400">{p.so}</td>
              <td className="py-1 text-center text-gray-400">{p.pitchCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PitcherStatsCard({ pitcher, team, color }: { pitcher: PitcherStats; team: string; color: 'cyan' | 'pink' }) {
  return (
    <div className={`p-3 rounded-xl border border-${color}-500/20 bg-${color}-950/10`}>
      <p className="text-[10px] font-mono text-gray-500 mb-1">{team}</p>
      <Link href={`/player/${pitcher.playerId}`}>
        <p className={`text-sm font-bold text-${color}-400 truncate hover:underline cursor-pointer`}>{pitcher.name}</p>
      </Link>
      <div className="grid grid-cols-3 gap-1 mt-2">
        <div className="text-center">
          <p className="text-[9px] text-gray-500">IP</p>
          <p className="text-xs font-bold text-gray-300">{pitcher.ip}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">SO</p>
          <p className="text-xs font-bold text-cyan-400">{pitcher.so}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">ER</p>
          <p className="text-xs font-bold text-pink-400">{pitcher.er}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">H</p>
          <p className="text-xs font-bold text-gray-300">{pitcher.h}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">BB</p>
          <p className="text-xs font-bold text-gray-300">{pitcher.bb}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">PC</p>
          <p className="text-xs font-bold text-gray-300">{pitcher.pitchCount}</p>
        </div>
      </div>
    </div>
  );
}

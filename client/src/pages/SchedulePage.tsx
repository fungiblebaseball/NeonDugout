import { useGameStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Trophy, Clock } from "lucide-react";

interface MatchData {
  id: number;
  seasonId: number;
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
  ownerWallet: string | null;
}

export default function SchedulePage() {
  const { team, walletAddress } = useGameStore();

  const { data: allMatches = [] } = useQuery<MatchData[]>({
    queryKey: ['matches', team?.division],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${team!.division}`);
      return res.json();
    },
    enabled: !!team,
  });

  const { data: divTeams = [] } = useQuery<TeamData[]>({
    queryKey: ['teams', team?.division],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${team!.division}`);
      return res.json();
    },
    enabled: !!team,
  });

  if (!walletAddress || !team) {
    return <div className="min-h-screen bg-black p-6 flex items-center justify-center text-center text-pink-500 font-mono text-xl uppercase tracking-widest">ACCESS DENIED</div>;
  }

  const teamMap = new Map(divTeams.map(t => [t.id, t]));
  const getTeamName = (id: number) => teamMap.get(id)?.name ?? `Team #${id}`;
  const isUserTeam = (id: number) => id === team.id;

  const matchesByDay = new Map<number, MatchData[]>();
  for (const m of allMatches) {
    const list = matchesByDay.get(m.day) || [];
    list.push(m);
    matchesByDay.set(m.day, list);
  }

  const sortedDays = Array.from(matchesByDay.keys()).sort((a, b) => a - b);

  const userMatches = allMatches.filter(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
  const nextMatch = userMatches.find(m => !m.played);
  const playedMatches = userMatches.filter(m => m.played);
  const wins = playedMatches.filter(m => {
    if (m.homeTeamId === team.id) return (m.homeScore ?? 0) > (m.awayScore ?? 0);
    return (m.awayScore ?? 0) > (m.homeScore ?? 0);
  }).length;
  const losses = playedMatches.filter(m => {
    if (m.homeTeamId === team.id) return (m.homeScore ?? 0) < (m.awayScore ?? 0);
    return (m.awayScore ?? 0) < (m.homeScore ?? 0);
  }).length;

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-cyan-900/30 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Schedule
        </h1>
        <p className="text-xs font-mono text-cyan-200/60 mt-1">
          {team.division === 'A' ? 'Neon Apex Division' : 'Chrome Street Division'} — Season 1
        </p>
      </header>

      <main className="p-4 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/10 text-center">
            <Trophy className="w-5 h-5 mx-auto text-cyan-400 mb-1" />
            <span data-testid="text-record" className="text-lg font-black text-cyan-100" style={{fontFamily: "'Orbitron', sans-serif"}}>{wins}-{losses}</span>
            <p className="text-[9px] font-mono text-gray-500">RECORD</p>
          </div>
          <div className="p-3 rounded-xl border border-pink-500/30 bg-pink-950/10 text-center">
            <Calendar className="w-5 h-5 mx-auto text-pink-400 mb-1" />
            <span data-testid="text-games-played" className="text-lg font-black text-pink-100" style={{fontFamily: "'Orbitron', sans-serif"}}>{playedMatches.length}</span>
            <p className="text-[9px] font-mono text-gray-500">PLAYED</p>
          </div>
          <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/10 text-center">
            <Clock className="w-5 h-5 mx-auto text-cyan-400 mb-1" />
            <span data-testid="text-games-remaining" className="text-lg font-black text-cyan-100" style={{fontFamily: "'Orbitron', sans-serif"}}>{userMatches.length - playedMatches.length}</span>
            <p className="text-[9px] font-mono text-gray-500">REMAINING</p>
          </div>
        </div>

        {nextMatch && (
          <div data-testid="next-match-card" className="p-4 rounded-xl border-2 border-cyan-400/50 bg-gradient-to-r from-cyan-950/30 to-pink-950/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-cyan-500 text-black text-[10px] font-black rounded uppercase">Next</span>
              <span className="text-[10px] font-mono text-gray-400">Day {nextMatch.day} — {nextMatch.matchDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className={`text-sm font-bold ${isUserTeam(nextMatch.awayTeamId) ? 'text-cyan-400' : 'text-gray-300'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>
                  {getTeamName(nextMatch.awayTeamId)}
                </p>
                <span className="text-[9px] font-mono text-gray-500">AWAY</span>
              </div>
              <span className="text-lg font-black text-pink-400 px-4" style={{fontFamily: "'Press Start 2P', cursive"}}>VS</span>
              <div className="text-center flex-1">
                <p className={`text-sm font-bold ${isUserTeam(nextMatch.homeTeamId) ? 'text-cyan-400' : 'text-gray-300'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>
                  {getTeamName(nextMatch.homeTeamId)}
                </p>
                <span className="text-[9px] font-mono text-gray-500">HOME</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2">FULL SCHEDULE</h2>

          {sortedDays.map(day => {
            const dayMatches = matchesByDay.get(day) || [];
            const dayDate = dayMatches[0]?.matchDate;
            const hasUserMatch = dayMatches.some(m => m.homeTeamId === team.id || m.awayTeamId === team.id);

            return (
              <div key={day} className={`rounded-lg border ${hasUserMatch ? 'border-cyan-500/30 bg-cyan-950/5' : 'border-gray-800 bg-black/20'}`}>
                <div className="px-3 py-2 border-b border-gray-800/50 flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-400">DAY {day}</span>
                  <span className="text-[10px] font-mono text-gray-600">{dayDate}</span>
                </div>

                <div className="divide-y divide-gray-800/30">
                  {dayMatches.map(m => {
                    const isUser = m.homeTeamId === team.id || m.awayTeamId === team.id;
                    return (
                      <div key={m.id} data-testid={`match-${m.id}`} className={`px-3 py-2 flex items-center gap-2 ${isUser ? 'bg-cyan-950/10' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-mono truncate ${isUserTeam(m.awayTeamId) ? 'text-cyan-400 font-bold' : 'text-gray-300'}`}>
                              {getTeamName(m.awayTeamId)}
                            </span>
                            {m.played ? (
                              <span className={`font-black px-1 ${m.awayScore! > m.homeScore! ? 'text-cyan-400' : 'text-gray-500'}`}>
                                {m.awayScore}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between text-xs mt-0.5">
                            <span className={`font-mono truncate ${isUserTeam(m.homeTeamId) ? 'text-cyan-400 font-bold' : 'text-gray-300'}`}>
                              {getTeamName(m.homeTeamId)}
                            </span>
                            {m.played ? (
                              <span className={`font-black px-1 ${m.homeScore! > m.awayScore! ? 'text-cyan-400' : 'text-gray-500'}`}>
                                {m.homeScore}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {!m.played && (
                          <span className="text-[9px] font-mono text-gray-600 shrink-0">00:00 CET</span>
                        )}
                        {m.played && (
                          <span className="text-[9px] font-mono text-pink-500 shrink-0">FINAL</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

import { useGameStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Trophy, Clock, FileText, Crosshair, ChevronLeft, ChevronRight, Archive } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";

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
  matchType: string;
}

interface TeamData {
  id: number;
  name: string;
  division: string;
  ownerWallet: string | null;
  seasonId: number;
  league: string;
  series: string;
}

interface ProjectedMatch {
  type: string;
  division: string;
  day: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
}

export default function SchedulePage() {
  const { team, walletAddress } = useGameStore();
  const [location, navigate] = useLocation();

  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const urlSeason = urlParams.get('season') ? parseInt(urlParams.get('season')!) : null;

  const { data: seasonData } = useQuery<{ seasonId: number }>({
    queryKey: ['current-season'],
    queryFn: async () => {
      const res = await fetch('/api/season');
      return res.json();
    },
  });
  const currentSeason = seasonData?.seasonId ?? 1;

  const [viewingSeason, setViewingSeason] = useState<number | null>(urlSeason);

  useEffect(() => {
    setViewingSeason(urlSeason);
  }, [urlSeason]);

  const displaySeason = viewingSeason ?? currentSeason;
  const isPastSeason = displaySeason < currentSeason;

  const changeSeason = (newSeason: number) => {
    setViewingSeason(newSeason);
    if (newSeason === currentSeason) {
      navigate('/schedule', { replace: true });
    } else {
      navigate(`/schedule?season=${newSeason}`, { replace: true });
    }
  };

  const { data: allMatchesRaw = [] } = useQuery<MatchData[]>({
    queryKey: ['matches-all'],
    queryFn: async () => {
      const res = await fetch('/api/matches');
      return res.json();
    },
    enabled: !!team,
  });

  const { data: allTeamsRaw = [] } = useQuery<TeamData[]>({
    queryKey: ['teams-all'],
    queryFn: async () => {
      const res = await fetch('/api/teams');
      return res.json();
    },
    enabled: !!team,
  });

  const { data: projectedPlayoffs = [] } = useQuery<ProjectedMatch[]>({
    queryKey: ['projected-playoffs'],
    queryFn: async () => {
      const res = await fetch('/api/projected-playoffs');
      return res.json();
    },
    enabled: !!team && !isPastSeason,
  });

  const getProjectionsForDay = (matches: MatchData[]): Map<number, ProjectedMatch> => {
    if (isPastSeason) return new Map();
    const result = new Map<number, ProjectedMatch>();
    const tbdMatches = matches.filter(m => (m.homeTeamId === 0 || m.awayTeamId === 0) && !m.played);
    const relevantProjections = projectedPlayoffs.filter(p => 
      tbdMatches.some(m => m.division === p.division && m.day === p.day)
    );
    
    const usedProjections = new Set<number>();
    for (const m of tbdMatches) {
      for (let i = 0; i < relevantProjections.length; i++) {
        if (usedProjections.has(i)) continue;
        const p = relevantProjections[i];
        if (p.division === m.division && p.day === m.day) {
          result.set(m.id, p);
          usedProjections.add(i);
          break;
        }
      }
    }
    return result;
  };

  const seasonMatches = allMatchesRaw.filter(m => m.seasonId === displaySeason);
  const allSeasonTeams = allTeamsRaw.filter(t => t.seasonId === displaySeason);
  const teamMap = new Map(allSeasonTeams.map(t => [t.id, t]));

  const userTeamInSeason = isPastSeason
    ? allSeasonTeams.find(t => t.ownerWallet === walletAddress)
    : team;

  const userLeague = userTeamInSeason?.league ?? team?.league ?? '';
  const userDivision = userTeamInSeason?.division ?? team?.division ?? '';
  const userTeamId = userTeamInSeason?.id ?? team?.id ?? 0;

  const divTeamIds = new Set(allSeasonTeams.filter(t => t.division === userDivision).map(t => t.id));

  const allMatches = seasonMatches.filter(m =>
    m.division === userDivision ||
    divTeamIds.has(m.homeTeamId) || divTeamIds.has(m.awayTeamId) ||
    (m.matchType === 'playoff' && m.division === `playoff_${userLeague}`) ||
    (m.matchType === 'promotion' && (m.division.includes(`_${userLeague}`) || m.division.includes(`to_${userLeague}`)))
  );

  if (!walletAddress || !team) {
    return <div className="min-h-screen bg-black p-6 flex items-center justify-center text-center text-pink-500 font-mono text-xl uppercase tracking-widest">ACCESS DENIED</div>;
  }

  const getTeamName = (id: number) => id === 0 ? 'TBD' : (teamMap.get(id)?.name ?? `Team #${id}`);
  const isUserTeam = (id: number) => id !== 0 && id === userTeamId;
  const isTBDMatch = (m: MatchData) => m.homeTeamId === 0 || m.awayTeamId === 0;

  const getMatchTypeLabel = (m: MatchData): { label: string; color: string } | null => {
    if (m.matchType === 'playoff') return { label: 'PLAYOFF', color: 'red' };
    if (m.matchType === 'promotion') return { label: 'PROMOTION', color: 'orange' };
    return null;
  };

  const matchesByDay = new Map<number, MatchData[]>();
  for (const m of allMatches) {
    const list = matchesByDay.get(m.day) || [];
    list.push(m);
    matchesByDay.set(m.day, list);
  }

  const sortedDays = Array.from(matchesByDay.keys()).sort((a, b) => a - b);

  const userMatches = allMatches.filter(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId);
  const nextMatch = isPastSeason ? undefined : userMatches.find(m => !m.played);
  const playedMatches = userMatches.filter(m => m.played);
  const wins = playedMatches.filter(m => {
    if (m.homeTeamId === userTeamId) return (m.homeScore ?? 0) > (m.awayScore ?? 0);
    return (m.awayScore ?? 0) > (m.homeScore ?? 0);
  }).length;
  const losses = playedMatches.filter(m => {
    if (m.homeTeamId === userTeamId) return (m.homeScore ?? 0) < (m.awayScore ?? 0);
    return (m.awayScore ?? 0) < (m.homeScore ?? 0);
  }).length;

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-cyan-900/30 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Schedule
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs font-mono text-cyan-200/60">
            {userDivision} — Season {displaySeason}
          </p>
          {currentSeason > 1 && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                data-testid="button-prev-season"
                onClick={() => changeSeason(Math.max(1, displaySeason - 1))}
                disabled={displaySeason <= 1}
                className="p-0.5 rounded border border-gray-700 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-gray-500 min-w-[16px] text-center">{displaySeason}</span>
              <button
                data-testid="button-next-season"
                onClick={() => changeSeason(Math.min(currentSeason, displaySeason + 1))}
                disabled={displaySeason >= currentSeason}
                className="p-0.5 rounded border border-gray-700 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="p-4 space-y-6">
        {isPastSeason && (
          <div data-testid="banner-archive" className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 flex items-center gap-3">
            <Archive className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold font-mono text-amber-300 uppercase" style={{fontFamily: "'Orbitron', sans-serif"}}>Season {displaySeason} Archive</p>
              <p className="text-[9px] font-mono text-gray-500">Historical results — play-by-play logs removed to save space</p>
            </div>
          </div>
        )}

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
            <span data-testid="text-games-remaining" className="text-lg font-black text-cyan-100" style={{fontFamily: "'Orbitron', sans-serif"}}>{isPastSeason ? 0 : userMatches.length - playedMatches.length}</span>
            <p className="text-[9px] font-mono text-gray-500">REMAINING</p>
          </div>
        </div>

        {nextMatch && !isPastSeason && (
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
          <h2 className="text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2">
            {isPastSeason ? `SEASON ${displaySeason} RESULTS` : 'FULL SCHEDULE'}
          </h2>

          {sortedDays.map(day => {
            const dayMatches = matchesByDay.get(day) || [];
            const dayDate = dayMatches[0]?.matchDate;
            const hasUserMatch = dayMatches.some(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId);
            const dayProjections = getProjectionsForDay(dayMatches);

            return (
              <div key={day} className={`rounded-lg border ${hasUserMatch ? 'border-cyan-500/30 bg-cyan-950/5' : 'border-gray-800 bg-black/20'}`}>
                <div className="px-3 py-2 border-b border-gray-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">DAY {day}</span>
                    {dayMatches.some(m => m.matchType === 'interleague') && (
                      <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[8px] font-mono rounded uppercase">Interleague</span>
                    )}
                    {dayMatches.some(m => m.matchType === 'playoff') && (
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-mono rounded uppercase">Playoff</span>
                    )}
                    {dayMatches.some(m => m.matchType === 'promotion') && (
                      <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[8px] font-mono rounded uppercase">Promotion</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-gray-600">{dayDate}</span>
                </div>

                <div className="divide-y divide-gray-800/30">
                  {dayMatches.map(m => {
                    const isUser = m.homeTeamId === userTeamId || m.awayTeamId === userTeamId;
                    const tbdMatch = isTBDMatch(m);
                    const typeLabel = getMatchTypeLabel(m);
                    const projection = dayProjections.get(m.id);
                    const hasProjection = !isPastSeason && tbdMatch && !m.played && !!projection;
                    const isClickable = m.played || (!tbdMatch && !m.played);
                    const matchContent = (
                      <div data-testid={`match-${m.id}`} className={`px-3 py-2 flex items-center gap-2 ${hasProjection ? 'opacity-70 border-l-2 border-dashed border-purple-500/50' : ''} ${isUser ? 'bg-cyan-950/10' : ''} ${isClickable ? 'hover:bg-gray-900/40 transition-colors cursor-pointer' : ''}`}>
                        {typeLabel && (
                          <span className={`px-1.5 py-0.5 text-[8px] font-black rounded uppercase shrink-0 ${
                            typeLabel.color === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}>
                            {typeLabel.label}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-mono truncate ${
                              hasProjection ? 'text-purple-300 italic' :
                              m.awayTeamId === 0 ? 'text-gray-500 italic' :
                              isUserTeam(m.awayTeamId) ? 'text-cyan-400 font-bold' : 'text-gray-300'
                            }`}>
                              {hasProjection ? projection.awayTeamName : getTeamName(m.awayTeamId)}
                            </span>
                            {m.played ? (
                              <span className={`font-black px-1 ${m.awayScore! > m.homeScore! ? 'text-cyan-400' : 'text-gray-500'}`}>
                                {m.awayScore}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between text-xs mt-0.5">
                            <span className={`font-mono truncate ${
                              hasProjection ? 'text-purple-300 italic' :
                              m.homeTeamId === 0 ? 'text-gray-500 italic' :
                              isUserTeam(m.homeTeamId) ? 'text-cyan-400 font-bold' : 'text-gray-300'
                            }`}>
                              {hasProjection ? projection.homeTeamName : getTeamName(m.homeTeamId)}
                            </span>
                            {m.played ? (
                              <span className={`font-black px-1 ${m.homeScore! > m.awayScore! ? 'text-cyan-400' : 'text-gray-500'}`}>
                                {m.homeScore}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {hasProjection && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Crosshair className="w-3 h-3 text-purple-400" />
                            <span className="text-[9px] font-mono text-purple-400 shrink-0 italic">PROJECTED</span>
                          </div>
                        )}
                        {!m.played && tbdMatch && !hasProjection && (
                          <span className="text-[9px] font-mono text-gray-600 shrink-0 italic">PENDING</span>
                        )}
                        {!m.played && !tbdMatch && (
                          <span className="text-[9px] font-mono text-gray-600 shrink-0">PREVIEW</span>
                        )}
                        {m.played && (
                          <div className="flex items-center gap-1 shrink-0">
                            <FileText className="w-3 h-3 text-cyan-500" />
                            <span className="text-[9px] font-mono text-cyan-500">VIEW</span>
                          </div>
                        )}
                      </div>
                    );
                    if (m.played) {
                      return <Link key={m.id} href={`/match/${m.id}`}>{matchContent}</Link>;
                    }
                    if (!tbdMatch) {
                      return <Link key={m.id} href={`/match/${m.id}`}>{matchContent}</Link>;
                    }
                    return <div key={m.id}>{matchContent}</div>;
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

import { useGameStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, Eye, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, FileText, Calendar } from "lucide-react";
import { Link } from "wouter";

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
  primaryColor: string;
  ownerWallet: string | null;
  seasonId: number;
  wins?: number;
  losses?: number;
  runsFor?: number;
  runsAgainst?: number;
}

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

interface StandingRow {
  team: TeamData;
  wins: number;
  losses: number;
  ties: number;
  runsFor: number;
  runsAgainst: number;
  pct: string;
}

function computeStandings(teams: TeamData[], matches: MatchData[]): StandingRow[] {
  const played = matches.filter(m => m.played);
  const rows: StandingRow[] = teams.map(t => {
    let w = 0, l = 0, tie = 0, rf = 0, ra = 0;
    for (const m of played) {
      if (m.homeTeamId === t.id) {
        const hs = m.homeScore ?? 0;
        const as_ = m.awayScore ?? 0;
        rf += hs; ra += as_;
        if (hs > as_) w++; else if (hs < as_) l++; else tie++;
      } else if (m.awayTeamId === t.id) {
        const hs = m.homeScore ?? 0;
        const as_ = m.awayScore ?? 0;
        rf += as_; ra += hs;
        if (as_ > hs) w++; else if (as_ < hs) l++; else tie++;
      }
    }
    const total = w + l + tie;
    return {
      team: t,
      wins: w,
      losses: l,
      ties: tie,
      runsFor: rf,
      runsAgainst: ra,
      pct: total > 0 ? (w / total).toFixed(3).replace(/^0/, '') : '.000',
    };
  });
  rows.sort((a, b) => {
    const pctDiff = parseFloat(b.pct) - parseFloat(a.pct);
    if (pctDiff !== 0) return pctDiff;
    return (b.runsFor - b.runsAgainst) - (a.runsFor - a.runsAgainst);
  });
  return rows;
}

function playerOverall(p: PlayerData): number {
  return Math.round((p.pow + p.con + p.spd + p.eye + p.vel + p.ctl + p.mov + p.sta + p.def) / 9);
}

function TeamRosterPreview({ teamId, allTeams, onClose }: { teamId: number; allTeams: TeamData[]; onClose: () => void }) {
  const selectedTeam = allTeams.find(t => t.id === teamId);

  const { data: players = [] } = useQuery<PlayerData[]>({
    queryKey: ['team-players', teamId],
    queryFn: async () => {
      const res = await fetch(`/api/team/${teamId}/players`);
      return res.json();
    },
  });

  const { data: lineup } = useQuery<{ fieldPositions: Record<string, number>; battingOrder: number[] }>({
    queryKey: ['team-lineup', teamId],
    queryFn: async () => {
      const res = await fetch(`/api/lineup/${teamId}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: rotation } = useQuery<{ sp: number | null; r1: number | null; closer: number | null; nextSp: number | null }>({
    queryKey: ['team-rotation', teamId],
    queryFn: async () => {
      const res = await fetch(`/api/pitcher-rotation/${teamId}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const playerMap = new Map(players.map(p => [p.id, p]));
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-black/60 p-4 space-y-3" data-testid={`team-preview-${teamId}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-black text-sm text-cyan-400 uppercase" style={{fontFamily: "'Orbitron', sans-serif"}}>
          {selectedTeam?.name || 'Team'}
        </h3>
        <button data-testid="button-close-team-preview" onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
      </div>

      {lineup?.fieldPositions && (
        <div>
          <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Field Lineup</p>
          <div className="grid grid-cols-3 gap-1">
            {positions.map(pos => {
              const pid = lineup.fieldPositions[pos];
              const player = pid ? playerMap.get(pid) : null;
              return (
                <div key={pos} className="flex items-center gap-1 text-[10px]">
                  <span className="text-pink-400 font-bold w-6">{pos}</span>
                  {player ? (
                    <Link href={`/player/${player.id}`}>
                      <span className="text-gray-300 hover:text-cyan-300 cursor-pointer truncate">{player.name}</span>
                    </Link>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rotation && (
        <div>
          <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Pitching Staff</p>
          <div className="grid grid-cols-2 gap-1">
            {[
              { role: 'SP', id: rotation.sp },
              { role: 'R1', id: rotation.r1 },
              { role: 'CL', id: rotation.closer },
              { role: '2P', id: rotation.nextSp },
            ].map(({ role, id }) => {
              const player = id ? playerMap.get(id) : null;
              return (
                <div key={role} className="flex items-center gap-1 text-[10px]">
                  <span className="text-cyan-400 font-bold w-6">{role}</span>
                  {player ? (
                    <Link href={`/player/${player.id}`}>
                      <span className="text-gray-300 hover:text-cyan-300 cursor-pointer truncate">{player.name}</span>
                    </Link>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!lineup && !rotation && (
        <p className="text-[10px] text-gray-500 font-mono">No lineup or rotation set for this team.</p>
      )}
    </div>
  );
}

export default function StandingsPage() {
  const { team, walletAddress } = useGameStore();
  const [selectedDiv, setSelectedDiv] = useState<string>(team?.division || 'B');
  const [previewMatchId, setPreviewMatchId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [viewingSeason, setViewingSeason] = useState<number | null>(null);
  const [showSchedule, setShowSchedule] = useState<boolean>(false);

  const { data: seasonData } = useQuery<{ seasonId: number }>({
    queryKey: ['current-season'],
    queryFn: async () => {
      const res = await fetch('/api/season');
      return res.json();
    },
  });
  const currentSeason = seasonData?.seasonId ?? 1;
  const displaySeason = viewingSeason ?? currentSeason;

  const isPastSeason = displaySeason < currentSeason;

  const { data: allTeams = [] } = useQuery<TeamData[]>({
    queryKey: ['teams-all'],
    queryFn: async () => {
      const res = await fetch('/api/teams');
      return res.json();
    },
  });

  const { data: teamSnapshotsRaw = [] } = useQuery<TeamData[]>({
    queryKey: ['team-snapshots', displaySeason],
    queryFn: async () => {
      const res = await fetch(`/api/team-snapshots?season=${displaySeason}`);
      return res.json();
    },
    enabled: isPastSeason,
  });

  const { data: allMatches = [] } = useQuery<MatchData[]>({
    queryKey: ['matches-all'],
    queryFn: async () => {
      const res = await fetch('/api/matches');
      return res.json();
    },
  });

  if (!walletAddress || !team) {
    return <div className="min-h-screen bg-black p-6 flex items-center justify-center text-center text-pink-500 font-mono text-xl uppercase tracking-widest">ACCESS DENIED</div>;
  }

  const seasonMatches = allMatches.filter(m => m.seasonId === displaySeason);

  const snapshotTeams: TeamData[] = isPastSeason
    ? teamSnapshotsRaw.map((s: any) => ({ id: s.teamId, name: s.name, division: s.division, primaryColor: s.primaryColor, ownerWallet: s.ownerWallet, seasonId: s.seasonId, wins: s.wins ?? 0, losses: s.losses ?? 0, runsFor: s.runsFor ?? 0, runsAgainst: s.runsAgainst ?? 0 }))
    : allTeams.filter(t => t.seasonId === displaySeason);
  const seasonTeams = snapshotTeams;

  const divisions = Array.from(new Set(seasonTeams.map(t => t.division))).sort();
  const validDiv = divisions.includes(selectedDiv) ? selectedDiv : divisions[0] || selectedDiv;
  const divTeams = seasonTeams.filter(t => t.division === validDiv);
  const divMatches = seasonMatches.filter(m => m.division === validDiv);

  const standings = isPastSeason
    ? divTeams.map(t => {
        const w = t.wins ?? 0;
        const l = t.losses ?? 0;
        const total = w + l;
        return {
          team: t,
          wins: w,
          losses: l,
          ties: 0,
          runsFor: t.runsFor ?? 0,
          runsAgainst: t.runsAgainst ?? 0,
          pct: total > 0 ? (w / total).toFixed(3).replace(/^0/, '') : '.000',
        } as StandingRow;
      }).sort((a, b) => {
        const pctDiff = parseFloat(b.pct) - parseFloat(a.pct);
        if (pctDiff !== 0) return pctDiff;
        return (b.runsFor - b.runsAgainst) - (a.runsFor - a.runsAgainst);
      })
    : computeStandings(divTeams, divMatches);

  const isUserDiv = !isPastSeason && validDiv === team.division;
  const divName = validDiv;

  const playedDivMatches = divMatches.filter(m => m.played).sort((a, b) => b.day - a.day);
  const teamMap = new Map(seasonTeams.map(t => [t.id, t]));

  const userMatches = divMatches.filter(m =>
    (m.homeTeamId === team.id || m.awayTeamId === team.id) && !m.played
  ).sort((a, b) => a.day - b.day);
  const nextMatch = userMatches[0];

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-cyan-900/30 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Standings
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs font-mono text-cyan-200/60">Season {displaySeason} — League Overview</p>
          {currentSeason > 1 && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                data-testid="button-prev-season"
                onClick={() => setViewingSeason(Math.max(1, displaySeason - 1))}
                disabled={displaySeason <= 1}
                className="p-0.5 rounded border border-gray-700 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-gray-500 min-w-[16px] text-center">{displaySeason}</span>
              <button
                data-testid="button-next-season"
                onClick={() => setViewingSeason(Math.min(currentSeason, displaySeason + 1))}
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
        <div className="flex gap-2">
          {divisions.map(div => (
            <button
              key={div}
              data-testid={`button-div-${div}`}
              onClick={() => setSelectedDiv(div)}
              className={`flex-1 py-3 rounded-xl border font-black uppercase text-sm tracking-wider transition-all ${
                validDiv === div
                  ? (!isPastSeason && div === team.division)
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                    : 'border-pink-400 bg-pink-500/20 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.3)]'
                  : 'border-gray-700 bg-black/40 text-gray-500 hover:border-gray-500'
              }`}
              style={{fontFamily: "'Orbitron', sans-serif"}}
            >
              {div}
              {!isPastSeason && div === team.division && <span className="ml-1 text-[9px]">★</span>}
            </button>
          ))}
        </div>

        {isPastSeason && seasonTeams.length === 0 && (
          <div className="p-6 rounded-xl border border-gray-700 bg-gray-950/30 text-center">
            <p className="text-sm font-mono text-gray-500">No snapshot data available for Season {displaySeason}</p>
          </div>
        )}

        <div className={`rounded-xl border ${isUserDiv ? 'border-cyan-500/40' : 'border-pink-500/30'} overflow-hidden`}>
          <div className={`px-4 py-2 ${isUserDiv ? 'bg-cyan-950/30' : 'bg-pink-950/30'} flex items-center gap-2`}>
            <Trophy className={`w-4 h-4 ${isUserDiv ? 'text-cyan-400' : 'text-pink-400'}`} />
            <span className={`text-xs font-mono ${isUserDiv ? 'text-cyan-300' : 'text-pink-300'} uppercase`}>{divName}</span>
            {isUserDiv && <span className="ml-auto px-2 py-0.5 bg-cyan-500 text-black text-[9px] font-black rounded">YOUR DIV</span>}
          </div>

          <table data-testid="table-standings" className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-2 text-gray-500 w-8">#</th>
                <th className="text-left p-2 text-gray-500">TEAM</th>
                <th className="p-2 text-gray-500 text-center">W</th>
                <th className="p-2 text-gray-500 text-center">L</th>
                <th className="p-2 text-gray-500 text-center">PCT</th>
                <th className="p-2 text-gray-500 text-center">RF</th>
                <th className="p-2 text-gray-500 text-center">RA</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, idx) => {
                const isUser = row.team.id === team.id;
                return (
                  <tr
                    key={row.team.id}
                    data-testid={`standing-row-${row.team.id}`}
                    className={`border-b border-gray-800/30 ${isUser ? 'bg-cyan-950/20 border-l-2 border-l-cyan-400' : ''}`}
                  >
                    <td className={`p-2 ${isUser ? 'text-cyan-400 font-bold' : 'text-gray-500'}`}>{idx + 1}</td>
                    <td className={`p-2 font-bold truncate max-w-[100px] ${isUser ? 'text-cyan-300' : 'text-gray-200'}`}>
                      <button
                        data-testid={`button-team-${row.team.id}`}
                        onClick={() => setSelectedTeamId(selectedTeamId === row.team.id ? null : row.team.id)}
                        className="text-left hover:underline cursor-pointer"
                      >
                        {row.team.name}
                        {isUser && <span className="ml-1 text-cyan-500 text-[9px]">★</span>}
                      </button>
                    </td>
                    <td className={`p-2 text-center ${isUser ? 'text-cyan-300' : 'text-gray-300'}`}>{row.wins}</td>
                    <td className={`p-2 text-center ${isUser ? 'text-pink-300' : 'text-gray-300'}`}>{row.losses}</td>
                    <td className={`p-2 text-center font-bold ${isUser ? 'text-cyan-200' : 'text-gray-200'}`}>{row.pct}</td>
                    <td className="p-2 text-center text-gray-400">{row.runsFor}</td>
                    <td className="p-2 text-center text-gray-400">{row.runsAgainst}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <button
            data-testid="button-toggle-schedule"
            onClick={() => setShowSchedule(!showSchedule)}
            className={`w-full py-3 px-4 rounded-xl border ${isUserDiv ? 'border-cyan-400/40' : 'border-pink-400/40'} bg-gradient-to-r ${isUserDiv ? 'from-cyan-950/30 to-black' : 'from-pink-950/30 to-black'} hover:from-gray-900/30 hover:to-gray-900/30 transition-all flex items-center justify-between`}
          >
            <div className="flex items-center gap-2">
              <Calendar className={`w-4 h-4 ${isUserDiv ? 'text-cyan-400' : 'text-pink-400'}`} />
              <span className={`text-sm font-black ${isUserDiv ? 'text-cyan-300' : 'text-pink-300'} uppercase`} style={{fontFamily: "'Orbitron', sans-serif"}}>Schedule</span>
              <span className="text-[10px] font-mono text-gray-500">({divMatches.length} games)</span>
            </div>
            {showSchedule ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showSchedule && (
            <div className={`rounded-xl border ${isUserDiv ? 'border-cyan-500/20' : 'border-pink-500/20'} overflow-hidden divide-y divide-gray-800/30`}>
              {divMatches.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs font-mono text-gray-500">No matches scheduled yet</p>
                </div>
              ) : (
                [...divMatches].sort((a, b) => a.day - b.day).map(m => {
                  const homeName = m.homeTeamId > 0 ? (teamMap.get(m.homeTeamId)?.name ?? `#${m.homeTeamId}`) : 'TBD';
                  const awayName = m.awayTeamId > 0 ? (teamMap.get(m.awayTeamId)?.name ?? `#${m.awayTeamId}`) : 'TBD';
                  const isTbd = m.homeTeamId === 0 || m.awayTeamId === 0;
                  const isPlayoff = m.day >= 13;

                  if (m.played) {
                    return (
                      <Link key={m.id} href={`/match/${m.id}`}>
                        <div data-testid={`schedule-match-${m.id}`} className="px-3 py-2 flex items-center gap-2 hover:bg-gray-900/40 transition-colors cursor-pointer">
                          <span className="text-[9px] font-mono text-gray-600 w-10 shrink-0">Day {m.day}</span>
                          {isPlayoff && <span className="text-[8px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-1 rounded">PLAYOFF</span>}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono truncate text-gray-300">{awayName}</span>
                              <span className={`font-black px-1 ${(m.awayScore ?? 0) > (m.homeScore ?? 0) ? 'text-cyan-400' : 'text-gray-500'}`}>{m.awayScore}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs mt-0.5">
                              <span className="font-mono truncate text-gray-300">{homeName}</span>
                              <span className={`font-black px-1 ${(m.homeScore ?? 0) > (m.awayScore ?? 0) ? 'text-cyan-400' : 'text-gray-500'}`}>{m.homeScore}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <FileText className="w-3 h-3 text-cyan-500" />
                            <span className="text-[9px] font-mono text-cyan-500">VIEW</span>
                          </div>
                        </div>
                      </Link>
                    );
                  }

                  if (isTbd) {
                    return (
                      <div key={m.id} data-testid={`schedule-match-${m.id}`} className="px-3 py-2 flex items-center gap-2 opacity-60">
                        <span className="text-[9px] font-mono text-gray-600 w-10 shrink-0">Day {m.day}</span>
                        {isPlayoff && <span className="text-[8px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-1 rounded">{m.day === 14 ? 'PROMOTION' : 'PLAYOFF'}</span>}
                        <div className="flex-1 min-w-0 text-xs font-mono text-gray-500 text-center">
                          TBD vs TBD
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      data-testid={`schedule-match-${m.id}`}
                      className="px-3 py-2 flex items-center gap-2"
                    >
                      <span className="text-[9px] font-mono text-gray-600 w-10 shrink-0">Day {m.day}</span>
                      {isPlayoff && <span className="text-[8px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-1 rounded">PLAYOFF</span>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono truncate text-gray-400">{awayName}</span>
                          <span className="text-[9px] font-mono text-gray-600">—</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-0.5">
                          <span className="font-mono truncate text-gray-400">{homeName}</span>
                          <span className="text-[9px] font-mono text-gray-600">—</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-gray-600 shrink-0">TBD</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {selectedTeamId && (
          <TeamRosterPreview teamId={selectedTeamId} allTeams={allTeams} onClose={() => setSelectedTeamId(null)} />
        )}

        {isUserDiv && nextMatch && displaySeason === currentSeason && (
          <div className="space-y-3">
            <button
              data-testid="button-match-preview"
              onClick={() => setPreviewMatchId(previewMatchId === nextMatch.id ? null : nextMatch.id)}
              className="w-full py-3 px-4 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-950/30 to-pink-950/30 hover:from-cyan-900/30 hover:to-pink-900/30 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-black text-cyan-300 uppercase" style={{fontFamily: "'Orbitron', sans-serif"}}>Match Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-400">Day {nextMatch.day}</span>
                {previewMatchId === nextMatch.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {previewMatchId === nextMatch.id && (
              <MatchPreview match={nextMatch} userTeamId={team.id} allTeams={allTeams} />
            )}
          </div>
        )}

        {isPastSeason && playedDivMatches.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2">MATCH RESULTS</h3>
            <div className="rounded-xl border border-gray-800 overflow-hidden divide-y divide-gray-800/30">
              {playedDivMatches.map(m => (
                <Link key={m.id} href={`/match/${m.id}`}>
                  <div data-testid={`past-match-${m.id}`} className="px-3 py-2 flex items-center gap-2 hover:bg-gray-900/40 transition-colors cursor-pointer">
                    <span className="text-[9px] font-mono text-gray-600 w-10 shrink-0">Day {m.day}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono truncate text-gray-300">{teamMap.get(m.awayTeamId)?.name ?? `#${m.awayTeamId}`}</span>
                        <span className={`font-black px-1 ${(m.awayScore ?? 0) > (m.homeScore ?? 0) ? 'text-cyan-400' : 'text-gray-500'}`}>{m.awayScore}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-0.5">
                        <span className="font-mono truncate text-gray-300">{teamMap.get(m.homeTeamId)?.name ?? `#${m.homeTeamId}`}</span>
                        <span className={`font-black px-1 ${(m.homeScore ?? 0) > (m.awayScore ?? 0) ? 'text-cyan-400' : 'text-gray-500'}`}>{m.homeScore}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <FileText className="w-3 h-3 text-cyan-500" />
                      <span className="text-[9px] font-mono text-cyan-500">VIEW</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface LineupData {
  fieldPositions: Record<string, number | null>;
  battingOrder: number[];
}

interface RotationData {
  roles: { sp: number | null; r1: number | null; closer: number | null; nextSp: number | null };
}

function MatchPreview({ match, userTeamId, allTeams }: { match: MatchData; userTeamId: number; allTeams: TeamData[] }) {
  const opponentId = match.homeTeamId === userTeamId ? match.awayTeamId : match.homeTeamId;
  const isHome = match.homeTeamId === userTeamId;
  const teamMap = new Map(allTeams.map(t => [t.id, t]));

  const { data: userPlayers = [] } = useQuery<PlayerData[]>({
    queryKey: ['team-players', userTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/team/${userTeamId}/players`);
      return res.json();
    },
  });

  const { data: oppPlayers = [] } = useQuery<PlayerData[]>({
    queryKey: ['team-players', opponentId],
    queryFn: async () => {
      const res = await fetch(`/api/team/${opponentId}/players`);
      return res.json();
    },
  });

  const { data: userLineup } = useQuery<LineupData>({
    queryKey: ['lineup', userTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/lineup/${userTeamId}`);
      return res.json();
    },
  });

  const { data: oppLineup } = useQuery<LineupData>({
    queryKey: ['lineup', opponentId],
    queryFn: async () => {
      const res = await fetch(`/api/lineup/${opponentId}`);
      return res.json();
    },
  });

  const { data: userRotation } = useQuery<RotationData>({
    queryKey: ['pitcher-rotation', userTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/pitcher-rotation/${userTeamId}`);
      return res.json();
    },
  });

  const { data: oppRotation } = useQuery<RotationData>({
    queryKey: ['pitcher-rotation', opponentId],
    queryFn: async () => {
      const res = await fetch(`/api/pitcher-rotation/${opponentId}`);
      return res.json();
    },
  });

  const userAvg = userPlayers.length > 0
    ? Math.round(userPlayers.reduce((s, p) => s + playerOverall(p), 0) / userPlayers.length)
    : 0;
  const oppAvg = oppPlayers.length > 0
    ? Math.round(oppPlayers.reduce((s, p) => s + playerOverall(p), 0) / oppPlayers.length)
    : 0;

  const userTeam = teamMap.get(userTeamId);
  const oppTeam = teamMap.get(opponentId);

  const statKeys = ['pow', 'con', 'spd', 'eye', 'vel', 'ctl', 'mov', 'sta', 'def'] as const;

  const userStatAvgs = statKeys.map(key => ({
    key,
    avg: userPlayers.length > 0
      ? Math.round(userPlayers.reduce((s, p) => s + p[key], 0) / userPlayers.length)
      : 0,
  }));
  const oppStatAvgs = statKeys.map(key => ({
    key,
    avg: oppPlayers.length > 0
      ? Math.round(oppPlayers.reduce((s, p) => s + p[key], 0) / oppPlayers.length)
      : 0,
  }));

  const buildLineupDisplay = (lineup: LineupData | undefined, rotation: RotationData | undefined, allPlayers: PlayerData[]) => {
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));
    const posMap: Record<string, number | null> = lineup?.fieldPositions || {};
    const battingOrder = lineup?.battingOrder || [];

    if (battingOrder.length === 0) {
      const nonPitchers = allPlayers.filter(p => !p.positions.includes('P'))
        .sort((a, b) => playerOverall(b) - playerOverall(a))
        .slice(0, 9);
      return { lineup: nonPitchers.map(p => ({ player: p, pos: p.positions[0] || '?' })), hasSaved: false };
    }

    const spId = rotation?.roles?.sp ?? null;
    const result = battingOrder.map(id => {
      const player = playerMap.get(id);
      if (!player) return null;
      let pos = '?';
      if (id === spId) pos = 'SP';
      else if (posMap['DH'] === id) pos = 'DH';
      else {
        for (const [p, pid] of Object.entries(posMap)) {
          if (pid === id && p !== 'P' && p !== 'DH') { pos = p; break; }
        }
      }
      return { player, pos };
    }).filter(Boolean) as { player: PlayerData; pos: string }[];

    return { lineup: result, hasSaved: true };
  };

  const buildPitcherRoster = (rotation: RotationData | undefined, allPlayers: PlayerData[]) => {
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));
    const roles = rotation?.roles || { sp: null, r1: null, closer: null, nextSp: null };
    const roster: { player: PlayerData; role: string }[] = [];

    if (roles.sp) { const p = playerMap.get(roles.sp); if (p) roster.push({ player: p, role: 'SP' }); }
    if (roles.r1) { const p = playerMap.get(roles.r1); if (p) roster.push({ player: p, role: 'R1' }); }
    if (roles.closer) { const p = playerMap.get(roles.closer); if (p) roster.push({ player: p, role: 'CL' }); }
    if (roles.nextSp) { const p = playerMap.get(roles.nextSp); if (p) roster.push({ player: p, role: '2P' }); }

    if (roster.length === 0) {
      const pitchers = allPlayers.filter(p => p.positions.includes('P')).slice(0, 4);
      const roleLabels = ['SP', 'R1', 'CL', '2P'];
      pitchers.forEach((p, i) => roster.push({ player: p, role: roleLabels[i] || 'BP' }));
    }

    return roster;
  };

  const userDisplay = buildLineupDisplay(userLineup, userRotation, userPlayers);
  const oppDisplay = buildLineupDisplay(oppLineup, oppRotation, oppPlayers);
  const userPitchers = buildPitcherRoster(userRotation, userPlayers);
  const oppPitchers = buildPitcherRoster(oppRotation, oppPlayers);

  return (
    <div data-testid="match-preview" className="rounded-xl border border-cyan-500/30 bg-cyan-950/5 overflow-hidden">
      <div className="p-4 border-b border-gray-800 text-center">
        <span className="text-[10px] font-mono text-gray-500">DAY {match.day} — {match.matchDate}</span>
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="text-right flex-1">
            <p className="text-sm font-black text-cyan-400" style={{fontFamily: "'Orbitron', sans-serif"}}>{isHome ? userTeam?.name : oppTeam?.name}</p>
            <span className="text-[9px] font-mono text-gray-500">HOME</span>
          </div>
          <span className="text-lg font-black text-pink-400 px-3" style={{fontFamily: "'Press Start 2P', cursive"}}>VS</span>
          <div className="text-left flex-1">
            <p className="text-sm font-black text-pink-400" style={{fontFamily: "'Orbitron', sans-serif"}}>{isHome ? oppTeam?.name : userTeam?.name}</p>
            <span className="text-[9px] font-mono text-gray-500">AWAY</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-gray-800">
        <div className="p-3">
          <p className="text-[10px] font-mono text-cyan-500 mb-1 text-center uppercase">{userTeam?.name} ★</p>
          {!userDisplay.hasSaved && <p className="text-[8px] font-mono text-gray-600 text-center mb-1">Auto lineup (no saved)</p>}
          <div className="space-y-0.5">
            {userDisplay.lineup.map((entry, i) => (
              <Link key={entry.player.id} href={`/player/${entry.player.id}`}>
                <div className="flex items-center gap-1.5 py-0.5 px-1 hover:bg-cyan-950/20 rounded cursor-pointer transition-colors">
                  <span className="text-[8px] font-mono text-gray-600 w-3">{i + 1}</span>
                  <span className="text-[9px] font-mono text-cyan-500 w-6 font-bold">{entry.pos}</span>
                  <span className="text-[10px] text-cyan-200 truncate flex-1">{entry.player.name}</span>
                  <span className="text-[10px] font-bold text-cyan-400">{playerOverall(entry.player)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-mono text-pink-500 mb-1 text-center uppercase">{oppTeam?.name}</p>
          {!oppDisplay.hasSaved && <p className="text-[8px] font-mono text-gray-600 text-center mb-1">Auto lineup (no saved)</p>}
          <div className="space-y-0.5">
            {oppDisplay.lineup.map((entry, i) => (
              <Link key={entry.player.id} href={`/player/${entry.player.id}`}>
                <div className="flex items-center gap-1.5 py-0.5 px-1 hover:bg-pink-950/20 rounded cursor-pointer transition-colors">
                  <span className="text-[8px] font-mono text-gray-600 w-3">{i + 1}</span>
                  <span className="text-[9px] font-mono text-pink-500 w-6 font-bold">{entry.pos}</span>
                  <span className="text-[10px] text-pink-200 truncate flex-1">{entry.player.name}</span>
                  <span className="text-[10px] font-bold text-pink-400">{playerOverall(entry.player)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-gray-800 border-t border-gray-800">
        <div className="p-3">
          <p className="text-[9px] font-mono text-cyan-400/70 mb-1 text-center uppercase">Pitching Staff</p>
          {userPitchers.map(entry => (
            <Link key={entry.player.id} href={`/player/${entry.player.id}`}>
              <div className="flex items-center gap-1.5 py-0.5 px-1 hover:bg-cyan-950/20 rounded cursor-pointer transition-colors">
                <span className="text-[9px] font-mono text-pink-400 w-5 font-bold">{entry.role}</span>
                <span className="text-[10px] text-cyan-200 truncate flex-1">{entry.player.name}</span>
                <span className="text-[9px] font-mono text-gray-500">V{entry.player.vel} C{entry.player.ctl}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="p-3">
          <p className="text-[9px] font-mono text-pink-400/70 mb-1 text-center uppercase">Pitching Staff</p>
          {oppPitchers.map(entry => (
            <Link key={entry.player.id} href={`/player/${entry.player.id}`}>
              <div className="flex items-center gap-1.5 py-0.5 px-1 hover:bg-pink-950/20 rounded cursor-pointer transition-colors">
                <span className="text-[9px] font-mono text-cyan-400 w-5 font-bold">{entry.role}</span>
                <span className="text-[10px] text-pink-200 truncate flex-1">{entry.player.name}</span>
                <span className="text-[9px] font-mono text-gray-500">V{entry.player.vel} C{entry.player.ctl}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <span className={`text-2xl font-black ${userAvg >= oppAvg ? 'text-cyan-300' : 'text-gray-400'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>{userAvg}</span>
            <p className="text-[9px] font-mono text-gray-500">YOUR OVR</p>
          </div>
          <div className="px-3">
            <span className="text-[10px] font-mono text-gray-600">TEAM AVG</span>
          </div>
          <div className="text-center flex-1">
            <span className={`text-2xl font-black ${oppAvg >= userAvg ? 'text-pink-300' : 'text-gray-400'}`} style={{fontFamily: "'Orbitron', sans-serif"}}>{oppAvg}</span>
            <p className="text-[9px] font-mono text-gray-500">OPP OVR</p>
          </div>
        </div>

        <div className="space-y-1">
          {statKeys.map((key, i) => {
            const uVal = userStatAvgs[i].avg;
            const oVal = oppStatAvgs[i].avg;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className={`text-[9px] font-mono w-6 text-right ${uVal > oVal ? 'text-cyan-400' : 'text-gray-500'}`}>{uVal}</span>
                <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden flex">
                  <div className="h-full bg-cyan-500/60 rounded-l-full" style={{ width: `${(uVal / (uVal + oVal || 1)) * 100}%` }} />
                  <div className="h-full bg-pink-500/60 rounded-r-full" style={{ width: `${(oVal / (uVal + oVal || 1)) * 100}%` }} />
                </div>
                <span className={`text-[9px] font-mono w-6 ${oVal > uVal ? 'text-pink-400' : 'text-gray-500'}`}>{oVal}</span>
                <span className="text-[8px] font-mono text-gray-600 w-6 uppercase">{key}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

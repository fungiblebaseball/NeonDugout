import { useGameStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, Eye, ChevronDown, ChevronUp } from "lucide-react";
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

export default function StandingsPage() {
  const { team, walletAddress } = useGameStore();
  const [selectedDiv, setSelectedDiv] = useState<string>(team?.division || 'B');
  const [previewMatchId, setPreviewMatchId] = useState<number | null>(null);

  const { data: allTeams = [] } = useQuery<TeamData[]>({
    queryKey: ['teams-all'],
    queryFn: async () => {
      const res = await fetch('/api/teams');
      return res.json();
    },
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

  const divisions = Array.from(new Set(allTeams.map(t => t.division))).sort();
  const divTeams = allTeams.filter(t => t.division === selectedDiv);
  const divMatches = allMatches.filter(m => m.division === selectedDiv);
  const standings = computeStandings(divTeams, divMatches);

  const isUserDiv = selectedDiv === team.division;
  const divName = selectedDiv === 'A' ? 'Neon Apex Division' : 'Chrome Street Division';

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
        <p className="text-xs font-mono text-cyan-200/60 mt-1">Season 1 — League Overview</p>
      </header>

      <main className="p-4 space-y-6">
        <div className="flex gap-2">
          {divisions.map(div => (
            <button
              key={div}
              data-testid={`button-div-${div}`}
              onClick={() => setSelectedDiv(div)}
              className={`flex-1 py-3 rounded-xl border font-black uppercase text-sm tracking-wider transition-all ${
                selectedDiv === div
                  ? div === team.division
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                    : 'border-pink-400 bg-pink-500/20 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.3)]'
                  : 'border-gray-700 bg-black/40 text-gray-500 hover:border-gray-500'
              }`}
              style={{fontFamily: "'Orbitron', sans-serif"}}
            >
              {div === 'A' ? 'Neon Apex' : 'Chrome St.'}
              {div === team.division && <span className="ml-1 text-[9px]">★</span>}
            </button>
          ))}
        </div>

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
                      {row.team.name}
                      {isUser && <span className="ml-1 text-cyan-500 text-[9px]">★</span>}
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

        {isUserDiv && nextMatch && (
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
      </main>
    </div>
  );
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

  const userTop9 = [...userPlayers].sort((a, b) => playerOverall(b) - playerOverall(a)).slice(0, 9);
  const oppTop9 = [...oppPlayers].sort((a, b) => playerOverall(b) - playerOverall(a)).slice(0, 9);

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
          <p className="text-[10px] font-mono text-cyan-500 mb-2 text-center uppercase">{userTeam?.name} ★</p>
          {userTop9.map(p => (
            <Link key={p.id} href={`/player/${p.id}`}>
              <div className="flex items-center justify-between py-1 px-1 hover:bg-cyan-950/20 rounded cursor-pointer transition-colors">
                <span className="text-[10px] text-cyan-200 truncate max-w-[80px]">{p.name}</span>
                <span className="text-[10px] font-bold text-cyan-400">{playerOverall(p)}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="p-3">
          <p className="text-[10px] font-mono text-pink-500 mb-2 text-center uppercase">{oppTeam?.name}</p>
          {oppTop9.map(p => (
            <Link key={p.id} href={`/player/${p.id}`}>
              <div className="flex items-center justify-between py-1 px-1 hover:bg-pink-950/20 rounded cursor-pointer transition-colors">
                <span className="text-[10px] text-pink-200 truncate max-w-[80px]">{p.name}</span>
                <span className="text-[10px] font-bold text-pink-400">{playerOverall(p)}</span>
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
            const maxVal = Math.max(uVal, oVal, 1);
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

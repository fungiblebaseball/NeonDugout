import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useGameStore } from "@/lib/store";

interface PlayLogEntry {
  type: 'at_bat' | 'pitcher_change' | 'tactic_change' | 'tactic_initial';
  inning: number;
  half: 'top' | 'bottom';
  outs: number;
  batterId?: number;
  batterName?: string;
  pitcherId?: number;
  pitcherName?: string;
  count?: { balls: number; strikes: number; pitches: number };
  outcome?: string;
  fielderName?: string;
  fielderPosition?: string;
  playDirection?: 'infield' | 'outfield';
  basesBefore?: { first: boolean; second: boolean; third: boolean };
  basesAfter?: { first: boolean; second: boolean; third: boolean };
  runsScored?: number;
  outsAdded?: number;
  oldPitcherName?: string;
  newPitcherName?: string;
  newPitcherRole?: string;
  changeReason?: string;
  pitcherStyle?: string;
  tacticField?: string;
  oldValue?: string;
  newValue?: string;
  teamSide?: 'home' | 'away';
}

interface MatchWithLog {
  matchId: number;
  day: number;
  matchDate: string;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamName: string;
  awayTeamName: string;
  playLog: PlayLogEntry[];
}

function outcomeLabel(outcome: string): string {
  const labels: Record<string, string> = {
    'HR': 'HOME RUN', '3B': 'TRIPLE', '2B': 'DOUBLE', '1B': 'SINGLE',
    'BB': 'WALK', 'SO': 'STRIKEOUT', 'GO': 'GROUND OUT', 'FO': 'FLY OUT',
    'ERR': 'ERROR', 'GIDP': 'DOUBLE PLAY',
  };
  return labels[outcome] || outcome;
}

function outcomeColor(outcome: string): string {
  if (['HR', '3B', '2B', '1B'].includes(outcome)) return 'text-green-400';
  if (['BB'].includes(outcome)) return 'text-yellow-400';
  if (['SO', 'GO', 'FO', 'GIDP'].includes(outcome)) return 'text-red-400';
  if (['ERR'].includes(outcome)) return 'text-orange-400';
  return 'text-gray-400';
}

function MatchLogAccordion({ match }: { match: MatchWithLog }) {
  const [open, setOpen] = useState(false);
  const innings = Array.from(new Set(match.playLog.map(e => e.inning))).sort((a, b) => a - b);

  return (
    <div className="rounded-xl border border-green-500/20 bg-green-950/10 overflow-hidden">
      <button
        data-testid={`button-expand-match-${match.matchId}`}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-green-500/5 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <span className="text-[10px] font-mono text-gray-500 w-8">D{match.day}</span>
          <span className="text-xs font-mono text-cyan-300 truncate max-w-[80px]">{match.homeTeamName}</span>
          <span className="text-xs font-bold text-gray-300">{match.homeScore} - {match.awayScore}</span>
          <span className="text-xs font-mono text-pink-300 truncate max-w-[80px]">{match.awayTeamName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-gray-600">{match.playLog.length} ev</span>
          {open ? <ChevronUp className="w-3 h-3 text-green-400" /> : <ChevronDown className="w-3 h-3 text-green-400" />}
        </div>
      </button>
      {open && (
        <div className="p-3 pt-0 border-t border-green-500/10 font-mono text-[10px] space-y-3">
          {(() => {
            const tacticInitials = match.playLog.filter(e => e.type === 'tactic_initial');
            const homeInitials = tacticInitials.filter(e => e.teamSide === 'home');
            const awayInitials = tacticInitials.filter(e => e.teamSide === 'away');
            if (homeInitials.length === 0 && awayInitials.length === 0) return null;
            return (
              <div className="mb-2 p-2 rounded-lg border border-amber-500/20 bg-amber-950/10">
                <div className="text-[9px] font-bold uppercase text-amber-400 mb-1">⚙ Starting Tactics</div>
                <div className="grid grid-cols-2 gap-2">
                  {awayInitials.length > 0 && (
                    <div>
                      <div className="text-[9px] text-pink-400 font-bold mb-0.5">AWAY</div>
                      {awayInitials.map((e, i) => (
                        <div key={i} className="text-[9px] text-gray-400">
                          <span className="text-gray-500">{e.tacticField}:</span> <span className="text-amber-300">{e.newValue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {homeInitials.length > 0 && (
                    <div>
                      <div className="text-[9px] text-cyan-400 font-bold mb-0.5">HOME</div>
                      {homeInitials.map((e, i) => (
                        <div key={i} className="text-[9px] text-gray-400">
                          <span className="text-gray-500">{e.tacticField}:</span> <span className="text-amber-300">{e.newValue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          {innings.map(inn => (
            <div key={inn}>
              {['top', 'bottom'].map(half => {
                const halfEntries = match.playLog.filter(e => e.inning === inn && e.half === half && e.type !== 'tactic_initial');
                if (halfEntries.length === 0) return null;
                return (
                  <div key={`${inn}-${half}`} className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${half === 'top' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                        {half === 'top' ? '▲' : '▼'} {inn}
                      </span>
                    </div>
                    <div className="space-y-0.5 ml-2 border-l border-gray-800 pl-2">
                      {halfEntries.map((entry, idx) => {
                        if (entry.type === 'tactic_change') {
                          return (
                            <div key={idx} className="py-1 px-2 bg-amber-950/30 border border-amber-500/20 rounded text-amber-300">
                              ⚙ <span className={entry.teamSide === 'home' ? 'text-cyan-400' : 'text-pink-400'}>{entry.teamSide === 'home' ? 'HOME' : 'AWAY'}</span>
                              {' '}{entry.tacticField}: <span className="text-gray-500">{entry.oldValue}</span> → <span className="text-amber-200 font-bold">{entry.newValue}</span>
                            </div>
                          );
                        }
                        if (entry.type === 'pitcher_change') {
                          return (
                            <div key={idx} className="py-1 px-2 bg-purple-950/30 border border-purple-500/20 rounded text-purple-300">
                              ⟳ {entry.oldPitcherName} → <span className="text-purple-200 font-bold">{entry.newPitcherName}</span>
                              <span className="text-gray-500 ml-1">({entry.newPitcherRole})</span>
                              {entry.pitcherStyle && <span className="text-amber-400 ml-1">⚡ {entry.pitcherStyle}</span>}
                              {entry.changeReason && <span className="text-gray-600 ml-1">• {entry.changeReason}</span>}
                            </div>
                          );
                        }
                        return (
                          <div key={idx} className="py-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0">
                            <span className="text-gray-600 w-4 text-right">{entry.outs}o</span>
                            <span className="text-cyan-300">{entry.batterName}</span>
                            <span className="text-gray-600">vs</span>
                            <span className="text-pink-300">{entry.pitcherName}</span>
                            {entry.count && <span className="text-gray-500">({entry.count.balls}-{entry.count.strikes}, {entry.count.pitches}p)</span>}
                            {entry.outcome && <span className={`font-bold ${outcomeColor(entry.outcome)}`}>{outcomeLabel(entry.outcome)}</span>}
                            {entry.fielderName && <span className="text-gray-500">→ {entry.fielderPosition} {entry.fielderName}</span>}
                            {entry.playDirection && <span className="text-gray-600">[{entry.playDirection === 'infield' ? 'IF' : 'OF'}]</span>}
                            {(entry.runsScored ?? 0) > 0 && <span className="text-yellow-400 font-bold">+{entry.runsScored}R</span>}
                            {(entry.outsAdded ?? 0) > 1 && <span className="text-red-500 font-bold">+{entry.outsAdded}OUT</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="text-center pt-2">
            <Link href={`/match/${match.matchId}`} data-testid={`link-match-report-${match.matchId}`} className="text-cyan-400 text-[10px] font-mono underline hover:text-cyan-300">
              Full Match Report →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayLogPage() {
  const { team } = useGameStore();

  const { data: allMatches = [] } = useQuery<any[]>({
    queryKey: ['matches-all'],
    queryFn: async () => {
      const res = await fetch('/api/matches');
      return res.json();
    },
  });

  const { data: allTeams = [] } = useQuery<any[]>({
    queryKey: ['teams-all'],
    queryFn: async () => {
      const res = await fetch('/api/teams');
      return res.json();
    },
  });

  const teamMap = new Map(allTeams.map((t: any) => [t.id, t]));

  const playedMatches = allMatches.filter((m: any) =>
    m.played && (m.homeTeamId === team?.id || m.awayTeamId === team?.id)
  ).sort((a: any, b: any) => a.day - b.day);

  const days = Array.from(new Set(playedMatches.map((m: any) => m.day))).sort((a, b) => a - b);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const dayMatches = selectedDay !== null
    ? playedMatches.filter((m: any) => m.day === selectedDay)
    : [];

  const matchIds = dayMatches.map((m: any) => m.id);

  const { data: dayDetails = [], isLoading: detailsLoading } = useQuery<any[]>({
    queryKey: ['play-logs-day', selectedDay, ...matchIds],
    queryFn: async () => {
      const results = await Promise.all(
        matchIds.map(async (id: number) => {
          try {
            const res = await fetch(`/api/match-details/${id}`);
            if (!res.ok) return null;
            return res.json();
          } catch { return null; }
        })
      );
      return results.filter(Boolean);
    },
    enabled: matchIds.length > 0,
  });

  const matchesWithLogs: MatchWithLog[] = dayDetails
    .filter((d: any) => d.playLog && d.playLog.length > 0)
    .map((d: any) => {
      const match = playedMatches.find((m: any) => m.id === d.matchId);
      return {
        matchId: d.matchId,
        day: match?.day || 0,
        matchDate: match?.matchDate || '',
        homeTeamId: match?.homeTeamId || 0,
        awayTeamId: match?.awayTeamId || 0,
        homeScore: match?.homeScore,
        awayScore: match?.awayScore,
        homeTeamName: teamMap.get(match?.homeTeamId)?.name || 'Home',
        awayTeamName: teamMap.get(match?.awayTeamId)?.name || 'Away',
        playLog: d.playLog,
      };
    });

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-4 bg-gradient-to-b from-green-900/20 to-black border-b border-green-500/20 sticky top-0 z-10 backdrop-blur-md flex items-center gap-3">
        <Link href="/">
          <button data-testid="button-back" className="p-2 rounded-lg border border-gray-700 hover:border-green-500/50 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-black uppercase text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
            Play Log
          </h1>
          <p className="text-[10px] font-mono text-green-200/60">Play-by-play records — current season</p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {days.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 font-mono text-sm">No matches played yet</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {days.map(day => (
                <button
                  key={day}
                  data-testid={`button-day-${day}`}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  className={`px-3 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                    selectedDay === day
                      ? 'bg-green-500/30 border-green-500/60 text-green-300 border'
                      : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-green-500/30'
                  }`}
                >
                  Day {day}
                </button>
              ))}
            </div>

            {selectedDay !== null && (
              <div className="space-y-3">
                {detailsLoading ? (
                  <p className="text-green-400 font-mono text-sm animate-pulse text-center py-6">LOADING PLAY DATA...</p>
                ) : matchesWithLogs.length === 0 ? (
                  <p className="text-gray-500 font-mono text-sm text-center py-6">No play log available for Day {selectedDay}</p>
                ) : (
                  matchesWithLogs.map(match => (
                    <MatchLogAccordion key={match.matchId} match={match} />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

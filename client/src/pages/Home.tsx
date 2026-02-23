import { useGameStore } from "@/lib/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Terminal, ShieldAlert, Calendar, Swords, Shield, ListOrdered, RotateCcw, Zap, Trophy, Play } from "lucide-react";
import { useState } from "react";
import type { SimPlayer } from "@/lib/calculations";

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
  matchType: string;
}

interface TeamInfo {
  id: number;
  name: string;
  division: string;
}

export default function Home() {
  const { walletAddress, disconnectWallet, team, players, loading } = useGameStore();
  const [simulating, setSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<{ home: string; away: string; hs: number; as: number; matchId: number } | null>(null);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: allMatchesRaw = [] } = useQuery<MatchData[]>({
    queryKey: ['matches-all'],
    queryFn: async () => {
      const res = await fetch('/api/matches');
      return res.json();
    },
    enabled: !!team,
  });

  const { data: allTeamsRaw = [] } = useQuery<TeamInfo[]>({
    queryKey: ['teams-all'],
    queryFn: async () => {
      const res = await fetch('/api/teams');
      return res.json();
    },
    enabled: !!team,
  });

  const divMatches = allMatchesRaw.filter(m =>
    m.division === team?.division ||
    m.homeTeamId === team?.id || m.awayTeamId === team?.id
  );
  const divTeams = allTeamsRaw;

  const userMatches = divMatches.filter(m => m.homeTeamId === team?.id || m.awayTeamId === team?.id);
  const teamMap = new Map(divTeams.map(t => [t.id, t]));

  const allUnplayedDays = allMatchesRaw
    .filter(m => !m.played)
    .map(m => m.day);
  const nextUnplayedDay = allUnplayedDays.length > 0 ? Math.min(...allUnplayedDays) : undefined;

  const nextLeagueMatch = nextUnplayedDay
    ? userMatches.find(m => m.day === nextUnplayedDay && !m.played)
    : undefined;

  const realMatches = allMatchesRaw.filter(m => m.homeTeamId !== 0 && m.awayTeamId !== 0);
  const unfilledPlayoffs = allMatchesRaw.filter(m => (m.homeTeamId === 0 || m.awayTeamId === 0) && !m.played);
  const seasonFinished = realMatches.length > 0 && realMatches.every(m => m.played) && unfilledPlayoffs.length === 0;

  const playNextMatchDay = async () => {
    if (!nextUnplayedDay || !team) return;
    setSimulating(true);
    setLastResult(null);
    try {
      if (nextUnplayedDay >= 13) {
        await fetch('/api/update-playoff-matchups', { method: 'POST' });
        await queryClient.invalidateQueries({ queryKey: ['matches-all'] });
      }

      const res = await fetch('/api/simulate-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: nextUnplayedDay }),
      });
      const data = await res.json();

      if (data.results && nextLeagueMatch) {
        const userResult = data.results.find((r: any) => r.matchId === nextLeagueMatch.id);
        if (userResult) {
          setLastResult({
            home: teamMap.get(nextLeagueMatch.homeTeamId)?.name || 'Home',
            away: teamMap.get(nextLeagueMatch.awayTeamId)?.name || 'Away',
            hs: userResult.homeScore,
            as: userResult.awayScore,
            matchId: nextLeagueMatch.id,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['matches-all'] });
      queryClient.invalidateQueries({ queryKey: ['teams-all'] });
    } catch (err) {
      console.error('Match day simulation failed:', err);
    }
    setSimulating(false);
  };

  const startNewSeason = async () => {
    if (!team) return;
    setSimulating(true);
    try {
      const res = await fetch('/api/new-season', { method: 'POST' });
      const data = await res.json();
      if (data.seasonId) {
        queryClient.invalidateQueries({ queryKey: ['matches-all'] });
        queryClient.invalidateQueries({ queryKey: ['teams-all'] });
        setLastResult(null);
      }
    } catch (err) {
      console.error('New season failed:', err);
    }
    setSimulating(false);
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-cyan-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            <h1 data-testid="text-title" className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-pink-500 filter drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
              Gridiron<br/>Ghosts
            </h1>
            <p className="text-sm tracking-widest text-cyan-200/70 font-mono uppercase">
              Retro Cyber-Baseball Manager
            </p>
          </div>

          <div className="p-6 border border-cyan-500/30 bg-black/40 backdrop-blur rounded-xl space-y-6">
            <ShieldAlert className="w-12 h-12 text-pink-500 mx-auto opacity-80" />
            <p className="text-sm text-gray-400 font-mono leading-relaxed">
              INITIALIZING SECURE CONNECTION...<br/>
              REQUIRE WALLET SIGNATURE TO ACCESS OWNER DASHBOARD.
            </p>
            <Button
              data-testid="button-connect-wallet"
              onClick={() => navigate("/login")}
              disabled={loading}
              className="w-full h-14 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-lg transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            >
              {loading ? "CONNECTING..." : "Connect Wallet"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-black text-cyan-50 p-6">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-sm font-mono text-cyan-500 uppercase tracking-widest">Sys.Status: Online</h2>
          <h1 data-testid="text-team-name" className="text-3xl font-black uppercase text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
            {team?.name || "Loading..."}
          </h1>
          <p className="text-xs font-mono text-pink-300 mt-1 uppercase">
            Division {team?.division}
          </p>
        </div>
        <Button data-testid="button-disconnect" variant="ghost" size="sm" onClick={disconnectWallet} className="text-gray-500 hover:text-pink-500">
          <Terminal className="w-4 h-4 mr-2" />
          DISCONNECT
        </Button>
      </header>

      <main className="space-y-4">
        <div className="p-4 rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-transparent">
          <h3 className="font-mono text-sm text-pink-300 mb-2">OWNER REGISTRY</h3>
          <p data-testid="text-wallet" className="text-xs break-all text-gray-400 bg-black/50 p-3 rounded font-mono border border-gray-800">
            {walletAddress}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/lineup" data-testid="link-lineup" className="block p-5 rounded-2xl border border-cyan-500/30 bg-black/40 hover:bg-cyan-900/20 transition-colors group">
            <ListOrdered className="w-6 h-6 text-cyan-500 mb-2 group-hover:animate-pulse" />
            <h3 className="font-black text-lg text-cyan-400 mb-1 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" style={{fontFamily: "'Orbitron', sans-serif"}}>LINEUP</h3>
            <p className="text-[10px] font-mono text-gray-500">Batting order & field</p>
          </Link>

          <Link href="/pitchers" data-testid="link-pitchers" className="block p-5 rounded-2xl border border-pink-500/30 bg-black/40 hover:bg-pink-900/20 transition-colors group">
            <RotateCcw className="w-6 h-6 text-pink-500 mb-2 group-hover:animate-pulse" />
            <h3 className="font-black text-lg text-pink-400 mb-1" style={{fontFamily: "'Orbitron', sans-serif"}}>PITCHERS</h3>
            <p className="text-[10px] font-mono text-gray-500">Rotation & conditions</p>
          </Link>

          <Link href="/attack" data-testid="link-attack" className="block p-5 rounded-2xl border border-cyan-500/30 bg-black/40 hover:bg-cyan-900/20 transition-colors group">
            <Swords className="w-6 h-6 text-cyan-500 mb-2 group-hover:animate-pulse" />
            <h3 className="font-black text-lg text-cyan-400 mb-1" style={{fontFamily: "'Orbitron', sans-serif"}}>ATTACK</h3>
            <p className="text-[10px] font-mono text-gray-500">Offensive tactics</p>
          </Link>

          <Link href="/defense" data-testid="link-defense" className="block p-5 rounded-2xl border border-pink-500/30 bg-black/40 hover:bg-pink-900/20 transition-colors group">
            <Shield className="w-6 h-6 text-pink-500 mb-2 group-hover:animate-pulse" />
            <h3 className="font-black text-lg text-pink-400 mb-1" style={{fontFamily: "'Orbitron', sans-serif"}}>DEFENSE</h3>
            <p className="text-[10px] font-mono text-gray-500">Field positioning</p>
          </Link>

          <Link href="/simulate" data-testid="link-simulate" className="col-span-2 block p-5 rounded-2xl border border-cyan-400/50 bg-gradient-to-r from-cyan-950/30 to-pink-950/30 hover:from-cyan-900/30 hover:to-pink-900/30 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <Zap className="w-6 h-6 text-cyan-400 mb-2 group-hover:animate-pulse" />
                <h3 className="font-black text-lg text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" style={{fontFamily: "'Orbitron', sans-serif"}}>TEST MATCH</h3>
                <p className="text-[10px] font-mono text-gray-500">Simulate exhibition game vs division rival</p>
              </div>
              <span className="text-3xl">⚾</span>
            </div>
          </Link>

          {seasonFinished ? (
            <div className="col-span-2 p-5 rounded-2xl border-2 border-cyan-400/50 bg-gradient-to-r from-cyan-950/30 to-pink-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Trophy className="w-6 h-6 text-cyan-400 mb-2" />
                  <h3 className="font-black text-lg text-cyan-400" style={{fontFamily: "'Orbitron', sans-serif"}}>SEASON COMPLETE</h3>
                  <p className="text-[10px] font-mono text-gray-500">
                    All matches played. Promotions and relegations will be applied.
                  </p>
                </div>
                <span className="text-3xl">🏆</span>
              </div>
              <button
                data-testid="button-new-season"
                onClick={startNewSeason}
                disabled={simulating}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50 text-sm"
              >
                {simulating ? "GENERATING..." : "START NEW SEASON"}
              </button>
            </div>
          ) : nextUnplayedDay ? (
            <div className="col-span-2 p-5 rounded-2xl border-2 border-pink-400/50 bg-gradient-to-r from-pink-950/30 to-cyan-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Play className="w-6 h-6 text-pink-400 mb-2" />
                  <h3 className="font-black text-lg text-pink-400" style={{fontFamily: "'Orbitron', sans-serif"}}>
                    {nextLeagueMatch
                      ? (nextLeagueMatch.matchType === 'interleague' ? 'INTERLEAGUE' : nextLeagueMatch.matchType === 'playoff' ? 'PLAYOFF' : 'NEXT GAME')
                      : nextUnplayedDay >= 13 ? 'PLAYOFF DAY' : 'LEAGUE DAY'}
                  </h3>
                  <p className="text-[10px] font-mono text-gray-500">
                    {nextLeagueMatch
                      ? `Day ${nextLeagueMatch.day} — vs ${teamMap.get(nextLeagueMatch.homeTeamId === team?.id ? nextLeagueMatch.awayTeamId : nextLeagueMatch.homeTeamId)?.name || 'TBD'}`
                      : `Day ${nextUnplayedDay} — Your team is not playing`}
                  </p>
                </div>
                <span className="text-3xl">🏟️</span>
              </div>
              <button
                data-testid="button-play-league"
                onClick={playNextMatchDay}
                disabled={simulating}
                className="w-full py-3 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] disabled:opacity-50 text-sm"
              >
                {simulating ? "SIMULATING ALL GAMES..." : `PLAY DAY ${nextUnplayedDay}`}
              </button>
              {lastResult && (
                <div className="p-3 rounded-lg border border-cyan-500/30 bg-black/40 text-center space-y-2">
                  <p className="text-xs font-mono text-gray-400">FINAL SCORE</p>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <span className="text-sm font-bold text-cyan-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{lastResult.home}</span>
                    <span className="text-lg font-black text-cyan-400" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '14px'}}>{lastResult.hs}</span>
                    <span className="text-gray-600">-</span>
                    <span className="text-lg font-black text-pink-400" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '14px'}}>{lastResult.as}</span>
                    <span className="text-sm font-bold text-pink-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{lastResult.away}</span>
                  </div>
                  <Link href={`/match/${lastResult.matchId}`}>
                    <button data-testid="button-view-details" className="mt-1 px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs uppercase tracking-wider rounded-lg transition-all">
                      VIEW MATCH REPORT
                    </button>
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          {(() => {
            const recentResults = userMatches
              .filter(m => m.played)
              .sort((a, b) => b.day - a.day)
              .slice(0, 3);
            if (recentResults.length === 0) return null;
            return (
              <div className="col-span-2 rounded-xl border border-gray-800 bg-black/30 p-3 space-y-2">
                <p className="text-[10px] font-mono text-gray-500 uppercase">Recent Results</p>
                {recentResults.map(m => {
                  const isHome = m.homeTeamId === team?.id;
                  const won = isHome ? (m.homeScore ?? 0) > (m.awayScore ?? 0) : (m.awayScore ?? 0) > (m.homeScore ?? 0);
                  const oppName = teamMap.get(isHome ? m.awayTeamId : m.homeTeamId)?.name || '???';
                  return (
                    <Link key={m.id} href={`/match/${m.id}`}>
                      <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-900/40 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${won ? 'bg-cyan-500/20 text-cyan-400' : 'bg-pink-500/20 text-pink-400'}`}>
                            {won ? 'W' : 'L'}
                          </span>
                          <span className="text-xs font-mono text-gray-400">{isHome ? 'vs' : '@'} {oppName}</span>
                        </div>
                        <span className="text-xs font-black font-mono text-gray-300">
                          {isHome ? `${m.homeScore}-${m.awayScore}` : `${m.awayScore}-${m.homeScore}`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })()}

          <Link href="/schedule" data-testid="link-schedule" className="block p-5 rounded-2xl border border-pink-500/30 bg-black/40 hover:bg-pink-900/20 transition-colors group">
            <Calendar className="w-6 h-6 text-pink-500 mb-2 group-hover:animate-pulse" />
            <h3 className="font-black text-lg text-pink-400 mb-1 group-hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" style={{fontFamily: "'Orbitron', sans-serif"}}>SCHEDULE</h3>
            <p className="text-[10px] font-mono text-gray-500">Calendar & results</p>
          </Link>

          <Link href="/standings" data-testid="link-standings" className="block p-5 rounded-2xl border border-cyan-500/30 bg-black/40 hover:bg-cyan-900/20 transition-colors group">
            <Trophy className="w-6 h-6 text-cyan-500 mb-2 group-hover:animate-pulse" />
            <h3 className="font-black text-lg text-cyan-400 mb-1 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" style={{fontFamily: "'Orbitron', sans-serif"}}>STANDINGS</h3>
            <p className="text-[10px] font-mono text-gray-500">Rankings & preview</p>
          </Link>
        </div>
      </main>
    </div>
  );
}

import { useGameStore } from "@/lib/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Terminal, ShieldAlert, Calendar, Swords, Shield, ListOrdered, RotateCcw, Zap, Trophy, Play } from "lucide-react";
import { useState } from "react";
import { simulateGame, resetRng } from "@/lib/calculations";
import type { SimPlayer, SimTeam } from "@/lib/calculations";

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

interface TeamInfo {
  id: number;
  name: string;
  division: string;
}

export default function Home() {
  const { walletAddress, connectWallet, disconnectWallet, team, players, loading } = useGameStore();
  const [simulating, setSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<{ home: string; away: string; hs: number; as: number } | null>(null);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: divMatches = [] } = useQuery<MatchData[]>({
    queryKey: ['matches', team?.division],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${team!.division}`);
      return res.json();
    },
    enabled: !!team,
  });

  const { data: divTeams = [] } = useQuery<TeamInfo[]>({
    queryKey: ['teams', team?.division],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${team!.division}`);
      return res.json();
    },
    enabled: !!team,
  });

  const userMatches = divMatches.filter(m =>
    (m.homeTeamId === team?.id || m.awayTeamId === team?.id) && !m.played
  ).sort((a, b) => a.day - b.day);
  const nextLeagueMatch = userMatches[0];
  const teamMap = new Map(divTeams.map(t => [t.id, t]));

  const playNextLeagueMatch = async () => {
    if (!nextLeagueMatch || !team || players.length === 0) return;
    setSimulating(true);
    setLastResult(null);
    try {
      const opponentId = nextLeagueMatch.homeTeamId === team.id ? nextLeagueMatch.awayTeamId : nextLeagueMatch.homeTeamId;
      const res = await fetch(`/api/team/${opponentId}/players`);
      const opponentPlayers: SimPlayer[] = await res.json();

      const isHome = nextLeagueMatch.homeTeamId === team.id;
      const homeTeam: SimTeam = isHome
        ? { id: team.id, name: team.name, division: team.division }
        : { id: opponentId, name: teamMap.get(opponentId)?.name || 'Opponent', division: team.division };
      const awayTeam: SimTeam = isHome
        ? { id: opponentId, name: teamMap.get(opponentId)?.name || 'Opponent', division: team.division }
        : { id: team.id, name: team.name, division: team.division };
      const homePlayers = isHome ? (players as SimPlayer[]) : opponentPlayers;
      const awayPlayers = isHome ? opponentPlayers : (players as SimPlayer[]);

      resetRng();
      const gameResult = simulateGame(homeTeam, awayTeam, homePlayers, awayPlayers);

      await fetch(`/api/matches/${nextLeagueMatch.id}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeScore: gameResult.homeScore, awayScore: gameResult.awayScore }),
      });

      setLastResult({
        home: homeTeam.name,
        away: awayTeam.name,
        hs: gameResult.homeScore,
        as: gameResult.awayScore,
      });

      queryClient.invalidateQueries({ queryKey: ['matches', team.division] });
      queryClient.invalidateQueries({ queryKey: ['matches-all'] });
    } catch (err) {
      console.error('League match failed:', err);
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
              onClick={connectWallet}
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

          {nextLeagueMatch && (
            <div className="col-span-2 p-5 rounded-2xl border-2 border-pink-400/50 bg-gradient-to-r from-pink-950/30 to-cyan-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Play className="w-6 h-6 text-pink-400 mb-2" />
                  <h3 className="font-black text-lg text-pink-400" style={{fontFamily: "'Orbitron', sans-serif"}}>NEXT LEAGUE GAME</h3>
                  <p className="text-[10px] font-mono text-gray-500">
                    Day {nextLeagueMatch.day} — vs {teamMap.get(nextLeagueMatch.homeTeamId === team?.id ? nextLeagueMatch.awayTeamId : nextLeagueMatch.homeTeamId)?.name || 'TBD'}
                  </p>
                </div>
                <span className="text-3xl">🏟️</span>
              </div>
              <button
                data-testid="button-play-league"
                onClick={playNextLeagueMatch}
                disabled={simulating}
                className="w-full py-3 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] disabled:opacity-50 text-sm"
              >
                {simulating ? "SIMULATING..." : "PLAY MATCH"}
              </button>
              {lastResult && (
                <div className="p-3 rounded-lg border border-cyan-500/30 bg-black/40 text-center">
                  <p className="text-xs font-mono text-gray-400">FINAL SCORE</p>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <span className="text-sm font-bold text-cyan-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{lastResult.home}</span>
                    <span className="text-lg font-black text-cyan-400" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '14px'}}>{lastResult.hs}</span>
                    <span className="text-gray-600">-</span>
                    <span className="text-lg font-black text-pink-400" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '14px'}}>{lastResult.as}</span>
                    <span className="text-sm font-bold text-pink-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{lastResult.away}</span>
                  </div>
                </div>
              )}
            </div>
          )}

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

import { useGameStore } from "@/lib/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Terminal, ShieldAlert, Calendar, Swords, Shield, ListOrdered, RotateCcw, Zap, Trophy, Play, Pencil, Check, X, ScrollText, Dumbbell, Users, Coins, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { SimPlayer } from "@/lib/calculations";
import logoImg from "@/assets/images/logo-neon-dugout.png";

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
  league: string;
  series: string;
}

interface PlayerInfo {
  id: number;
  name: string;
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

function SectorBar({ label, myVal, oppVal, color }: { label: string; myVal: number; oppVal: number; color: string }) {
  const max = Math.max(myVal, oppVal, 1);
  const myPct = (myVal / max) * 100;
  const oppPct = (oppVal / max) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-mono text-gray-500 uppercase w-8">{label}</span>
        <span className="text-[10px] font-mono text-cyan-400 w-8 text-right">{myVal}</span>
      </div>
      <div className="relative h-3 bg-gray-900 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${myPct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
        <div className="absolute inset-y-0 right-0 rounded-full transition-all opacity-40 border border-pink-500/50" style={{ width: `${oppPct}%`, background: 'linear-gradient(270deg, #ec4899, #ec489988)' }} />
      </div>
      <div className="flex justify-end">
        <span className="text-[10px] font-mono text-pink-400 w-8 text-right">{oppVal}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const { walletAddress, disconnectWallet, team, players, loading, token } = useGameStore();
  const { signMessage } = useWallet();
  const [simulating, setSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<{ home: string; away: string; hs: number; as: number; matchId: number } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const { data: seasonData } = useQuery<{ seasonId: number }>({
    queryKey: ['current-season'],
    queryFn: async () => {
      const res = await fetch('/api/season');
      return res.json();
    },
  });
  const currentSeason = seasonData?.seasonId ?? 1;

  const { data: tokenBalance } = useQuery<{ balance: number; canClaim: boolean; nextClaimAt: string | null; claimAmount: number }>({
    queryKey: ['token-balance'],
    queryFn: async () => {
      const res = await fetch('/api/tokens/balance', { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  const claimTokens = async () => {
    if (!token || !signMessage || claiming) return;
    setClaiming(true);
    try {
      const challengeRes = await fetch('/api/tokens/claim-challenge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const { message } = await challengeRes.json();
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encodedMessage);
      const signature = Buffer.from(signatureBytes).toString('base64');
      const claimRes = await fetch('/api/tokens/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ signature, message }),
      });
      if (claimRes.ok) {
        queryClient.invalidateQueries({ queryKey: ['token-balance'] });
      }
    } catch (err) {
      console.error('Token claim failed:', err);
    }
    setClaiming(false);
  };

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

  const opponentId = nextLeagueMatch
    ? (nextLeagueMatch.homeTeamId === team?.id ? nextLeagueMatch.awayTeamId : nextLeagueMatch.homeTeamId)
    : undefined;

  const { data: opponentPlayers } = useQuery<PlayerInfo[]>({
    queryKey: ['opponent-players', opponentId],
    queryFn: async () => {
      const res = await fetch(`/api/team/${opponentId}/players`);
      return res.json();
    },
    enabled: !!opponentId && opponentId !== 0,
  });

  const realMatches = allMatchesRaw.filter(m => m.homeTeamId !== 0 && m.awayTeamId !== 0);
  const unfilledPlayoffs = allMatchesRaw.filter(m => (m.homeTeamId === 0 || m.awayTeamId === 0) && !m.played);
  const seasonFinished = realMatches.length > 0 && realMatches.every(m => m.played) && unfilledPlayoffs.length === 0;

  const calcSectors = (pls: PlayerInfo[] | SimPlayer[] | undefined) => {
    if (!pls || pls.length === 0) return { atk: 0, def: 0, pit: 0 };
    const n = pls.length;
    const atk = Math.round(pls.reduce((s, p) => s + (p.pow + p.con + p.spd + p.eye), 0) / n);
    const def_ = Math.round(pls.reduce((s, p) => s + p.def, 0) / n);
    const pit = Math.round(pls.reduce((s, p) => s + (p.vel + p.ctl + p.mov + p.sta), 0) / n);
    return { atk, def: def_, pit };
  };

  const mySectors = calcSectors(players as PlayerInfo[]);
  const oppSectors = calcSectors(opponentPlayers);

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
        queryClient.invalidateQueries({ queryKey: ['current-season'] });
        setLastResult(null);
      }
    } catch (err) {
      console.error('New season failed:', err);
    }
    setSimulating(false);
  };

  const saveTeamName = async () => {
    if (!team || !nameInput.trim() || nameInput.trim() === team.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        useGameStore.setState({ team: { ...team, name: updated.name } });
        queryClient.invalidateQueries({ queryKey: ['teams-all'] });
      }
    } catch (err) {
      console.error('Rename failed:', err);
    }
    setSavingName(false);
    setEditingName(false);
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-cyan-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            <h1 data-testid="text-title" className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-pink-500 filter drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
              Neon<br/>Dugout
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

  const recentResults = userMatches
    .filter(m => m.played)
    .sort((a, b) => b.day - a.day);

  return (
    <div className="min-h-screen pb-20 bg-black text-cyan-50 p-6">
      <header className="mb-8 flex justify-between items-start">
        <div className="flex items-start gap-3">
          <img src={logoImg} alt="Neon Dugout" className="w-12 h-12 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
          <div>
          <h2 className="text-sm font-mono text-cyan-500 uppercase tracking-widest">Sys.Status: Online</h2>
          {editingName ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                ref={nameInputRef}
                data-testid="input-team-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTeamName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                maxLength={30}
                className="bg-black/80 border border-pink-500/50 text-pink-500 font-black uppercase text-2xl px-2 py-1 rounded-lg outline-none focus:border-pink-400 w-48"
                style={{fontFamily: "'Orbitron', sans-serif"}}
                disabled={savingName}
              />
              <button data-testid="button-save-name" onClick={saveTeamName} disabled={savingName} className="text-cyan-400 hover:text-cyan-300">
                <Check className="w-5 h-5" />
              </button>
              <button data-testid="button-cancel-name" onClick={() => setEditingName(false)} className="text-gray-500 hover:text-pink-400">
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <h1 data-testid="text-team-name" className="text-2xl font-black uppercase text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
                {team?.name || "Loading..."}
              </h1>
              <button
                data-testid="button-edit-name"
                onClick={() => { setNameInput(team?.name || ""); setEditingName(true); }}
                className="text-gray-600 hover:text-pink-400 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-xs font-mono text-pink-300 mt-1 uppercase">
            {team?.league} — Serie {team?.series} — Div {team?.division}
          </p>
          </div>
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

        <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <h3 className="font-mono text-sm text-amber-300">TOKEN BALANCE</h3>
            </div>
            <span data-testid="text-token-balance" className="text-xl font-black text-amber-400" style={{fontFamily: "'Orbitron', sans-serif"}}>
              {tokenBalance?.balance ?? 0}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {tokenBalance?.canClaim ? (
              <button
                data-testid="button-claim-tokens"
                onClick={claimTokens}
                disabled={claiming}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_10px_rgba(245,158,11,0.3)] disabled:opacity-50 text-xs"
              >
                {claiming ? "SIGNING..." : `CLAIM ${tokenBalance?.claimAmount ?? 0} TOKENS`}
              </button>
            ) : (
              <div className="flex-1 flex items-center gap-2 py-2 px-3 bg-gray-900/50 rounded-lg border border-gray-800">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] font-mono text-gray-500">
                  {tokenBalance?.nextClaimAt
                    ? `NEXT CLAIM: ${new Date(tokenBalance.nextClaimAt).toLocaleString()}`
                    : "CLAIM AVAILABLE SOON"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/lineup" data-testid="link-lineup" className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-cyan-500/20 bg-black/30 hover:bg-cyan-900/20 transition-colors group">
            <ListOrdered className="w-4 h-4 text-cyan-500 group-hover:animate-pulse" />
            <span className="font-bold text-sm text-cyan-400 uppercase" style={{fontFamily: "'Orbitron', sans-serif"}}>LINEUP</span>
          </Link>
          <Link href="/pitchers" data-testid="link-pitchers" className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-pink-500/20 bg-black/30 hover:bg-pink-900/20 transition-colors group">
            <RotateCcw className="w-4 h-4 text-pink-500 group-hover:animate-pulse" />
            <span className="font-bold text-sm text-pink-400 uppercase" style={{fontFamily: "'Orbitron', sans-serif"}}>PITCHERS</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/training" data-testid="link-training" className="block col-span-2 p-5 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-950/30 to-orange-950/30 hover:from-amber-900/30 hover:to-orange-900/30 transition-colors group shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <div className="flex items-center justify-between">
              <div>
                <Dumbbell className="w-7 h-7 text-amber-400 mb-2 group-hover:animate-pulse" />
                <h3 className="font-black text-xl text-amber-400 mb-1 group-hover:drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" style={{fontFamily: "'Orbitron', sans-serif"}}>TRAINING CENTER</h3>
                <p className="text-[10px] font-mono text-gray-500">Play minigames to boost your players' attributes</p>
              </div>
              <span className="text-3xl">🏋️</span>
            </div>
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

          {(() => {
            const display = lastResult || (() => {
              const lastPlayed = recentResults[0];
              if (!lastPlayed) return null;
              return {
                home: teamMap.get(lastPlayed.homeTeamId)?.name || 'Home',
                away: teamMap.get(lastPlayed.awayTeamId)?.name || 'Away',
                hs: lastPlayed.homeScore ?? 0,
                as: lastPlayed.awayScore ?? 0,
                matchId: lastPlayed.id,
              };
            })();
            if (!display) return null;
            return (
              <div className="col-span-2 p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-pink-950/20 text-center space-y-2">
                <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">FINAL SCORE</p>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <span className="text-sm font-bold text-cyan-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{display.home}</span>
                  <span className="text-lg font-black text-cyan-400" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '14px'}}>{display.hs}</span>
                  <span className="text-gray-600">-</span>
                  <span className="text-lg font-black text-pink-400" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '14px'}}>{display.as}</span>
                  <span className="text-sm font-bold text-pink-300" style={{fontFamily: "'Orbitron', sans-serif"}}>{display.away}</span>
                </div>
                <Link href={`/match/${display.matchId}`}>
                  <button data-testid="button-view-details" className="mt-1 px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs uppercase tracking-wider rounded-lg transition-all">
                    VIEW MATCH REPORT
                  </button>
                </Link>
              </div>
            );
          })()}

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
                      ? (nextLeagueMatch.matchType === 'interleague' ? 'INTERLEAGUE' : nextLeagueMatch.matchType === 'playoff' ? 'PLAYOFF' : `GAME DAY ${nextLeagueMatch.day}`)
                      : nextUnplayedDay >= 13 ? 'PLAYOFF DAY' : `GAME DAY ${nextUnplayedDay}`}
                  </h3>
                  <p className="text-[10px] font-mono text-gray-500">
                    {nextLeagueMatch
                      ? `Season ${currentSeason} — vs ${teamMap.get(opponentId!)?.name || 'TBD'}`
                      : `Season ${currentSeason} — Day ${nextUnplayedDay} — Your team is not playing`}
                  </p>
                </div>
                <span className="text-3xl">🏟️</span>
              </div>

              {nextLeagueMatch && opponentPlayers && opponentId !== 0 && (
                <div className="p-3 rounded-lg border border-cyan-500/20 bg-black/30 space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase">{team?.name}</span>
                    <span className="text-[9px] font-mono text-gray-600 uppercase">Sector Preview</span>
                    <span className="text-[10px] font-mono text-pink-400 uppercase">{teamMap.get(opponentId!)?.name}</span>
                  </div>
                  <SectorBar label="ATK" myVal={mySectors.atk} oppVal={oppSectors.atk} color="#22d3ee" />
                  <SectorBar label="DEF" myVal={mySectors.def} oppVal={oppSectors.def} color="#22d3ee" />
                  <SectorBar label="PIT" myVal={mySectors.pit} oppVal={oppSectors.pit} color="#22d3ee" />
                </div>
              )}

              <button
                data-testid="button-play-league"
                onClick={playNextMatchDay}
                disabled={simulating}
                className="w-full py-3 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] disabled:opacity-50 text-sm"
              >
                {simulating ? "SIMULATING ALL GAMES..." : `PLAY DAY ${nextUnplayedDay}`}
              </button>
            </div>
          ) : null}

          <Link href="/simulate" data-testid="link-simulate" className="block p-5 rounded-2xl border border-cyan-400/50 bg-gradient-to-r from-cyan-950/30 to-pink-950/30 hover:from-cyan-900/30 hover:to-pink-900/30 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <Zap className="w-6 h-6 text-cyan-400 mb-2 group-hover:animate-pulse" />
                <h3 className="font-black text-lg text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" style={{fontFamily: "'Orbitron', sans-serif"}}>TEST MATCH</h3>
                <p className="text-[10px] font-mono text-gray-500">Exhibition vs rival</p>
              </div>
              <span className="text-3xl">⚾</span>
            </div>
          </Link>

          <Link href="/play-log" data-testid="link-play-log" className="block p-5 rounded-2xl border border-green-500/30 bg-black/40 hover:bg-green-900/20 transition-colors group">
            <ScrollText className="w-6 h-6 text-green-500 mb-2 group-hover:animate-pulse" />
            <h3 className="font-black text-lg text-green-400 mb-1" style={{fontFamily: "'Orbitron', sans-serif"}}>PLAY LOG</h3>
            <p className="text-[10px] font-mono text-gray-500">Play-by-play records</p>
          </Link>

          <Link href="/team" data-testid="link-team" className="block p-5 rounded-2xl border border-cyan-500/30 bg-black/40 hover:bg-cyan-900/20 transition-colors group">
            <Users className="w-6 h-6 text-cyan-500 mb-2 group-hover:animate-pulse" />
            <h3 className="font-black text-lg text-cyan-400 mb-1 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" style={{fontFamily: "'Orbitron', sans-serif"}}>MY TEAM</h3>
            <p className="text-[10px] font-mono text-gray-500">Roster & token info</p>
          </Link>

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

          {recentResults.length > 0 && (
            <div className="col-span-2 rounded-xl border border-gray-800 bg-black/30 p-3 space-y-1">
              <p className="text-[10px] font-mono text-gray-500 uppercase mb-2">Recent Results</p>
              <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {recentResults.map(m => {
                  const isHome = m.homeTeamId === team?.id;
                  const won = isHome ? (m.homeScore ?? 0) > (m.awayScore ?? 0) : (m.awayScore ?? 0) > (m.homeScore ?? 0);
                  const oppName = teamMap.get(isHome ? m.awayTeamId : m.homeTeamId)?.name || '???';
                  return (
                    <Link key={m.id} href={`/match/${m.id}`}>
                      <div data-testid={`result-match-${m.id}`} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-900/40 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-gray-600">D{m.day}</span>
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

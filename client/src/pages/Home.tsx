import { useGameStore } from "@/lib/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageTip from "@/components/PageTip";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Terminal, ShieldAlert, Calendar, Swords, Shield, ListOrdered, RotateCcw, Zap, Trophy, Play, Pencil, Check, X, ScrollText, Dumbbell, Users, Coins, Clock, Eye, Target, Crosshair, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { SimPlayer } from "@/lib/calculations";
import logoImg from "@/assets/images/logo-neon-dugout.png";
import confetti from "canvas-confetti";
import winIcon from "@/assets/images/icons/win.png";
import playoffIcon from "@/assets/images/icons/playoff.png";

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

const RADAR_ATTRS = ['POW', 'CON', 'SPD', 'EYE', 'DEF', 'VEL', 'CTL', 'MOV', 'STA'] as const;
const RADAR_KEYS = ['pow', 'con', 'spd', 'eye', 'def', 'vel', 'ctl', 'mov', 'sta'] as const;

function RadarChart({ myPlayers, oppPlayers }: { myPlayers: PlayerInfo[]; oppPlayers: PlayerInfo[] }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 70;
  const n = RADAR_ATTRS.length;

  const avg = (pls: PlayerInfo[], key: string) => {
    if (!pls.length) return 0;
    return pls.reduce((s, p) => s + ((p as any)[key] ?? 0), 0) / pls.length;
  };

  const myVals = RADAR_KEYS.map(k => avg(myPlayers, k));
  const oppVals = RADAR_KEYS.map(k => avg(oppPlayers, k));
  const globalMax = Math.max(...myVals, ...oppVals, 1);

  const toPoint = (idx: number, val: number) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    const r = (val / globalMax) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const poly = (vals: number[]) => vals.map((v, i) => { const p = toPoint(i, v); return `${p.x},${p.y}`; }).join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg data-testid="radar-chart-preview" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {gridLevels.map(lev => (
        <polygon
          key={lev}
          points={Array.from({ length: n }, (_, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
            const r = lev * maxR;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(100,100,100,0.2)"
          strokeWidth="0.5"
        />
      ))}
      {RADAR_ATTRS.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)} stroke="rgba(100,100,100,0.15)" strokeWidth="0.5" />
        );
      })}
      <polygon points={poly(oppVals)} fill="rgba(236,72,153,0.15)" stroke="#ec4899" strokeWidth="1.5" />
      <polygon points={poly(myVals)} fill="rgba(34,211,238,0.2)" stroke="#22d3ee" strokeWidth="1.5" />
      {RADAR_ATTRS.map((label, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + (maxR + 14) * Math.cos(angle);
        const ly = cy + (maxR + 14) * Math.sin(angle);
        return (
          <text key={label} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill="#9ca3af" fontSize="7" fontFamily="monospace">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const target = new Date(now);
      target.setUTCHours(23, 0, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setUTCDate(target.getUTCDate() + 1);
      }
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);
  return timeLeft;
}

export default function Home() {
  const { walletAddress, disconnectWallet, team, players, loading, token } = useGameStore();
  const { signMessage } = useWallet();
  const [lastResult, setLastResult] = useState<{ home: string; away: string; hs: number; as: number; matchId: number } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showOppLineup, setShowOppLineup] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const countdown = useCountdown();

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const { data: trainingConfigs } = useQuery<{ gameType: string; rewardAttributes: string[] }[]>({
    queryKey: ['training-configs'],
    queryFn: async () => {
      const res = await fetch('/api/training-configs');
      return res.json();
    },
  });

  const getConfigAttrs = (gameType: string) => {
    const cfg = trainingConfigs?.find(c => c.gameType === gameType);
    return cfg?.rewardAttributes?.map(a => a.toUpperCase()).join("/") || null;
  };

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

  const { data: oppLineupData } = useQuery<{ battingOrder: number[]; fieldPositions: Record<string, number | null> } | null>({
    queryKey: ['opponent-lineup', opponentId],
    queryFn: async () => {
      const res = await fetch(`/api/lineup/${opponentId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!opponentId && opponentId !== 0 && showOppLineup,
  });

  const { data: oppTactics } = useQuery<{
    attackStyle: string;
    batterApproach: string;
    offensiveAttack: string;
    infieldPosition: string;
    outfieldPosition: string;
    defenseSetup: string;
  } | null>({
    queryKey: ['opponent-tactics', opponentId],
    queryFn: async () => {
      const res = await fetch(`/api/tactics/${opponentId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!opponentId && opponentId !== 0,
  });

  const realMatches = allMatchesRaw.filter(m => m.homeTeamId !== 0 && m.awayTeamId !== 0);
  const unfilledPlayoffs = allMatchesRaw.filter(m => (m.homeTeamId === 0 || m.awayTeamId === 0) && !m.played);
  const seasonFinished = realMatches.length > 0 && realMatches.every(m => m.played) && unfilledPlayoffs.length === 0;

  const [welcomeBanner, setWelcomeBanner] = useState<{ type: 'win' | 'playoff' | 'champion' | 'new_season'; text: string } | null>(null);

  const { data: adminMessages = [], refetch: refetchMessages } = useQuery<any[]>({
    queryKey: ['admin-messages', walletAddress],
    queryFn: async () => {
      const res = await fetch(`/api/messages?wallet=${walletAddress}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!walletAddress,
  });

  const dismissAdminMessage = async (msgId: number) => {
    await fetch(`/api/messages/${msgId}/dismiss`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet: walletAddress }) });
    refetchMessages();
  };

  const fireConfetti = useCallback(() => {
    const duration = 1500;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#22d3ee', '#ec4899', '#f59e0b'] });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#22d3ee', '#ec4899', '#f59e0b'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  useEffect(() => {
    if (!team || !allMatchesRaw.length || !allTeamsRaw.length) return;
    const storageKey = `nd_welcome_${team.id}_s${currentSeason}`;
    if (sessionStorage.getItem(storageKey)) return;

    const myMatches = allMatchesRaw.filter(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
    const playedMatches = myMatches.filter(m => m.played).sort((a, b) => b.day - a.day);

    const myPlayoffMatches = myMatches.filter(m => m.matchType === 'playoff' || m.matchType === 'interleague');
    const playedPlayoffs = myPlayoffMatches.filter(m => m.played).sort((a, b) => b.day - a.day);

    const isInPlayoff = myPlayoffMatches.length > 0 && myPlayoffMatches.some(m => !m.played);

    const allMyMatchesPlayed = myMatches.length > 0 && myMatches.every(m => m.played);
    const wonLastPlayoff = playedPlayoffs.length > 0 && (() => {
      const last = playedPlayoffs[0];
      const isHome = last.homeTeamId === team.id;
      return isHome ? (last.homeScore ?? 0) > (last.awayScore ?? 0) : (last.awayScore ?? 0) > (last.homeScore ?? 0);
    })();

    if (allMyMatchesPlayed && playedPlayoffs.length > 0 && wonLastPlayoff) {
      setWelcomeBanner({ type: 'champion', text: 'CHAMPION!' });
      sessionStorage.setItem(storageKey, 'champion');
      setTimeout(fireConfetti, 300);
      return;
    }

    if (isInPlayoff) {
      setWelcomeBanner({ type: 'playoff', text: 'PLAYOFF!' });
      sessionStorage.setItem(storageKey, 'playoff');
      return;
    }

    if (playedMatches.length === 0) {
      setWelcomeBanner({ type: 'new_season', text: 'NEW SEASON' });
      sessionStorage.setItem(storageKey, 'new_season');
      return;
    }

    const lastMatch = playedMatches[0];
    const isHome = lastMatch.homeTeamId === team.id;
    const won = isHome ? (lastMatch.homeScore ?? 0) > (lastMatch.awayScore ?? 0) : (lastMatch.awayScore ?? 0) > (lastMatch.homeScore ?? 0);

    if (won) {
      setWelcomeBanner({ type: 'win', text: 'YOU WON!' });
      sessionStorage.setItem(storageKey, 'win');
      setTimeout(fireConfetti, 300);
      return;
    }

    sessionStorage.setItem(storageKey, 'none');
  }, [team, allMatchesRaw, allTeamsRaw, currentSeason, fireConfetti]);

  const oppPlayerMap = useMemo(() => {
    const map = new Map<number, PlayerInfo>();
    if (opponentPlayers) {
      for (const p of opponentPlayers) map.set(p.id, p);
    }
    return map;
  }, [opponentPlayers]);

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
                className="bg-black/80 border border-pink-500/50 text-pink-500 font-black uppercase text-xl px-2 py-1 rounded-lg outline-none focus:border-pink-400 w-48"
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
              <h1 data-testid="text-team-name" className="text-xl font-black uppercase text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
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
        {welcomeBanner && (
          <div
            data-testid={`banner-${welcomeBanner.type}`}
            className={`relative overflow-hidden rounded-2xl border-2 p-4 text-center animate-in fade-in slide-in-from-top-4 duration-700 ${
              welcomeBanner.type === 'win'
                ? 'border-cyan-400/60 bg-gradient-to-r from-cyan-950/40 to-cyan-900/20'
                : welcomeBanner.type === 'champion'
                ? 'border-amber-400/60 bg-gradient-to-r from-amber-950/40 to-pink-950/20'
                : welcomeBanner.type === 'playoff'
                ? 'border-pink-400/60 bg-gradient-to-r from-pink-950/40 to-cyan-950/20'
                : 'border-cyan-500/40 bg-gradient-to-r from-cyan-950/30 to-pink-950/20'
            }`}
            style={{
              boxShadow: welcomeBanner.type === 'champion'
                ? '0 0 30px rgba(245,158,11,0.4), inset 0 0 30px rgba(245,158,11,0.1)'
                : welcomeBanner.type === 'playoff'
                ? '0 0 25px rgba(236,72,153,0.4), inset 0 0 25px rgba(236,72,153,0.1)'
                : welcomeBanner.type === 'win'
                ? '0 0 20px rgba(34,211,238,0.3)'
                : '0 0 15px rgba(34,211,238,0.2)',
            }}
          >
            {(welcomeBanner.type === 'win' || welcomeBanner.type === 'champion') && (
              <img
                src={welcomeBanner.type === 'champion' ? winIcon : winIcon}
                alt=""
                className="w-10 h-10 mx-auto mb-2 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              />
            )}
            {welcomeBanner.type === 'playoff' && (
              <img
                src={playoffIcon}
                alt=""
                className="w-10 h-10 mx-auto mb-2 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]"
              />
            )}
            <h2
              className={`text-2xl font-black uppercase tracking-wider ${
                welcomeBanner.type === 'champion'
                  ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]'
                  : welcomeBanner.type === 'playoff'
                  ? 'text-pink-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]'
                  : welcomeBanner.type === 'win'
                  ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]'
                  : 'text-cyan-300'
              }`}
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              {welcomeBanner.text}
            </h2>
            <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-wider">
              {welcomeBanner.type === 'champion' ? 'You conquered the bracket!'
                : welcomeBanner.type === 'playoff' ? 'Your team made the playoffs!'
                : welcomeBanner.type === 'win' ? 'Great game, manager!'
                : `Season ${currentSeason} has begun`}
            </p>
            <button
              data-testid="button-dismiss-banner"
              onClick={() => setWelcomeBanner(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {adminMessages.length > 0 && (
          <div className="space-y-2">
            {adminMessages.map((msg: any) => (
              <div
                key={msg.id}
                data-testid={`admin-msg-${msg.id}`}
                className="relative p-3 rounded-xl border border-amber-500/40 bg-amber-950/20 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-400 text-xs font-bold">!</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-amber-200 leading-relaxed">{msg.message}</p>
                  <p className="text-[9px] font-mono text-gray-500 mt-1">
                    {msg.targetType === 'all' ? 'ALL' : msg.targetType.toUpperCase()}: {msg.targetValue || 'everyone'}
                  </p>
                </div>
                <button
                  data-testid={`dismiss-msg-${msg.id}`}
                  onClick={() => dismissAdminMessage(msg.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 hover:bg-green-500/40 border border-green-500/40 flex items-center justify-center transition-colors"
                >
                  <Check className="w-3 h-3 text-green-400" />
                </button>
              </div>
            ))}
          </div>
        )}

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
            <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-pink-950/20 text-center space-y-2">
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

        {!seasonFinished && nextUnplayedDay && (
          <div data-testid="countdown-next-game" className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border-2 border-red-500/40 bg-red-950/20" style={{boxShadow: '0 0 15px rgba(239,68,68,0.3)'}}>
            <Clock className="w-3 h-3 text-red-500/50" />
            <span className="text-[10px] font-mono text-red-400/60 uppercase tracking-wider">NEXT GAME IN</span>
            <span data-testid="text-countdown" className="text-xs font-black text-red-400 tracking-widest" style={{fontFamily: "'Orbitron', sans-serif"}}>{countdown}</span>
          </div>
        )}

        <div className="rounded-2xl border-2 animate-border-glitter bg-gradient-to-r from-amber-950/30 to-orange-950/30 overflow-hidden p-5">
          <div className="flex items-center gap-3 mb-4">
            <Dumbbell className="w-7 h-7 text-amber-400" />
            <div>
              <h3 className="font-black text-xl text-amber-400" style={{fontFamily: "'Orbitron', sans-serif"}}>TRAINING CENTER</h3>
              <p className="text-[10px] font-mono text-gray-500">Play minigames to boost your players' attributes</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/training/eye-drill" data-testid="link-minigame-eye" className="block p-3 rounded-xl border border-amber-500/25 bg-black/50 hover:bg-amber-900/20 transition-colors group/card text-center">
              <Eye className="w-5 h-5 text-amber-400 mx-auto mb-1.5 group-hover/card:animate-pulse" />
              <h4 className="font-black text-xs text-amber-300 mb-1" style={{fontFamily: "'Orbitron', sans-serif"}}>EYE DRILL</h4>
              <p className="text-[9px] font-mono text-gray-500 leading-tight">Reaction · {getConfigAttrs("eye_drill") || "EYE"}</p>
            </Link>
            <Link href="/training/batting" data-testid="link-minigame-batting" className="block p-3 rounded-xl border border-amber-500/25 bg-black/50 hover:bg-amber-900/20 transition-colors group/card text-center">
              <Target className="w-5 h-5 text-amber-400 mx-auto mb-1.5 group-hover/card:animate-pulse" />
              <h4 className="font-black text-xs text-amber-300 mb-1" style={{fontFamily: "'Orbitron', sans-serif"}}>BATTING</h4>
              <p className="text-[9px] font-mono text-gray-500 leading-tight">Swing · {getConfigAttrs("batting_practice") || "CON/POW"}</p>
            </Link>
            <Link href="/training/pitch-control" data-testid="link-minigame-pitch" className="block p-3 rounded-xl border border-amber-500/25 bg-black/50 hover:bg-amber-900/20 transition-colors group/card text-center">
              <Crosshair className="w-5 h-5 text-amber-400 mx-auto mb-1.5 group-hover/card:animate-pulse" />
              <h4 className="font-black text-xs text-amber-300 mb-1" style={{fontFamily: "'Orbitron', sans-serif"}}>PITCH CTL</h4>
              <p className="text-[9px] font-mono text-gray-500 leading-tight">Accuracy · {getConfigAttrs("pitch_control") || "CTL"}</p>
            </Link>
          </div>
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
          <Link href="/pitchers" data-testid="link-pitchers" className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-pink-500/20 bg-black/30 hover:bg-pink-900/20 transition-colors group">
            <RotateCcw className="w-4 h-4 text-pink-500 group-hover:animate-pulse" />
            <span className="font-bold text-sm text-pink-400 uppercase" style={{fontFamily: "'Orbitron', sans-serif"}}>PITCHERS</span>
          </Link>
          <Link href="/lineup" data-testid="link-lineup" className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-cyan-500/20 bg-black/30 hover:bg-cyan-900/20 transition-colors group">
            <ListOrdered className="w-4 h-4 text-cyan-500 group-hover:animate-pulse" />
            <span className="font-bold text-sm text-cyan-400 uppercase" style={{fontFamily: "'Orbitron', sans-serif"}}>LINEUP</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              <p className="text-[10px] font-mono text-gray-500 text-center">Admin will start next season</p>
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
                <div className="p-3 rounded-lg border border-cyan-500/20 bg-black/30 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase">{team?.name}</span>
                    <span className="text-[9px] font-mono text-gray-600 uppercase">Radar Preview</span>
                    <span className="text-[10px] font-mono text-pink-400 uppercase">{teamMap.get(opponentId!)?.name}</span>
                  </div>
                  <RadarChart myPlayers={(players || []) as PlayerInfo[]} oppPlayers={opponentPlayers} />
                  <div className="flex justify-between items-center gap-2">
                    <Link href="/lineup" data-testid="link-my-lineup-preview" className="flex-1 text-center py-1.5 px-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase">MY LINEUP</span>
                    </Link>
                    <button
                      data-testid="button-opp-lineup-toggle"
                      onClick={() => setShowOppLineup(!showOppLineup)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 transition-colors"
                    >
                      <span className="text-[10px] font-mono text-pink-400 uppercase">OPP LINEUP</span>
                      {showOppLineup ? <ChevronUp className="w-3 h-3 text-pink-400" /> : <ChevronDown className="w-3 h-3 text-pink-400" />}
                    </button>
                  </div>
                  {showOppLineup && (
                    <div className="border border-pink-500/20 rounded-lg bg-black/40 p-2 space-y-1">
                      {oppLineupData?.battingOrder && oppLineupData.battingOrder.length > 0 ? (
                        <>
                          {oppLineupData.battingOrder.map((pid, idx) => {
                            const p = oppPlayerMap.get(pid);
                            const pos = Object.entries(oppLineupData.fieldPositions || {}).find(([, v]) => v === pid)?.[0] || '—';
                            return (
                              <div key={pid} data-testid={`opp-lineup-slot-${idx}`} className="flex items-center gap-2 py-0.5">
                                <span className="text-[9px] font-mono text-gray-600 w-4">{idx + 1}.</span>
                                <span className="text-[10px] font-mono text-pink-300">{p?.name || `#${pid}`}</span>
                                <span className="text-[9px] font-mono text-gray-500 ml-auto">{pos}</span>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <p data-testid="text-opp-no-lineup" className="text-[9px] font-mono text-gray-600 text-center py-1">No lineup set</p>
                      )}
                    </div>
                  )}
                  {oppTactics && (
                    <div data-testid="opp-tactics-preview" className="border border-pink-500/20 rounded-lg bg-black/40 p-2 space-y-1">
                      <p className="text-[9px] font-mono text-pink-400 uppercase tracking-wider mb-1">OPP TACTICS</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        <div className="flex justify-between">
                          <span data-testid="label-opp-attack-style" className="text-[9px] font-mono text-gray-500">Attack Style</span>
                          <span data-testid="value-opp-attack-style" className="text-[9px] font-mono text-pink-300 uppercase">{oppTactics.attackStyle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span data-testid="label-opp-batter-approach" className="text-[9px] font-mono text-gray-500">Batter Appr.</span>
                          <span data-testid="value-opp-batter-approach" className="text-[9px] font-mono text-pink-300 uppercase">{oppTactics.batterApproach}</span>
                        </div>
                        <div className="flex justify-between">
                          <span data-testid="label-opp-offensive-attack" className="text-[9px] font-mono text-gray-500">Off. Attack</span>
                          <span data-testid="value-opp-offensive-attack" className="text-[9px] font-mono text-pink-300 uppercase">{oppTactics.offensiveAttack}</span>
                        </div>
                        <div className="flex justify-between">
                          <span data-testid="label-opp-defense-setup" className="text-[9px] font-mono text-gray-500">Defense Setup</span>
                          <span data-testid="value-opp-defense-setup" className="text-[9px] font-mono text-pink-300 uppercase">{oppTactics.defenseSetup}</span>
                        </div>
                        <div className="flex justify-between">
                          <span data-testid="label-opp-infield" className="text-[9px] font-mono text-gray-500">Infield Pos.</span>
                          <span data-testid="value-opp-infield" className="text-[9px] font-mono text-pink-300 uppercase">{oppTactics.infieldPosition}</span>
                        </div>
                        <div className="flex justify-between">
                          <span data-testid="label-opp-outfield" className="text-[9px] font-mono text-gray-500">Outfield Pos.</span>
                          <span data-testid="value-opp-outfield" className="text-[9px] font-mono text-pink-300 uppercase">{oppTactics.outfieldPosition}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 border-red-500/40 bg-red-950/20" style={{boxShadow: '0 0 15px rgba(239,68,68,0.3)'}}>
                <Clock className="w-3 h-3 text-red-500/50" />
                <span className="text-[10px] font-mono text-red-400/60">NEXT GAME IN </span>
                <span data-testid="text-countdown-preview" className="text-[10px] font-black text-red-400 tracking-wider" style={{fontFamily: "'Orbitron', sans-serif"}}>{countdown}</span>
              </div>
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

        <div className="p-4 rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-transparent">
          <h3 className="font-mono text-sm text-pink-300 mb-2">OWNER REGISTRY</h3>
          <p data-testid="text-wallet" className="text-xs break-all text-gray-400 bg-black/50 p-3 rounded font-mono border border-gray-800">
            {walletAddress}
          </p>
        </div>
      </main>
      <PageTip route="/" message="This is your command center. Check match results and prepare for the next game." />
    </div>
  );
}

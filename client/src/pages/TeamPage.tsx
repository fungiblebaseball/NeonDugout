import { useGameStore } from "@/lib/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Coins, Users, RotateCcw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useMemo } from "react";

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
  powAdd: number;
  conAdd: number;
  spdAdd: number;
  eyeAdd: number;
  velAdd: number;
  ctlAdd: number;
  movAdd: number;
  staAdd: number;
  defAdd: number;
}

interface TokenBalance {
  balance: number;
  lastClaimAt: string | null;
  canClaim: boolean;
  nextClaimAt: string | null;
}

interface LineupData {
  battingOrder: number[];
  fieldPositions: Record<string, number | null>;
}

const ATTRS = ['pow', 'con', 'spd', 'eye', 'vel', 'ctl', 'mov', 'sta', 'def'] as const;
const ATTR_LABELS: Record<string, string> = {
  pow: 'POW', con: 'CON', spd: 'SPD', eye: 'EYE',
  vel: 'VEL', ctl: 'CTL', mov: 'MOV', sta: 'STA', def: 'DEF',
};

type SortDir = 'asc' | 'desc' | null;

function getBase(p: PlayerData, key: string): number {
  return (p as any)[key] ?? 0;
}
function getAdd(p: PlayerData, key: string): number {
  return (p as any)[`${key}Add`] ?? 0;
}
function getTotal(p: PlayerData, key: string): number {
  return Math.min(99, getBase(p, key) + getAdd(p, key));
}

export default function TeamPage() {
  const { walletAddress, user, team, token } = useGameStore();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: rosterPlayers = [] } = useQuery<PlayerData[]>({
    queryKey: ['team-players', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/team/${team!.id}/players`);
      return res.json();
    },
    enabled: !!team,
    refetchOnMount: 'always',
  });

  const { data: tokenData } = useQuery<TokenBalance>({
    queryKey: ['token-balance'],
    queryFn: async () => {
      const res = await fetch('/api/tokens/balance', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return { balance: 0, lastClaimAt: null, canClaim: false, nextClaimAt: null };
      return res.json();
    },
    enabled: !!token,
  });

  const { data: lineupData } = useQuery<LineupData | null>({
    queryKey: ['lineup', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/lineup/${team!.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!team,
    refetchOnMount: 'always',
  });

  const battingOrderMap = useMemo(() => {
    const map = new Map<number, number>();
    if (lineupData?.battingOrder) {
      lineupData.battingOrder.forEach((pid, idx) => map.set(pid, idx + 1));
    }
    return map;
  }, [lineupData]);

  const fieldPosMap = useMemo(() => {
    const map = new Map<number, string>();
    if (lineupData?.fieldPositions) {
      for (const [pos, pid] of Object.entries(lineupData.fieldPositions)) {
        if (pid) map.set(pid, pos);
      }
    }
    return map;
  }, [lineupData]);

  const handleSort = (attr: string) => {
    if (sortKey === attr) {
      if (sortDir === 'desc') {
        setSortDir('asc');
      } else if (sortDir === 'asc') {
        setSortKey(null);
        setSortDir(null);
      } else {
        setSortDir('desc');
      }
    } else {
      setSortKey(attr);
      setSortDir('desc');
    }
  };

  const sortedPlayers = useMemo(() => {
    if (!sortKey || !sortDir) return rosterPlayers;
    return [...rosterPlayers].sort((a, b) => {
      const aVal = getTotal(a, sortKey);
      const bVal = getTotal(b, sortKey);
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [rosterPlayers, sortKey, sortDir]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['team-players'] }),
      queryClient.invalidateQueries({ queryKey: ['lineup'] }),
      queryClient.invalidateQueries({ queryKey: ['pitcher-rotation'] }),
    ]);
    setTimeout(() => setRefreshing(false), 600);
  };

  if (!walletAddress || !team) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-cyan-400 font-mono animate-pulse">LOADING TEAM DATA...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-4 bg-gradient-to-b from-cyan-900/30 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-md flex items-center gap-3">
        <button data-testid="button-back" onClick={() => navigate("/")} className="p-2 rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div>
          <h1 data-testid="text-page-title" className="text-lg font-black uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            MY TEAM
          </h1>
          <p className="text-[10px] font-mono text-cyan-200/60">Owner Dashboard</p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="p-4 rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-transparent space-y-3">
          <h3 className="font-mono text-sm text-pink-300 uppercase">User Info</h3>
          <div className="space-y-2">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase">Wallet Address</span>
              <p data-testid="text-wallet-address" className="text-xs break-all text-gray-400 bg-black/50 p-2 rounded font-mono border border-gray-800 mt-1">
                {walletAddress}
              </p>
            </div>
            {(user as any)?.createdAt && (
              <div>
                <span className="text-[10px] font-mono text-gray-500 uppercase">Registered</span>
                <p data-testid="text-registered-date" className="text-xs text-gray-400 font-mono mt-1">
                  {new Date((user as any).createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent space-y-3">
          <h3 className="font-mono text-sm text-cyan-300 uppercase">Team Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase">Team Name</span>
              <p data-testid="text-team-name" className="text-sm font-black text-pink-400 mt-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {team.name}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase">Primary Color</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-4 h-4 rounded-full border border-gray-700" style={{ backgroundColor: team.primaryColor }} />
                <span className="text-xs font-mono text-gray-400">{team.primaryColor}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase">League</span>
              <p data-testid="text-league" className="text-xs font-mono text-cyan-300 mt-1">{team.league}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase">Series</span>
              <p data-testid="text-series" className="text-xs font-mono text-cyan-300 mt-1">Serie {team.series}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase">Division</span>
              <p data-testid="text-division" className="text-xs font-mono text-cyan-300 mt-1">Div {team.division}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent space-y-3">
          <h3 className="font-mono text-sm text-amber-300 uppercase flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Token Balance
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🪙</span>
              <span data-testid="text-token-balance" className="text-2xl font-black text-amber-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {tokenData?.balance ?? 0}
              </span>
            </div>
            {tokenData?.canClaim && (
              <Link href="/">
                <button data-testid="button-claim-tokens" className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-xs uppercase tracking-wider rounded-lg transition-all">
                  CLAIM TOKENS
                </button>
              </Link>
            )}
          </div>
          {tokenData?.nextClaimAt && !tokenData.canClaim && (
            <p data-testid="text-next-claim" className="text-[10px] font-mono text-gray-500">
              Next claim available: {new Date(tokenData.nextClaimAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-black/40 overflow-hidden">
          <div className="p-4 border-b border-cyan-500/20 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono text-sm text-cyan-300 uppercase">Roster ({rosterPlayers.length} players)</h3>
            <button
              data-testid="button-refresh-roster"
              onClick={handleRefresh}
              className="ml-auto p-1.5 rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-colors"
              title="Refresh roster data"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-gray-400 hover:text-cyan-400 transition-colors ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-3 py-2 text-[9px] font-mono text-gray-500 uppercase sticky left-0 bg-black/90 z-10">Player</th>
                  <th className="px-2 py-2 text-[9px] font-mono text-gray-500 uppercase">Pos</th>
                  <th className="px-1.5 py-2 text-[9px] font-mono text-green-500/70 uppercase text-center min-w-[28px]">#</th>
                  <th className="px-1.5 py-2 text-[9px] font-mono text-green-500/70 uppercase text-center min-w-[32px]">FLD</th>
                  {ATTRS.map(attr => (
                    <th
                      key={attr}
                      data-testid={`sort-header-${attr}`}
                      onClick={() => handleSort(attr)}
                      className="px-1.5 py-2 text-[9px] font-mono text-gray-500 uppercase text-center min-w-[52px] cursor-pointer hover:text-cyan-400 transition-colors select-none"
                    >
                      {ATTR_LABELS[attr]}
                      {sortKey === attr && (
                        <span className="ml-0.5 text-cyan-400">{sortDir === 'desc' ? '▼' : '▲'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map(player => {
                  const batOrder = battingOrderMap.get(player.id);
                  const fieldPos = fieldPosMap.get(player.id);
                  return (
                    <tr
                      key={player.id}
                      data-testid={`row-player-${player.id}`}
                      onClick={() => navigate(`/player/${player.id}`)}
                      className="border-b border-gray-800/50 hover:bg-cyan-900/10 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2 sticky left-0 bg-black/90 z-10">
                        <Link href={`/player/${player.id}`} data-testid={`link-player-${player.id}`} className="text-xs font-bold text-cyan-300 hover:text-cyan-200 whitespace-nowrap">
                          {player.name}
                        </Link>
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-[10px] font-mono text-pink-400">{player.positions.join('/')}</span>
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        <span data-testid={`text-bat-order-${player.id}`} className={`text-[10px] font-mono ${batOrder ? 'text-green-400 font-bold' : 'text-gray-700'}`}>
                          {batOrder ?? '—'}
                        </span>
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        <span data-testid={`text-field-pos-${player.id}`} className={`text-[10px] font-mono ${fieldPos ? 'text-green-400' : 'text-gray-700'}`}>
                          {fieldPos ?? '—'}
                        </span>
                      </td>
                      {ATTRS.map(attr => {
                        const base = getBase(player, attr);
                        const add = getAdd(player, attr);
                        const total = getTotal(player, attr);
                        return (
                          <td key={attr} className="px-1.5 py-2 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-black text-cyan-300" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                                {total}
                              </span>
                              {add > 0 && (
                                <span className="text-[8px] font-mono text-amber-400">
                                  {base}+{add}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

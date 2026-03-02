import { useGameStore } from "@/lib/store";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Coins, Users, RotateCcw, DollarSign } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/hooks/use-toast";

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
  const [pendingColor, setPendingColor] = useState<string | null>(null);
  const [sellPlayer, setSellPlayer] = useState<PlayerData | null>(null);
  const [sellPrice, setSellPrice] = useState('10');
  const [sellStatus, setSellStatus] = useState<'idle' | 'signing' | 'confirming' | 'done' | 'error'>('idle');
  const { signMessage } = useWallet();
  const { toast } = useToast();

  const colorMutation = useMutation({
    mutationFn: async (color: string) => {
      const res = await fetch(`/api/team/${team!.id}/color`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ color }),
      });
      if (!res.ok) throw new Error('Failed to update color');
      return res.json();
    },
    onSuccess: (updatedTeam) => {
      useGameStore.setState({ team: { ...team!, primaryColor: updatedTeam.primaryColor } });
      setPendingColor(null);
    },
  });

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

  const isInLineup = (playerId: number) => {
    if (!lineupData) return false;
    const inBatting = lineupData.battingOrder.includes(playerId);
    const inField = Object.values(lineupData.fieldPositions).includes(playerId);
    return inBatting || inField;
  };

  const handleSellConfirm = async () => {
    if (!sellPlayer || !token || !signMessage) return;
    const price = parseInt(sellPrice);
    if (!price || price < 1) return;

    setSellStatus('signing');
    try {
      const challengeRes = await fetch('/api/market/sell/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ playerId: sellPlayer.id, price }),
      });
      if (!challengeRes.ok) {
        const err = await challengeRes.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
        setSellStatus('error');
        return;
      }
      const challenge = await challengeRes.json();

      const messageBytes = new TextEncoder().encode(challenge.message);
      const sig = await signMessage(messageBytes);
      const signature = Buffer.from(sig).toString('base64');

      setSellStatus('confirming');
      const confirmRes = await fetch('/api/market/sell/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ playerId: sellPlayer.id, price, signature, message: challenge.message }),
      });
      if (confirmRes.ok) {
        setSellStatus('done');
        toast({ title: 'Listed!', description: `${sellPlayer.name} listed for ${price} tokens` });
        queryClient.invalidateQueries({ queryKey: ['team-players'] });
        queryClient.invalidateQueries({ queryKey: ['market-listings'] });
        setTimeout(() => { setSellPlayer(null); setSellStatus('idle'); }, 1000);
      } else {
        const err = await confirmRes.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
        setSellStatus('error');
      }
    } catch (err) {
      console.error('Sell failed:', err);
      setSellStatus('error');
      toast({ title: 'Error', description: 'Transaction cancelled or failed', variant: 'destructive' });
    }
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
        <div className="p-2.5 rounded-xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-transparent">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-gray-500 uppercase shrink-0">Wallet</span>
            <p data-testid="text-wallet-address" className="text-[10px] break-all text-gray-400 bg-black/50 px-2 py-1 rounded font-mono border border-gray-800 flex-1 truncate">
              {walletAddress}
            </p>
            {(user as any)?.createdAt && (
              <span data-testid="text-registered-date" className="text-[9px] text-gray-500 font-mono shrink-0">
                {new Date((user as any).createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p data-testid="text-team-name" className="text-sm font-black text-pink-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {team.name}
              </p>
              <label className="relative cursor-pointer">
                <input
                  data-testid="input-team-color"
                  type="color"
                  value={pendingColor ?? team.primaryColor}
                  onChange={(e) => setPendingColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-5 h-5 rounded-full border-2 border-gray-600 hover:border-cyan-400 transition-colors" style={{ backgroundColor: pendingColor ?? team.primaryColor }} />
              </label>
              {pendingColor && pendingColor !== team.primaryColor && (
                <button
                  data-testid="button-save-color"
                  onClick={() => colorMutation.mutate(pendingColor)}
                  disabled={colorMutation.isPending}
                  className="px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-[9px] uppercase tracking-wider rounded transition-all disabled:opacity-50"
                >
                  {colorMutation.isPending ? '...' : 'SAVE'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
              <span data-testid="text-league">{team.league}</span>
              <span className="text-gray-600">·</span>
              <span data-testid="text-series">S{team.series}</span>
              <span className="text-gray-600">·</span>
              <span data-testid="text-division">D{team.division}</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-cyan-500/10">
            <div className="flex items-center gap-2">
              <span className="text-lg">🪙</span>
              <span data-testid="text-token-balance" className="text-lg font-black text-amber-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {tokenData?.balance ?? 0}
              </span>
              {tokenData?.canClaim && (
                <Link href="/">
                  <button data-testid="button-claim-tokens" className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-[9px] uppercase tracking-wider rounded transition-all">
                    CLAIM
                  </button>
                </Link>
              )}
              {tokenData?.nextClaimAt && !tokenData.canClaim && (
                <span data-testid="text-next-claim" className="text-[9px] font-mono text-gray-500">
                  Next: {new Date(tokenData.nextClaimAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-black/40 overflow-hidden">
          <div className="px-3 py-2 border-b border-cyan-500/20 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="font-mono text-xs text-cyan-300 uppercase">Roster ({rosterPlayers.length})</h3>
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
                  <th className="px-2 py-1.5 text-[9px] font-mono text-gray-500 uppercase sticky left-0 bg-black/90 z-10">Player</th>
                  <th className="px-1.5 py-1.5 text-[9px] font-mono text-gray-500 uppercase">Pos</th>
                  <th className="px-1 py-1.5 text-[9px] font-mono text-green-500/70 uppercase text-center min-w-[24px]">#</th>
                  <th className="px-1 py-1.5 text-[9px] font-mono text-green-500/70 uppercase text-center min-w-[28px]">FLD</th>
                  <th className="px-1 py-1.5 text-[9px] font-mono text-amber-500/70 uppercase text-center min-w-[32px]">SELL</th>
                  {ATTRS.map(attr => (
                    <th
                      key={attr}
                      data-testid={`sort-header-${attr}`}
                      onClick={() => handleSort(attr)}
                      className="px-1 py-1.5 text-[9px] font-mono text-gray-500 uppercase text-center min-w-[44px] cursor-pointer hover:text-cyan-400 transition-colors select-none"
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
                      <td className="px-2 py-1 sticky left-0 bg-black/90 z-10">
                        <Link href={`/player/${player.id}`} data-testid={`link-player-${player.id}`} className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 whitespace-nowrap">
                          {player.name}
                        </Link>
                      </td>
                      <td className="px-1.5 py-1">
                        <span className="text-[9px] font-mono text-pink-400">{player.positions.join('/')}</span>
                      </td>
                      <td className="px-1 py-1 text-center">
                        <span data-testid={`text-bat-order-${player.id}`} className={`text-[9px] font-mono ${batOrder ? 'text-green-400 font-bold' : 'text-gray-700'}`}>
                          {batOrder ?? '—'}
                        </span>
                      </td>
                      <td className="px-1 py-1 text-center">
                        <span data-testid={`text-field-pos-${player.id}`} className={`text-[9px] font-mono ${fieldPos ? 'text-green-400' : 'text-gray-700'}`}>
                          {fieldPos ?? '—'}
                        </span>
                      </td>
                      <td className="px-1 py-1 text-center">
                        {isInLineup(player.id) ? (
                          <span className="text-[7px] font-mono text-gray-600">IN USE</span>
                        ) : (
                          <button
                            data-testid={`button-sell-${player.id}`}
                            onClick={(e) => { e.stopPropagation(); setSellPlayer(player); setSellPrice('10'); setSellStatus('idle'); }}
                            className="px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-[8px] uppercase tracking-wider rounded transition-all"
                          >
                            SELL
                          </button>
                        )}
                      </td>
                      {ATTRS.map(attr => {
                        const base = getBase(player, attr);
                        const add = getAdd(player, attr);
                        const total = getTotal(player, attr);
                        return (
                          <td key={attr} className="px-1 py-1 text-center">
                            <div className="flex flex-col items-center leading-tight">
                              <span className="text-[11px] font-black text-cyan-300" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                                {total}
                              </span>
                              {add > 0 && (
                                <span className="text-[7px] font-mono text-amber-400">
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

      {sellPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => sellStatus === 'idle' && setSellPlayer(null)}>
          <div className="bg-gray-900 border border-amber-500/40 rounded-xl p-5 w-full max-w-sm shadow-[0_0_30px_rgba(245,158,11,0.2)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-amber-400 uppercase mb-3" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              SELL PLAYER
            </h3>
            <div className="flex items-center gap-2 mb-3 p-2 bg-black/50 rounded-lg border border-gray-800">
              <span className="text-xs font-bold text-cyan-300">{sellPlayer.name}</span>
              <span className="text-[9px] font-mono text-pink-400">{sellPlayer.positions.join('/')}</span>
            </div>
            <div className="mb-4">
              <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Price (tokens)</label>
              <input
                data-testid="input-sell-price"
                type="number"
                min="1"
                value={sellPrice}
                onChange={e => setSellPrice(e.target.value)}
                disabled={sellStatus !== 'idle'}
                className="w-full px-3 py-2 bg-black border border-amber-500/30 rounded-lg text-amber-300 font-mono text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                data-testid="button-cancel-sell"
                onClick={() => { setSellPlayer(null); setSellStatus('idle'); }}
                disabled={sellStatus === 'signing' || sellStatus === 'confirming'}
                className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 font-mono text-[10px] uppercase tracking-wider rounded-lg transition-all disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                data-testid="button-confirm-sell"
                onClick={handleSellConfirm}
                disabled={sellStatus !== 'idle' || !sellPrice || parseInt(sellPrice) < 1}
                className="flex-1 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-mono text-[10px] uppercase tracking-wider rounded-lg transition-all disabled:opacity-50"
              >
                {sellStatus === 'idle' ? 'CONFIRM & SIGN' :
                 sellStatus === 'signing' ? 'SIGN WALLET...' :
                 sellStatus === 'confirming' ? 'PROCESSING...' :
                 sellStatus === 'done' ? '✓ LISTED' : 'ERROR — RETRY'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

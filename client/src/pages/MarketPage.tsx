import { useGameStore } from "@/lib/store";
import PageTip from "@/components/PageTip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Store, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/hooks/use-toast";

interface PlayerData {
  id: number;
  name: string;
  teamId: number | null;
  positions: string[];
  pow: number; con: number; spd: number; eye: number;
  vel: number; ctl: number; mov: number; sta: number; def: number;
  powAdd: number; conAdd: number; spdAdd: number; eyeAdd: number;
  velAdd: number; ctlAdd: number; movAdd: number; staAdd: number; defAdd: number;
}

interface MarketListing {
  id: number;
  playerId: number;
  sellerWallet: string;
  sellerTeamId: number;
  price: number;
  status: string;
  buyerWallet: string | null;
  listedAt: string;
  player: PlayerData;
}

interface SeasonStats {
  seasonId: number;
  gamesPlayed: number;
  ab: number; hits: number; hr: number; rbi: number; bb: number; so: number;
  ip: number; pitcherH: number; er: number; pitcherBb: number; pitcherSo: number;
  wins: number; losses: number;
}

function statAvg(p: PlayerData, keys: string[]): number {
  const sum = keys.reduce((a, k) => a + Math.min(99, ((p as any)[k] ?? 0) + ((p as any)[`${k}Add`] ?? 0)), 0);
  return Math.round(sum / keys.length);
}

export default function MarketPage() {
  const { walletAddress, team, token } = useGameStore();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { signMessage } = useWallet();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionStatus, setActionStatus] = useState<Record<number, string>>({});

  const { data: listings = [], isLoading } = useQuery<MarketListing[]>({
    queryKey: ['market-listings'],
    queryFn: async () => {
      const res = await fetch('/api/market/listings');
      return res.json();
    },
    refetchOnMount: 'always',
  });

  const { data: rosterCount = 0 } = useQuery<number>({
    queryKey: ['roster-count', team?.id],
    queryFn: async () => {
      const res = await fetch(`/api/team/${team!.id}/players`);
      const players = await res.json();
      return players.length;
    },
    enabled: !!team,
  });

  const { data: expandedStats } = useQuery<SeasonStats[]>({
    queryKey: ['listing-stats', expandedId],
    queryFn: async () => {
      const res = await fetch(`/api/market/listing/${expandedId}/stats`);
      return res.json();
    },
    enabled: !!expandedId,
  });

  const { data: tokenData } = useQuery<{ balance: number }>({
    queryKey: ['token-balance'],
    queryFn: async () => {
      const res = await fetch('/api/tokens/balance', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { balance: 0 };
      return res.json();
    },
    enabled: !!token,
  });

  const handleBuy = async (listing: MarketListing) => {
    if (!token || !signMessage || !team) return;
    setActionStatus(s => ({ ...s, [listing.id]: 'signing' }));
    try {
      const challengeRes = await fetch('/api/market/buy/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId: listing.id }),
      });
      if (!challengeRes.ok) {
        const err = await challengeRes.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
        setActionStatus(s => ({ ...s, [listing.id]: 'error' }));
        return;
      }
      const challenge = await challengeRes.json();
      const messageBytes = new TextEncoder().encode(challenge.message);
      const sig = await signMessage(messageBytes);
      const signature = Buffer.from(sig).toString('base64');

      setActionStatus(s => ({ ...s, [listing.id]: 'confirming' }));
      const confirmRes = await fetch('/api/market/buy/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId: listing.id, signature, message: challenge.message }),
      });
      if (confirmRes.ok) {
        setActionStatus(s => ({ ...s, [listing.id]: 'done' }));
        toast({ title: 'Acquired!', description: `${listing.player.name} joined your roster` });
        queryClient.invalidateQueries({ queryKey: ['market-listings'] });
        queryClient.invalidateQueries({ queryKey: ['team-players'] });
        queryClient.invalidateQueries({ queryKey: ['roster-count'] });
        queryClient.invalidateQueries({ queryKey: ['token-balance'] });
      } else {
        const err = await confirmRes.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
        setActionStatus(s => ({ ...s, [listing.id]: 'error' }));
      }
    } catch {
      setActionStatus(s => ({ ...s, [listing.id]: 'error' }));
      toast({ title: 'Error', description: 'Transaction cancelled or failed', variant: 'destructive' });
    }
  };

  const handleCancel = async (listing: MarketListing) => {
    if (!token || !signMessage) return;
    setActionStatus(s => ({ ...s, [listing.id]: 'signing' }));
    try {
      const challengeRes = await fetch('/api/market/cancel/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId: listing.id }),
      });
      if (!challengeRes.ok) {
        const err = await challengeRes.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
        setActionStatus(s => ({ ...s, [listing.id]: 'error' }));
        return;
      }
      const challenge = await challengeRes.json();
      const messageBytes = new TextEncoder().encode(challenge.message);
      const sig = await signMessage(messageBytes);
      const signature = Buffer.from(sig).toString('base64');

      setActionStatus(s => ({ ...s, [listing.id]: 'confirming' }));
      const confirmRes = await fetch('/api/market/cancel/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId: listing.id, signature, message: challenge.message }),
      });
      if (confirmRes.ok) {
        setActionStatus(s => ({ ...s, [listing.id]: 'done' }));
        toast({ title: 'Cancelled', description: `${listing.player.name} returned to roster` });
        queryClient.invalidateQueries({ queryKey: ['market-listings'] });
        queryClient.invalidateQueries({ queryKey: ['team-players'] });
        queryClient.invalidateQueries({ queryKey: ['roster-count'] });
      } else {
        const err = await confirmRes.json();
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
        setActionStatus(s => ({ ...s, [listing.id]: 'error' }));
      }
    } catch {
      setActionStatus(s => ({ ...s, [listing.id]: 'error' }));
      toast({ title: 'Error', description: 'Transaction cancelled or failed', variant: 'destructive' });
    }
  };

  const isMine = (l: MarketListing) => l.sellerWallet === walletAddress;
  const canBuy = (l: MarketListing) => {
    if (isMine(l)) return false;
    if (rosterCount >= 20) return false;
    if (l.sellerWallet === 'FREE_AGENT') return true;
    return (tokenData?.balance ?? 0) >= l.price;
  };

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-4 bg-gradient-to-b from-amber-900/20 to-black border-b border-amber-500/20 sticky top-0 z-10 backdrop-blur-md flex items-center gap-3">
        <button data-testid="button-back" onClick={() => navigate("/")} className="p-2 rounded-lg border border-gray-700 hover:border-amber-500/50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 data-testid="text-page-title" className="text-lg font-black uppercase text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            PLAYER MARKET
          </h1>
          <p className="text-[10px] font-mono text-amber-200/60">Buy & Sell Players</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🪙</span>
          <span data-testid="text-market-balance" className="text-sm font-black text-amber-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            {tokenData?.balance ?? 0}
          </span>
          <span className="text-[9px] font-mono text-gray-500 ml-1">Roster: {rosterCount}/20</span>
        </div>
      </header>

      <main className="p-4 space-y-2">
        {isLoading && (
          <div className="text-center py-10">
            <span className="text-cyan-400 font-mono animate-pulse">LOADING MARKET...</span>
          </div>
        )}

        {!isLoading && listings.length === 0 && (
          <div className="text-center py-10">
            <Store className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-mono text-sm">NO PLAYERS AVAILABLE</p>
          </div>
        )}

        {listings.map(listing => {
          const p = listing.player;
          const isExpanded = expandedId === listing.id;
          const status = actionStatus[listing.id];
          const atk = statAvg(p, ['pow', 'con', 'eye']);
          const pit = statAvg(p, ['vel', 'ctl', 'mov']);
          const def = statAvg(p, ['def', 'spd']);

          return (
            <div key={listing.id} data-testid={`card-listing-${listing.id}`} className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : listing.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span data-testid={`text-player-name-${listing.id}`} className="text-xs font-bold text-cyan-300 truncate">{p.name}</span>
                    <span className="text-[9px] font-mono text-pink-400 shrink-0">{p.positions.join('/')}</span>
                    {listing.sellerWallet === 'FREE_AGENT' && (
                      <span className="text-[8px] font-mono text-green-400 bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 rounded shrink-0">FREE AGENT</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[9px] font-mono text-red-400">ATK {atk}</span>
                    <span className="text-[9px] font-mono text-blue-400">PIT {pit}</span>
                    <span className="text-[9px] font-mono text-green-400">DEF {def}</span>
                    <span className="text-[9px] font-mono text-gray-500">STA {Math.min(99, p.sta + (p.staAdd ?? 0))}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-xs">🪙</span>
                      <span data-testid={`text-price-${listing.id}`} className="text-sm font-black text-amber-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                        {listing.price}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-800">
                  <div className="grid grid-cols-3 gap-2 mt-2 mb-3">
                    {['pow', 'con', 'spd', 'eye', 'vel', 'ctl', 'mov', 'sta', 'def'].map(attr => {
                      const val = Math.min(99, ((p as any)[attr] ?? 0) + ((p as any)[`${attr}Add`] ?? 0));
                      const isPitching = ['vel', 'ctl', 'mov', 'sta'].includes(attr);
                      return (
                        <div key={attr} className="flex items-center justify-between bg-black/40 rounded px-2 py-1 border border-gray-800">
                          <span className={`text-[9px] font-mono uppercase ${isPitching ? 'text-blue-400' : 'text-red-400'}`}>{attr}</span>
                          <span className="text-[11px] font-black text-cyan-300" style={{ fontFamily: "'Orbitron', sans-serif" }}>{val}</span>
                        </div>
                      );
                    })}
                  </div>

                  {expandedStats && expandedStats.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-[10px] font-mono text-gray-400 uppercase mb-1">Career Stats</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-800">
                              <th className="px-1 py-1 text-[8px] font-mono text-gray-500">SZN</th>
                              <th className="px-1 py-1 text-[8px] font-mono text-gray-500">GP</th>
                              <th className="px-1 py-1 text-[8px] font-mono text-gray-500">AVG</th>
                              <th className="px-1 py-1 text-[8px] font-mono text-gray-500">HR</th>
                              <th className="px-1 py-1 text-[8px] font-mono text-gray-500">RBI</th>
                              <th className="px-1 py-1 text-[8px] font-mono text-gray-500">BB</th>
                              <th className="px-1 py-1 text-[8px] font-mono text-gray-500">SO</th>
                              <th className="px-1 py-1 text-[8px] font-mono text-gray-500">ERA</th>
                              <th className="px-1 py-1 text-[8px] font-mono text-gray-500">IP</th>
                              <th className="px-1 py-1 text-[8px] font-mono text-gray-500">K</th>
                              <th className="px-1 py-1 text-[8px] font-mono text-gray-500">W-L</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expandedStats.map((s: SeasonStats) => {
                              const avg = s.ab > 0 ? (s.hits / s.ab).toFixed(3).replace('0.', '.') : '---';
                              const era = s.ip > 0 ? ((s.er / s.ip) * 9).toFixed(2) : '---';
                              return (
                                <tr key={s.seasonId} className="border-b border-gray-800/30">
                                  <td className="px-1 py-0.5 text-[9px] font-mono text-cyan-400">S{s.seasonId}</td>
                                  <td className="px-1 py-0.5 text-[9px] font-mono text-gray-300">{s.gamesPlayed}</td>
                                  <td className="px-1 py-0.5 text-[9px] font-mono text-gray-300">{avg}</td>
                                  <td className="px-1 py-0.5 text-[9px] font-mono text-gray-300">{s.hr}</td>
                                  <td className="px-1 py-0.5 text-[9px] font-mono text-gray-300">{s.rbi}</td>
                                  <td className="px-1 py-0.5 text-[9px] font-mono text-gray-300">{s.bb}</td>
                                  <td className="px-1 py-0.5 text-[9px] font-mono text-gray-300">{s.so}</td>
                                  <td className="px-1 py-0.5 text-[9px] font-mono text-gray-300">{era}</td>
                                  <td className="px-1 py-0.5 text-[9px] font-mono text-gray-300">{s.ip}</td>
                                  <td className="px-1 py-0.5 text-[9px] font-mono text-gray-300">{s.pitcherSo}</td>
                                  <td className="px-1 py-0.5 text-[9px] font-mono text-gray-300">{s.wins}-{s.losses}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {isMine(listing) ? (
                      <button
                        data-testid={`button-cancel-listing-${listing.id}`}
                        onClick={() => handleCancel(listing)}
                        disabled={!!status && status !== 'error'}
                        className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-[10px] uppercase tracking-wider rounded-lg transition-all disabled:opacity-50"
                      >
                        {!status || status === 'error' ? 'CANCEL LISTING' :
                         status === 'signing' ? 'SIGN WALLET...' :
                         status === 'confirming' ? 'PROCESSING...' : '✓ CANCELLED'}
                      </button>
                    ) : (
                      <button
                        data-testid={`button-buy-${listing.id}`}
                        onClick={() => handleBuy(listing)}
                        disabled={!canBuy(listing) || (!!status && status !== 'error')}
                        className="flex-1 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-mono text-[10px] uppercase tracking-wider rounded-lg transition-all disabled:opacity-50"
                      >
                        {!status || status === 'error' ? (
                          rosterCount >= 20 ? 'ROSTER FULL' :
                          !canBuy(listing) ? 'NOT ENOUGH TOKENS' :
                          `BUY FOR ${listing.price} 🪙`
                        ) :
                         status === 'signing' ? 'SIGN WALLET...' :
                         status === 'confirming' ? 'PROCESSING...' : '✓ ACQUIRED'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </main>
      <PageTip route="/market" message="Browse and buy free agents or players listed by other managers." />
    </div>
  );
}

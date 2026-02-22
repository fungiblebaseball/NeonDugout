import { useGameStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Terminal, ShieldAlert, Trophy, Calendar } from "lucide-react";

export default function Home() {
  const { walletAddress, connectWallet, disconnectWallet, getMyTeam, league } = useGameStore();

  const team = getMyTeam();

  if (!walletAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-cyan-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-pink-500 filter drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
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
              onClick={connectWallet}
              className="w-full h-14 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-lg transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            >
              Connect Wallet
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
          <h1 className="text-3xl font-black uppercase text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
            {team?.name || "Loading..."}
          </h1>
          <p className="text-xs font-mono text-pink-300 mt-1 uppercase">
            Division {team?.division} | {league?.divisions[team?.division || 'B']?.name}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={disconnectWallet} className="text-gray-500 hover:text-pink-500">
          <Terminal className="w-4 h-4 mr-2" />
          DISCONNECT
        </Button>
      </header>

      <main className="space-y-6">
        <div className="p-6 rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-transparent">
          <h3 className="font-mono text-sm text-pink-300 mb-2">OWNER REGISTRY</h3>
          <p className="text-xs break-all text-gray-400 bg-black/50 p-3 rounded font-mono border border-gray-800">
            {walletAddress}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/lineup">
            <a className="block p-6 rounded-2xl border border-cyan-500/30 bg-black/40 hover:bg-cyan-900/20 transition-colors group">
              <h3 className="font-black text-xl text-cyan-400 mb-1 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" style={{fontFamily: "'Orbitron', sans-serif"}}>ROSTER</h3>
              <p className="text-xs font-mono text-gray-500">Manage lineup & tactics</p>
            </a>
          </Link>
          <div className="p-6 rounded-2xl border border-pink-500/30 bg-black/40 hover:bg-pink-900/20 transition-colors group cursor-pointer">
            <Trophy className="w-6 h-6 text-pink-500 mb-2 group-hover:animate-pulse" />
            <h3 className="font-black text-xl text-pink-400 mb-1" style={{fontFamily: "'Orbitron', sans-serif"}}>STANDINGS</h3>
            <p className="text-xs font-mono text-gray-500">View Division {team?.division}</p>
          </div>
          
          <div className="p-6 rounded-2xl border border-gray-800 bg-black/40 opacity-50 col-span-2 flex items-center justify-between">
             <div>
               <h3 className="font-black text-xl text-gray-500 mb-1" style={{fontFamily: "'Orbitron', sans-serif"}}>SCHEDULE</h3>
               <p className="text-xs font-mono text-gray-600">Next match: Simulated at 00:00 CET</p>
             </div>
             <Calendar className="w-8 h-8 text-gray-700" />
          </div>
        </div>
      </main>
    </div>
  );
}

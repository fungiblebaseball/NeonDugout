import { useGameStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { simulateGame, resetRng } from "@/lib/calculations";
import type { GameResult, SimPlayer, SimTeam, SimConfig, PitchingConfig, TacticsModifiers } from "@/lib/calculations";

export default function SimulationPage() {
  const { team, players, walletAddress } = useGameStore();
  const [result, setResult] = useState<GameResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  const { data: allTeams } = useQuery({
    queryKey: ['teams-league-series', team?.league, team?.series],
    queryFn: async () => {
      const res = await fetch(`/api/teams/league/${team!.league}/series/${team!.series}`);
      return res.json() as Promise<SimTeam[]>;
    },
    enabled: !!team,
  });

  if (!walletAddress || !team) {
    return <div className="min-h-screen bg-black p-6 flex items-center justify-center text-center text-pink-500 font-mono text-xl uppercase tracking-widest">ACCESS DENIED</div>;
  }

  const opponents = allTeams?.filter(t => t.id !== team.id) || [];

  const runSimulation = async (opponentId?: number) => {
    setSimulating(true);

    const opponent = opponentId
      ? opponents.find(t => t.id === opponentId)!
      : opponents[Math.floor(Math.random() * opponents.length)];

    if (!opponent) {
      setSimulating(false);
      return;
    }

    const [oppPlayersRes, myLineupRes, myRotationRes, myTacticsRes] = await Promise.all([
      fetch(`/api/team/${opponent.id}/players`),
      fetch(`/api/lineup/${team.id}`),
      fetch(`/api/pitcher-rotation/${team.id}`),
      fetch(`/api/tactics/${team.id}`),
    ]);

    const opponentPlayers: SimPlayer[] = await oppPlayersRes.json();
    const myLineup = await myLineupRes.json();
    const myRotation = await myRotationRes.json();
    const myTactics = await myTacticsRes.json();

    const playerMap = new Map((players as SimPlayer[]).map(p => [p.id, p]));

    const builtLineup = myLineup?.battingOrder?.length > 0
      ? myLineup.battingOrder.map((id: number) => playerMap.get(id)).filter(Boolean) as SimPlayer[]
      : undefined;

    const buildPitching = (rot: any, allP: SimPlayer[]): PitchingConfig | undefined => {
      if (!rot?.roles) return undefined;
      const pm = new Map(allP.map(p => [p.id, p]));
      return {
        sp: rot.roles.sp ? pm.get(rot.roles.sp) || null : null,
        r1: rot.roles.r1 ? pm.get(rot.roles.r1) || null : null,
        closer: rot.roles.closer ? pm.get(rot.roles.closer) || null : null,
        maxPitches: rot.maxPitches ?? 100, maxInnings: rot.maxInnings ?? 7,
        maxBb: rot.maxBb ?? 4, maxEr: rot.maxEr ?? 4,
        r1MaxPitches: rot.r1MaxPitches ?? 40, r1MaxEr: rot.r1MaxEr ?? 3,
        closerMaxPitches: rot.closerMaxPitches ?? 30, closerMaxEr: rot.closerMaxEr ?? 2,
      };
    };

    const buildTac = (tac: any): TacticsModifiers | undefined => {
      if (!tac) return undefined;
      return {
        attackStyle: tac.attackStyle || 'neutral',
        infieldPosition: tac.infieldPosition || 'neutral',
        outfieldPosition: tac.outfieldPosition || 'neutral',
        batterApproach: tac.batterApproach || 'contact',
        pitcherStyle: tac.pitcherStyle || 'command',
        offensiveAttack: tac.offensiveAttack || 'balanced',
        defenseSetup: tac.defenseSetup || 'balanced',
      };
    };

    const simConfig: SimConfig = {
      homeLineup: builtLineup && builtLineup.length >= 9 ? builtLineup : undefined,
      homePitching: buildPitching(myRotation, players as SimPlayer[]),
      homeTactics: buildTac(myTactics),
    };

    resetRng();

    const homeTeam: SimTeam = { id: team.id, name: team.name, division: team.division };
    const awayTeam: SimTeam = { id: opponent.id, name: opponent.name, division: opponent.division };

    const gameResult = simulateGame(
      homeTeam,
      awayTeam,
      players as SimPlayer[],
      opponentPlayers,
      simConfig,
    );

    setResult(gameResult);
    setSimulating(false);
  };

  return (
    <div className="min-h-screen pb-24 bg-black text-cyan-50">
      <header className="p-6 bg-gradient-to-b from-cyan-900/30 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{fontFamily: "'Orbitron', sans-serif"}}>
          Test Match
        </h1>
        <p className="text-xs font-mono text-cyan-200/60 mt-1">{team.name} - Exhibition</p>
      </header>

      <main className="p-4 space-y-6">
        {!result && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 text-center space-y-4">
              <p className="text-sm font-mono text-gray-400">Select an opponent from your division or let RNG decide.</p>

              <button
                data-testid="button-random-match"
                onClick={() => runSimulation()}
                disabled={simulating || opponents.length === 0}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50"
              >
                {simulating ? "SIMULATING..." : "⚡ RANDOM OPPONENT"}
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-mono text-pink-500 border-b border-pink-500/30 pb-2">PICK OPPONENT</h2>
              {opponents.map(opp => (
                <button
                  key={opp.id}
                  data-testid={`button-opponent-${opp.id}`}
                  onClick={() => runSimulation(opp.id)}
                  disabled={simulating}
                  className="w-full text-left p-3 rounded-lg border border-gray-800 bg-gray-950/50 hover:border-pink-500/50 hover:bg-pink-950/10 transition-all disabled:opacity-50"
                >
                  <span className="text-sm font-bold text-pink-400" style={{fontFamily: "'Orbitron', sans-serif"}}>{opp.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {result && <GameResultView result={result} onReset={() => setResult(null)} />}
      </main>
    </div>
  );
}

function GameResultView({ result, onReset }: { result: GameResult; onReset: () => void }) {
  const { boxScore } = result;
  const winnerIsHome = result.homeScore > result.awayScore;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-950/20 to-cyan-950/20 text-center space-y-3">
        <div className="flex items-center justify-center gap-6">
          <div className={`text-right flex-1 ${!winnerIsHome ? 'opacity-60' : ''}`}>
            <p className="text-xs font-mono text-gray-500 uppercase">Home</p>
            <p data-testid="text-home-team" className="text-lg font-black text-cyan-400" style={{fontFamily: "'Orbitron', sans-serif"}}>{result.homeTeam.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span data-testid="text-home-score" className="text-4xl font-black text-cyan-300" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '24px'}}>{result.homeScore}</span>
            <span className="text-gray-600 text-lg">-</span>
            <span data-testid="text-away-score" className="text-4xl font-black text-pink-300" style={{fontFamily: "'Press Start 2P', cursive", fontSize: '24px'}}>{result.awayScore}</span>
          </div>
          <div className={`text-left flex-1 ${winnerIsHome ? 'opacity-60' : ''}`}>
            <p className="text-xs font-mono text-gray-500 uppercase">Away</p>
            <p data-testid="text-away-team" className="text-lg font-black text-pink-400" style={{fontFamily: "'Orbitron', sans-serif"}}>{result.awayTeam.name}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table data-testid="table-linescore" className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left p-2 text-gray-500 w-24">TEAM</th>
              {boxScore.innings.map(i => (
                <th key={i} className="p-2 text-gray-500 w-6 text-center">{i}</th>
              ))}
              <th className="p-2 text-cyan-500 text-center border-l border-gray-800">R</th>
              <th className="p-2 text-pink-500 text-center">H</th>
              <th className="p-2 text-gray-400 text-center">E</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-800/50">
              <td className="p-2 text-pink-400 font-bold truncate max-w-[96px]">{result.awayTeam.name.split(' ').pop()}</td>
              {boxScore.awayLine.map((r, i) => (
                <td key={i} className={`p-2 text-center ${r > 0 ? 'text-pink-300 font-bold' : 'text-gray-600'}`}>{r}</td>
              ))}
              <td className="p-2 text-center text-cyan-300 font-bold border-l border-gray-800">{boxScore.awayRHE[0]}</td>
              <td className="p-2 text-center text-pink-300">{boxScore.awayRHE[1]}</td>
              <td className="p-2 text-center text-gray-400">{boxScore.awayRHE[2]}</td>
            </tr>
            <tr>
              <td className="p-2 text-cyan-400 font-bold truncate max-w-[96px]">{result.homeTeam.name.split(' ').pop()}</td>
              {boxScore.homeLine.map((r, i) => (
                <td key={i} className={`p-2 text-center ${r > 0 ? 'text-cyan-300 font-bold' : 'text-gray-600'}`}>{r}</td>
              ))}
              <td className="p-2 text-center text-cyan-300 font-bold border-l border-gray-800">{boxScore.homeRHE[0]}</td>
              <td className="p-2 text-center text-pink-300">{boxScore.homeRHE[1]}</td>
              <td className="p-2 text-center text-gray-400">{boxScore.homeRHE[2]}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-2 p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10">
        <h3 className="text-sm font-mono text-cyan-500 mb-3">📰 GAME REPORT</h3>
        {result.flavorTexts.map((text, i) => (
          <p key={i} data-testid={`text-flavor-${i}`} className="text-xs font-mono text-gray-300 leading-relaxed border-l-2 border-pink-500/40 pl-3 py-1">
            {text}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <BatterStatsTable title={`${result.homeTeam.name} Batting`} batters={boxScore.homeBatters} color="cyan" />
        <BatterStatsTable title={`${result.awayTeam.name} Batting`} batters={boxScore.awayBatters} color="pink" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PitcherStatsCard pitcher={boxScore.homePitcher} team={result.homeTeam.name} color="cyan" />
        <PitcherStatsCard pitcher={boxScore.awayPitcher} team={result.awayTeam.name} color="pink" />
      </div>

      <div className="p-4 rounded-xl border border-pink-500/30 bg-pink-950/10 text-center">
        <p className="text-xs font-mono text-gray-500 mb-1">PLAYER OF THE GAME</p>
        <p data-testid="text-mvp" className="text-lg font-black text-pink-400" style={{fontFamily: "'Orbitron', sans-serif"}}>{result.mvp.name}</p>
        <p className="text-xs font-mono text-gray-400 mt-1">{result.mvp.reason}</p>
      </div>

      <button
        data-testid="button-play-again"
        onClick={onReset}
        className="w-full py-4 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)]"
      >
        NEW MATCH
      </button>
    </div>
  );
}

function BatterStatsTable({ title, batters, color }: { title: string; batters: any[]; color: 'cyan' | 'pink' }) {
  return (
    <div className="overflow-x-auto">
      <h3 className={`text-xs font-mono text-${color}-500 mb-2`}>{title}</h3>
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left p-1 text-gray-500">NAME</th>
            <th className="p-1 text-gray-500 text-center">AB</th>
            <th className="p-1 text-gray-500 text-center">H</th>
            <th className="p-1 text-gray-500 text-center">HR</th>
            <th className="p-1 text-gray-500 text-center">RBI</th>
            <th className="p-1 text-gray-500 text-center">BB</th>
            <th className="p-1 text-gray-500 text-center">SO</th>
            <th className="p-1 text-gray-500 text-center">AVG</th>
          </tr>
        </thead>
        <tbody>
          {batters.map(b => (
            <tr key={b.playerId} className="border-b border-gray-800/30">
              <td className={`p-1 text-${color}-300 truncate max-w-[80px]`}>{b.name}</td>
              <td className="p-1 text-center text-gray-400">{b.ab}</td>
              <td className="p-1 text-center text-gray-300">{b.hits}</td>
              <td className={`p-1 text-center ${b.hr > 0 ? 'text-pink-400 font-bold' : 'text-gray-600'}`}>{b.hr}</td>
              <td className={`p-1 text-center ${b.rbi > 0 ? 'text-cyan-400 font-bold' : 'text-gray-600'}`}>{b.rbi}</td>
              <td className="p-1 text-center text-gray-400">{b.bb}</td>
              <td className="p-1 text-center text-gray-400">{b.so}</td>
              <td className="p-1 text-center text-gray-300">{b.avg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PitcherStatsCard({ pitcher, team, color }: { pitcher: any; team: string; color: 'cyan' | 'pink' }) {
  return (
    <div className={`p-3 rounded-xl border border-${color}-500/20 bg-${color}-950/10`}>
      <p className="text-[10px] font-mono text-gray-500 mb-1">{team}</p>
      <p className={`text-sm font-bold text-${color}-400 truncate`}>{pitcher.name}</p>
      <div className="grid grid-cols-3 gap-1 mt-2">
        <div className="text-center">
          <p className="text-[9px] text-gray-500">IP</p>
          <p className="text-xs font-bold text-gray-300">{pitcher.ip}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">SO</p>
          <p className="text-xs font-bold text-cyan-400">{pitcher.so}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">ER</p>
          <p className="text-xs font-bold text-pink-400">{pitcher.er}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">H</p>
          <p className="text-xs font-bold text-gray-300">{pitcher.h}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">BB</p>
          <p className="text-xs font-bold text-gray-300">{pitcher.bb}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">PC</p>
          <p className="text-xs font-bold text-gray-300">{pitcher.pitchCount}</p>
        </div>
      </div>
    </div>
  );
}

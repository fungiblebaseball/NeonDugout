import { rng } from './rng';
import type { GameResult, SimPlayer, BatterStats, PitcherStats } from './types';

const HR_FLAVORS = [
  "💥 {batter} cranks one into the neon-lit stratosphere! The chrome bleachers ERUPT!",
  "🚀 {batter} launches a MOONSHOT! That ball hasn't landed yet... probably orbiting Saturn.",
  "⚡ {batter} goes YARD! The holographic scoreboard can't keep up!",
  "💣 {batter} DEMOLISHES that pitch! Somebody call the Cyber-Police!",
  "🔥 {batter} sends it DOWNTOWN! The neon signs are flickering from the impact!",
  "☄️ {batter} with a COSMIC BLAST! That ball just broke the speed limit in three dimensions!",
];

const SO_FLAVORS = [
  "💀 {batter} goes down swinging... the bat's still vibrating from embarrassment.",
  "🌀 {pitcher} makes {batter} look like a malfunctioning android. STRUCK OUT!",
  "❌ {batter} whiffs on all three. The crowd's AR glasses fog up from cringing.",
  "🎭 {pitcher}'s curveball had more moves than a disco robot. {batter} K'd!",
];

const DOUBLE_PLAY_FLAVORS = [
  "⚙️ DOUBLE PLAY! {batter}'s grounder gets processed faster than a crypto transaction!",
  "🔗 TWIN KILLING! The infield executes a perfect chain combo. 6-4-3!",
];

const WALK_FLAVORS = [
  "🚶 {batter} takes a free pass. {pitcher}'s control module needs recalibration.",
  "📦 Ball four! {batter} jogs to first like they own the place (they might, it's Web3).",
];

const ERROR_FLAVORS = [
  "🤖 ERROR! The defense glitches out! {batter} reaches on a malfunction!",
  "💾 CORRUPTED PLAY! The fielder's firmware crashes. Safe at first!",
];

function pickFlavor(arr: string[], replacements: Record<string, string>): string {
  const template = rng().pick(arr);
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(`{${key}}`, value);
  }
  return result;
}

function findLeaders(batters: BatterStats[]): string[] {
  const texts: string[] = [];

  const hrLeaders = batters.filter(b => b.hr > 0).sort((a, b) => b.hr - a.hr);
  if (hrLeaders.length > 0) {
    const top = hrLeaders[0];
    texts.push(`⚡ ${top.name} led the power surge with ${top.hr} HR${top.hr > 1 ? 's' : ''}.`);
    if (top.hr >= 2) {
      texts.push(`💥 ${top.name} went multi-HR! ${top.hr} dingers in one game — neon legend status.`);
    }
  }

  const hitLeaders = batters.filter(b => b.hits >= 3).sort((a, b) => b.hits - a.hits);
  if (hitLeaders.length > 0) {
    const top = hitLeaders[0];
    texts.push(`🎯 ${top.name} racked up ${top.hits}-for-${top.ab} — the laser show of the night.`);
  }

  const rbiLeaders = batters.filter(b => b.rbi >= 3).sort((a, b) => b.rbi - a.rbi);
  if (rbiLeaders.length > 0 && !hrLeaders.find(h => h.playerId === rbiLeaders[0].playerId && rbiLeaders[0].rbi <= 3)) {
    const top = rbiLeaders[0];
    texts.push(`🔋 ${top.name} drove in ${top.rbi} runs — the clutch processor of the game.`);
  }

  const bbLeaders = batters.filter(b => b.bb >= 3).sort((a, b) => b.bb - a.bb);
  if (bbLeaders.length > 0) {
    const top = bbLeaders[0];
    texts.push(`👁️ ${top.name} drew ${top.bb} walks — patient circuits pay off.`);
  }

  const soVictims = batters.filter(b => b.so >= 3).sort((a, b) => b.so - a.so);
  if (soVictims.length > 0) {
    const top = soVictims[0];
    texts.push(`💀 ${top.name} fanned ${top.so} times — a rough night at the plate.`);
  }

  return texts;
}

function findPitcherHighlights(homePitcher: PitcherStats, awayPitcher: PitcherStats, homeTeamName: string, awayTeamName: string): string[] {
  const texts: string[] = [];

  const pitchers = [
    { ...homePitcher, team: homeTeamName },
    { ...awayPitcher, team: awayTeamName },
  ];

  const soKing = pitchers.sort((a, b) => b.so - a.so)[0];
  if (soKing.so >= 6) {
    texts.push(`🌀 ${soKing.team} starter: ${soKing.so} K — dominant from the mound.`);
  }

  const efficient = pitchers.find(p => p.ip >= 7 && p.er <= 1);
  if (efficient) {
    texts.push(`🎮 ${efficient.team} starter went ${efficient.ip} IP, ${efficient.er} ER — quality start on lock.`);
  }

  const rough = pitchers.find(p => p.ip <= 3 && p.er >= 5);
  if (rough) {
    texts.push(`🗑️ ${rough.team} starter: ${rough.ip} IP, ${rough.er} ER — early exit, system overheated.`);
  }

  return texts;
}

export function generateFlavorTexts(result: GameResult, homePitcher: SimPlayer, awayPitcher: SimPlayer): string[] {
  const texts: string[] = [];
  const diff = Math.abs(result.homeScore - result.awayScore);

  if (diff <= 1) {
    texts.push(`🏟️ A ${result.homeScore}-${result.awayScore} nail-biter — every at-bat mattered.`);
  } else if (diff >= 8) {
    texts.push(`📡 A ${Math.max(result.homeScore, result.awayScore)}-${Math.min(result.homeScore, result.awayScore)} blowout. The neon lights dimmed early.`);
  }

  const allBatters = [...result.boxScore.homeBatters, ...result.boxScore.awayBatters];
  const batterTexts = findLeaders(allBatters);
  texts.push(...batterTexts);

  const pitcherTexts = findPitcherHighlights(
    result.boxScore.homePitcher,
    result.boxScore.awayPitcher,
    result.homeTeam.name,
    result.awayTeam.name,
  );
  texts.push(...pitcherTexts);

  const totalHR = allBatters.reduce((s, b) => s + b.hr, 0);
  if (totalHR >= 5) {
    texts.push(`💣 ${totalHR} home runs total — the ball was jumping tonight.`);
  }

  const totalSO = result.boxScore.homePitcher.so + result.boxScore.awayPitcher.so;
  if (totalSO >= 15) {
    texts.push(`🌀 ${totalSO} total strikeouts — pitchers dominated this one.`);
  }

  const mvpReason = result.mvp.reason;
  texts.push(`🏆 MVP: ${result.mvp.name} — ${mvpReason}.`);

  if (texts.length < 3) {
    texts.push(`🎙️ Final: ${result.homeTeam.name} ${result.homeScore} - ${result.awayScore} ${result.awayTeam.name}.`);
  }

  return texts.slice(0, 6);
}

export function generateAtBatDescription(
  outcome: string,
  batterName: string,
  pitcherName: string,
): string {
  switch (outcome) {
    case 'HR': return pickFlavor(HR_FLAVORS, { batter: batterName });
    case '3B': return `${batterName} rips a triple into the gap!`;
    case '2B': return `${batterName} doubles off the wall!`;
    case '1B': return `${batterName} lines a single through the infield.`;
    case 'BB': return pickFlavor(WALK_FLAVORS, { batter: batterName, pitcher: pitcherName });
    case 'SO': return pickFlavor(SO_FLAVORS, { batter: batterName, pitcher: pitcherName });
    case 'GO': return `${batterName} grounds out. Routine play.`;
    case 'FO': return `${batterName} flies out to center.`;
    case 'ERR': return pickFlavor(ERROR_FLAVORS, { batter: batterName });
    case 'GIDP': return pickFlavor(DOUBLE_PLAY_FLAVORS, { batter: batterName });
    default: return `${batterName} makes an out.`;
  }
}

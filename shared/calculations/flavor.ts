import { rng } from './rng';
import type { GameResult, SimPlayer } from './types';

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

const CLOSE_GAME_FLAVORS = [
  "🏟️ The neon lights pulse faster as this one goes down to the wire!",
  "⚡ ELECTRIC atmosphere in the dome! Every pitch counts!",
  "🎮 This game has more tension than a final boss fight on hard mode!",
];

const BLOWOUT_FLAVORS = [
  "🗑️ This game got ugly faster than a dial-up connection.",
  "📡 Mercy rule? In THIS league? Nah. Keep the pain flowing.",
  "💤 Even the holographic fans are checking their DMs at this point.",
];

const MVP_FLAVORS = [
  "🏆 Tonight's MVP: {name} — {reason}. Certified GOAT.exe running smoothly.",
  "⭐ Player of the Game: {name}. {reason}. The crowd throws virtual roses.",
  "👑 {name} takes MVP honors. {reason}. Legend status: CONFIRMED.",
];

function pickFlavor(arr: string[], replacements: Record<string, string>): string {
  const template = rng().pick(arr);
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(`{${key}}`, value);
  }
  return result;
}

export function generateFlavorTexts(result: GameResult, homePitcher: SimPlayer, awayPitcher: SimPlayer): string[] {
  const texts: string[] = [];
  const diff = Math.abs(result.homeScore - result.awayScore);

  if (diff <= 2) {
    texts.push(rng().pick(CLOSE_GAME_FLAVORS));
  } else if (diff >= 7) {
    texts.push(rng().pick(BLOWOUT_FLAVORS));
  }

  const topHR = result.boxScore.homeBatters.find(b => b.hr > 0) || result.boxScore.awayBatters.find(b => b.hr > 0);
  if (topHR && topHR.hr > 0) {
    texts.push(pickFlavor(HR_FLAVORS, { batter: topHR.name }));
  }

  const topSO = result.boxScore.homePitcher.so > result.boxScore.awayPitcher.so
    ? result.boxScore.homePitcher
    : result.boxScore.awayPitcher;
  if (topSO.so >= 5) {
    const pitcherName = topSO.playerId === homePitcher.id ? homePitcher.name : awayPitcher.name;
    const victim = result.boxScore.homeBatters[0]?.name || result.boxScore.awayBatters[0]?.name || 'someone';
    texts.push(pickFlavor(SO_FLAVORS, { pitcher: pitcherName, batter: victim }));
  }

  const mvpText = pickFlavor(MVP_FLAVORS, { name: result.mvp.name, reason: result.mvp.reason });
  texts.push(mvpText);

  while (texts.length < 3) {
    texts.push(`🎙️ Another day in the neon leagues. ${result.homeTeam.name} ${result.homeScore} - ${result.awayScore} ${result.awayTeam.name}.`);
  }

  return texts.slice(0, 5);
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

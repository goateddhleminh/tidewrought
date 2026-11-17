import type { StatIcon } from './upgrades';

export type SkillBranch = 'patience' | 'fortune' | 'mastery';
export interface SkillDef {
  id: string;
  branch: SkillBranch;
  name: string;
  max: number;
  icon: StatIcon;
  /** skill required (at least level 1) */
  requires?: string;
  desc: (lvl: number) => string;
}

export const BRANCHES: { id: SkillBranch; name: string; desc: string; color: string }[] = [
  { id: 'patience', name: 'Patience', desc: 'Idle power', color: '#4a8fe8' },
  { id: 'fortune', name: 'Fortune', desc: 'RNG power', color: '#f2a02a' },
  { id: 'mastery', name: 'Mastery', desc: 'Active power', color: '#58b84a' },
];

export const SKILLS: SkillDef[] = [
  { id: 'autoReel', branch: 'patience', name: 'Auto-Reel Mastery', max: 5, icon: 'reel', desc: (l) => `Idle reel efficiency +${l * 7}% (base 60%)` },
  { id: 'steady', branch: 'patience', name: 'Steady Hands', max: 5, icon: 'speed', requires: 'autoReel', desc: (l) => `Wait time -${l * 4}%` },
  { id: 'deepSleep', branch: 'patience', name: 'Deep Sleep', max: 3, icon: 'offline', requires: 'steady', desc: (l) => `Offline cap +${l}h, offline efficiency +${l * 8}%` },
  { id: 'thrift', branch: 'patience', name: 'Thrifty Tackle', max: 3, icon: 'bait', requires: 'steady', desc: (l) => `+${l * 6}% chance to save bait` },
  { id: 'zen', branch: 'patience', name: 'Tidal Zen', max: 1, icon: 'heart', requires: 'deepSleep', desc: (l) => (l ? 'Idle reels count as Good (100%)' : 'Idle reels count as Good (100%)') },
  { id: 'luckyStars', branch: 'fortune', name: 'Lucky Stars', max: 5, icon: 'luck', desc: (l) => `Luck +${l * 6}` },
  { id: 'mutagen', branch: 'fortune', name: 'Mutagen', max: 5, icon: 'xp_star', requires: 'luckyStars', desc: (l) => `Mutation chance +${l * 8}%` },
  { id: 'chestSense', branch: 'fortune', name: 'Chest Sense', max: 3, icon: 'relic', requires: 'luckyStars', desc: (l) => `Chest chance +${l * 20}%` },
  { id: 'pityPact', branch: 'fortune', name: 'Pity Pact', max: 3, icon: 'achievement', requires: 'mutagen', desc: (l) => `Pity thresholds -${l * 10}%` },
  { id: 'hotHands', branch: 'fortune', name: 'Hot Hands', max: 3, icon: 'crit', requires: 'chestSense', desc: (l) => `Hot Streak luck +${l * 25}%, cap +${l * 2}` },
  { id: 'perfectForm', branch: 'mastery', name: 'Perfect Form', max: 3, icon: 'hook', desc: (l) => `Perfect window +${l * 20}%` },
  { id: 'powerReel', branch: 'mastery', name: 'Power Reel', max: 5, icon: 'value', requires: 'perfectForm', desc: (l) => `Perfect reels +${l * 10}% value` },
  { id: 'critInstinct', branch: 'mastery', name: 'Crit Instinct', max: 5, icon: 'crit', requires: 'perfectForm', desc: (l) => `Double Catch chance +${l}%` },
  { id: 'combo', branch: 'mastery', name: 'Combo Keeper', max: 3, icon: 'xp_star', requires: 'powerReel', desc: (l) => `Each Perfect in a row +${l * 2}% value (max 20 stacks)` },
  { id: 'bossBreaker', branch: 'mastery', name: 'Boss Breaker', max: 3, icon: 'reel', requires: 'critInstinct', desc: (l) => `Boss click damage +${l * 30}%` },
];
export const skillDef = (id: string) => SKILLS.find((s) => s.id === id)!;

import type { HelperId } from '../types';
import { ROD_KEYS, manifest } from '../assets';

export function costAt(base: number, growth: number, level: number): number {
  return base * Math.pow(growth, level);
}
/** Total cost to buy `count` levels starting at `level`. */
export function bulkCost(base: number, growth: number, level: number, count: number): number {
  if (count <= 0) return 0;
  return (base * Math.pow(growth, level) * (Math.pow(growth, count) - 1)) / (growth - 1);
}
/** Max affordable levels (capped by maxLevel). */
export function maxAffordable(base: number, growth: number, level: number, coins: number, maxLevel = Infinity): number {
  const first = base * Math.pow(growth, level);
  if (coins < first) return 0;
  const n = Math.floor(Math.log((coins * (growth - 1)) / first + 1) / Math.log(growth));
  return Math.max(0, Math.min(n, maxLevel - level));
}

export interface RodDef {
  key: string;
  tier: number;
  name: string;
  cost: number;
  luck: number;
  value: number;
  speed: number; // cast/reel speed multiplier
}
const ROD_STATS: [cost: number, luck: number, value: number, speed: number][] = [
  [0, 0, 1, 1],
  [120, 5, 1.5, 1.05],
  [2500, 12, 2.4, 1.1],
  [45000, 22, 4, 1.15],
  [9e5, 35, 7, 1.22],
  [2.2e7, 55, 12, 1.3],
  [6e8, 80, 21, 1.4],
  [2e10, 120, 38, 1.55],
];
export const RODS: RodDef[] = ROD_KEYS.map((key, i) => {
  const s = ROD_STATS[Math.min(i, ROD_STATS.length - 1)];
  const scale = i >= ROD_STATS.length ? Math.pow(30, i - ROD_STATS.length + 1) : 1;
  return {
    key,
    tier: i + 1,
    name: manifest.groups.rods[key].name ?? key,
    cost: s[0] * scale,
    luck: s[1],
    value: s[2],
    speed: s[3],
  };
});

export type StatIcon = 'luck' | 'speed' | 'value' | 'crit' | 'reel' | 'offline' | 'bait' | 'hook' | 'achievement' | 'relic' | 'fish' | 'heart' | 'xp_star';

export interface UpgradeDef {
  id: string;
  name: string;
  icon: StatIcon;
  base: number;
  growth: number;
  max: number;
  desc: (lvl: number) => string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'autoPerfect', name: 'Clockwork Auto-Reeler', icon: 'reel', base: 35, growth: 1.18, max: 45, desc: (l) => `Auto-Fishing Perfect Reel Chance: ${Math.min(95, 5 + l * 2)}% (+2%/lv) & Auto Efficiency +${l}%` },
  { id: 'reel', name: 'Spool Reel', icon: 'reel', base: 25, growth: 1.15, max: 200, desc: (l) => `Reel Strength +${l * 8}% (faster reel, boss damage), Cast Speed +${l * 2}%` },
  { id: 'line', name: 'Braided Line', icon: 'speed', base: 40, growth: 1.16, max: 200, desc: (l) => `Bite Speed +${l * 4}%` },
  { id: 'hook', name: 'Barbed Hook', icon: 'hook', base: 60, growth: 1.18, max: 100, desc: (l) => `Crit Chance +${(l * 0.15).toFixed(2)}%, Luck +${l}` },
  { id: 'charm', name: 'Lucky Charm', icon: 'luck', base: 100, growth: 1.2, max: 200, desc: (l) => `Luck +${l * 3}` },
  { id: 'polish', name: 'Scale Polish', icon: 'value', base: 50, growth: 1.15, max: 300, desc: (l) => `Fish Value +${l * 10}%` },
  { id: 'stall', name: 'Market Stall', icon: 'heart', base: 80, growth: 1.17, max: 50, desc: (l) => `Auto-sell Value +${l * 2}%` },
  { id: 'baitbox', name: 'Bait Box', icon: 'bait', base: 150, growth: 1.2, max: 20, desc: (l) => `${l * 3}% chance to not consume bait` },
  { id: 'vane', name: 'Weather Vane', icon: 'offline', base: 500, growth: 1.25, max: 10, desc: (l) => `Forecast accuracy ${(85 + l * 1.5).toFixed(1)}%` },
];
export const upgradeDef = (id: string) => UPGRADES.find((u) => u.id === id)!;

export interface HelperDef {
  id: HelperId;
  name: string;
  base: number;
  growth: number;
  max: number;
  desc: (lvl: number) => string;
}
export const HELPERS: HelperDef[] = [
  { id: 'cat', name: manifest.groups.helpers.cat?.name ?? 'Dock Cat', base: 200, growth: 1.55, max: 25, desc: (l) => `Auto-sells inventory overflow. Auto-sell value +${l * 6}%` },
  { id: 'pelican', name: manifest.groups.helpers.pelican?.name ?? 'Pelican', base: 500, growth: 1.6, max: 15, desc: (l) => `${Math.min(60, l * 4)}% chance per catch to find bait` },
  { id: 'sailor', name: manifest.groups.helpers.sailor?.name ?? 'Old Sailor', base: 1000, growth: 1.7, max: 16, desc: (l) => `Offline cap +${l}h, offline efficiency +${l * 4}%` },
  { id: 'mermaid', name: manifest.groups.helpers.mermaid?.name ?? 'Mermaid', base: 5000, growth: 1.6, max: 25, desc: (l) => `Luck +${l * 4}, Mutation chance +${l * 2}%` },
];

export interface PrestigeDef {
  id: string;
  name: string;
  icon: StatIcon;
  base: number;
  growth: number;
  max: number;
  desc: (lvl: number) => string;
}
export const PRESTIGE_SHOP: PrestigeDef[] = [
  { id: 'tidalLuck', name: 'Tidal Luck', icon: 'luck', base: 1, growth: 1.45, max: 25, desc: (l) => `Permanent Luck +${l * 10}` },
  { id: 'pearlPolish', name: 'Pearl Polish', icon: 'value', base: 1, growth: 1.5, max: 25, desc: (l) => `Permanent Value +${l * 25}%` },
  { id: 'mutPity', name: 'Mutation Pity', icon: 'xp_star', base: 2, growth: 1.8, max: 8, desc: (l) => (l ? `Guaranteed mutation every ${120 - l * 10} casts` : 'Guarantees a mutation every N casts') },
  { id: 'swift', name: 'Swift Tides', icon: 'speed', base: 2, growth: 1.6, max: 10, desc: (l) => `Wait time -${l * 5}%` },
  { id: 'zoneSkip', name: 'Current Skip', icon: 'fish', base: 4, growth: 3, max: 3, desc: (l) => (l ? `Start each run with zones 1-${l + 1} unlocked` : 'Start runs with later zones unlocked') },
  { id: 'headStart', name: 'Golden Start', icon: 'value', base: 2, growth: 2.2, max: 5, desc: (l) => (l ? `Start each run with ${Math.pow(10, l + 2).toLocaleString()} coins` : 'Start runs with bonus coins') },
  { id: 'relicShelf', name: 'Relic Shelf', icon: 'relic', base: 3, growth: 3.3, max: 3, desc: (l) => `Relic slots: ${3 + l} / 6` },
  { id: 'chestMagnet', name: 'Chest Magnet', icon: 'crit', base: 2, growth: 1.7, max: 10, desc: (l) => `Chest chance +${l * 15}%` },
];
export const prestigeDef = (id: string) => PRESTIGE_SHOP.find((p) => p.id === id)!;

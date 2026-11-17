import type { GameState, MutationId, Rarity } from '../types';
import { FISH } from './fish';
import { RELICS } from './relics';
import { ZONES } from './zones';

export interface AchievementReward {
  luck?: number;
  value?: number; // percent
  mutation?: number; // percent
  xp?: number; // percent
}
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  reward: AchievementReward;
  check: (s: GameState) => boolean;
}

const discovered = (s: GameState) => Object.keys(s.codex).length;
const uniqueRelics = (s: GameState) => new Set(s.relics.map((r) => r.id)).size;
const rarityCaught = (s: GameState, r: Rarity) => s.stats.rarityCounts[r] > 0;
const mutCaught = (s: GameState, m: MutationId) => s.stats.mutationCounts[m] > 0;

export function rewardLabel(r: AchievementReward): string {
  const parts: string[] = [];
  if (r.luck) parts.push(`+${r.luck} Luck`);
  if (r.value) parts.push(`+${r.value}% Value`);
  if (r.mutation) parts.push(`+${r.mutation}% Mutation`);
  if (r.xp) parts.push(`+${r.xp}% XP`);
  return parts.join(', ');
}

const A: AchievementDef[] = [];
const add = (id: string, name: string, desc: string, reward: AchievementReward, check: (s: GameState) => boolean) =>
  A.push({ id, name, desc, reward, check });

// Catches
([[1, 'First Nibble'], [100, 'Hooked'], [1000, 'Angler'], [10000, 'Fishmonger'], [100000, 'Living Legend']] as const).forEach(([n, name], i) =>
  add(`catch_${n}`, name, `Catch ${n.toLocaleString()} fish`, { value: 1 + i }, (s) => s.stats.catches >= n),
);
// Coins
([[1e3, 'Pocket Change'], [1e6, 'Millionaire Mackerel'], [1e9, 'Billionaire Bass'], [1e12, 'Trillion Tuna']] as const).forEach(([n, name], i) =>
  add(`coins_${n}`, name, `Earn ${n.toExponential(0).replace('+', '')} coins in total`, { value: 2 + i * 2 }, (s) => s.stats.totalCoinsAllTime >= n),
);
// Codex
([[10, 'Curious'], [30, 'Naturalist'], [50, 'Ichthyologist']] as const).forEach(([n, name], i) =>
  add(`codex_${n}`, name, `Discover ${n} species`, { luck: 3 + i * 3 }, (s) => discovered(s) >= n),
);
add('codex_all', 'Gotta Fish Em All', `Discover all ${FISH.length} species`, { luck: 25, value: 10 }, (s) => discovered(s) >= FISH.length);
// Zones
ZONES.slice(1).forEach((z) => add(`zone_${z.id}`, `To ${z.name}`, `Unlock ${z.name}`, { value: 3 }, (s) => s.unlockedZone >= z.id));
// Rarity firsts
(['rare', 'epic', 'legendary', 'mythic'] as Rarity[]).forEach((r, i) =>
  add(`first_${r}`, `First ${r[0].toUpperCase() + r.slice(1)}`, `Catch a ${r} fish`, { luck: 1 + i * 2 }, (s) => rarityCaught(s, r)),
);
// Mutations
(['shiny', 'giant', 'tiny', 'golden', 'cursed', 'glitched', 'prismatic'] as MutationId[]).forEach((m, i) =>
  add(`mut_${m}`, `${m[0].toUpperCase() + m.slice(1)} Hunter`, `Catch a ${m} fish`, { mutation: 1 + Math.floor(i / 2) }, (s) => mutCaught(s, m)),
);
add('jackpot', 'JACKPOT!', 'Land a triple-mutation catch', { mutation: 5, luck: 5 }, (s) => s.stats.jackpots > 0);
// Bosses
ZONES.forEach((z) => add(`boss_${z.id}`, `${z.boss.name} Slayer`, `Defeat ${z.boss.name}`, { value: 4 }, (s) => !!s.bossDefeated[z.id]));
add('kraken', 'Release the Kraken', 'Defeat the Kraken', { luck: 8 }, (s) => s.stats.krakens > 0);
add('kraken5', 'Calamari Chef', 'Defeat the Kraken 5 times', { value: 8 }, (s) => s.stats.krakens >= 5);
// Chests
([[1, 'Treasure!'], [50, 'Loot Goblin'], [500, 'Dragon Hoard']] as const).forEach(([n, name], i) =>
  add(`chest_${n}`, name, `Open ${n} chests`, { luck: 2 + i * 3 }, (s) => s.stats.chestsOpened >= n),
);
// Relics
([[1, 'Collector'], [10, 'Curator'], [RELICS.length, 'Museum of the Tides']] as const).forEach(([n, name], i) =>
  add(`relic_${n}`, name, `Own ${n} unique relics`, { mutation: 1 + i * 2 }, (s) => uniqueRelics(s) >= n),
);
// Prestige
([[1, 'Tide Turner'], [5, 'Tidal Veteran'], [10, 'Lord of the Tides']] as const).forEach(([n, name], i) =>
  add(`prestige_${n}`, name, `Tide Reset ${n} time${n > 1 ? 's' : ''}`, { value: 5 + i * 5 }, (s) => s.prestiges >= n),
);
// Perfect reels
([[10, 'Good Timing'], [100, 'Reel Rhythm'], [1000, 'Frame Perfect']] as const).forEach(([n, name], i) =>
  add(`perfect_${n}`, name, `Land ${n} Perfect reels`, { value: 1 + i * 2 }, (s) => s.stats.perfect >= n),
);
// Streak
add('streak_3', 'Heating Up', 'Reach a Hot Streak of 3', { luck: 3 }, (s) => s.bestStreak >= 3);
add('streak_6', 'On Fire', 'Reach a Hot Streak of 6', { luck: 6 }, (s) => s.bestStreak >= 6);
// Levels
([[10, 'Apprentice'], [25, 'Journeyman'], [50, 'Master Angler']] as const).forEach(([n, name], i) =>
  add(`level_${n}`, name, `Reach level ${n}`, { xp: 5 + i * 5 }, (s) => s.level >= n),
);
// Deep dive
add('depth_100', 'Pressure Drop', 'Reach 100m in Deep Dive', { luck: 10 }, (s) => s.deep.maxDepth >= 100);
add('depth_500', 'Hadal Zone', 'Reach 500m in Deep Dive', { value: 15 }, (s) => s.deep.maxDepth >= 500);
// Misc
add('weather_all', 'Storm Chaser', 'Fish in every weather', { mutation: 3 }, (s) => s.stats.weatherSeen.length >= 7);
add('seagull', 'Bird Brain', 'Catch a Lucky Seagull', { luck: 2 }, (s) => s.stats.seagulls > 0);
add('double_25', 'Two For One', 'Land 25 Double Catches', { value: 3 }, (s) => s.stats.doubles >= 25);
add('rod_max', 'Starlight Angler', 'Own the Starlight Rod', { luck: 10 }, (s) => s.rodTier >= 8);

export const ACHIEVEMENTS = A;

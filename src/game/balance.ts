import type { MutationId, Rarity, WeatherId } from './types';

/**
 * CENTRAL BALANCE CONFIG.
 * Every tunable number of the game lives here so the economy can be adjusted
 * in one place and verified with the simulation helper (src/game/sim.ts).
 */
export const BALANCE = {
  tickRate: 10, // ticks per second (fixed timestep)
  saveEverySec: 10,

  /** Base rarity weights (sum = 100). */
  rarityWeights: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 0.9, mythic: 0.1 } as Record<Rarity, number>,
  /**
   * Luck curve exponents. weight' = weight * (1 + luck / luckScale) ^ k.
   * Power curve = smooth with diminishing returns per point of luck.
   */
  luckScale: 100,
  luckExponent: { common: -0.55, uncommon: 0, rare: 0.6, epic: 1.1, legendary: 1.55, mythic: 1.95 } as Record<Rarity, number>,

  /** Mutation base chances (independent rolls, stackable). */
  mutationChance: {
    shiny: 1 / 64,
    giant: 1 / 100,
    tiny: 1 / 50,
    golden: 1 / 500,
    cursed: 1 / 80,
    glitched: 1 / 777,
    prismatic: 1 / 5000,
  } as Record<MutationId, number>,
  mutationMult: { shiny: 2, giant: 3, tiny: 0.5, golden: 5, cursed: 0.2, glitched: 1, prismatic: 25 } as Record<MutationId, number>,
  glitchRange: [0.1, 20] as [number, number],
  mutationCap: 0.5,
  tinyXpMult: 3,
  jackpotMutations: 3,

  /** Fishing timings (seconds). */
  castTime: 0.9,
  waitTime: 4.2,
  waitJitter: [0.6, 1.4] as [number, number],
  biteWindow: 1.6,
  perfectWindow: [0.12, 0.5] as [number, number],
  reelTime: 0.7,
  catchShowTime: 0.8,
  cheerTime: 1.5,
  missPenalty: 1.5,

  /** Reel quality value multipliers. Idle auto reel ~60% of active. */
  qualityMult: { perfect: 1.25, good: 1.0, auto: 0.6, miss: 0 },
  perfectLuckBonus: 25,

  critDoubleBase: 0.05,
  chestBase: 0.01,

  /** Pity. */
  pityEpic: 150,
  pityLegendary: 1000,
  beginnersLuckCast: 6,

  /** Hot streak luck per stack. */
  streakLuck: 15,
  streakCap: 12,

  /** Zones. Coin value multiplier per zone. */
  zoneValueMult: [1, 6, 40, 250, 1600],

  /** XP per rarity and level curve. */
  xpPerRarity: { common: 1, uncommon: 3, rare: 8, epic: 20, legendary: 60, mythic: 200 } as Record<Rarity, number>,
  xpForLevel: (lvl: number) => Math.floor(12 * Math.pow(lvl, 1.65)),

  /** Selling. */
  manualSellRate: 1.0,
  autoSellRate: 0.8,
  inventoryCap: 60,

  /** Offline progress. */
  offlineCapHours: 8,
  offlineEfficiency: 0.5,
  offlineMinSec: 60,
  offlineSimRolls: 400,

  /** Weather slots. */
  weatherSlotSec: 120,
  forecastBaseAccuracy: 0.85,
  weatherWeights: { clear: 30, rain: 20, storm: 12, fog: 14, aurora: 9, bloodmoon: 7, meteor: 8 } as Record<WeatherId, number>,

  /** Day cycle (seconds). */
  dayCycleSec: 480,

  /** Events. */
  eventMinSec: 60,
  eventMaxSec: 240,
  firstEventSec: 45,

  /** Prestige. */
  pearlDivisor: 1e6,
  pearlValueBonus: 0.1,

  /** Fate altar. */
  altarFishBase: 3,
  altarFishGrowth: 1.35,
  altarRelicBase: 2,
  altarRelicGrowth: 1.8,

  /** Relic slots. */
  baseRelicSlots: 3,
  maxRelicSlots: 6,

  /** Boss. */
  bossTime: 30,
  bossCooldownSec: 300,
  krakenHpPerZone: 70,

  /** Deep dive. */
  deepUnlockPrestiges: 5,

  /** Particles. */
  maxParticles: 60,
  maxLog: 200,
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa8b8',
  uncommon: '#58b84a',
  rare: '#4a8fe8',
  epic: '#a45af0',
  legendary: '#f2a02a',
  mythic: '#ff5ac8',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

export const MUTATION_INFO: Record<MutationId, { label: string; color: string; desc: string }> = {
  shiny: { label: 'Shiny', color: '#fff6a8', desc: 'x2 value. Sparkles.' },
  giant: { label: 'Giant', color: '#58b84a', desc: 'x3 value. Twice the fish.' },
  tiny: { label: 'Tiny', color: '#9ad8ff', desc: 'x0.5 value but x3 XP.' },
  golden: { label: 'Golden', color: '#f2c02a', desc: 'x5 value. Pure bling.' },
  cursed: { label: 'Cursed', color: '#8a5ad8', desc: 'x0.2 value, drops Cursed Shards.' },
  glitched: { label: 'Glitched', color: '#3cf0d0', desc: 'Random x0.1 to x20 value.' },
  prismatic: { label: 'Prismatic', color: '#ff5ac8', desc: 'x25 value. Every color.' },
};

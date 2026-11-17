export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
export const rarityIndex = (r: Rarity) => RARITIES.indexOf(r);

export type MutationId = 'shiny' | 'giant' | 'tiny' | 'golden' | 'cursed' | 'glitched' | 'prismatic';
export const MUTATIONS: MutationId[] = ['shiny', 'giant', 'tiny', 'golden', 'cursed', 'glitched', 'prismatic'];

export type WeatherId = 'clear' | 'rain' | 'storm' | 'fog' | 'aurora' | 'bloodmoon' | 'meteor';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type BaitId = 'worm' | 'glowgrub' | 'chaos' | 'golden' | 'gambler';
export type EventId = 'frenzy' | 'school' | 'treasure' | 'kraken' | 'merchant' | 'seagull' | 'rust';
export type ChestTier = 'wood' | 'silver' | 'gold' | 'cosmic';
export const CHEST_TIERS: ChestTier[] = ['wood', 'silver', 'gold', 'cosmic'];
export type HelperId = 'cat' | 'pelican' | 'sailor' | 'mermaid';
export type Phase = 'cast' | 'wait' | 'bite' | 'reel' | 'catch';
export type ReelQuality = 'perfect' | 'good' | 'auto' | 'miss';
export type Pose = 'idle' | 'cast' | 'reel' | 'cheer';
export type FishingMode = 'manual' | 'auto';

export interface AutoSellConfig {
  /** Which rarities are allowed to be auto-sold */
  rarities: Record<Rarity, boolean>;
  /** Keep any fish that has at least this many mutations (0 = sell mutated too, 1 = keep any mutated, 2 = keep 2+ mutated) */
  keepMutationsAtLeast: 0 | 1 | 2;
  /** Minimum size (cm) to auto-sell (0 = no minimum) */
  minSizeCm: number;
  /** Maximum size (cm) to auto-sell (0 = no maximum; e.g. 50 = keep trophy fish > 50cm) */
  maxSizeCm: number;
}

export interface FishDef {
  id: string;
  name: string;
  zone: number;
  rarity: Rarity;
  baseValue: number;
  flavor: string;
  /** manifest key of the sprite in groups.fish */
  sprite: string;
  /** optional CSS filter used to tint variant species */
  tint?: string;
  weather?: WeatherId[];
  time?: TimeOfDay[];
  w: number;
  h: number;
}

export interface HeldFish {
  uid: number;
  fishId: string;
  mutations: MutationId[];
  /** coin value without mutation multipliers (so mutations can be rerolled) */
  preMutValue: number;
  glitchMult: number;
  size: number;
  locked?: boolean;
}

export interface CodexEntry {
  count: number;
  bestMutations: MutationId[];
  bestMutMult: number;
  biggest: number;
  firstAt: number;
}

export interface RelicInstance {
  uid: number;
  id: string;
  roll: number;
  rerolls: number;
}

export interface LogEntry {
  id: number;
  t: number;
  kind: 'fish' | 'chest' | 'nothing' | 'info';
  fishId: string | null;
  text: string;
  rarity: Rarity;
  mutations: MutationId[];
  value: number;
  quality: ReelQuality | null;
}

export interface BossState {
  kind: 'kraken' | 'zone';
  zone: number;
  name: string;
  hp: number;
  maxHp: number;
  timeLeft: number;
  maxTime: number;
}

export interface ActiveEvent {
  id: EventId;
  timeLeft: number;
  duration: number;
}

export type DealKind = 'bait' | 'chest' | 'shards' | 'scrap' | 'relic';
export interface MerchantDeal {
  id: string;
  label: string;
  kind: DealKind;
  key: string;
  amount: number;
  price: number;
  discount: number;
  bought: boolean;
}

export interface WeatherSlot {
  actual: WeatherId;
  forecast: WeatherId;
}

export interface Seagull {
  x: number;
  y: number;
  vx: number;
  caught: boolean;
}

export interface FishingState {
  /** False on game entry until the player clicks Start Fishing and picks a mode */
  started: boolean;
  /** 'manual' = player must reel during bite; 'auto' = auto-reels with upgradeable Perfect chance */
  mode: FishingMode;
  phase: Phase;
  t: number;
  dur: number;
  quality: ReelQuality | null;
  /** seconds since the bite started (for timing grade) */
  biteElapsed: number;
  pose: Pose;
  poseT: number;
  lastClickAt: number;
}

export interface GameStats {
  casts: number;
  catches: number;
  perfect: number;
  good: number;
  auto: number;
  miss: number;
  jackpots: number;
  chestsOpened: number;
  krakens: number;
  bossKills: number;
  doubles: number;
  seagulls: number;
  nothing: number;
  rarityCounts: Record<Rarity, number>;
  mutationCounts: Record<MutationId, number>;
  expected: Record<Rarity, number>;
  rolls: number;
  playTime: number;
  bestCatchValue: number;
  bestCatchName: string;
  everRare: boolean;
  weatherSeen: WeatherId[];
  totalCoinsAllTime: number;
}

export interface Settings {
  volume: number;
  muted: boolean;
  reducedMotion: boolean;
  logFilter: 'all' | 'rare' | 'epic' | 'mutated';
  showTooltips: boolean;
}

export interface GameState {
  version: number;
  coins: number;
  runCoins: number;
  lifetimeCoins: number;
  pearls: number;
  pearlsEarned: number;
  shards: number;
  scrap: number;
  xp: number;
  level: number;
  skillPoints: number;
  zone: number;
  unlockedZone: number;
  rodTier: number;
  /** Highest rod tier ever obtained across all runs (for the Codex) */
  highestRodTier: number;
  upgrades: Record<string, number>;
  helpers: Record<HelperId, number>;
  skills: Record<string, number>;
  prestigeShop: Record<string, number>;
  bait: Record<BaitId, number>;
  /** Bait IDs ever obtained by the player (for the Codex) */
  discoveredBaits: BaitId[];
  /** Helper IDs ever hired by the player (for the Codex) */
  discoveredHelpers: HelperId[];
  equippedBait: BaitId | null;
  inventory: HeldFish[];
  autoSell: boolean;
  autoSellConfig: AutoSellConfig;
  chests: Record<ChestTier, number>;
  relics: RelicInstance[];
  /** Relic IDs ever found by the player (for the Codex) */
  discoveredRelics: string[];
  equippedRelics: number[];
  codex: Record<string, CodexEntry>;
  claimedMilestones: string[];
  achievements: Record<string, number>;
  bossDefeated: Record<number, boolean>;
  bossCooldown: number;
  fishing: FishingState;
  weather: { current: WeatherId; timeLeft: number; queue: WeatherSlot[] };
  clock: number;
  event: ActiveEvent | null;
  nextEventIn: number;
  boss: BossState | null;
  merchant: MerchantDeal[];
  seagull: Seagull | null;
  pity: { sinceEpic: number; sinceLegendary: number; sinceMutation: number };
  streak: number;
  bestStreak: number;
  perfectCombo: number;
  altarRerolls: number;
  stats: GameStats;
  prestiges: number;
  deep: { active: boolean; depth: number; maxDepth: number; milestones: number };
  cosmetics: { owned: string[]; line: string; dye: string };
  settings: Settings;
  tutorialStep: number;
  lastSave: number;
  lastActive: number;
  log: LogEntry[];
  nextUid: number;
}

export interface CatchResult {
  kind: 'fish' | 'chest' | 'nothing';
  fish: FishDef | null;
  rarity: Rarity;
  mutations: MutationId[];
  glitchMult: number;
  mutMult: number;
  preMutValue: number;
  value: number;
  size: number;
  xp: number;
  shards: number;
  scrap: number;
  chest: ChestTier | null;
  quality: ReelQuality;
  isDouble: boolean;
  forcedBy: string | null;
  chaos: string | null;
}

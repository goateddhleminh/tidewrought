import { useEffect, useRef, useState } from 'react';
import { BALANCE } from './balance';
import type { GameState, MutationId, Rarity } from './types';
import { MUTATIONS, RARITIES } from './types';

export const SAVE_VERSION = 4;

const zeroRarity = () => Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>;
const zeroMut = () => Object.fromEntries(MUTATIONS.map((m) => [m, 0])) as Record<MutationId, number>;

export function createInitialState(): GameState {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    coins: 0,
    runCoins: 0,
    lifetimeCoins: 0,
    pearls: 0,
    pearlsEarned: 0,
    shards: 0,
    scrap: 0,
    xp: 0,
    level: 1,
    skillPoints: 0,
    zone: 1,
    unlockedZone: 1,
    rodTier: 1,
    highestRodTier: 1,
    upgrades: {},
    helpers: { cat: 0, pelican: 0, sailor: 0, mermaid: 0 },
    skills: {},
    prestigeShop: {},
    bait: { worm: 10, glowgrub: 0, chaos: 0, golden: 0, gambler: 0 },
    discoveredBaits: ['worm'],
    discoveredHelpers: [],
    equippedBait: null,
    inventory: [],
    autoSell: true,
    autoSellConfig: {
      rarities: {
        common: true,
        uncommon: true,
        rare: true,
        epic: false,
        legendary: false,
        mythic: false,
      },
      keepMutationsAtLeast: 1,
      minSizeCm: 0,
      maxSizeCm: 0,
    },
    chests: { wood: 0, silver: 0, gold: 0, cosmic: 0 },
    relics: [],
    discoveredRelics: [],
    equippedRelics: [],
    codex: {},
    claimedMilestones: [],
    achievements: {},
    bossDefeated: {},
    bossCooldown: 0,
    fishing: {
      started: false,
      mode: 'auto',
      phase: 'cast',
      t: 0,
      dur: BALANCE.castTime,
      quality: null,
      biteElapsed: 0,
      pose: 'idle',
      poseT: 0,
      lastClickAt: -99,
    },
    weather: { current: 'clear', timeLeft: BALANCE.weatherSlotSec, queue: [] },
    clock: BALANCE.dayCycleSec * 0.15,
    event: null,
    nextEventIn: BALANCE.firstEventSec,
    boss: null,
    merchant: [],
    seagull: null,
    pity: { sinceEpic: 0, sinceLegendary: 0, sinceMutation: 0 },
    streak: 0,
    bestStreak: 0,
    perfectCombo: 0,
    altarRerolls: 0,
    stats: {
      casts: 0, catches: 0, perfect: 0, good: 0, auto: 0, miss: 0, jackpots: 0, chestsOpened: 0, krakens: 0,
      bossKills: 0, doubles: 0, seagulls: 0, nothing: 0,
      rarityCounts: zeroRarity(), mutationCounts: zeroMut(), expected: zeroRarity(), rolls: 0,
      playTime: 0, bestCatchValue: 0, bestCatchName: '', everRare: false, weatherSeen: ['clear'], totalCoinsAllTime: 0,
    },
    prestiges: 0,
    deep: { active: false, depth: 0, maxDepth: 0, milestones: 0 },
    cosmetics: { owned: ['line_white', 'dye_none'], line: 'line_white', dye: 'dye_none' },
    settings: { volume: 0.5, muted: false, reducedMotion: false, logFilter: 'all', showTooltips: true },
    tutorialStep: 0,
    lastSave: now,
    lastActive: now,
    log: [],
    nextUid: 1,
  };
}

// ---------------- store ----------------
type Listener = () => void;
const listeners = new Set<Listener>();

export const store = {
  state: createInitialState(),
  version: 0,
};

export function emit() {
  store.version++;
  for (const l of listeners) l();
}
export function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export const getState = () => store.state;

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  return false;
}

/**
 * Subscribe a component to a slice of the game state. Re-renders only when the
 * selected value (or tuple of values) changes. Collections in the state are
 * replaced (copy-on-write) when they change, so references are safe to compare.
 */
export function useGame<T>(selector: (s: GameState) => T): T {
  const selRef = useRef(selector);
  selRef.current = selector;
  const [value, setValue] = useState(() => selector(store.state));
  const valRef = useRef(value);
  valRef.current = value;
  useEffect(() => {
    const check = () => {
      const next = selRef.current(store.state);
      if (!shallowEqual(next, valRef.current)) {
        valRef.current = next;
        setValue(() => next);
      }
    };
    check();
    return subscribe(check);
  }, []);
  return value;
}

/** Re-render on every emitted tick (for small, live widgets). */
export function useTick(): number {
  const [v, setV] = useState(store.version);
  useEffect(() => subscribe(() => setV(store.version)), []);
  return v;
}

// ---------------- FX bus (transient visual events) ----------------
export type FxEvent =
  | { type: 'cast' }
  | { type: 'bite' }
  | { type: 'catch'; result: import('./types').CatchResult; second?: boolean }
  | { type: 'nothing'; text: string }
  | { type: 'miss' }
  | { type: 'float'; text: string; color: string; x?: number; y?: number; big?: boolean }
  | { type: 'jackpot' }
  | { type: 'shake'; power: number }
  | { type: 'levelUp'; level: number }
  | { type: 'toast'; title: string; text: string; color?: string; icon?: string }
  | { type: 'bossHit'; dmg: number; x: number; y: number }
  | { type: 'bossEnd'; won: boolean; name: string }
  | { type: 'seagull' }
  | { type: 'chestDrop'; tier: import('./types').ChestTier }
  | { type: 'perfect'; quality: import('./types').ReelQuality };

type FxListener = (e: FxEvent) => void;
const fxListeners = new Set<FxListener>();
export const fx = {
  emit(e: FxEvent) {
    for (const l of fxListeners) l(e);
  },
  on(l: FxListener) {
    fxListeners.add(l);
    return () => {
      fxListeners.delete(l);
    };
  },
};

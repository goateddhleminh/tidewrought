import { addCoins, addXp, checkAchievements } from './actions';
import { BALANCE } from './balance';
import { BAITS } from './data/bait';
import { computeStats, idleCycleTime, rollCatch, rollChestTier } from './engine';
import { chance, weightedPick } from './rng';
import { SAVE_VERSION, createInitialState, emit, store } from './state';
import { MUTATIONS, RARITIES, type GameState, type Rarity } from './types';

const STORAGE_KEY = 'tidewrought_idle_save';

export interface OfflineReport {
  awaySec: number;
  cappedSec: number;
  capHours: number;
  casts: number;
  coins: number;
  xp: number;
  chests: number;
  shards: number;
  newSpecies: number;
  byRarity: Record<Rarity, number>;
}

/** Merge a partial/older save object safely onto a fresh initial state. */
export function migrateSave(raw: unknown): GameState {
  const fresh = createInitialState();
  if (!raw || typeof raw !== 'object') return fresh;
  const src = raw as Partial<GameState>;

  const mergedHelpers = { ...fresh.helpers, ...(src.helpers ?? {}) };
  const mergedBait = { ...fresh.bait, ...(src.bait ?? {}) };
  const mergedRelics = Array.isArray(src.relics) ? src.relics : [];

  const discBaits = new Set<import('./types').BaitId>(['worm', ...(src.discoveredBaits ?? [])]);
  for (const [k, v] of Object.entries(mergedBait)) {
    if (v > 0) discBaits.add(k as import('./types').BaitId);
  }
  const discHelpers = new Set<import('./types').HelperId>(src.discoveredHelpers ?? []);
  for (const [k, v] of Object.entries(mergedHelpers)) {
    if (v > 0) discHelpers.add(k as import('./types').HelperId);
  }
  const discRelics = new Set<string>([
    ...(src.discoveredRelics ?? []),
    ...mergedRelics.map((r) => r.id),
  ]);

  const merged: GameState = {
    ...fresh,
    ...src,
    version: SAVE_VERSION,
    highestRodTier: Math.max(fresh.highestRodTier, src.highestRodTier ?? 1, src.rodTier ?? 1),
    upgrades: { ...fresh.upgrades, ...(src.upgrades ?? {}) },
    helpers: mergedHelpers,
    skills: { ...fresh.skills, ...(src.skills ?? {}) },
    prestigeShop: { ...fresh.prestigeShop, ...(src.prestigeShop ?? {}) },
    bait: mergedBait,
    discoveredBaits: Array.from(discBaits),
    discoveredHelpers: Array.from(discHelpers),
    discoveredRelics: Array.from(discRelics),
    autoSellConfig: {
      ...fresh.autoSellConfig,
      ...(src.autoSellConfig ?? {}),
      rarities: {
        ...fresh.autoSellConfig.rarities,
        ...(src.autoSellConfig?.rarities ?? {}),
      },
    },
    chests: { ...fresh.chests, ...(src.chests ?? {}) },
    codex: { ...(src.codex ?? {}) },
    achievements: { ...(src.achievements ?? {}) },
    bossDefeated: { ...(src.bossDefeated ?? {}) },
    pity: { ...fresh.pity, ...(src.pity ?? {}) },
    deep: { ...fresh.deep, ...(src.deep ?? {}) },
    cosmetics: {
      ...fresh.cosmetics,
      ...(src.cosmetics ?? {}),
      owned: Array.from(new Set([...fresh.cosmetics.owned, ...(src.cosmetics?.owned ?? [])])),
    },
    settings: { ...fresh.settings, ...(src.settings ?? {}) },
    stats: {
      ...fresh.stats,
      ...(src.stats ?? {}),
      rarityCounts: { ...fresh.stats.rarityCounts, ...(src.stats?.rarityCounts ?? {}) },
      mutationCounts: { ...fresh.stats.mutationCounts, ...(src.stats?.mutationCounts ?? {}) },
      expected: { ...fresh.stats.expected, ...(src.stats?.expected ?? {}) },
      weatherSeen: Array.from(new Set([...fresh.stats.weatherSeen, ...(src.stats?.weatherSeen ?? [])])),
    },
    // Never auto-start fishing on enter/load; wait for the player to click Start Fishing
    fishing: {
      ...fresh.fishing,
      started: false,
      mode: src.fishing?.mode ?? 'auto',
      pose: 'idle',
    },
    boss: null,
    event: null,
    seagull: null,
    merchant: [],
    log: Array.isArray(src.log) ? src.log.slice(0, BALANCE.maxLog) : [],
    inventory: Array.isArray(src.inventory) ? src.inventory.slice(0, BALANCE.inventoryCap) : [],
    relics: mergedRelics,
    equippedRelics: Array.isArray(src.equippedRelics) ? src.equippedRelics : [],
    claimedMilestones: Array.isArray(src.claimedMilestones) ? src.claimedMilestones : [],
  };

  for (const r of RARITIES) {
    if (typeof merged.stats.rarityCounts[r] !== 'number') merged.stats.rarityCounts[r] = 0;
    if (typeof merged.stats.expected[r] !== 'number') merged.stats.expected[r] = 0;
  }
  for (const m of MUTATIONS) {
    if (typeof merged.stats.mutationCounts[m] !== 'number') merged.stats.mutationCounts[m] = 0;
  }

  return merged;
}

export function saveGame(): void {
  try {
    const s = store.state;
    s.lastSave = Date.now();
    s.lastActive = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (err) {
    console.warn('[Tidewrought] Failed to save:', err);
  }
}

export function loadGame(): OfflineReport | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    store.state = migrateSave(parsed);
    const awaySec = Math.max(0, (Date.now() - (store.state.lastActive || Date.now())) / 1000);
    const report = awaySec >= BALANCE.offlineMinSec ? applyOfflineProgress(awaySec) : null;
    emit();
    return report;
  } catch (err) {
    console.warn('[Tidewrought] Failed to load save:', err);
    return null;
  }
}

export function exportSave(): string {
  saveGame();
  const json = JSON.stringify(store.state);
  return btoa(encodeURIComponent(json));
}

export function importSave(encoded: string): boolean {
  try {
    const clean = encoded.trim();
    const json = decodeURIComponent(atob(clean));
    const parsed = JSON.parse(json);
    store.state = migrateSave(parsed);
    saveGame();
    emit();
    return true;
  } catch {
    return false;
  }
}

export function hardReset(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  store.state = createInitialState();
  emit();
}

/** Compute & apply offline progress when returning after `awaySec` seconds. */
export function applyOfflineProgress(awaySec: number): OfflineReport | null {
  if (awaySec < BALANCE.offlineMinSec) return null;
  const s = store.state;
  const st = computeStats(s);
  const capSec = st.offlineCapH * 3600;
  const cappedSec = Math.min(awaySec, capSec);
  const cycle = idleCycleTime(st);
  const totalCasts = Math.max(1, Math.floor((cappedSec * st.offlineEff) / cycle));
  const simCount = Math.min(totalCasts, BALANCE.offlineSimRolls);
  const scale = totalCasts / simCount;

  let coins = 0;
  let xp = 0;
  let chests = 0;
  let shards = 0;
  let newSpecies = 0;
  const byRarity: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 };

  for (let i = 0; i < simCount; i++) {
    const res = rollCatch(s, st, 'auto');
    if (res.kind === 'fish' && res.fish) {
      const n = Math.max(1, Math.round(scale));
      byRarity[res.rarity] += n;
      s.stats.catches += n;
      s.stats.casts += n;
      s.stats.auto += n;
      s.stats.rarityCounts[res.rarity] += n;
      for (const m of res.mutations) s.stats.mutationCounts[m] += n;
      coins += res.value * st.autoSellRate * scale;
      xp += res.xp * scale;
      shards += res.shards * scale;

      if (!s.codex[res.fish.id]) {
        newSpecies++;
        s.codex[res.fish.id] = {
          count: n,
          bestMutations: res.mutations,
          bestMutMult: res.mutMult,
          biggest: res.size,
          firstAt: Date.now(),
        };
      } else {
        s.codex[res.fish.id].count += n;
      }
    }
    if (chance(st.chest)) {
      const tier = rollChestTier(st.luck);
      s.chests[tier]++;
      chests++;
    }
    if (s.helpers.pelican > 0 && chance(Math.min(0.6, s.helpers.pelican * 0.04))) {
      const b = weightedPick(BAITS, (x) => x.findWeight);
      s.bait[b.id] += Math.max(1, Math.round(scale * 0.5));
    }
  }

  coins = Math.round(coins);
  xp = Math.round(xp);
  shards = Math.round(shards);
  addCoins(s, coins);
  addXp(s, xp);
  s.shards += shards;
  s.codex = { ...s.codex };
  s.chests = { ...s.chests };
  s.bait = { ...s.bait };
  s.lastActive = Date.now();
  checkAchievements(s);
  saveGame();
  emit();

  return {
    awaySec,
    cappedSec,
    capHours: st.offlineCapH,
    casts: totalCasts,
    coins,
    xp,
    chests,
    shards,
    newSpecies,
    byRarity,
  };
}

import { BALANCE, RARITY_COLOR } from './balance';
import { ACHIEVEMENTS, rewardLabel } from './data/achievements';
import { BAITS, baitDef } from './data/bait';
import { COSMETICS, cosmeticDef } from './data/cosmetics';
import { EVENTS, EVENT_IDS, WEATHER, WEATHER_IDS } from './data/events';
import { FISH, FISH_BY_ID, fishInZone } from './data/fish';
import { RELICS, RELIC_BY_ID } from './data/relics';
import { SKILLS, skillDef } from './data/skills';
import {
  HELPERS, RODS, UPGRADES, bulkCost, costAt, maxAffordable, prestigeDef, upgradeDef,
} from './data/upgrades';
import { ZONES, zoneDef } from './data/zones';
import {
  computeStats, expectedCatchValue, lvl, mutationMultiplier, pearlsForReset, relicSlots, rollCatch, rollChestTier,
  rollMutations, shouldAutoSell, xpToNext, type Stats,
} from './engine';
import { fmt, safe } from './format';
import { chance, logUniform, pick, rand, randInt, weightedPick } from './rng';
import { sfx } from './sound';
import { saveGame } from './save';
import { emit, fx, store } from './state';
import {
  CHEST_TIERS, rarityIndex, type AutoSellConfig, type BaitId, type CatchResult, type ChestTier, type EventId,
  type FishingMode, type GameState, type HeldFish, type HelperId, type LogEntry, type MerchantDeal, type Rarity,
  type ReelQuality, type Settings, type WeatherSlot,
} from './types';

function markBaitDiscovered(s: GameState, id: BaitId) {
  if (!s.discoveredBaits.includes(id)) {
    s.discoveredBaits = [...s.discoveredBaits, id];
  }
}

let lastAutoSaveAt = 0;
/** Save immediately (throttled to 1.5s during rapid clicks) whenever progress changes if autoSaveEnabled is true. */
export function autoSaveProgress(force = false) {
  const s = store.state;
  if (!force && !s.settings.autoSaveEnabled) return;
  const now = Date.now();
  if (!force && now - lastAutoSaveAt < 1500) return;
  lastAutoSaveAt = now;
  saveGame();
}

function pushLog(s: GameState, entry: Omit<LogEntry, 'id' | 't'>) {
  const next: LogEntry = { ...entry, id: s.nextUid++, t: Date.now() };
  s.log = [next, ...s.log.slice(0, BALANCE.maxLog - 1)];
}

export function addCoins(s: GameState, amount: number) {
  const v = safe(Math.max(0, amount));
  s.coins = safe(s.coins + v);
  s.runCoins = safe(s.runCoins + v);
  s.lifetimeCoins = safe(s.lifetimeCoins + v);
  s.stats.totalCoinsAllTime = safe(s.stats.totalCoinsAllTime + v);
}

export function addXp(s: GameState, amount: number) {
  s.xp += Math.max(0, amount);
  let leveled = false;
  while (s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
    s.skillPoints++;
    leveled = true;
  }
  if (leveled) {
    sfx.levelUp();
    fx.emit({ type: 'levelUp', level: s.level });
    fx.emit({ type: 'toast', title: `LEVEL ${s.level}!`, text: '+1 Skill Point earned.', color: '#58b84a', icon: 'icon:xp_star' });
  }
}

export function checkAchievements(s: GameState) {
  let changed = false;
  for (const a of ACHIEVEMENTS) {
    if (s.achievements[a.id]) continue;
    if (a.check(s)) {
      s.achievements = { ...s.achievements, [a.id]: Date.now() };
      changed = true;
      fx.emit({
        type: 'toast',
        title: `Achievement: ${a.name}`,
        text: `${a.desc} (${rewardLabel(a.reward)})`,
        color: '#f2a02a',
        icon: 'icon:achievement',
      });
    }
  }
  return changed;
}

// ---------- Weather queue ----------
function rollWeatherSlot(forecastAcc: number): WeatherSlot {
  const actual = weightedPick(WEATHER_IDS, (w) => BALANCE.weatherWeights[w]);
  const forecast = chance(forecastAcc)
    ? actual
    : weightedPick(
        WEATHER_IDS.filter((w) => w !== actual),
        (w) => BALANCE.weatherWeights[w],
      );
  return { actual, forecast };
}

export function ensureWeatherQueue(s: GameState, st: Stats) {
  if (s.weather.queue.length >= 2) return;
  const q = [...s.weather.queue];
  while (q.length < 2) q.push(rollWeatherSlot(st.forecastAcc));
  s.weather = { ...s.weather, queue: q };
}

function advanceWeather(s: GameState, st: Stats) {
  ensureWeatherQueue(s, st);
  const [next, ...rest] = s.weather.queue;
  const chosen = next?.actual ?? 'clear';
  rest.push(rollWeatherSlot(st.forecastAcc));
  const wrong = next && next.forecast !== next.actual;
  s.weather = { current: chosen, timeLeft: BALANCE.weatherSlotSec, queue: rest };
  if (!s.stats.weatherSeen.includes(chosen)) {
    s.stats.weatherSeen = [...s.stats.weatherSeen, chosen];
  }
  if (chosen !== 'clear' || wrong) {
    const w = WEATHER[chosen];
    fx.emit({
      type: 'toast',
      title: `Weather: ${w.name}${wrong ? ' (Surprise!)' : ''}`,
      text: w.desc,
      color: '#4a8fe8',
      icon: `weather:${chosen}`,
    });
  }
}

// ---------- Random Events ----------
function generateMerchantDeals(s: GameState, st: Stats): MerchantDeal[] {
  const ev = expectedCatchValue(s, st, 'good');
  const pool: (() => Omit<MerchantDeal, 'id' | 'bought'>)[] = [
    () => {
      const b = pick(['glowgrub', 'golden', 'chaos', 'gambler'] as BaitId[]);
      const amt = randInt(5, 14);
      const disc = pick([20, 30, 40, 50]);
      const baseP = baitDef(b).price * (BALANCE.zoneValueMult[s.zone - 1] ?? 1) * amt;
      return {
        label: `${amt}x ${baitDef(b).name}`,
        kind: 'bait',
        key: b,
        amount: amt,
        price: Math.max(10, Math.round(baseP * (1 - disc / 100))),
        discount: disc,
      };
    },
    () => {
      const tier = pick(['wood', 'silver', 'gold'] as ChestTier[]);
      const mult = tier === 'wood' ? 8 : tier === 'silver' ? 22 : 55;
      const disc = pick([25, 35, 45]);
      return {
        label: `1x ${tier[0].toUpperCase() + tier.slice(1)} Chest`,
        kind: 'chest',
        key: tier,
        amount: 1,
        price: Math.max(25, Math.round(ev * mult * (1 - disc / 100))),
        discount: disc,
      };
    },
    () => {
      const amt = randInt(3, 8);
      const disc = pick([20, 35, 50]);
      return {
        label: `${amt}x Cursed Shards`,
        kind: 'shards',
        key: 'shards',
        amount: amt,
        price: Math.max(40, Math.round(ev * 6 * amt * (1 - disc / 100))),
        discount: disc,
      };
    },
    () => {
      const amt = randInt(6, 15);
      const disc = pick([25, 40, 55]);
      return {
        label: `${amt}x Scrap`,
        kind: 'scrap',
        key: 'scrap',
        amount: amt,
        price: Math.max(20, Math.round(ev * 2.5 * amt * (1 - disc / 100))),
        discount: disc,
      };
    },
  ];
  return [0, 1, 2].map((i) => ({
    id: `deal_${Date.now()}_${i}`,
    bought: false,
    ...pick(pool)(),
  }));
}

export function triggerEvent(s: GameState, st: Stats, forcedId?: EventId) {
  const cands = EVENT_IDS.filter((id) => EVENTS[id].minZone <= s.zone && (id !== 'kraken' || !s.boss));
  const id = forcedId ?? weightedPick(cands, (k) => EVENTS[k].weight);
  const def = EVENTS[id];
  const dur = randInt(def.duration[0], def.duration[1]);
  s.event = { id, timeLeft: dur, duration: dur };
  if (id === 'kraken') {
    const hp = Math.round(BALANCE.krakenHpPerZone * Math.pow(2.1, s.zone - 1));
    s.boss = { kind: 'kraken', zone: s.zone, name: 'The Kraken', hp, maxHp: hp, timeLeft: dur, maxTime: dur };
  } else if (id === 'merchant') {
    s.merchant = generateMerchantDeals(s, st);
  } else if (id === 'seagull') {
    s.seagull = { x: 10, y: 16 + randInt(0, 16), vx: 14, caught: false };
  }
  fx.emit({
    type: 'toast',
    title: `Event: ${def.name}`,
    text: def.desc,
    color: def.good ? '#f2a02a' : '#e85a5a',
    icon: id === 'treasure' ? 'icon:relic' : id === 'kraken' ? 'icon:reel' : 'icon:xp_star',
  });
}

// ---------- Catch resolution ----------
function applySingleCatch(s: GameState, st: Stats, res: CatchResult, isSecond = false) {
  if (res.scrap > 0) s.scrap += res.scrap;
  if (res.shards > 0) s.shards += res.shards;
  if (res.xp > 0) addXp(s, res.xp);

  if (res.kind === 'nothing') {
    s.stats.nothing++;
    s.streak = 0;
    pushLog(s, {
      kind: 'nothing',
      fishId: null,
      text: res.forcedBy ?? 'Nothing bit...',
      rarity: 'common',
      mutations: [],
      value: 0,
      quality: res.quality,
    });
    fx.emit({ type: 'nothing', text: res.forcedBy ?? 'Empty hook!' });
    return;
  }

  if (res.kind === 'chest' && res.chest) {
    s.chests = { ...s.chests, [res.chest]: s.chests[res.chest] + 1 };
    pushLog(s, {
      kind: 'chest',
      fishId: null,
      text: `Fished up a ${res.chest.toUpperCase()} Chest!`,
      rarity: res.chest === 'cosmic' ? 'mythic' : res.chest === 'gold' ? 'legendary' : res.chest === 'silver' ? 'rare' : 'uncommon',
      mutations: [],
      value: 0,
      quality: res.quality,
    });
    sfx.chest();
    fx.emit({ type: 'chestDrop', tier: res.chest });
    return;
  }

  const fish = res.fish!;
  s.stats.catches++;
  s.stats.rarityCounts = { ...s.stats.rarityCounts, [res.rarity]: s.stats.rarityCounts[res.rarity] + 1 };
  for (const m of res.mutations) {
    s.stats.mutationCounts = { ...s.stats.mutationCounts, [m]: s.stats.mutationCounts[m] + 1 };
  }

  const rIdx = rarityIndex(res.rarity);
  if (rIdx >= 2) {
    s.stats.everRare = true;
    s.streak++;
    if (s.streak > s.bestStreak) s.bestStreak = s.streak;
  } else {
    s.streak = Math.max(0, s.streak - 1);
  }

  if (res.mutations.length >= BALANCE.jackpotMutations) {
    s.stats.jackpots++;
    sfx.jackpot();
    fx.emit({ type: 'jackpot' });
  } else {
    sfx.catchRarity(rIdx);
  }

  if (rIdx >= 4) {
    fx.emit({ type: 'shake', power: rIdx === 5 ? 8 : 5 });
  }

  // Codex update
  const prev = s.codex[fish.id];
  if (!prev) {
    s.codex = {
      ...s.codex,
      [fish.id]: {
        count: 1,
        bestMutations: res.mutations,
        bestMutMult: res.mutMult,
        biggest: res.size,
        firstAt: Date.now(),
      },
    };
  } else {
    s.codex = {
      ...s.codex,
      [fish.id]: {
        count: prev.count + 1,
        bestMutations: res.mutMult > prev.bestMutMult ? res.mutations : prev.bestMutations,
        bestMutMult: Math.max(prev.bestMutMult, res.mutMult),
        biggest: Math.max(prev.biggest, res.size),
        firstAt: prev.firstAt,
      },
    };
  }

  // Sell or store in inventory based on custom Auto-Sell Filter
  let coinsEarned = 0;
  let storedInInventory = false;
  const held: HeldFish = {
    uid: s.nextUid++,
    fishId: fish.id,
    mutations: res.mutations,
    preMutValue: res.preMutValue,
    glitchMult: res.glitchMult,
    size: res.size,
  };

  const canAutoSellThis = shouldAutoSell(s, res.rarity, res.mutations, res.size);
  if (canAutoSellThis) {
    coinsEarned = res.value * st.autoSellRate;
    addCoins(s, coinsEarned);
  } else if (s.inventory.length < BALANCE.inventoryCap) {
    s.inventory = [held, ...s.inventory];
    storedInInventory = true;
  } else if (s.helpers.cat > 0) {
    coinsEarned = res.value * st.autoSellRate;
    addCoins(s, coinsEarned);
  } else {
    // Inventory full without Dock Cat: auto-sell at base auto rate so nothing is lost
    coinsEarned = res.value * BALANCE.autoSellRate;
    addCoins(s, coinsEarned);
  }

  if (res.value > s.stats.bestCatchValue) {
    s.stats.bestCatchValue = res.value;
    s.stats.bestCatchName = fish.name;
  }

  const mutText = res.mutations.length ? ` [${res.mutations.map((m) => m.toUpperCase()).join('+')}]` : '';
  const storedTag = storedInInventory ? ' [KEPT IN INVENTORY]' : '';
  pushLog(s, {
    kind: 'fish',
    fishId: fish.id,
    text: `${isSecond ? '(DOUBLE!) ' : ''}Caught ${fish.name}${mutText} (${res.size}cm)${storedTag}${res.forcedBy ? ` — ${res.forcedBy}` : ''}`,
    rarity: res.rarity,
    mutations: res.mutations,
    value: storedInInventory ? res.value : coinsEarned,
    quality: res.quality,
  });

  fx.emit({ type: 'catch', result: res, second: isSecond });
  if (coinsEarned > 0) {
    fx.emit({
      type: 'float',
      text: `+${fmt(coinsEarned)}`,
      color: RARITY_COLOR[res.rarity],
      big: rIdx >= 3,
    });
  }

  // Deep Dive progress
  if (s.deep.active) {
    const gain = 1.5 + rIdx * 0.8 + (res.quality === 'perfect' ? 1 : 0);
    s.deep = {
      ...s.deep,
      depth: s.deep.depth + gain,
      maxDepth: Math.max(s.deep.maxDepth, s.deep.depth + gain),
    };
    const ms = Math.floor(s.deep.maxDepth / 100);
    if (ms > s.deep.milestones) {
      const diff = ms - s.deep.milestones;
      s.deep.milestones = ms;
      s.pearls += diff * 2;
      s.pearlsEarned += diff * 2;
      fx.emit({
        type: 'toast',
        title: `Deep Dive ${ms * 100}m!`,
        text: `+${diff * 2} Pearls earned from the abyss.`,
        color: '#ff5ac8',
        icon: 'icon:offline',
      });
    }
  }
}

function finishCatchCycle(s: GameState, st: Stats) {
  const quality: ReelQuality = s.fishing.quality ?? 'auto';
  s.stats.casts++;
  if (quality === 'perfect') {
    s.stats.perfect++;
    s.perfectCombo = Math.min(50, s.perfectCombo + 1);
  } else if (quality === 'good') {
    s.stats.good++;
    s.perfectCombo = 0;
  } else {
    s.stats.auto++;
    s.perfectCombo = 0;
  }

  // Consume equipped bait (unless saved)
  if (s.equippedBait && s.bait[s.equippedBait] > 0) {
    if (!chance(st.baitSave)) {
      const nextCnt = s.bait[s.equippedBait] - 1;
      s.bait = { ...s.bait, [s.equippedBait]: nextCnt };
      if (nextCnt <= 0) s.equippedBait = null;
    }
  }

  // Pelican helper finds extra bait
  const pelLvl = s.helpers.pelican;
  if (pelLvl > 0 && chance(Math.min(0.6, pelLvl * 0.04))) {
    const found = weightedPick(BAITS, (b) => b.findWeight);
    s.bait = { ...s.bait, [found.id]: s.bait[found.id] + 1 };
    markBaitDiscovered(s, found.id);
  }

  const first = rollCatch(s, st, quality);
  applySingleCatch(s, st, first, false);

  // Double catch critical roll
  if (first.kind === 'fish' && chance(st.crit)) {
    s.stats.doubles++;
    const second = rollCatch(s, st, quality);
    second.isDouble = true;
    applySingleCatch(s, st, second, true);
  }

  // Bonus Treasure Chest drop roll
  if (chance(st.chest)) {
    const tier = rollChestTier(st.luck);
    s.chests = { ...s.chests, [tier]: s.chests[tier] + 1 };
    sfx.chest();
    fx.emit({ type: 'chestDrop', tier });
    pushLog(s, {
      kind: 'chest',
      fishId: null,
      text: `Bonus ${tier.toUpperCase()} Chest hooked!`,
      rarity: tier === 'cosmic' ? 'mythic' : tier === 'gold' ? 'legendary' : 'rare',
      mutations: [],
      value: 0,
      quality,
    });
  }

  // Advance tutorial if on step 0 or 1
  if (s.tutorialStep === 0 && s.stats.catches >= 1) s.tutorialStep = 1;

  const rIdx = first.kind === 'fish' ? rarityIndex(first.rarity) : 0;
  const pose = rIdx >= 2 ? 'cheer' : 'idle';
  const dur = rIdx >= 2 ? BALANCE.cheerTime : BALANCE.catchShowTime;
  s.fishing = {
    ...s.fishing,
    phase: 'catch',
    t: 0,
    dur,
    pose,
    poseT: 0,
  };

  checkAchievements(s);
  autoSaveProgress();
}

// ---------- Main fixed-timestep tick ----------
export function stepTick(dt: number) {
  const s = store.state;
  const st = computeStats(s);
  ensureWeatherQueue(s, st);

  s.clock += dt;
  s.stats.playTime += dt;
  s.lastActive = Date.now();

  if (s.bossCooldown > 0) s.bossCooldown = Math.max(0, s.bossCooldown - dt);

  // Weather timer
  s.weather.timeLeft -= dt;
  if (s.weather.timeLeft <= 0) advanceWeather(s, st);

  // Random events timer
  if (s.event) {
    s.event.timeLeft -= dt;
    if (s.event.timeLeft <= 0) {
      const ended = s.event.id;
      s.event = null;
      if (ended === 'merchant') s.merchant = [];
      if (ended === 'seagull') s.seagull = null;
      s.nextEventIn = rand(BALANCE.eventMinSec, BALANCE.eventMaxSec) / st.eventFreq;
    }
  } else {
    s.nextEventIn -= dt;
    if (s.nextEventIn <= 0) triggerEvent(s, st);
  }

  // Seagull flight
  if (s.seagull && !s.seagull.caught) {
    s.seagull.x += s.seagull.vx * dt;
    if (s.seagull.x > 196) s.seagull = null;
  }

  // Boss timer + auto chip damage from Reel Strength
  if (s.boss) {
    s.boss.timeLeft -= dt;
    const idleDps = st.clickDamage * 0.65;
    s.boss.hp = Math.max(0, s.boss.hp - idleDps * dt);
    if (s.boss.hp <= 0) {
      resolveBossVictory(s, st);
    } else if (s.boss.timeLeft <= 0) {
      const name = s.boss.name;
      if (s.boss.kind === 'kraken' && s.event?.id === 'kraken') s.event = null;
      s.boss = null;
      fx.emit({ type: 'bossEnd', won: false, name });
      fx.emit({ type: 'toast', title: `${name} escaped!`, text: 'Upgrade your Spool Reel or click faster next time.', color: '#e85a5a' });
    }
  }

  // Fishing state machine (only runs after the user clicks Start Fishing)
  const f = s.fishing;
  f.poseT += dt;

  if (!f.started) {
    f.pose = 'idle';
    emit();
    return;
  }

  f.t += dt;

  if (f.phase === 'cast') {
    if (f.t >= f.dur) {
      const waitDur = st.waitTime * rand(BALANCE.waitJitter[0], BALANCE.waitJitter[1]);
      s.fishing = { ...f, phase: 'wait', t: 0, dur: waitDur, quality: null, biteElapsed: 0, pose: 'idle', poseT: 0 };
      sfx.cast();
      fx.emit({ type: 'cast' });
    }
  } else if (f.phase === 'wait') {
    if (f.t >= f.dur) {
      s.fishing = { ...f, phase: 'bite', t: 0, dur: st.biteWindow, quality: null, biteElapsed: 0, pose: 'idle', poseT: 0 };
      sfx.bite();
      fx.emit({ type: 'bite' });
    }
  } else if (f.phase === 'bite') {
    f.biteElapsed = f.t;
    if (f.t >= f.dur) {
      if (f.mode === 'manual') {
        // In Manual mode, if the player didn't reel during the bite window, the fish escapes!
        s.stats.miss++;
        s.perfectCombo = 0;
        s.streak = 0;
        sfx.miss();
        fx.emit({ type: 'miss' });
        pushLog(s, {
          kind: 'nothing',
          fishId: null,
          text: 'The fish got away! (Manual Mode: click REEL NOW! when it bites)',
          rarity: 'common',
          mutations: [],
          value: 0,
          quality: 'miss',
        });
        s.fishing = {
          ...f,
          phase: 'cast',
          t: 0,
          dur: st.castTime,
          quality: null,
          biteElapsed: 0,
          pose: 'cast',
          poseT: 0,
        };
      } else {
        // In Automatic mode, auto-reels and rolls a randomized chance for a Perfect Reel!
        const isAutoPerfect = chance(st.autoPerfectChance);
        const autoQuality: ReelQuality = isAutoPerfect ? 'perfect' : 'auto';
        if (isAutoPerfect) {
          sfx.perfect();
          fx.emit({ type: 'perfect', quality: 'perfect' });
        }
        s.fishing = { ...f, phase: 'reel', t: 0, dur: st.reelTime, quality: autoQuality, pose: 'reel', poseT: 0 };
      }
    }
  } else if (f.phase === 'reel') {
    if (f.t >= f.dur) {
      finishCatchCycle(s, st);
    }
  } else if (f.phase === 'catch') {
    if (f.t >= f.dur) {
      s.fishing = {
        ...f,
        phase: 'cast',
        t: 0,
        dur: st.castTime,
        quality: null,
        biteElapsed: 0,
        pose: 'cast',
        poseT: 0,
      };
    }
  }

  emit();
}

function resolveBossVictory(s: GameState, st: Stats) {
  const b = s.boss;
  if (!b) return;
  const ev = expectedCatchValue(s, st, 'perfect');
  s.stats.bossKills++;
  if (b.kind === 'kraken') {
    s.stats.krakens++;
    const coins = ev * 35;
    addCoins(s, coins);
    s.chests = { ...s.chests, gold: s.chests.gold + 1, silver: s.chests.silver + 1 };
    s.shards += 4;
    if (s.event?.id === 'kraken') s.event = null;
    fx.emit({
      type: 'toast',
      title: 'KRAKEN DEFEATED!',
      text: `+${fmt(coins)} coins, +1 Gold Chest, +1 Silver Chest, +4 Shards!`,
      color: '#f2a02a',
      icon: 'icon:achievement',
    });
  } else {
    const zd = zoneDef(b.zone);
    const coins = ev * 25 + zd.boss.reward * (BALANCE.zoneValueMult[b.zone - 1] ?? 1);
    addCoins(s, coins);
    s.bossDefeated = { ...s.bossDefeated, [b.zone]: true };
    s.chests = { ...s.chests, gold: s.chests.gold + 1 };
    s.shards += 3;
    fx.emit({
      type: 'toast',
      title: `${b.name} Slain!`,
      text: `+${fmt(coins)} coins, +1 Gold Chest, +25% permanent value in ${zd.name}!`,
      color: '#58b84a',
      icon: 'icon:achievement',
    });
  }
  const name = b.name;
  s.boss = null;
  sfx.jackpot();
  fx.emit({ type: 'bossEnd', won: true, name });
  checkAchievements(s);
  autoSaveProgress();
}

// ---------- Player-initiated actions ----------
export const actions = {
  /** Start fishing in the chosen mode ('manual' or 'auto'). */
  startFishing(mode: FishingMode) {
    sfx.unlock();
    sfx.cast();
    const s = store.state;
    const st = computeStats(s);
    s.fishing = {
      ...s.fishing,
      started: true,
      mode,
      phase: 'cast',
      t: 0,
      dur: st.castTime,
      quality: null,
      biteElapsed: 0,
      pose: 'cast',
      poseT: 0,
    };
    emit();
  },

  /** Stop fishing and return character to dock idle state. */
  stopFishing() {
    sfx.unlock();
    sfx.click();
    const s = store.state;
    s.fishing = {
      ...s.fishing,
      started: false,
      phase: 'cast',
      t: 0,
      quality: null,
      biteElapsed: 0,
      pose: 'idle',
      poseT: 0,
    };
    emit();
  },

  /** Switch between Manual and Automatic fishing modes at any time. */
  setFishingMode(mode: FishingMode) {
    sfx.unlock();
    sfx.click();
    const s = store.state;
    s.fishing = { ...s.fishing, mode };
    emit();
  },

  /** Active click on the Reel! button or scene during bite/wait. */
  reelClick() {
    sfx.unlock();
    const s = store.state;
    if (!s.fishing.started) return;
    const st = computeStats(s);
    const f = s.fishing;

    if (f.phase === 'bite') {
      const [pa, pb] = st.perfectWindow;
      const q: ReelQuality = f.t >= pa && f.t <= pb ? 'perfect' : 'good';
      if (q === 'perfect') sfx.perfect();
      else sfx.good();
      fx.emit({ type: 'perfect', quality: q });
      s.fishing = { ...f, phase: 'reel', t: 0, dur: st.reelTime * 0.65, quality: q, pose: 'reel', poseT: 0 };
      if (s.tutorialStep === 1) s.tutorialStep = 2;
      emit();
    } else if (f.phase === 'wait') {
      // Clicking too early during wait is a Miss (adds a small delay, resets combo)
      if (s.clock - f.lastClickAt < 0.6) return;
      s.stats.miss++;
      s.perfectCombo = 0;
      sfx.miss();
      fx.emit({ type: 'miss' });
      s.fishing = {
        ...f,
        t: Math.max(0, f.t - BALANCE.missPenalty * 0.5),
        lastClickAt: s.clock,
      };
      emit();
    } else if (f.phase === 'catch' && f.t > 0.15) {
      // Let active players skip the post-catch pause quickly
      s.fishing = { ...f, t: f.dur };
      emit();
    }
  },

  hitBoss(x = 130, y = 64) {
    sfx.unlock();
    const s = store.state;
    if (!s.boss) return;
    const st = computeStats(s);
    const dmg = st.clickDamage * 3.2;
    s.boss.hp = Math.max(0, s.boss.hp - dmg);
    sfx.bossHit();
    fx.emit({ type: 'bossHit', dmg, x, y });
    if (s.boss.hp <= 0) resolveBossVictory(s, st);
    emit();
  },

  challengeZoneBoss() {
    sfx.unlock();
    const s = store.state;
    if (s.boss || s.bossCooldown > 0) return;
    const zd = zoneDef(s.zone);
    const hp = zd.boss.hp;
    s.boss = {
      kind: 'zone',
      zone: s.zone,
      name: zd.boss.name,
      hp,
      maxHp: hp,
      timeLeft: BALANCE.bossTime,
      maxTime: BALANCE.bossTime,
    };
    s.bossCooldown = 45;
    sfx.bite();
    emit();
  },

  clickSeagull() {
    sfx.unlock();
    const s = store.state;
    if (!s.seagull || s.seagull.caught) return;
    const st = computeStats(s);
    s.seagull.caught = true;
    s.seagull = null;
    if (s.event?.id === 'seagull') s.event = null;
    s.stats.seagulls++;
    const coins = expectedCatchValue(s, st, 'perfect') * 8;
    addCoins(s, coins);
    const b = pick(['glowgrub', 'golden', 'chaos', 'gambler'] as BaitId[]);
    s.bait = { ...s.bait, [b]: s.bait[b] + 3 };
    markBaitDiscovered(s, b);
    sfx.perfect();
    fx.emit({ type: 'seagull' });
    fx.emit({
      type: 'toast',
      title: 'Lucky Seagull!',
      text: `Dropped +${fmt(coins)} coins and 3x ${baitDef(b).name}!`,
      color: '#f2a02a',
      icon: 'icon:luck',
    });
    checkAchievements(s);
    emit();
  },

  toggleAutoSell() {
    sfx.unlock();
    sfx.click();
    store.state.autoSell = !store.state.autoSell;
    emit();
  },

  updateAutoSellConfig(patch: Partial<AutoSellConfig>) {
    sfx.unlock();
    sfx.click();
    const s = store.state;
    s.autoSellConfig = { ...s.autoSellConfig, ...patch };
    emit();
  },

  toggleAutoSellRarity(r: Rarity) {
    sfx.unlock();
    sfx.click();
    const s = store.state;
    s.autoSellConfig = {
      ...s.autoSellConfig,
      rarities: { ...s.autoSellConfig.rarities, [r]: !s.autoSellConfig.rarities[r] },
    };
    emit();
  },

  sellFish(uid: number) {
    sfx.unlock();
    const s = store.state;
    const item = s.inventory.find((f) => f.uid === uid);
    if (!item || item.locked) return;
    const st = computeStats(s);
    const val = item.preMutValue * mutationMultiplier(item.mutations, item.glitchMult, st.cursedKeep);
    addCoins(s, val);
    s.inventory = s.inventory.filter((f) => f.uid !== uid);
    sfx.coin();
    emit();
  },

  sellAllFish() {
    sfx.unlock();
    const s = store.state;
    const st = computeStats(s);
    let total = 0;
    const kept: HeldFish[] = [];
    for (const item of s.inventory) {
      if (item.locked) {
        kept.push(item);
      } else {
        total += item.preMutValue * mutationMultiplier(item.mutations, item.glitchMult, st.cursedKeep);
      }
    }
    if (total > 0) {
      addCoins(s, total);
      s.inventory = kept;
      sfx.coin();
      fx.emit({ type: 'float', text: `+${fmt(total)}`, color: '#f2c02a', big: true });
      emit();
    }
  },

  toggleLockFish(uid: number) {
    sfx.unlock();
    sfx.click();
    const s = store.state;
    s.inventory = s.inventory.map((f) => (f.uid === uid ? { ...f, locked: !f.locked } : f));
    emit();
  },

  buyUpgrade(id: string, qty: 1 | 10 | 100 | 'max') {
    sfx.unlock();
    const s = store.state;
    const def = upgradeDef(id);
    if (!def) return;
    const cur = lvl(s.upgrades, id);
    if (cur >= def.max) return;
    const maxN = maxAffordable(def.base, def.growth, cur, s.coins, def.max);
    const n = qty === 'max' ? maxN : Math.min(qty, def.max - cur, maxN);
    if (n <= 0) return;
    const cost = bulkCost(def.base, def.growth, cur, n);
    if (s.coins < cost) return;
    s.coins -= cost;
    s.upgrades = { ...s.upgrades, [id]: cur + n };
    if (s.tutorialStep === 2) s.tutorialStep = 3;
    sfx.coin();
    emit();
  },

  buyRod(tier: number) {
    sfx.unlock();
    const s = store.state;
    const rod = RODS.find((r) => r.tier === tier);
    if (!rod || s.rodTier >= tier || s.coins < rod.cost) return;
    s.coins -= rod.cost;
    s.rodTier = tier;
    s.highestRodTier = Math.max(s.highestRodTier ?? 1, tier);
    if (s.tutorialStep === 2) s.tutorialStep = 3;
    sfx.levelUp();
    checkAchievements(s);
    emit();
  },

  buyHelper(id: HelperId, qty: 1 | 10 | 100 | 'max' = 1) {
    sfx.unlock();
    const s = store.state;
    const def = HELPERS.find((h) => h.id === id);
    if (!def) return;
    const cur = s.helpers[id] ?? 0;
    if (cur >= def.max) return;
    const maxN = maxAffordable(def.base, def.growth, cur, s.coins, def.max);
    const n = qty === 'max' ? maxN : Math.min(qty, def.max - cur, maxN);
    if (n <= 0) return;
    const cost = bulkCost(def.base, def.growth, cur, n);
    if (s.coins < cost) return;
    s.coins -= cost;
    s.helpers = { ...s.helpers, [id]: cur + n };
    if (!s.discoveredHelpers.includes(id)) {
      s.discoveredHelpers = [...s.discoveredHelpers, id];
    }
    sfx.coin();
    emit();
  },

  selectZone(zoneId: number) {
    sfx.unlock();
    const s = store.state;
    const zd = zoneDef(zoneId);
    if (zoneId <= s.unlockedZone) {
      s.zone = zoneId;
      sfx.click();
      emit();
      return;
    }
    if (zoneId !== s.unlockedZone + 1) return;
    const prevSpecies = fishInZone(zoneId - 1).filter((f) => !!s.codex[f.id]).length;
    if (prevSpecies < zd.codexReq || s.coins < zd.cost) return;
    s.coins -= zd.cost;
    s.unlockedZone = zoneId;
    s.zone = zoneId;
    sfx.levelUp();
    fx.emit({ type: 'toast', title: `Unlocked ${zd.name}!`, text: zd.mechanic.desc, color: '#58b84a', icon: 'icon:fish' });
    checkAchievements(s);
    emit();
  },

  buyBait(id: BaitId, count: number) {
    sfx.unlock();
    const s = store.state;
    const def = baitDef(id);
    const unit = def.price * (BALANCE.zoneValueMult[s.zone - 1] ?? 1);
    const cost = unit * count;
    if (s.coins < cost) return;
    s.coins -= cost;
    s.bait = { ...s.bait, [id]: s.bait[id] + count };
    markBaitDiscovered(s, id);
    if (!s.equippedBait) s.equippedBait = id;
    sfx.coin();
    emit();
  },

  craftBait(id: BaitId) {
    sfx.unlock();
    const s = store.state;
    const def = baitDef(id);
    if (!def.craft) return;
    const { scrap, shards, worms, makes } = def.craft;
    if (s.scrap < scrap || s.shards < shards || s.bait.worm < worms) return;
    s.scrap -= scrap;
    s.shards -= shards;
    s.bait = {
      ...s.bait,
      worm: s.bait.worm - worms,
      [id]: s.bait[id] + makes,
    };
    markBaitDiscovered(s, id);
    if (!s.equippedBait) s.equippedBait = id;
    sfx.perfect();
    emit();
  },

  equipBait(id: BaitId | null) {
    sfx.unlock();
    sfx.click();
    const s = store.state;
    s.equippedBait = s.equippedBait === id ? null : id;
    emit();
  },

  buyMerchantDeal(dealId: string) {
    sfx.unlock();
    const s = store.state;
    const deal = s.merchant.find((d) => d.id === dealId);
    if (!deal || deal.bought || s.coins < deal.price) return;
    s.coins -= deal.price;
    deal.bought = true;
    s.merchant = [...s.merchant];
    if (deal.kind === 'bait') {
      const k = deal.key as BaitId;
      s.bait = { ...s.bait, [k]: s.bait[k] + deal.amount };
      markBaitDiscovered(s, k);
    } else if (deal.kind === 'chest') {
      const k = deal.key as ChestTier;
      s.chests = { ...s.chests, [k]: s.chests[k] + deal.amount };
    } else if (deal.kind === 'shards') {
      s.shards += deal.amount;
    } else if (deal.kind === 'scrap') {
      s.scrap += deal.amount;
    }
    sfx.coin();
    emit();
  },

  openChest(tier: ChestTier): { coins: number; baitId: BaitId; baitAmt: number; shards: number; relicName: string | null; cosmeticName: string | null } | null {
    sfx.unlock();
    const s = store.state;
    if (s.chests[tier] <= 0) return null;
    const st = computeStats(s);
    s.chests = { ...s.chests, [tier]: s.chests[tier] - 1 };
    s.stats.chestsOpened++;

    const tierIdx = CHEST_TIERS.indexOf(tier);
    const mult = [5, 16, 55, 220][tierIdx];
    const coins = Math.round(expectedCatchValue(s, st, 'perfect') * mult * rand(0.85, 1.25));
    addCoins(s, coins);

    const b = pick(BAITS).id;
    const baitAmt = (tierIdx + 1) * randInt(2, 5);
    s.bait = { ...s.bait, [b]: s.bait[b] + baitAmt };
    markBaitDiscovered(s, b);

    const shards = tierIdx >= 1 ? randInt(1, tierIdx * 2 + 1) : chance(0.35) ? 1 : 0;
    s.shards += shards;

    // Relic roll
    let relicName: string | null = null;
    const relicChance = [0.35, 0.65, 0.9, 1.0][tierIdx];
    if (chance(relicChance)) {
      const rWeights: [string, number][] = [
        ['common', tierIdx === 0 ? 55 : tierIdx === 1 ? 25 : 5],
        ['uncommon', tierIdx === 0 ? 30 : tierIdx === 1 ? 40 : 15],
        ['rare', tierIdx === 0 ? 12 : tierIdx === 1 ? 25 : 35],
        ['epic', tierIdx >= 2 ? 30 : 8],
        ['legendary', tierIdx === 3 ? 30 : tierIdx === 2 ? 12 : 2],
        ['mythic', tierIdx === 3 ? 12 : tierIdx === 2 ? 3 : 0],
      ];
      const rar = weightedPick(rWeights, (w) => w[1])[0];
      const cands = RELICS.filter((r) => r.rarity === rar);
      const chosen = pick(cands.length ? cands : RELICS);
      const inst = { uid: s.nextUid++, id: chosen.id, roll: Math.round(rand(0.15, 1) * 100) / 100, rerolls: 0 };
      s.relics = [inst, ...s.relics];
      if (!s.discoveredRelics.includes(chosen.id)) {
        s.discoveredRelics = [...s.discoveredRelics, chosen.id];
      }
      if (s.equippedRelics.length < relicSlots(s) && !s.equippedRelics.some((u) => s.relics.find((x) => x.uid === u)?.id === chosen.id)) {
        s.equippedRelics = [...s.equippedRelics, inst.uid];
      }
      relicName = chosen.name;
    }

    // Cosmetic roll
    let cosmeticName: string | null = null;
    const unowned = COSMETICS.filter((c) => c.source === 'chest' && !s.cosmetics.owned.includes(c.id));
    if (unowned.length > 0 && chance(0.12 + tierIdx * 0.1)) {
      const c = pick(unowned);
      s.cosmetics = { ...s.cosmetics, owned: [...s.cosmetics.owned, c.id] };
      cosmeticName = c.name;
    }

    sfx.chest();
    checkAchievements(s);
    emit();
    return { coins, baitId: b, baitAmt, shards, relicName, cosmeticName };
  },

  toggleEquipRelic(uid: number) {
    sfx.unlock();
    sfx.click();
    const s = store.state;
    if (s.equippedRelics.includes(uid)) {
      s.equippedRelics = s.equippedRelics.filter((u) => u !== uid);
    } else {
      if (s.equippedRelics.length >= relicSlots(s)) return;
      const inst = s.relics.find((r) => r.uid === uid);
      if (!inst) return;
      // Only one copy of the same relic ID equipped at once
      const filtered = s.equippedRelics.filter((u) => s.relics.find((r) => r.uid === u)?.id !== inst.id);
      if (filtered.length >= relicSlots(s)) return;
      s.equippedRelics = [...filtered, uid];
    }
    emit();
  },

  salvageDuplicateRelics() {
    sfx.unlock();
    const s = store.state;
    const seen = new Set<string>();
    const kept: typeof s.relics = [];
    // Keep equipped first, then highest roll per relic ID
    const sorted = [...s.relics].sort((a, b) => {
      const ea = s.equippedRelics.includes(a.uid) ? 1 : 0;
      const eb = s.equippedRelics.includes(b.uid) ? 1 : 0;
      return eb - ea || b.roll - a.roll;
    });
    let salvaged = 0;
    for (const r of sorted) {
      if (!seen.has(r.id) || s.equippedRelics.includes(r.uid)) {
        seen.add(r.id);
        kept.push(r);
      } else {
        salvaged++;
      }
    }
    if (salvaged > 0) {
      s.relics = kept;
      s.shards += salvaged;
      sfx.coin();
      fx.emit({ type: 'toast', title: 'Salvaged Duplicates', text: `+${salvaged} Cursed Shards from ${salvaged} duplicate relics.`, color: '#a45af0' });
      emit();
    }
  },

  /** Fate Altar: reroll a held fish's mutations (guarantees at least 1 mutation). */
  rerollFishMutations(uid: number) {
    sfx.unlock();
    const s = store.state;
    const cost = Math.ceil(BALANCE.altarFishBase * Math.pow(BALANCE.altarFishGrowth, s.altarRerolls));
    if (s.shards < cost) return;
    const idx = s.inventory.findIndex((f) => f.uid === uid);
    if (idx < 0) return;
    const st = computeStats(s);
    s.shards -= cost;
    s.altarRerolls++;

    let muts = rollMutations(st.mutChance, 3.5);
    if (muts.length === 0) {
      muts = [weightedPick(['shiny', 'giant', 'golden', 'glitched', 'prismatic'], (m) => st.mutChance[m] * 5)];
    }
    for (const m of muts) {
      s.stats.mutationCounts = { ...s.stats.mutationCounts, [m]: s.stats.mutationCounts[m] + 1 };
    }
    if (muts.length >= 3) {
      s.stats.jackpots++;
      fx.emit({ type: 'jackpot' });
    }
    const glitch = muts.includes('glitched') ? logUniform(BALANCE.glitchRange[0], BALANCE.glitchRange[1]) : 1;
    const updated: HeldFish = { ...s.inventory[idx], mutations: muts, glitchMult: glitch };
    const nextInv = [...s.inventory];
    nextInv[idx] = updated;
    s.inventory = nextInv;
    sfx.perfect();
    checkAchievements(s);
    emit();
  },

  /** Fate Altar: reroll a relic's stat roll (biassed upward). */
  rerollRelicStats(uid: number) {
    sfx.unlock();
    const s = store.state;
    const idx = s.relics.findIndex((r) => r.uid === uid);
    if (idx < 0) return;
    const cur = s.relics[idx];
    const cost = Math.ceil(BALANCE.altarRelicBase * Math.pow(BALANCE.altarRelicGrowth, cur.rerolls));
    if (s.shards < cost) return;
    s.shards -= cost;
    const newRoll = Math.round(Math.max(cur.roll * 0.85, rand(0.35, 1)) * 100) / 100;
    const next = [...s.relics];
    next[idx] = { ...cur, roll: newRoll, rerolls: cur.rerolls + 1 };
    s.relics = next;
    sfx.perfect();
    emit();
  },

  claimCodexMilestone(key: string, rewardCoins: number, rewardPearls: number) {
    sfx.unlock();
    const s = store.state;
    if (s.claimedMilestones.includes(key)) return;
    s.claimedMilestones = [...s.claimedMilestones, key];
    if (rewardCoins > 0) addCoins(s, rewardCoins);
    if (rewardPearls > 0) {
      s.pearls += rewardPearls;
      s.pearlsEarned += rewardPearls;
    }
    sfx.levelUp();
    emit();
  },

  buySkill(id: string) {
    sfx.unlock();
    const s = store.state;
    const def = skillDef(id);
    if (!def || s.skillPoints <= 0) return;
    const cur = lvl(s.skills, id);
    if (cur >= def.max) return;
    if (def.requires && lvl(s.skills, def.requires) <= 0) return;
    s.skillPoints--;
    s.skills = { ...s.skills, [id]: cur + 1 };
    sfx.perfect();
    emit();
  },

  respecSkills() {
    sfx.unlock();
    const s = store.state;
    let spent = 0;
    for (const k of Object.keys(s.skills)) spent += s.skills[k];
    if (spent === 0) return;
    s.skills = {};
    s.skillPoints += spent;
    sfx.click();
    emit();
  },

  buyPrestigeUpgrade(id: string) {
    sfx.unlock();
    const s = store.state;
    const def = prestigeDef(id);
    if (!def) return;
    const cur = lvl(s.prestigeShop, id);
    if (cur >= def.max) return;
    const cost = Math.ceil(costAt(def.base, def.growth, cur));
    if (s.pearls < cost) return;
    s.pearls -= cost;
    s.prestigeShop = { ...s.prestigeShop, [id]: cur + 1 };
    if (id === 'zoneSkip') {
      s.unlockedZone = Math.max(s.unlockedZone, 1 + cur + 1);
    }
    sfx.levelUp();
    emit();
  },

  tideReset() {
    sfx.unlock();
    const s = store.state;
    const gain = pearlsForReset(s);
    if (gain <= 0) return;
    s.pearls += gain;
    s.pearlsEarned += gain;
    s.prestiges++;

    const headLvl = lvl(s.prestigeShop, 'headStart');
    const skipLvl = lvl(s.prestigeShop, 'zoneSkip');
    s.coins = headLvl > 0 ? Math.pow(10, headLvl + 2) : 0;
    s.runCoins = 0;
    s.rodTier = 1;
    s.upgrades = {};
    s.helpers = { cat: 0, pelican: 0, sailor: 0, mermaid: 0 };
    s.inventory = s.inventory.filter((f) => f.locked);
    s.unlockedZone = Math.min(ZONES.length, 1 + skipLvl);
    s.zone = s.unlockedZone;
    s.boss = null;
    s.deep = { ...s.deep, active: false, depth: 0 };
    s.altarRerolls = 0;

    sfx.jackpot();
    fx.emit({
      type: 'toast',
      title: `Tide Reset #${s.prestiges}!`,
      text: `Earned +${fmt(gain)} Pearls. The tide rises stronger.`,
      color: '#ff5ac8',
      icon: 'icon:offline',
    });
    checkAchievements(s);
    emit();
  },

  toggleDeepDive() {
    sfx.unlock();
    const s = store.state;
    if (s.prestiges < BALANCE.deepUnlockPrestiges) return;
    s.deep = { ...s.deep, active: !s.deep.active, depth: s.deep.active ? 0 : s.deep.depth };
    sfx.click();
    emit();
  },

  buyOrEquipCosmetic(id: string) {
    sfx.unlock();
    const s = store.state;
    const def = cosmeticDef(id);
    if (!def) return;
    if (!s.cosmetics.owned.includes(id)) {
      const cost = def.pearlCost ?? 0;
      if (def.source !== 'prestige' || s.pearls < cost) return;
      s.pearls -= cost;
      s.cosmetics = { ...s.cosmetics, owned: [...s.cosmetics.owned, id] };
    }
    if (def.kind === 'line') s.cosmetics = { ...s.cosmetics, line: id };
    else s.cosmetics = { ...s.cosmetics, dye: id };
    sfx.click();
    emit();
  },

  updateSettings(patch: Partial<Settings>) {
    sfx.unlock();
    store.state.settings = { ...store.state.settings, ...patch };
    sfx.syncMusic();
    saveGame();
    emit();
  },

  manualSave() {
    sfx.unlock();
    sfx.click();
    saveGame();
    fx.emit({
      type: 'toast',
      title: 'Game Saved!',
      text: `Progress saved at ${new Date().toLocaleTimeString()}.`,
      color: '#58b84a',
      icon: 'icon:achievement',
    });
    emit();
  },

  advanceTutorial() {
    sfx.unlock();
    sfx.click();
    store.state.tutorialStep = Math.min(3, store.state.tutorialStep + 1);
    emit();
  },
};

export { FISH, FISH_BY_ID, RELIC_BY_ID, SKILLS, UPGRADES };

import { BALANCE } from './balance';
import { chance, logUniform, rand, randInt, rng, weightedPick } from './rng';
import type {
  CatchResult, ChestTier, FishDef, GameState, MutationId, Rarity, ReelQuality, TimeOfDay, WeatherId,
} from './types';
import { MUTATIONS, RARITIES, rarityIndex } from './types';
import { fishInZone } from './data/fish';
import { WEATHER } from './data/events';
import { RELIC_BY_ID, relicValue, type RelicEffect } from './data/relics';
import { RODS } from './data/upgrades';
import { ACHIEVEMENTS } from './data/achievements';

// ---------- small accessors ----------
export const lvl = (rec: Record<string, number>, id: string) => rec[id] ?? 0;
export const rodDef = (s: GameState) => RODS[Math.max(0, Math.min(RODS.length - 1, s.rodTier - 1))];

export function timeOfDay(s: GameState): TimeOfDay {
  if (s.zone === 5) return 'night';
  const p = (s.clock % BALANCE.dayCycleSec) / BALANCE.dayCycleSec;
  if (p < 0.12) return 'dawn';
  if (p < 0.5) return 'day';
  if (p < 0.62) return 'dusk';
  return 'night';
}
/** 0 (full day) .. 1 (full night) darkness level, stepped for pixel look */
export function nightLevel(s: GameState): number {
  if (s.zone === 5) return 0;
  const p = (s.clock % BALANCE.dayCycleSec) / BALANCE.dayCycleSec;
  if (p < 0.06) return 0.66;
  if (p < 0.12) return 0.33;
  if (p < 0.5) return 0;
  if (p < 0.56) return 0.33;
  if (p < 0.62) return 0.66;
  return 1;
}

export function relicSums(s: GameState): Partial<Record<RelicEffect, number>> {
  const out: Partial<Record<RelicEffect, number>> = {};
  for (const uid of s.equippedRelics) {
    const inst = s.relics.find((r) => r.uid === uid);
    if (!inst) continue;
    const def = RELIC_BY_ID[inst.id];
    if (!def) continue;
    const v = relicValue(def, inst.roll);
    // multiplicative effects stack multiplicatively, additive ones add
    const multiplicative: RelicEffect[] = ['stormValue', 'shiny', 'golden', 'meteorChest', 'auroraMut', 'glitched', 'prismatic'];
    if (multiplicative.includes(def.effect)) out[def.effect] = (out[def.effect] ?? 1) * v;
    else if (def.effect === 'cursedKeep') out.cursedKeep = Math.max(out.cursedKeep ?? 0, v);
    else out[def.effect] = (out[def.effect] ?? 0) + v;
  }
  return out;
}

export function achievementBonus(s: GameState) {
  let luck = 0, value = 0, mutation = 0, xp = 0;
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements[a.id]) continue;
    luck += a.reward.luck ?? 0;
    value += a.reward.value ?? 0;
    mutation += a.reward.mutation ?? 0;
    xp += a.reward.xp ?? 0;
  }
  return { luck, value, mutation, xp };
}

export function relicSlots(s: GameState) {
  return Math.min(BALANCE.maxRelicSlots, BALANCE.baseRelicSlots + lvl(s.prestigeShop, 'relicShelf'));
}

export interface Modifier {
  label: string;
  detail: string;
  good: boolean;
  icon: string;
}

export interface Stats {
  luck: number;
  luckParts: { label: string; v: number }[];
  luckMult: number;
  valueMult: number;
  biteSpeed: number;
  waitTime: number;
  castTime: number;
  reelTime: number;
  biteWindow: number;
  perfectWindow: [number, number];
  perfectBonus: number;
  idleEff: number;
  autoPerfectChance: number;
  crit: number;
  chest: number;
  mutGlobal: number;
  mutChance: Record<MutationId, number>;
  rareWeightMult: number;
  xpMult: number;
  autoSellRate: number;
  baitSave: number;
  clickDamage: number;
  offlineCapH: number;
  offlineEff: number;
  forecastAcc: number;
  pityEpic: number;
  pityLeg: number;
  mutPity: number;
  streakLuckPer: number;
  streakCap: number;
  eventFreq: number;
  cursedKeep: number;
  legendValue: number;
  comboPer: number;
  weather: WeatherId;
  time: TimeOfDay;
  modifiers: Modifier[];
}

export function deepDiveBonus(s: GameState) {
  const d = s.deep.active ? s.deep.depth : 0;
  return {
    value: Math.pow(1.025, d / 5),
    luck: Math.sqrt(d) * 3,
    slow: 1 + d / 250,
    permValue: 1 + Math.floor(s.deep.maxDepth / 10) * 0.005,
  };
}

/** Compute every derived stat from the current state. Pure. */
export function computeStats(s: GameState): Stats {
  const rod = rodDef(s);
  const up = s.upgrades, sk = s.skills, ps = s.prestigeShop, hp = s.helpers;
  const rel = relicSums(s);
  const ach = achievementBonus(s);
  const w = WEATHER[s.weather.current];
  const tod = timeOfDay(s);
  const ev = s.event?.id ?? null;
  const deep = deepDiveBonus(s);
  const all = 1 + (rel.allStats ?? 0) / 100;
  const modifiers: Modifier[] = [];

  // ---- luck ----
  const luckParts: { label: string; v: number }[] = [];
  const addLuck = (label: string, v: number) => {
    if (v) luckParts.push({ label, v });
  };
  addLuck(rod.name, rod.luck);
  addLuck('Barbed Hook', lvl(up, 'hook'));
  addLuck('Lucky Charm', lvl(up, 'charm') * 3);
  addLuck('Mermaid', lvl(hp, 'mermaid') * 4);
  addLuck('Lucky Stars', lvl(sk, 'luckyStars') * 6);
  addLuck('Tidal Luck', lvl(ps, 'tidalLuck') * 10);
  addLuck('Achievements', ach.luck);
  addLuck('Relics', rel.luck ?? 0);
  addLuck(`Weather: ${w.name}`, w.luck);
  if (tod === 'night') addLuck('Night Lantern', rel.nightLuck ?? 0);
  if (s.weather.current === 'fog') addLuck('Fog Lens', rel.fogLuck ?? 0);
  if (s.weather.current === 'bloodmoon') addLuck('Blood Moon Idol', rel.moonLuck ?? 0);
  const streakCap = BALANCE.streakCap + lvl(sk, 'hotHands') * 2;
  const streakLuckPer = BALANCE.streakLuck * (1 + lvl(sk, 'hotHands') * 0.25 + (rel.streak ?? 0) / 100);
  addLuck(`Hot Streak x${Math.min(s.streak, streakCap)}`, Math.round(Math.min(s.streak, streakCap) * streakLuckPer));
  if (s.equippedBait === 'worm' && s.bait.worm > 0) addLuck('Worm bait', 8);
  if (s.deep.active) addLuck('Deep Dive', Math.round(deep.luck));
  let luckMult = all;
  if (s.zone === 4) luckMult *= 1.6;
  const luck = luckParts.reduce((a, b) => a + b.v, 0) * luckMult;

  // ---- value ----
  const zoneMult = BALANCE.zoneValueMult[s.zone - 1] ?? 1;
  let valueMult = rod.value * (1 + 0.1 * lvl(up, 'polish')) * zoneMult;
  valueMult *= 1 + BALANCE.pearlValueBonus * s.pearlsEarned;
  valueMult *= 1 + 0.25 * lvl(ps, 'pearlPolish');
  valueMult *= 1 + ach.value / 100;
  valueMult *= 1 + (rel.value ?? 0) / 100;
  valueMult *= w.value;
  if (s.weather.current === 'storm' && rel.stormValue) valueMult *= rel.stormValue;
  if (s.weather.current === 'rain' && rel.rainValue) valueMult *= 1 + rel.rainValue / 100;
  if (s.bossDefeated[s.zone]) valueMult *= 1.25;
  if (ev === 'rust') valueMult *= 0.5;
  valueMult *= deep.value * deep.permValue * all;

  // ---- speed ----
  let biteSpeed = (1 + 0.04 * lvl(up, 'line')) * w.bite * all;
  if (ev === 'frenzy') biteSpeed *= 3;
  if (s.zone === 4) biteSpeed /= 1.4;
  let waitTime = BALANCE.waitTime / biteSpeed;
  waitTime *= 1 - lvl(sk, 'steady') * 0.04;
  waitTime *= 1 - lvl(ps, 'swift') * 0.05;
  waitTime *= 1 - Math.min(40, rel.wait ?? 0) / 100;
  waitTime *= deep.slow;
  waitTime = Math.max(0.6, waitTime);
  const castTime = Math.max(0.35, BALANCE.castTime / (rod.speed * (1 + 0.02 * lvl(up, 'reel'))));
  const reelTime = Math.max(0.25, BALANCE.reelTime / (rod.speed * (1 + 0.08 * lvl(up, 'reel'))));

  // ---- reel timing ----
  const pwScale = (1 + lvl(sk, 'perfectForm') * 0.2) * (s.zone === 1 ? 1.4 : 1);
  const [pa, pb] = BALANCE.perfectWindow;
  const perfectWindow: [number, number] = [pa, Math.min(BALANCE.biteWindow - 0.1, pa + (pb - pa) * pwScale)];
  const perfectBonus = BALANCE.qualityMult.perfect + lvl(sk, 'powerReel') * 0.1 + (rel.perfectValue ?? 0) / 100;
  const idleEff = lvl(sk, 'zen') ? 1 : Math.min(1, BALANCE.qualityMult.auto + lvl(sk, 'autoReel') * 0.07 + lvl(up, 'autoPerfect') * 0.01);
  const autoPerfectChance = Math.min(0.95, BALANCE.autoPerfectBase + lvl(up, 'autoPerfect') * 0.02 + lvl(sk, 'autoReel') * 0.02);

  // ---- crit / chest ----
  const crit = Math.min(0.5, BALANCE.critDoubleBase + lvl(up, 'hook') * 0.0015 + lvl(sk, 'critInstinct') * 0.01 + (rel.crit ?? 0) / 100 + (rel.double ?? 0) / 100);
  let chest = BALANCE.chestBase * (1 + lvl(sk, 'chestSense') * 0.2 + lvl(ps, 'chestMagnet') * 0.15 + (rel.chest ?? 0) / 100) * w.chest;
  if (s.weather.current === 'meteor' && rel.meteorChest) chest *= rel.meteorChest;
  chest = Math.min(0.5, chest);

  // ---- mutations ----
  const uniqueFish = Object.keys(s.codex).length;
  let mutGlobal = (1 + lvl(sk, 'mutagen') * 0.08 + lvl(hp, 'mermaid') * 0.02 + ach.mutation / 100 + (rel.mutation ?? 0) / 100 + (Math.floor(uniqueFish / 10) * (rel.codexMut ?? 0)) / 100) * w.mutation;
  if (s.zone === 3) mutGlobal *= 1.5;
  if (s.weather.current === 'aurora' && rel.auroraMut) mutGlobal *= rel.auroraMut;
  const mutChance = {} as Record<MutationId, number>;
  for (const m of MUTATIONS) {
    let mult = mutGlobal * (w.mut?.[m] ?? 1);
    if (m === 'shiny') mult *= rel.shiny ?? 1;
    if (m === 'golden') mult *= rel.golden ?? 1;
    if (m === 'glitched') mult *= (rel.glitched ?? 1) * (s.zone === 5 ? 3 : 1);
    if (m === 'prismatic') mult *= (rel.prismatic ?? 1) * (s.zone === 5 ? 3 : 1);
    mutChance[m] = Math.min(BALANCE.mutationCap, BALANCE.mutationChance[m] * mult);
  }

  let rareWeightMult = 1;
  if (ev === 'school') rareWeightMult *= 3;
  if (s.equippedBait === 'glowgrub' && s.bait.glowgrub > 0) rareWeightMult *= 1.6;

  const pityScale = Math.max(0.4, 1 - lvl(sk, 'pityPact') * 0.1 - (rel.pity ?? 0) / 100);
  const mutPityLvl = lvl(ps, 'mutPity');

  const autoSellRate = BALANCE.autoSellRate + lvl(up, 'stall') * 0.02 + lvl(hp, 'cat') * 0.06 + (rel.autoSell ?? 0) / 100;
  const baitSave = Math.min(0.75, lvl(up, 'baitbox') * 0.03 + lvl(sk, 'thrift') * 0.06 + (rel.baitSave ?? 0) / 100);
  const clickDamage = (1 + lvl(up, 'reel') * 0.08) * rod.speed * (1 + lvl(sk, 'bossBreaker') * 0.3) * (1 + (rel.bossDmg ?? 0) / 100);

  // ---- active modifiers (display) ----
  if (s.weather.current !== 'clear') modifiers.push({ label: w.name, detail: w.desc, good: true, icon: `weather:${w.id}` });
  if (tod === 'night') modifiers.push({ label: 'Night', detail: 'Night-only fish are biting.', good: true, icon: 'weather:clear' });
  if (s.zone === 1) modifiers.push({ label: 'Calm Waters', detail: 'Perfect window +40%.', good: true, icon: 'icon:reel' });
  if (s.zone === 2) modifiers.push({ label: 'Tangled Roots', detail: '6% of casts snag Scrap and bait.', good: true, icon: 'icon:hook' });
  if (s.zone === 3) modifiers.push({ label: 'Coral Bloom', detail: 'Mutations x1.5.', good: true, icon: 'icon:xp_star' });
  if (s.zone === 4) modifiers.push({ label: 'Darkness', detail: 'Luck x1.6, bites 40% slower.', good: true, icon: 'icon:luck' });
  if (s.zone === 5) modifiers.push({ label: 'Star Tides', detail: 'Glitched & Prismatic x3.', good: true, icon: 'icon:xp_star' });
  if (ev === 'frenzy') modifiers.push({ label: 'Fish Frenzy', detail: 'Bite speed x3.', good: true, icon: 'icon:speed' });
  if (ev === 'school') modifiers.push({ label: 'School of Rares', detail: 'Rare+ weights x3.', good: true, icon: 'icon:luck' });
  if (ev === 'treasure') modifiers.push({ label: 'Treasure Current', detail: 'Catches are chests.', good: true, icon: 'icon:relic' });
  if (ev === 'rust') modifiers.push({ label: 'Rust Tide', detail: 'Value x0.5, drops Scrap.', good: false, icon: 'icon:value' });
  if (s.streak > 0) modifiers.push({ label: `Hot Streak x${s.streak}`, detail: `+${Math.round(Math.min(s.streak, streakCap) * streakLuckPer)} Luck`, good: true, icon: 'icon:crit' });
  if (s.equippedBait && s.bait[s.equippedBait] > 0) modifiers.push({ label: `Bait: ${s.equippedBait}`, detail: `${s.bait[s.equippedBait]} left`, good: true, icon: `bait:${s.equippedBait}` });
  if (s.bossDefeated[s.zone]) modifiers.push({ label: 'Boss Slain', detail: '+25% value in this zone.', good: true, icon: 'icon:achievement' });
  if (s.deep.active) modifiers.push({ label: `Deep Dive ${Math.floor(s.deep.depth)}m`, detail: `Value x${deep.value.toFixed(2)}, waits x${deep.slow.toFixed(2)}`, good: true, icon: 'icon:offline' });

  return {
    luck, luckParts, luckMult, valueMult, biteSpeed, waitTime, castTime, reelTime,
    biteWindow: BALANCE.biteWindow,
    perfectWindow, perfectBonus, idleEff, autoPerfectChance, crit, chest, mutGlobal, mutChance, rareWeightMult,
    xpMult: 1 + ach.xp / 100 + (rel.xp ?? 0) / 100,
    autoSellRate, baitSave, clickDamage,
    offlineCapH: BALANCE.offlineCapHours + lvl(hp, 'sailor') + lvl(sk, 'deepSleep'),
    offlineEff: Math.min(1, BALANCE.offlineEfficiency + lvl(hp, 'sailor') * 0.04 + lvl(sk, 'deepSleep') * 0.08),
    forecastAcc: Math.min(1, BALANCE.forecastBaseAccuracy + lvl(up, 'vane') * 0.015),
    pityEpic: Math.ceil(BALANCE.pityEpic * pityScale),
    pityLeg: Math.ceil(BALANCE.pityLegendary * pityScale),
    mutPity: mutPityLvl > 0 ? 120 - mutPityLvl * 10 : 0,
    streakLuckPer, streakCap,
    eventFreq: 1 + (rel.eventFreq ?? 0) / 100,
    cursedKeep: rel.cursedKeep ? rel.cursedKeep / 100 : BALANCE.mutationMult.cursed,
    legendValue: 1 + (rel.legendValue ?? 0) / 100,
    comboPer: lvl(sk, 'combo') * 0.02,
    weather: s.weather.current,
    time: tod,
    modifiers,
  };
}

// ---------- rarity odds ----------
/** Luck-adjusted rarity probabilities (normalized). Smooth power curve with diminishing returns. */
export function rarityOdds(luck: number, rareMult = 1, minRarity: Rarity = 'common'): Record<Rarity, number> {
  const g = 1 + Math.max(0, luck) / BALANCE.luckScale;
  const minIdx = rarityIndex(minRarity);
  const out = {} as Record<Rarity, number>;
  let total = 0;
  for (const r of RARITIES) {
    const i = rarityIndex(r);
    let w = i < minIdx ? 0 : BALANCE.rarityWeights[r] * Math.pow(g, BALANCE.luckExponent[r]);
    if (i >= 2) w *= rareMult;
    out[r] = w;
    total += w;
  }
  for (const r of RARITIES) out[r] = total > 0 ? out[r] / total : 0;
  return out;
}

export function rollRarity(odds: Record<Rarity, number>): Rarity {
  let r = rng();
  for (const k of RARITIES) {
    r -= odds[k];
    if (r < 0) return k;
  }
  return 'common';
}

export function fishAvailable(f: FishDef, weather: WeatherId, time: TimeOfDay): boolean {
  if (f.weather && !f.weather.includes(weather)) return false;
  if (f.time && !f.time.includes(time)) return false;
  return true;
}

export function poolFor(zone: number, weather: WeatherId, time: TimeOfDay): FishDef[] {
  return fishInZone(zone).filter((f) => fishAvailable(f, weather, time));
}

/** Pick a fish of the given rarity; steps down (then up) if the pool has none. */
export function pickFish(pool: FishDef[], rarity: Rarity): FishDef {
  const idx = rarityIndex(rarity);
  for (let d = 0; d < RARITIES.length; d++) {
    for (const j of [idx - d, idx + d]) {
      if (j < 0 || j >= RARITIES.length) continue;
      const cands = pool.filter((f) => f.rarity === RARITIES[j]);
      if (cands.length) {
        // conditional (weather/time) fish are favored when available: they are the special treat
        return weightedPick(cands, (f) => (f.weather || f.time ? 1.6 : 1));
      }
    }
  }
  return pool[0];
}

export function rollMutations(chances: Record<MutationId, number>, scale = 1): MutationId[] {
  const out: MutationId[] = [];
  for (const m of MUTATIONS) if (chance(Math.min(BALANCE.mutationCap, chances[m] * scale))) out.push(m);
  // Giant and Tiny cannot coexist: keep the rarer roll
  if (out.includes('giant') && out.includes('tiny')) out.splice(out.indexOf('tiny'), 1);
  return out;
}

export function forcedMutation(chances: Record<MutationId, number>): MutationId {
  return weightedPick(['shiny', 'giant', 'tiny', 'golden', 'glitched'] as MutationId[], (m) => chances[m]);
}

export function mutationMultiplier(muts: MutationId[], glitch: number, cursedKeep: number): number {
  let m = 1;
  for (const id of muts) {
    if (id === 'glitched') m *= glitch;
    else if (id === 'cursed') m *= cursedKeep;
    else m *= BALANCE.mutationMult[id];
  }
  return m;
}

export function rollChestTier(luck: number): ChestTier {
  const g = 1 + luck / 200;
  const weights: [ChestTier, number][] = [
    ['wood', 60 * Math.pow(g, -0.4)],
    ['silver', 28],
    ['gold', 10 * Math.pow(g, 0.7)],
    ['cosmic', 2 * Math.pow(g, 1.2)],
  ];
  return weightedPick(weights, (w) => w[1])[0];
}

export interface RollContext {
  quality: ReelQuality;
  forceNothing?: boolean;
}

/** Roll one complete catch. Mutates pity counters on `s` (caller owns the state). */
export function rollCatch(s: GameState, st: Stats, quality: ReelQuality): CatchResult {
  const base: CatchResult = {
    kind: 'fish', fish: null, rarity: 'common', mutations: [], glitchMult: 1, mutMult: 1, preMutValue: 0, value: 0,
    size: 0, xp: 0, shards: 0, scrap: 0, chest: null, quality, isDouble: false, forcedBy: null, chaos: null,
  };
  const bait = s.equippedBait && s.bait[s.equippedBait] > 0 ? s.equippedBait : null;

  let luck = st.luck + (quality === 'perfect' ? BALANCE.perfectLuckBonus : 0);
  let valueF = 1, mutF = 1;
  let minRarity: Rarity = 'common';

  if (bait === 'gambler') {
    if (chance(0.5)) return { ...base, kind: 'nothing', forcedBy: "The fish stole your Gambler's Bait!" };
    luck *= 4;
  }
  if (bait === 'golden') minRarity = 'uncommon';
  if (bait === 'chaos') {
    const lf = rand(0, 5), vf = rand(0.1, 5), mf = rand(0, 5);
    luck *= lf;
    valueF = vf;
    mutF = mf;
    base.chaos = `Chaos: luck x${lf.toFixed(1)}, value x${vf.toFixed(1)}, mutations x${mf.toFixed(1)}`;
  }

  // Creek snag
  if (s.zone === 2 && chance(0.06)) {
    return { ...base, kind: 'nothing', scrap: randInt(1, 3), forcedBy: 'Snagged the mangrove roots! Found Scrap.' };
  }
  // Treasure current: chests instead of fish
  if (s.event?.id === 'treasure') {
    return { ...base, kind: 'chest', chest: rollChestTier(luck), xp: 5 };
  }

  const odds = rarityOdds(luck, st.rareWeightMult, minRarity);
  let rarity = rollRarity(odds);
  s.stats.rolls++;
  for (const r of RARITIES) s.stats.expected[r] += odds[r];

  // Pity system
  const ri = rarityIndex(rarity);
  if (ri < 4 && s.pity.sinceLegendary + 1 >= st.pityLeg) {
    rarity = chance(0.1) ? 'mythic' : 'legendary';
    base.forcedBy = 'Pity: Legendary guaranteed!';
  } else if (ri < 3 && s.pity.sinceEpic + 1 >= st.pityEpic) {
    rarity = 'epic';
    base.forcedBy = 'Pity: Epic guaranteed!';
  } else if (ri < 2 && !s.stats.everRare && s.stats.casts >= BALANCE.beginnersLuckCast) {
    rarity = 'rare';
    base.forcedBy = "Beginner's luck!";
  }
  const fi = rarityIndex(rarity);
  s.pity.sinceEpic = fi >= 3 ? 0 : s.pity.sinceEpic + 1;
  s.pity.sinceLegendary = fi >= 4 ? 0 : s.pity.sinceLegendary + 1;

  const pool = poolFor(s.zone, st.weather, st.time);
  const fish = pickFish(pool, rarity);
  rarity = fish.rarity;

  // Mutations
  let muts = rollMutations(st.mutChance, mutF);
  if (st.mutPity && muts.length === 0 && s.pity.sinceMutation + 1 >= st.mutPity) {
    muts = [forcedMutation(st.mutChance)];
    base.forcedBy = base.forcedBy ?? 'Mutation pity!';
  }
  s.pity.sinceMutation = muts.length ? 0 : s.pity.sinceMutation + 1;
  const glitch = muts.includes('glitched') ? logUniform(BALANCE.glitchRange[0], BALANCE.glitchRange[1]) : 1;
  const mutMult = mutationMultiplier(muts, glitch, st.cursedKeep);

  const qMult = quality === 'perfect' ? st.perfectBonus * (1 + Math.min(20, s.perfectCombo) * st.comboPer) : quality === 'good' ? 1 : st.idleEff;
  const legend = rarityIndex(rarity) >= 4 ? st.legendValue : 1;
  const preMutValue = fish.baseValue * st.valueMult * qMult * legend * valueF;
  let size = fish.w * 1.6 * rand(0.75, 1.3);
  if (muts.includes('giant')) size *= 2.2;
  if (muts.includes('tiny')) size *= 0.4;

  return {
    ...base,
    fish,
    rarity,
    mutations: muts,
    glitchMult: glitch,
    mutMult,
    preMutValue,
    value: preMutValue * mutMult,
    size: Math.round(size * 10) / 10,
    xp: Math.ceil(BALANCE.xpPerRarity[rarity] * (muts.includes('tiny') ? BALANCE.tinyXpMult : 1) * st.xpMult * (quality === 'perfect' ? 1.5 : 1)),
    shards: muts.includes('cursed') ? randInt(1, 3) : 0,
    scrap: s.event?.id === 'rust' ? randInt(1, 2) : 0,
  };
}

/** Expected coin value of one catch with current stats (used for loot scaling and offline). */
export function expectedCatchValue(s: GameState, st: Stats, quality: ReelQuality = 'good'): number {
  const odds = rarityOdds(st.luck, st.rareWeightMult);
  const pool = poolFor(s.zone, st.weather, st.time);
  let ev = 0;
  for (const r of RARITIES) {
    const f = pool.filter((x) => x.rarity === r);
    const avg = f.length ? f.reduce((a, b) => a + b.baseValue, 0) / f.length : 0;
    ev += odds[r] * avg;
  }
  let mutEv = 1;
  for (const m of MUTATIONS) {
    const mult = m === 'glitched' ? 3 : m === 'cursed' ? st.cursedKeep : BALANCE.mutationMult[m];
    mutEv *= 1 + st.mutChance[m] * (mult - 1);
  }
  const q = quality === 'perfect' ? st.perfectBonus : quality === 'good' ? 1 : st.idleEff;
  return Math.max(1, ev * st.valueMult * q * mutEv);
}

/** Average seconds per idle cast cycle. */
export function idleCycleTime(st: Stats): number {
  return st.castTime + st.waitTime + st.biteWindow + st.reelTime + BALANCE.catchShowTime;
}

export function pearlsForReset(s: GameState): number {
  const total = Math.floor(Math.sqrt(s.lifetimeCoins / BALANCE.pearlDivisor));
  return Math.max(0, total - s.pearlsEarned);
}

export function xpToNext(level: number) {
  return BALANCE.xpForLevel(level);
}

/** Check whether a caught fish matches the player's custom Auto-Sell rules. */
export function shouldAutoSell(s: GameState, rarity: Rarity, mutations: MutationId[], size: number): boolean {
  if (!s.autoSell) return false;
  const cfg = s.autoSellConfig;
  if (!cfg.rarities[rarity]) return false;
  if (cfg.keepMutationsAtLeast > 0 && mutations.length >= cfg.keepMutationsAtLeast) return false;
  if (cfg.minSizeCm > 0 && size < cfg.minSizeCm) return false;
  if (cfg.maxSizeCm > 0 && size > cfg.maxSizeCm) return false;
  return true;
}


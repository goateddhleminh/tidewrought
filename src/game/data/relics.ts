import type { Rarity } from '../types';

export type RelicEffect =
  | 'luck' | 'value' | 'chest' | 'wait' | 'xp' | 'baitSave'
  | 'rainValue' | 'nightLuck' | 'mutation' | 'eventFreq' | 'crit' | 'autoSell'
  | 'stormValue' | 'codexMut' | 'streak' | 'pity' | 'fogLuck' | 'shiny'
  | 'golden' | 'bossDmg' | 'meteorChest' | 'double' | 'cursedKeep' | 'perfectValue'
  | 'auroraMut' | 'legendValue' | 'glitched' | 'moonLuck'
  | 'allStats' | 'prismatic';

export interface RelicDef {
  id: string;
  name: string;
  rarity: Rarity;
  effect: RelicEffect;
  min: number;
  max: number;
  /** icon to reuse (tinted per relic) */
  icon: string;
  hue: number;
  desc: (v: number) => string;
}

const p = (v: number) => `${Math.round(v)}%`;
const x = (v: number) => `x${v.toFixed(2)}`;

export const RELICS: RelicDef[] = [
  { id: 'rusty_hook', name: 'Rusty Hook', rarity: 'common', effect: 'luck', min: 3, max: 8, icon: 'hook', hue: 20, desc: (v) => `+${Math.round(v)} Luck` },
  { id: 'lucky_pebble', name: 'Lucky Pebble', rarity: 'common', effect: 'value', min: 5, max: 12, icon: 'luck', hue: 0, desc: (v) => `+${p(v)} fish value` },
  { id: 'soggy_map', name: 'Soggy Map', rarity: 'common', effect: 'chest', min: 10, max: 25, icon: 'relic', hue: 30, desc: (v) => `+${p(v)} chest chance` },
  { id: 'old_bobber', name: 'Old Bobber', rarity: 'common', effect: 'wait', min: 3, max: 8, icon: 'speed', hue: 0, desc: (v) => `-${p(v)} wait time` },
  { id: 'bent_nail', name: 'Bent Nail', rarity: 'common', effect: 'xp', min: 10, max: 25, icon: 'xp_star', hue: 0, desc: (v) => `+${p(v)} XP` },
  { id: 'worm_tin', name: 'Worm Tin', rarity: 'common', effect: 'baitSave', min: 5, max: 12, icon: 'bait', hue: 0, desc: (v) => `${p(v)} chance to save bait` },
  { id: 'rain_charm', name: 'Rain Charm', rarity: 'uncommon', effect: 'rainValue', min: 30, max: 60, icon: 'relic', hue: 180, desc: (v) => `Rain: +${p(v)} value` },
  { id: 'night_lantern', name: 'Night Lantern', rarity: 'uncommon', effect: 'nightLuck', min: 15, max: 30, icon: 'xp_star', hue: 200, desc: (v) => `At night: +${Math.round(v)} Luck` },
  { id: 'sea_glass', name: 'Sea Glass', rarity: 'uncommon', effect: 'mutation', min: 8, max: 15, icon: 'relic', hue: 120, desc: (v) => `+${p(v)} mutation chance` },
  { id: 'gull_feather', name: 'Gull Feather', rarity: 'uncommon', effect: 'eventFreq', min: 10, max: 25, icon: 'speed', hue: 160, desc: (v) => `Events ${p(v)} more often` },
  { id: 'tiny_trident', name: 'Tiny Trident', rarity: 'uncommon', effect: 'crit', min: 1, max: 3, icon: 'crit', hue: 0, desc: (v) => `+${v.toFixed(1)}% crit chance` },
  { id: 'cat_bell', name: 'Cat Bell', rarity: 'uncommon', effect: 'autoSell', min: 5, max: 15, icon: 'heart', hue: 40, desc: (v) => `+${p(v)} auto-sell value` },
  { id: 'storm_bottle', name: 'Storm in a Bottle', rarity: 'rare', effect: 'stormValue', min: 1.8, max: 2.4, icon: 'relic', hue: 230, desc: (v) => `Storms give ${x(v)} coins` },
  { id: 'codex_fragment', name: 'Codex Fragment', rarity: 'rare', effect: 'codexMut', min: 0.6, max: 1.2, icon: 'fish', hue: 60, desc: (v) => `+${v.toFixed(1)}% mutation chance per 10 unique fish` },
  { id: 'streak_totem', name: 'Streak Totem', rarity: 'rare', effect: 'streak', min: 30, max: 60, icon: 'achievement', hue: 300, desc: (v) => `Hot Streak luck +${p(v)}` },
  { id: 'pity_coin', name: 'Pity Coin', rarity: 'rare', effect: 'pity', min: 8, max: 15, icon: 'value', hue: 160, desc: (v) => `Pity thresholds -${p(v)}` },
  { id: 'fog_lens', name: 'Fog Lens', rarity: 'rare', effect: 'fogLuck', min: 40, max: 80, icon: 'luck', hue: 180, desc: (v) => `Fog: +${Math.round(v)} Luck` },
  { id: 'shiny_scale', name: 'Shiny Scale', rarity: 'rare', effect: 'shiny', min: 1.5, max: 2.5, icon: 'xp_star', hue: 40, desc: (v) => `Shiny chance ${x(v)}` },
  { id: 'golden_tooth', name: 'Golden Tooth', rarity: 'epic', effect: 'golden', min: 1.8, max: 3, icon: 'value', hue: 10, desc: (v) => `Golden chance ${x(v)}` },
  { id: 'kraken_ink', name: 'Kraken Ink', rarity: 'epic', effect: 'bossDmg', min: 25, max: 60, icon: 'reel', hue: 260, desc: (v) => `+${p(v)} boss damage` },
  { id: 'meteor_shard', name: 'Meteor Shard', rarity: 'epic', effect: 'meteorChest', min: 1.5, max: 2.5, icon: 'crit', hue: 300, desc: (v) => `Meteor Shower: chests ${x(v)}` },
  { id: 'twin_hook', name: 'Twin Hook', rarity: 'epic', effect: 'double', min: 2, max: 5, icon: 'hook', hue: 200, desc: (v) => `+${v.toFixed(1)}% Double Catch chance` },
  { id: 'cursed_compass', name: 'Cursed Compass', rarity: 'epic', effect: 'cursedKeep', min: 40, max: 80, icon: 'relic', hue: 260, desc: (v) => `Cursed fish keep ${p(v)} value (not 20%)` },
  { id: 'perfect_pearl', name: 'Perfect Pearl', rarity: 'epic', effect: 'perfectValue', min: 15, max: 35, icon: 'heart', hue: 280, desc: (v) => `Perfect reels +${p(v)} value` },
  { id: 'aurora_prism', name: 'Aurora Prism', rarity: 'legendary', effect: 'auroraMut', min: 1.5, max: 2.5, icon: 'relic', hue: 100, desc: (v) => `Aurora: mutations ${x(v)}` },
  { id: 'leviathan_scale', name: 'Leviathan Scale', rarity: 'legendary', effect: 'legendValue', min: 50, max: 120, icon: 'fish', hue: 250, desc: (v) => `Legendary+ fish +${p(v)} value` },
  { id: 'glitch_chip', name: 'Glitch Chip', rarity: 'legendary', effect: 'glitched', min: 2, max: 4, icon: 'crit', hue: 140, desc: (v) => `Glitched chance ${x(v)}` },
  { id: 'moon_idol', name: 'Blood Moon Idol', rarity: 'legendary', effect: 'moonLuck', min: 80, max: 150, icon: 'achievement', hue: 330, desc: (v) => `Blood Moon: +${Math.round(v)} Luck` },
  { id: 'heart_tide', name: 'Heart of the Tide', rarity: 'mythic', effect: 'allStats', min: 8, max: 15, icon: 'heart', hue: 180, desc: (v) => `All stats +${p(v)} (luck, value, speed)` },
  { id: 'prismatic_core', name: 'Prismatic Core', rarity: 'mythic', effect: 'prismatic', min: 2, max: 5, icon: 'relic', hue: 290, desc: (v) => `Prismatic chance ${x(v)}` },
];
export const RELIC_BY_ID: Record<string, RelicDef> = Object.fromEntries(RELICS.map((r) => [r.id, r]));
export const relicValue = (def: RelicDef, roll: number) => def.min + (def.max - def.min) * Math.max(0, Math.min(1, roll));

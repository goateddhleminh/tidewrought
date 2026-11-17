import type { BaitId } from '../types';
import { manifest } from '../assets';

export interface BaitDef {
  id: BaitId;
  name: string;
  desc: string;
  /** coin price per unit, multiplied by the zone value multiplier */
  price: number;
  /** crafting recipe */
  craft: { scrap: number; shards: number; worms: number; makes: number } | null;
  /** weight for pelican finds / chest loot */
  findWeight: number;
}

const n = (id: BaitId, fallback: string) => manifest.groups.bait[id]?.name ?? fallback;

export const BAITS: BaitDef[] = [
  { id: 'worm', name: n('worm', 'Worm'), desc: 'Safe and cheap. +8 Luck.', price: 4, craft: null, findWeight: 50 },
  { id: 'glowgrub', name: n('glowgrub', 'Glow Grub'), desc: 'Rare+ weights x1.6 for the catch.', price: 45, craft: { scrap: 1, shards: 0, worms: 5, makes: 1 }, findWeight: 22 },
  { id: 'golden', name: n('golden', 'Golden Hook Bait'), desc: 'Guarantees at least Uncommon.', price: 90, craft: { scrap: 4, shards: 2, worms: 0, makes: 2 }, findWeight: 10 },
  { id: 'chaos', name: n('chaos', 'Chaos Lure'), desc: 'Randomizes ALL modifiers (luck, value, mutations) from x0 to x5.', price: 70, craft: { scrap: 2, shards: 1, worms: 0, makes: 2 }, findWeight: 9 },
  { id: 'gambler', name: n('gambler', "Gambler's Bait"), desc: '50%: the fish steals it (nothing). 50%: x4 Luck.', price: 55, craft: { scrap: 3, shards: 0, worms: 0, makes: 2 }, findWeight: 9 },
];
export const baitDef = (id: BaitId) => BAITS.find((b) => b.id === id)!;

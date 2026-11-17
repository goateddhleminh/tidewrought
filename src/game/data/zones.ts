export interface ZoneDef {
  id: number;
  key: string; // background key in manifest
  name: string;
  cost: number;
  /** species discovered in the previous zone required to unlock */
  codexReq: number;
  mechanic: { name: string; desc: string };
  water: string; // shimmer highlight color
  boss: { name: string; sprite: string; tint: string; scale: number; hp: number; reward: number };
}

export const ZONES: ZoneDef[] = [
  {
    id: 1,
    key: 'pond',
    name: 'Sunny Pond',
    cost: 0,
    codexReq: 0,
    mechanic: { name: 'Calm Waters', desc: 'The Perfect reel window is 40% wider here.' },
    water: '#bfe8ff',
    boss: { name: 'Old Gnasher', sprite: 'catfish', tint: 'hue-rotate(20deg) saturate(1.4) brightness(0.9)', scale: 2, hp: 50, reward: 400 },
  },
  {
    id: 2,
    key: 'creek',
    name: 'Mangrove Creek',
    cost: 1500,
    codexReq: 5,
    mechanic: { name: 'Tangled Roots', desc: '6% of casts snag the roots and pull up Scrap and bait instead of a fish.' },
    water: '#c8f0b0',
    boss: { name: 'Mangrove Matriarch', sprite: 'snakehead', tint: 'hue-rotate(60deg) saturate(1.6)', scale: 2, hp: 110, reward: 600 },
  },
  {
    id: 3,
    key: 'reef',
    name: 'Coral Reef',
    cost: 60000,
    codexReq: 6,
    mechanic: { name: 'Coral Bloom', desc: 'All mutation chances are x1.5 in the reef.' },
    water: '#a8fff0',
    boss: { name: 'Tyrant Lionfish', sprite: 'lion', tint: 'hue-rotate(-30deg) saturate(1.8)', scale: 2, hp: 220, reward: 800 },
  },
  {
    id: 4,
    key: 'trench',
    name: 'Abyssal Trench',
    cost: 2.5e6,
    codexReq: 6,
    mechanic: { name: 'Darkness', desc: 'Luck counts x1.6, but bites are 40% slower.' },
    water: '#6aa8ff',
    boss: { name: 'The Lanternmaw', sprite: 'angler', tint: 'hue-rotate(160deg) saturate(1.5)', scale: 2, hp: 400, reward: 1000 },
  },
  {
    id: 5,
    key: 'void',
    name: 'Starlit Void Lake',
    cost: 1.5e8,
    codexReq: 6,
    mechanic: { name: 'Star Tides', desc: 'Eternal night. Glitched and Prismatic chances are x3.' },
    water: '#e0b8ff',
    boss: { name: 'Leviathan Prime', sprite: 'leviathan', tint: 'hue-rotate(90deg) saturate(1.8)', scale: 2, hp: 700, reward: 1400 },
  },
];

export const zoneDef = (id: number) => ZONES[Math.max(0, Math.min(ZONES.length - 1, id - 1))];

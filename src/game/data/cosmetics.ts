/** Cosmetics: fishing-line colors and outfit dyes (code-applied tints). */
export interface CosmeticDef {
  id: string;
  kind: 'line' | 'dye';
  name: string;
  value: string; // line color or CSS filter for dye
  source: 'default' | 'chest' | 'prestige';
  pearlCost?: number;
}

export const COSMETICS: CosmeticDef[] = [
  { id: 'line_white', kind: 'line', name: 'Classic Line', value: '#e8eef8', source: 'default' },
  { id: 'line_gold', kind: 'line', name: 'Gold Thread', value: '#f2c02a', source: 'chest' },
  { id: 'line_pink', kind: 'line', name: 'Bubblegum Line', value: '#ff8ad8', source: 'chest' },
  { id: 'line_cyan', kind: 'line', name: 'Neon Line', value: '#3cf0d0', source: 'chest' },
  { id: 'line_rainbow', kind: 'line', name: 'Rainbow Line', value: 'rainbow', source: 'prestige', pearlCost: 5 },
  { id: 'dye_none', kind: 'dye', name: 'Default Outfit', value: 'none', source: 'default' },
  { id: 'dye_ocean', kind: 'dye', name: 'Ocean Dye', value: 'hue-rotate(180deg)', source: 'chest' },
  { id: 'dye_forest', kind: 'dye', name: 'Forest Dye', value: 'hue-rotate(90deg)', source: 'chest' },
  { id: 'dye_royal', kind: 'dye', name: 'Royal Dye', value: 'hue-rotate(250deg) saturate(1.3)', source: 'chest' },
  { id: 'dye_shadow', kind: 'dye', name: 'Shadow Dye', value: 'grayscale(0.8) brightness(0.8)', source: 'prestige', pearlCost: 4 },
  { id: 'dye_star', kind: 'dye', name: 'Starlight Dye', value: 'hue-rotate(300deg) saturate(1.6) brightness(1.1)', source: 'prestige', pearlCost: 8 },
];
export const cosmeticDef = (id: string) => COSMETICS.find((c) => c.id === id);

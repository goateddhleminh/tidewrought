import manifestJson from '../../public/assets/manifest.json';

/** Typed view of public/assets/manifest.json. */
export interface Point {
  x: number;
  y: number;
}
export interface AssetEntry {
  file: string;
  w: number;
  h: number;
  frames?: number;
  frameW?: number;
  frameH?: number;
  fps?: number;
  loop?: boolean;
  hands?: Point[];
  anchor?: Point;
  tip?: Point;
  tier?: number;
  name?: string;
  desc?: string;
  zone?: number;
  rarity?: string;
  baseValue?: number;
  flavor?: string;
  horizonY?: number;
  nineSlice?: number;
  note?: string;
}
export type AssetGroup =
  | 'character'
  | 'rods'
  | 'fish'
  | 'bosses'
  | 'bait'
  | 'weather'
  | 'items'
  | 'chests'
  | 'icons'
  | 'helpers'
  | 'effects'
  | 'ui'
  | 'scene'
  | 'backgrounds'
  | 'hero';

export interface Manifest {
  name: string;
  version: number;
  baseSceneSize: { w: number; h: number };
  palette: { ink: string };
  groups: Record<AssetGroup, Record<string, AssetEntry>>;
  rarityColors: Record<string, string>;
}

export const manifest = manifestJson as unknown as Manifest;
export const INK = manifest.palette?.ink ?? '#1a1228';

const BASE = import.meta.env.BASE_URL + 'assets/';
export const assetUrl = (file: string) => BASE + file;

const images = new Map<string, HTMLImageElement | HTMLCanvasElement>();
const failed = new Set<string>();
const placeholderUrls = new Map<string, string>();

/** Look up a manifest entry. Returns a safe fallback entry if it does not exist. */
export function asset(group: AssetGroup, key: string): AssetEntry {
  const e = manifest.groups[group]?.[key];
  if (e) return e;
  return { file: `__missing__/${group}/${key}.png`, w: 16, h: 16 };
}
export function hasAsset(group: AssetGroup, key: string): boolean {
  return !!manifest.groups[group]?.[key];
}
export function groupKeys(group: AssetGroup): string[] {
  return Object.keys(manifest.groups[group] ?? {});
}

export function frames(entry: AssetEntry): { count: number; w: number; h: number; fps: number; loop: boolean } {
  const count = entry.frames ?? 1;
  return {
    count,
    w: entry.frameW ?? entry.w / count,
    h: entry.frameH ?? entry.h,
    fps: entry.fps ?? 1,
    loop: entry.loop ?? true,
  };
}

/** Frame index for a looping strip based on a time in seconds. */
export function frameAt(entry: AssetEntry, timeSec: number): number {
  const f = frames(entry);
  if (f.count <= 1) return 0;
  const idx = Math.floor(timeSec * f.fps);
  return f.loop ? idx % f.count : Math.min(idx, f.count - 1);
}

export function fishByZone(zone: number): [string, AssetEntry][] {
  return Object.entries(manifest.groups.fish).filter(([, e]) => e.zone === zone);
}

/** Pixel placeholder (checker + ink outline) for missing images. Never crashes. */
function makePlaceholder(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(2, w);
  c.height = Math.max(2, h);
  const g = c.getContext('2d')!;
  for (let y = 0; y < c.height; y += 2)
    for (let x = 0; x < c.width; x += 2) {
      g.fillStyle = ((x + y) / 2) % 2 === 0 ? '#ff5ac8' : '#2a1a3a';
      g.fillRect(x, y, 2, 2);
    }
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, c.width - 1, c.height - 1);
  return c;
}

export function getImage(entry: AssetEntry): HTMLImageElement | HTMLCanvasElement {
  const img = images.get(entry.file);
  if (img) return img;
  const ph = makePlaceholder(entry.w, entry.h);
  images.set(entry.file, ph);
  return ph;
}

/** URL usable in <img src>. Falls back to a data-URL placeholder when the file failed. */
export function imgSrc(entry: AssetEntry): string {
  if (!failed.has(entry.file) && !entry.file.startsWith('__missing__')) return assetUrl(entry.file);
  let url = placeholderUrls.get(entry.file);
  if (!url) {
    url = makePlaceholder(entry.w, entry.h).toDataURL();
    placeholderUrls.set(entry.file, url);
  }
  return url;
}

export function allEntries(): AssetEntry[] {
  const list: AssetEntry[] = [];
  for (const g of Object.keys(manifest.groups) as AssetGroup[]) {
    if (g === 'hero') continue; // reference only
    for (const e of Object.values(manifest.groups[g])) list.push(e);
  }
  return list;
}

/** Preload every image in the manifest. Calls onProgress(0..1). Never rejects. */
export function preloadAll(onProgress: (p: number) => void): Promise<{ failed: string[] }> {
  const list = allEntries();
  let done = 0;
  return new Promise((resolve) => {
    if (list.length === 0) resolve({ failed: [] });
    const finish = () => {
      done++;
      onProgress(done / list.length);
      if (done === list.length) resolve({ failed: [...failed] });
    };
    for (const e of list) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        images.set(e.file, img);
        finish();
      };
      img.onerror = () => {
        console.warn(`[Tidewrought] Missing asset "${e.file}", using a placeholder.`);
        failed.add(e.file);
        images.set(e.file, makePlaceholder(e.w, e.h));
        finish();
      };
      img.src = assetUrl(e.file);
    }
  });
}

export const ROD_KEYS: string[] = Object.entries(manifest.groups.rods)
  .sort((a, b) => (a[1].tier ?? 0) - (b[1].tier ?? 0))
  .map(([k]) => k);

export const ZONE_BG_KEYS = ['pond', 'creek', 'reef', 'trench', 'void'];

/**
 * Seedable RNG. Every random roll in the game goes through `rng()`.
 * Never call Math.random directly anywhere else.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let gen = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0);
let currentSeed = 0;

/** Re-seed the global generator (used by tests / simulation). */
export function seedRng(seed: number): void {
  currentSeed = seed >>> 0;
  gen = mulberry32(currentSeed);
}
export function getSeed(): number {
  return currentSeed;
}

/** Uniform float in [0, 1). */
export function rng(): number {
  return gen();
}

/** Run `fn` with a temporarily swapped generator (keeps the global stream intact). */
export function withRng<T>(seed: number, fn: () => T): T {
  const prev = gen;
  gen = mulberry32(seed);
  try {
    return fn();
  } finally {
    gen = prev;
  }
}

export const rand = (min: number, max: number) => min + rng() * (max - min);
export const randInt = (min: number, maxInclusive: number) => Math.floor(rand(min, maxInclusive + 1));
export const chance = (p: number) => rng() < p;
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
export function weightedPick<T>(items: readonly T[], weight: (t: T) => number): T {
  let total = 0;
  for (const it of items) total += Math.max(0, weight(it));
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, weight(it));
    if (r < 0) return it;
  }
  return items[items.length - 1];
}
/** Log-uniform sample: good for "x0.1 .. x20" style multipliers. */
export const logUniform = (min: number, max: number) => Math.exp(rand(Math.log(min), Math.log(max)));

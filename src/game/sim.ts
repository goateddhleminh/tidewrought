import { BALANCE } from './balance';
import { computeStats, rarityOdds, rollMutations, rollRarity } from './engine';
import { fmtPct } from './format';
import { withRng } from './rng';
import { getState } from './state';
import { MUTATIONS, RARITIES, type MutationId, type Rarity } from './types';

export interface SimReport {
  casts: number;
  luck: number;
  elapsedMs: number;
  rarity: Record<Rarity, { count: number; actualPct: number; expectedPct: number }>;
  mutations: Record<MutationId, { count: number; actualPct: number; expectedPct: number }>;
  doubleOrMoreMut: number;
  tripleOrMoreMut: number;
}

/**
 * Dev simulation helper: runs `casts` (default 100,000) catches using the
 * seedable RNG and current player stats, logs the rarity and mutation
 * distribution table to the console, and returns the report.
 */
export function runSimulation(casts = 100_000, seed = 1337): SimReport {
  const s = getState();
  const st = computeStats(s);
  const odds = rarityOdds(st.luck, st.rareWeightMult);

  const rCounts: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 };
  const mCounts: Record<MutationId, number> = {
    shiny: 0, giant: 0, tiny: 0, golden: 0, cursed: 0, glitched: 0, prismatic: 0,
  };
  let doubleOrMoreMut = 0;
  let tripleOrMoreMut = 0;

  const t0 = performance.now();
  withRng(seed, () => {
    let sinceEpic = 0;
    let sinceLeg = 0;
    for (let i = 0; i < casts; i++) {
      let r = rollRarity(odds);
      const idx = RARITIES.indexOf(r);
      if (idx < 4 && sinceLeg + 1 >= st.pityLeg) r = 'legendary';
      else if (idx < 3 && sinceEpic + 1 >= st.pityEpic) r = 'epic';
      const fi = RARITIES.indexOf(r);
      sinceEpic = fi >= 3 ? 0 : sinceEpic + 1;
      sinceLeg = fi >= 4 ? 0 : sinceLeg + 1;
      rCounts[r]++;

      const muts = rollMutations(st.mutChance, 1);
      for (const m of muts) mCounts[m]++;
      if (muts.length >= 2) doubleOrMoreMut++;
      if (muts.length >= BALANCE.jackpotMutations) tripleOrMoreMut++;
    }
  });
  const elapsedMs = Math.round(performance.now() - t0);

  const rarity = {} as SimReport['rarity'];
  for (const r of RARITIES) {
    rarity[r] = {
      count: rCounts[r],
      actualPct: (rCounts[r] / casts) * 100,
      expectedPct: odds[r] * 100,
    };
  }
  const mutations = {} as SimReport['mutations'];
  for (const m of MUTATIONS) {
    mutations[m] = {
      count: mCounts[m],
      actualPct: (mCounts[m] / casts) * 100,
      expectedPct: st.mutChance[m] * 100,
    };
  }

  console.group(`[Tidewrought Sim] ${casts.toLocaleString()} casts @ Luck=${Math.round(st.luck)} (${elapsedMs}ms)`);
  console.table(
    Object.fromEntries(
      RARITIES.map((r) => [
        r,
        {
          count: rCounts[r],
          actual: fmtPct(rCounts[r] / casts, 3),
          expectedNoPity: fmtPct(odds[r], 3),
        },
      ]),
    ),
  );
  console.table(
    Object.fromEntries(
      MUTATIONS.map((m) => [
        m,
        {
          count: mCounts[m],
          actual: fmtPct(mCounts[m] / casts, 3),
          expected: fmtPct(st.mutChance[m], 3),
        },
      ]),
    ),
  );
  console.log(`2+ mutations: ${doubleOrMoreMut} (${fmtPct(doubleOrMoreMut / casts, 3)}), 3+ JACKPOTS: ${tripleOrMoreMut}`);
  console.groupEnd();

  return { casts, luck: st.luck, elapsedMs, rarity, mutations, doubleOrMoreMut, tripleOrMoreMut };
}

declare global {
  interface Window {
    tidewroughtSim?: typeof runSimulation;
  }
}
if (typeof window !== 'undefined') {
  window.tidewroughtSim = runSimulation;
}

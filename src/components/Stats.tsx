import { useState } from 'react';
import { MUTATION_INFO, RARITY_COLOR, RARITY_LABEL } from '../game/balance';
import { computeStats, rarityOdds, xpToNext } from '../game/engine';
import { fmt, fmtInt, fmtMult, fmtPct, fmtTime } from '../game/format';
import { runSimulation, type SimReport } from '../game/sim';
import { getState, useTick } from '../game/state';
import { MUTATIONS, RARITIES, type Rarity } from '../game/types';
import { Icon, RARITY_SHAPE, Sprite, Tip } from './PixelUI';

export function Stats() {
  useTick();
  const s = getState();
  const st = computeStats(s);
  const minRarity: Rarity = s.equippedBait === 'golden' && s.bait.golden > 0 ? 'uncommon' : 'common';
  const odds = rarityOdds(st.luck, st.rareWeightMult, minRarity);
  const xpNeed = xpToNext(s.level);

  const [nerdsOpen, setNerdsOpen] = useState(false);
  const [simResult, setSimResult] = useState<SimReport | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {/* Player Level & Currencies */}
      <div className="panel-navy p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sprite group="items" name="xp_gem" scale={1} />
            <span className="font-heading text-xs text-[#9ad8ff]">LV. {s.level}</span>
            {s.skillPoints > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-bold bg-[#58b84a] text-[#1a1228]">
                +{s.skillPoints} SP
              </span>
            )}
          </div>
          <span className="font-num text-sm text-[#b8c7e0]">
            XP {fmt(s.xp)} / {fmt(xpNeed)}
          </span>
        </div>
        <div className="w-full h-2.5 bg-[#100b1a] border border-[#1a1228]">
          <div
            className="h-full bg-[#4a8fe8]"
            style={{ width: `${Math.min(100, (s.xp / Math.max(1, xpNeed)) * 100)}%` }}
          />
        </div>

        {/* Currencies grid */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <Tip label={`Lifetime Coins: ${fmt(s.lifetimeCoins)}`}>
            <div className="pixel-box px-2 py-1 flex items-center gap-1.5 w-full">
              <Sprite group="items" name="coin_spin" scale={1} />
              <div>
                <div className="text-[11px] uppercase text-[#9aa8b8]">Coins</div>
                <div className="font-num text-lg font-bold text-[#f2c02a] leading-none">{fmt(s.coins)}</div>
              </div>
            </div>
          </Tip>
          <Tip label={`Total Pearls Earned: ${fmtInt(s.pearlsEarned)} (+${Math.round(s.pearlsEarned * 10)}% value)`}>
            <div className="pixel-box px-2 py-1 flex items-center gap-1.5 w-full">
              <Sprite group="items" name="pearl" scale={1} />
              <div>
                <div className="text-[11px] uppercase text-[#9aa8b8]">Pearls</div>
                <div className="font-num text-lg font-bold text-[#ff8ad8] leading-none">{fmtInt(s.pearls)}</div>
              </div>
            </div>
          </Tip>
          <Tip label="Dropped by Cursed fish and chests. Spend at the Fate Altar to reroll mutations or relic stats.">
            <div className="pixel-box px-2 py-1 flex items-center gap-1.5 w-full">
              <Sprite group="items" name="cursed_shard" scale={1} />
              <div>
                <div className="text-[11px] uppercase text-[#9aa8b8]">Cursed Shards</div>
                <div className="font-num text-lg font-bold text-[#a45af0] leading-none">{fmtInt(s.shards)}</div>
              </div>
            </div>
          </Tip>
          <Tip label="Pulled from Mangrove Creek roots and Rust Tide events. Used to craft special bait.">
            <div className="pixel-box px-2 py-1 flex items-center gap-1.5 w-full">
              <Icon name="hook" scale={1} hue={40} />
              <div>
                <div className="text-[11px] uppercase text-[#9aa8b8]">Scrap</div>
                <div className="font-num text-lg font-bold text-[#d0b090] leading-none">{fmtInt(s.scrap)}</div>
              </div>
            </div>
          </Tip>
        </div>
      </div>

      {/* Core Stats & Pity */}
      <div className="panel-navy p-2.5 flex flex-col gap-2">
        <div className="font-heading text-xs text-[#f2c02a]">ANGLER STATS</div>
        <div className="grid grid-cols-2 gap-1 text-sm">
          <Tip
            label={
              <div>
                <div className="font-bold text-[#58b84a] mb-1">Luck Sources (x{st.luckMult.toFixed(2)})</div>
                {st.luckParts.map((p) => (
                  <div key={p.label} className="flex justify-between gap-3 text-xs">
                    <span>{p.label}</span>
                    <span className="text-[#fff6a8]">+{Math.round(p.v)}</span>
                  </div>
                ))}
              </div>
            }
          >
            <div className="pixel-box px-2 py-1 flex items-center justify-between w-full">
              <span className="flex items-center gap-1 text-[#b8c7e0]">
                <Icon name="luck" scale={1} /> Luck
              </span>
              <span className="font-num font-bold text-[#58b84a]">{fmt(st.luck, 0)}</span>
            </div>
          </Tip>

          <div className="pixel-box px-2 py-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[#b8c7e0]">
              <Icon name="value" scale={1} /> Value
            </span>
            <span className="font-num font-bold text-[#f2c02a]">{fmtMult(st.valueMult)}</span>
          </div>

          <div className="pixel-box px-2 py-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[#b8c7e0]">
              <Icon name="speed" scale={1} /> Avg Wait
            </span>
            <span className="font-num font-bold text-[#9ad8ff]">{st.waitTime.toFixed(1)}s</span>
          </div>

          <div className="pixel-box px-2 py-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[#b8c7e0]">
              <Icon name="crit" scale={1} /> Double
            </span>
            <span className="font-num font-bold text-[#3cf0d0]">{fmtPct(st.crit, 1)}</span>
          </div>

          <div className="pixel-box px-2 py-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[#b8c7e0]">
              <Icon name="relic" scale={1} /> Chest
            </span>
            <span className="font-num font-bold text-[#f2a02a]">{fmtPct(st.chest, 2)}</span>
          </div>

          <div className="pixel-box px-2 py-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[#b8c7e0]">
              <Icon name="xp_star" scale={1} /> Mut Boost
            </span>
            <span className="font-num font-bold text-[#ff5ac8]">{fmtMult(st.mutGlobal)}</span>
          </div>
        </div>

        {/* Pity & Hot Streak Bars */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#a45af0] font-bold">Epic+ Pity</span>
            <span className="font-num text-[#b8c7e0]">
              {s.pity.sinceEpic} / {st.pityEpic} casts
            </span>
          </div>
          <div className="w-full h-2 bg-[#100b1a] border border-[#1a1228]">
            <div
              className="h-full bg-[#a45af0]"
              style={{ width: `${Math.min(100, (s.pity.sinceEpic / st.pityEpic) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#f2a02a] font-bold">Legendary+ Pity</span>
            <span className="font-num text-[#b8c7e0]">
              {s.pity.sinceLegendary} / {st.pityLeg} casts
            </span>
          </div>
          <div className="w-full h-2 bg-[#100b1a] border border-[#1a1228]">
            <div
              className="h-full bg-[#f2a02a]"
              style={{ width: `${Math.min(100, (s.pity.sinceLegendary / st.pityLeg) * 100)}%` }}
            />
          </div>

          {st.mutPity > 0 && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#ff5ac8] font-bold">Mutation Pity</span>
                <span className="font-num text-[#b8c7e0]">
                  {s.pity.sinceMutation} / {st.mutPity}
                </span>
              </div>
              <div className="w-full h-2 bg-[#100b1a] border border-[#1a1228]">
                <div
                  className="h-full bg-[#ff5ac8]"
                  style={{ width: `${Math.min(100, (s.pity.sinceMutation / st.mutPity) * 100)}%` }}
                />
              </div>
            </>
          )}

          <div className="pixel-box px-2 py-1 flex items-center justify-between text-xs mt-0.5">
            <span className="text-[#fff6a8] font-bold">🔥 Hot Streak (Rare+ chain)</span>
            <span className="font-num text-sm font-bold text-[#58b84a]">
              {s.streak} / {st.streakCap} (+{Math.round(Math.min(s.streak, st.streakCap) * st.streakLuckPer)} Luck)
            </span>
          </div>
        </div>

        {/* Active Modifiers */}
        {st.modifiers.length > 0 && (
          <div className="pt-1">
            <div className="text-xs uppercase font-bold text-[#9aa8b8] mb-1">Active Modifiers</div>
            <div className="flex flex-wrap gap-1">
              {st.modifiers.map((m) => (
                <Tip key={m.label} label={m.detail}>
                  <span
                    className={`px-1.5 py-0.5 text-xs font-bold border ${
                      m.good
                        ? 'bg-[#1a332a] text-[#58b84a] border-[#58b84a]'
                        : 'bg-[#3a1a22] text-[#ff7a7a] border-[#e85a5a]'
                    }`}
                  >
                    {m.label}
                  </span>
                </Tip>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live Odds Table */}
      <div className="panel-navy p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs text-[#f2c02a]">LIVE RNG ODDS</span>
          <button
            type="button"
            onClick={() => setNerdsOpen((v) => !v)}
            className="btn-pixel px-2 py-0.5 text-xs"
          >
            {nerdsOpen ? 'Hide Nerds' : 'Stats for Nerds'}
          </button>
        </div>

        {/* Rarity table */}
        <div className="grid grid-cols-2 gap-1 text-xs">
          {RARITIES.map((r) => (
            <div
              key={r}
              className="pixel-box px-2 py-1 flex items-center justify-between"
              style={{ borderColor: RARITY_COLOR[r] }}
            >
              <span className="font-bold flex items-center gap-1" style={{ color: RARITY_COLOR[r] }}>
                <span>{RARITY_SHAPE[r]}</span>
                <span>{RARITY_LABEL[r]}</span>
              </span>
              <span className="font-num text-sm text-[#eef4ff]">{fmtPct(odds[r], 2)}</span>
            </div>
          ))}
        </div>

        {/* Mutation table */}
        <div className="text-xs uppercase font-bold text-[#9aa8b8] pt-0.5">Independent Mutation Odds</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {MUTATIONS.map((m) => {
            const info = MUTATION_INFO[m];
            const p = st.mutChance[m];
            const oneIn = p > 0 ? Math.max(2, Math.round(1 / p)) : 0;
            return (
              <Tip key={m} label={info.desc}>
                <div className="pixel-box px-2 py-0.5 flex items-center justify-between w-full">
                  <span className="font-bold" style={{ color: info.color }}>
                    {info.label}
                  </span>
                  <span className="font-num text-[#d6e4ff]">
                    1/{fmtInt(oneIn)} ({fmtPct(p, 2)})
                  </span>
                </div>
              </Tip>
            );
          })}
        </div>

        {/* Stats for Nerds Drawer */}
        {nerdsOpen && (
          <div className="pixel-box p-2 mt-1 flex flex-col gap-2 text-xs">
            <div className="font-heading text-[10px] text-[#3cf0d0]">STATS FOR NERDS</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#9aa8b8]">Total Casts:</span>
                <span className="font-num">{fmtInt(s.stats.casts)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9aa8b8]">Playtime:</span>
                <span className="font-num">{fmtTime(s.stats.playTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9aa8b8]">Perfect / Good:</span>
                <span className="font-num">
                  {fmtInt(s.stats.perfect)} / {fmtInt(s.stats.good)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9aa8b8]">Idle / Miss:</span>
                <span className="font-num">
                  {fmtInt(s.stats.auto)} / {fmtInt(s.stats.miss)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9aa8b8]">Doubles / Jackpots:</span>
                <span className="font-num">
                  {fmtInt(s.stats.doubles)} / {fmtInt(s.stats.jackpots)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9aa8b8]">Best Catch:</span>
                <span className="font-num text-[#f2c02a]">{fmt(s.stats.bestCatchValue)}</span>
              </div>
            </div>

            <div className="border-t border-[#26395c] pt-1">
              <div className="font-bold text-[#fff6a8] mb-1">Expected vs. Actual Drops</div>
              {RARITIES.map((r) => {
                const exp = s.stats.expected[r] ?? 0;
                const act = s.stats.rarityCounts[r] ?? 0;
                return (
                  <div key={r} className="flex justify-between font-num text-xs">
                    <span style={{ color: RARITY_COLOR[r] }}>
                      {RARITY_SHAPE[r]} {RARITY_LABEL[r]}
                    </span>
                    <span>
                      Act: <strong>{fmtInt(act)}</strong> / Exp: {exp.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#26395c] pt-1">
              <div className="font-bold text-[#fff6a8] mb-1">Mutations Caught</div>
              <div className="grid grid-cols-2 gap-x-2">
                {MUTATIONS.map((m) => (
                  <div key={m} className="flex justify-between font-num">
                    <span style={{ color: MUTATION_INFO[m].color }}>{MUTATION_INFO[m].label}</span>
                    <span>{fmtInt(s.stats.mutationCounts[m])}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#26395c] pt-1.5 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setSimResult(runSimulation(100_000))}
                className="btn-pixel py-1 px-2 text-xs font-bold text-[#3cf0d0]"
              >
                ▶ Run 100k Cast Simulation (Logs to Console)
              </button>
              {simResult && (
                <div className="bg-[#0b1020] p-1.5 border border-[#26395c] font-num text-xs">
                  <div className="text-[#58b84a] font-bold">
                    100,000 casts simulated in {simResult.elapsedMs}ms:
                  </div>
                  {RARITIES.map((r) => (
                    <div key={r} className="flex justify-between">
                      <span style={{ color: RARITY_COLOR[r] }}>{RARITY_LABEL[r]}</span>
                      <span>
                        {fmtInt(simResult.rarity[r].count)} ({simResult.rarity[r].actualPct.toFixed(2)}%)
                      </span>
                    </div>
                  ))}
                  <div className="text-[#ff5ac8] mt-0.5">
                    3+ Mut Jackpots: {simResult.tripleOrMoreMut}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

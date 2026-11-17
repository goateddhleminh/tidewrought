import { useState } from 'react';
import { actions } from '../game/actions';
import { HELPERS, RODS, UPGRADES, bulkCost, maxAffordable } from '../game/data/upgrades';
import { lvl } from '../game/engine';
import { fmt } from '../game/format';
import { getState, useTick } from '../game/state';
import { Icon, Sprite, Tip } from './PixelUI';

type BuyMode = 1 | 10 | 100 | 'max';

export function Shop({ mode = 'shop' }: { mode?: 'shop' | 'helpers' }) {
  useTick();
  const s = getState();
  const [buyQty, setBuyQty] = useState<BuyMode>(1);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Buy Quantity Selector */}
      <div className="flex items-center justify-between pixel-box px-2.5 py-1.5">
        <span className="text-xs uppercase font-bold text-[#9aa8b8]">Buy Amount</span>
        <div className="flex items-center gap-1">
          {([1, 10, 100, 'max'] as BuyMode[]).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setBuyQty(q)}
              className={`btn-pixel px-2.5 py-0.5 text-xs font-bold uppercase ${
                buyQty === q ? 'is-pressed text-[#f2c02a]' : ''
              }`}
            >
              {q === 'max' ? 'Max' : `x${q}`}
            </button>
          ))}
        </div>
      </div>

      {mode === 'shop' ? (
        <>
          {/* Fishing Rods (8 Tiers) */}
          <div className="flex flex-col gap-1.5">
            <div className="font-heading text-xs text-[#f2c02a]">FISHING RODS (TIER {s.rodTier}/8)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {RODS.map((r) => {
                const owned = s.rodTier >= r.tier;
                const equipped = s.rodTier === r.tier;
                const isNext = r.tier === s.rodTier + 1;
                const canBuy = isNext && s.coins >= r.cost;

                return (
                  <Tip
                    key={r.key}
                    label={
                      <div>
                        <div className="font-bold text-[#f2c02a]">{r.name}</div>
                        <div className="text-xs">
                          Luck +{r.luck} • Value x{r.value} • Speed x{r.speed}
                        </div>
                      </div>
                    }
                  >
                    <div
                      className={`pixel-box p-2 flex items-center justify-between gap-2 w-full ${
                        equipped ? 'border-[#f2c02a]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sprite group="rods" name={r.key} scale={1} />
                        <div>
                          <div className="text-sm font-bold text-[#eef4ff]">
                            T{r.tier}. {r.name}
                          </div>
                          <div className="text-xs text-[#9aa8b8]">
                            +{r.luck} Luck • x{r.value} Val • x{r.speed} Spd
                          </div>
                        </div>
                      </div>
                      {owned ? (
                        <span className="text-xs font-bold px-2 py-0.5 bg-[#1e4236] text-[#58b84a] border border-[#58b84a]">
                          {equipped ? 'EQUIPPED' : 'OWNED'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => actions.buyRod(r.tier)}
                          className="btn-pixel px-2.5 py-1 text-xs font-bold text-[#f2c02a]"
                        >
                          {fmt(r.cost)}c
                        </button>
                      )}
                    </div>
                  </Tip>
                );
              })}
            </div>
          </div>

          {/* Tackle & Part Upgrades */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="font-heading text-xs text-[#f2c02a]">TACKLE & PART UPGRADES</div>
            {UPGRADES.map((u) => {
              const cur = lvl(s.upgrades, u.id);
              const maxed = cur >= u.max;
              const maxN = maxAffordable(u.base, u.growth, cur, s.coins, u.max);
              const n = buyQty === 'max' ? Math.max(1, maxN) : Math.min(buyQty, u.max - cur);
              const cost = bulkCost(u.base, u.growth, cur, n);
              const affordable = !maxed && s.coins >= cost && (buyQty !== 'max' || maxN > 0);

              return (
                <div key={u.id} className="pixel-box p-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Icon name={u.icon} scale={2} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[#eef4ff]">{u.name}</span>
                        <span className="font-num text-xs px-1.5 py-0.2 bg-[#1a1228] text-[#9ad8ff]">
                          Lv {cur}/{u.max}
                        </span>
                      </div>
                      <div className="text-xs text-[#b8c7e0]">{u.desc(cur)}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!affordable}
                    onClick={() => actions.buyUpgrade(u.id, buyQty)}
                    className="btn-pixel px-3 py-1 text-xs font-bold shrink-0"
                  >
                    {maxed ? (
                      'MAX'
                    ) : (
                      <span>
                        +{buyQty === 'max' ? Math.max(1, maxN) : n} •{' '}
                        <span className="font-num text-[#f2c02a]">{fmt(cost)}c</span>
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Dock Helpers */
        <div className="flex flex-col gap-2">
          <div className="font-heading text-xs text-[#f2c02a]">DOCK HELPERS</div>
          <div className="text-xs text-[#b8c7e0]">
            Hired helpers appear directly on your dock and grant passive bonuses.
          </div>
          {HELPERS.map((h) => {
            const cur = s.helpers[h.id] ?? 0;
            const maxed = cur >= h.max;
            const maxN = maxAffordable(h.base, h.growth, cur, s.coins, h.max);
            const n = buyQty === 'max' ? Math.max(1, maxN) : Math.min(buyQty, h.max - cur);
            const cost = bulkCost(h.base, h.growth, cur, n);
            const affordable = !maxed && s.coins >= cost && (buyQty !== 'max' || maxN > 0);

            return (
              <div key={h.id} className="pixel-box p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Sprite group="helpers" name={h.id} scale={2} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[#eef4ff]">{h.name}</span>
                      <span className="font-num text-xs px-1.5 bg-[#1a1228] text-[#58b84a]">
                        Lv {cur}/{h.max}
                      </span>
                    </div>
                    <div className="text-xs text-[#b8c7e0]">{h.desc(cur)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!affordable}
                  onClick={() => actions.buyHelper(h.id, buyQty)}
                  className="btn-pixel px-3 py-1.5 text-xs font-bold shrink-0"
                >
                  {maxed ? (
                    'MAX'
                  ) : (
                    <span>
                      {cur === 0 ? 'Hire' : `+${buyQty === 'max' ? Math.max(1, maxN) : n}`} •{' '}
                      <span className="font-num text-[#f2c02a]">{fmt(cost)}c</span>
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

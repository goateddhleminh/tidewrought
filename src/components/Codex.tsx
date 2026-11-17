import { useState } from 'react';
import { actions } from '../game/actions';
import { BALANCE, RARITY_COLOR } from '../game/balance';
import { FISH, fishConditionLabel, fishInZone } from '../game/data/fish';
import { ZONES } from '../game/data/zones';
import { fmt, fmtInt } from '../game/format';
import { getState, useTick } from '../game/state';
import { FishSprite, MutationBadges, RarityBadge, Tip } from './PixelUI';

export function Codex() {
  useTick();
  const s = getState();
  const [zoneTab, setZoneTab] = useState<number>(0); // 0 = all

  const totalSpecies = FISH.length;
  const totalFound = Object.keys(s.codex).length;
  const pct = Math.floor((totalFound / totalSpecies) * 100);

  const visibleFish = zoneTab === 0 ? FISH : fishInZone(zoneTab);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Header & 10% Milestone Rewards */}
      <div className="pixel-box p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs text-[#f2c02a]">
            FISHDEX ({totalFound} / {totalSpecies} SPECIES • {pct}%)
          </span>
          <span className="text-xs text-[#9ad8ff]">
            +{(Math.floor(totalFound / 10) * 1).toFixed(0)}% bonus from Codex Relics
          </span>
        </div>
        <div className="w-full h-2.5 bg-[#100b1a] border border-[#1a1228]">
          <div className="h-full bg-[#58b84a]" style={{ width: `${pct}%` }} />
        </div>

        {/* 10% Milestones */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((m) => {
            const key = `pct_${m}`;
            const claimed = s.claimedMilestones.includes(key);
            const ready = pct >= m && !claimed;
            const rewardCoins = Math.pow(4, m / 10) * 100;
            const rewardPearls = m >= 50 ? Math.floor(m / 25) : 0;

            return (
              <Tip
                key={key}
                label={`Reach ${m}% Codex completion for +${fmt(rewardCoins)} Coins${
                  rewardPearls ? ` & +${rewardPearls} Pearls` : ''
                }`}
              >
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => actions.claimCodexMilestone(key, rewardCoins, rewardPearls)}
                  className={`btn-pixel px-2 py-0.5 text-xs font-bold ${
                    claimed
                      ? 'opacity-50 text-[#58b84a]'
                      : ready
                        ? 'ring-2 ring-[#fff6a8] text-[#fff6a8]'
                        : ''
                  }`}
                >
                  {m}% {claimed ? '✓' : ready ? 'CLAIM!' : ''}
                </button>
              </Tip>
            );
          })}
        </div>
      </div>

      {/* Zone Filter + Per-Zone Completion Rewards */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => setZoneTab(0)}
          className={`btn-pixel px-2 py-1 text-xs font-bold ${
            zoneTab === 0 ? 'is-pressed text-[#f2c02a]' : ''
          }`}
        >
          All ({totalFound}/{totalSpecies})
        </button>
        {ZONES.map((z) => {
          const zList = fishInZone(z.id);
          const zFound = zList.filter((f) => !!s.codex[f.id]).length;
          const zKey = `zone_complete_${z.id}`;
          const zClaimed = s.claimedMilestones.includes(zKey);
          const zComplete = zFound === zList.length;
          const zRewardCoins = 1000 * (BALANCE.zoneValueMult[z.id - 1] ?? 1);

          return (
            <div key={z.id} className="inline-flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setZoneTab(z.id)}
                className={`btn-pixel px-2 py-1 text-xs font-bold ${
                  zoneTab === z.id ? 'is-pressed text-[#f2c02a]' : ''
                }`}
              >
                Z{z.id} ({zFound}/{zList.length})
              </button>
              {zComplete && !zClaimed && (
                <button
                  type="button"
                  onClick={() => actions.claimCodexMilestone(zKey, zRewardCoins, z.id)}
                  className="btn-pixel px-1.5 py-1 text-xs font-bold text-[#fff6a8] ring-1 ring-[#fff6a8]"
                  title={`Claim Zone ${z.id} 100% reward: +${fmt(zRewardCoins)}c & +${z.id} Pearls`}
                >
                  🎁
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Species Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[430px] overflow-y-auto pr-1">
        {visibleFish.map((f) => {
          const entry = s.codex[f.id];
          const discovered = !!entry;
          const cond = fishConditionLabel(f);

          return (
            <div
              key={f.id}
              className={`slot-${f.rarity} p-2 flex items-center gap-2.5 ${
                !discovered ? 'opacity-80' : ''
              }`}
            >
              <div className="w-16 h-12 flex items-center justify-center bg-[#0b1020] border border-[#1a1228] shrink-0">
                <FishSprite
                  fishId={f.id}
                  mutations={entry?.bestMutations ?? []}
                  undiscovered={!discovered}
                  baseScale={1}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1">
                  <span
                    className="font-bold text-sm truncate"
                    style={{ color: discovered ? RARITY_COLOR[f.rarity] : '#7c8da6' }}
                  >
                    {discovered ? f.name : '???'}
                  </span>
                  <RarityBadge rarity={f.rarity} compact />
                  <span className="text-[11px] text-[#9aa8b8]">Z{f.zone}</span>
                </div>

                {cond && (
                  <div className="text-[11px] text-[#9ad8ff] font-bold">Requires: {cond}</div>
                )}

                {discovered ? (
                  <>
                    <div className="text-xs text-[#b8c7e0] italic truncate">"{f.flavor}"</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#fff6a8] font-num mt-0.5">
                      <span>Caught: {fmtInt(entry.count)}</span>
                      <span>Max: {entry.biggest}cm</span>
                      <span>Base: {f.baseValue}c</span>
                    </div>
                    {entry.bestMutations.length > 0 && (
                      <div className="mt-0.5">
                        <MutationBadges mutations={entry.bestMutations} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-[#64748b] italic">
                    Fish in {ZONES[f.zone - 1]?.name} {cond ? `during ${cond}` : ''} to discover.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

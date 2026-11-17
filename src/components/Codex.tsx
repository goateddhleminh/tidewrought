import { useState } from 'react';
import { actions } from '../game/actions';
import { BALANCE, RARITY_COLOR } from '../game/balance';
import { BAITS } from '../game/data/bait';
import { COSMETICS } from '../game/data/cosmetics';
import { FISH, fishConditionLabel, fishInZone } from '../game/data/fish';
import { RELICS } from '../game/data/relics';
import { HELPERS, RODS } from '../game/data/upgrades';
import { ZONES } from '../game/data/zones';
import { fmt, fmtInt } from '../game/format';
import { getState, useTick } from '../game/state';
import { FishSprite, MutationBadges, RarityBadge, Sprite, Tip } from './PixelUI';

type CodexCategory = 'fish' | 'rods' | 'relics' | 'helpers_baits' | 'bosses_cosmetics';

export function Codex() {
  useTick();
  const s = getState();
  const [category, setCategory] = useState<CodexCategory>('fish');
  const [zoneTab, setZoneTab] = useState<number>(0); // 0 = all

  // Collection counts across the entire game
  const fishFound = Object.keys(s.codex).length;
  const fishTotal = FISH.length;

  const rodsFound = Math.max(1, s.highestRodTier ?? s.rodTier);
  const rodsTotal = RODS.length;

  const relicIdsFound = new Set<string>([
    ...(s.discoveredRelics ?? []),
    ...s.relics.map((r) => r.id),
  ]);
  const relicsFound = relicIdsFound.size;
  const relicsTotal = RELICS.length;

  const helperIdsFound = new Set<string>([
    ...(s.discoveredHelpers ?? []),
    ...HELPERS.filter((h) => (s.helpers[h.id] ?? 0) > 0).map((h) => h.id),
  ]);
  const helpersFound = helperIdsFound.size;
  const helpersTotal = HELPERS.length;

  const baitIdsFound = new Set<string>([
    'worm',
    ...(s.discoveredBaits ?? []),
    ...BAITS.filter((b) => (s.bait[b.id] ?? 0) > 0).map((b) => b.id),
  ]);
  const baitsFound = baitIdsFound.size;
  const baitsTotal = BAITS.length;

  const zoneBossesSlain = ZONES.filter((z) => !!s.bossDefeated[z.id]).length;
  const krakenSlain = s.stats.krakens > 0 ? 1 : 0;
  const bossesFound = zoneBossesSlain + krakenSlain;
  const bossesTotal = ZONES.length + 1;

  const cosmeticsFound = s.cosmetics.owned.length;
  const cosmeticsTotal = COSMETICS.length;

  const grandFound =
    fishFound + rodsFound + relicsFound + helpersFound + baitsFound + bossesFound + cosmeticsFound;
  const grandTotal =
    fishTotal + rodsTotal + relicsTotal + helpersTotal + baitsTotal + bossesTotal + cosmeticsTotal;
  const grandPct = Math.floor((grandFound / grandTotal) * 100);
  const fishPct = Math.floor((fishFound / fishTotal) * 100);

  const visibleFish = zoneTab === 0 ? FISH : fishInZone(zoneTab);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Master Collection Progress Header */}
      <div className="pixel-box p-2.5 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="font-heading text-xs text-[#f2c02a]">
            MASTER CODEX ({grandFound} / {grandTotal} • {grandPct}%)
          </span>
          <span className="text-xs text-[#9ad8ff]">
            Undiscovered items are blacked out
          </span>
        </div>
        <div className="w-full h-2.5 bg-[#100b1a] border border-[#1a1228]">
          <div className="h-full bg-[#58b84a]" style={{ width: `${grandPct}%` }} />
        </div>

        {/* Category Progress Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 text-xs pt-0.5">
          <button
            type="button"
            onClick={() => setCategory('fish')}
            className={`btn-pixel px-2 py-1 text-left flex flex-col ${
              category === 'fish' ? 'is-pressed ring-1 ring-[#f2c02a]' : ''
            }`}
          >
            <span className="text-[11px] text-[#9aa8b8]">Fish Caught</span>
            <span className="font-num font-bold text-sm text-[#58b84a]">
              {fishFound} / {fishTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('rods')}
            className={`btn-pixel px-2 py-1 text-left flex flex-col ${
              category === 'rods' ? 'is-pressed ring-1 ring-[#f2c02a]' : ''
            }`}
          >
            <span className="text-[11px] text-[#9aa8b8]">Rods Obtained</span>
            <span className="font-num font-bold text-sm text-[#f2c02a]">
              {rodsFound} / {rodsTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('relics')}
            className={`btn-pixel px-2 py-1 text-left flex flex-col ${
              category === 'relics' ? 'is-pressed ring-1 ring-[#f2c02a]' : ''
            }`}
          >
            <span className="text-[11px] text-[#9aa8b8]">Relics Found</span>
            <span className="font-num font-bold text-sm text-[#a45af0]">
              {relicsFound} / {relicsTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('helpers_baits')}
            className={`btn-pixel px-2 py-1 text-left flex flex-col ${
              category === 'helpers_baits' ? 'is-pressed ring-1 ring-[#f2c02a]' : ''
            }`}
          >
            <span className="text-[11px] text-[#9aa8b8]">Helpers & Baits</span>
            <span className="font-num font-bold text-sm text-[#9ad8ff]">
              {helpersFound + baitsFound} / {helpersTotal + baitsTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('bosses_cosmetics')}
            className={`btn-pixel px-2 py-1 text-left flex flex-col ${
              category === 'bosses_cosmetics' ? 'is-pressed ring-1 ring-[#f2c02a]' : ''
            }`}
          >
            <span className="text-[11px] text-[#9aa8b8]">Bosses & Gear</span>
            <span className="font-num font-bold text-sm text-[#ff8ad8]">
              {bossesFound + cosmeticsFound} / {bossesTotal + cosmeticsTotal}
            </span>
          </button>
        </div>
      </div>

      {/* CATEGORY 1: FISH COLLECTION */}
      {category === 'fish' && (
        <>
          {/* 10% Fish Milestones */}
          <div className="pixel-box p-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#f2c02a]">
                Fish Milestones ({fishFound}/{fishTotal} • {fishPct}%)
              </span>
              <span className="text-[#9aa8b8]">Click glowing milestones to claim rewards</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((m) => {
                const key = `pct_${m}`;
                const claimed = s.claimedMilestones.includes(key);
                const ready = fishPct >= m && !claimed;
                const rewardCoins = Math.pow(4, m / 10) * 100;
                const rewardPearls = m >= 50 ? Math.floor(m / 25) : 0;

                return (
                  <Tip
                    key={key}
                    label={`Reach ${m}% Fish Codex completion for +${fmt(rewardCoins)} Coins${
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
              All ({fishFound}/{fishTotal})
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[390px] overflow-y-auto pr-1">
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
                        Not caught yet • Fish in {ZONES[f.zone - 1]?.name}{' '}
                        {cond ? `during ${cond}` : ''}.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* CATEGORY 2: FISHING RODS COLLECTION */}
      {category === 'rods' && (
        <div className="flex flex-col gap-2">
          <div className="pixel-box p-2 flex items-center justify-between text-xs">
            <span className="font-heading text-xs text-[#f2c02a]">
              FISHING RODS OBTAINED: {rodsFound} / {rodsTotal}
            </span>
            <span className="text-[#9aa8b8]">
              Unobtained rods are blacked out
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[420px] overflow-y-auto pr-1">
            {RODS.map((r) => {
              const obtained = r.tier <= rodsFound;
              return (
                <div
                  key={r.key}
                  className={`pixel-box p-2.5 flex items-center gap-3 ${
                    obtained ? 'border-[#f2c02a]' : 'opacity-75'
                  }`}
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-[#0b1020] border border-[#1a1228] shrink-0">
                    <Sprite
                      group="rods"
                      name={r.key}
                      scale={1}
                      filter={obtained ? undefined : 'brightness(0)'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-sm text-[#eef4ff]">
                        Tier {r.tier}: {obtained ? r.name : '???'}
                      </span>
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 ${
                          obtained
                            ? 'bg-[#1e4236] text-[#58b84a] border border-[#58b84a]'
                            : 'bg-[#1a1228] text-[#7c8da6]'
                        }`}
                      >
                        {obtained ? 'OBTAINED' : 'LOCKED'}
                      </span>
                    </div>
                    {obtained ? (
                      <div className="text-xs text-[#fff6a8] mt-0.5">
                        +{r.luck} Luck • x{r.value} Value • x{r.speed} Cast/Reel Speed
                      </div>
                    ) : (
                      <div className="text-xs text-[#64748b] italic mt-0.5">
                        Purchase in the Shop for {fmt(r.cost)} Coins to unlock.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORY 3: RELICS COLLECTION */}
      {category === 'relics' && (
        <div className="flex flex-col gap-2">
          <div className="pixel-box p-2 flex items-center justify-between text-xs">
            <span className="font-heading text-xs text-[#f2c02a]">
              RELICS DISCOVERED: {relicsFound} / {relicsTotal}
            </span>
            <span className="text-[#9aa8b8]">Found inside Treasure Chests</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[420px] overflow-y-auto pr-1">
            {RELICS.map((r) => {
              const obtained = relicIdsFound.has(r.id);
              return (
                <div
                  key={r.id}
                  className={`slot-${r.rarity} p-2 flex items-center gap-2.5 ${
                    !obtained ? 'opacity-75' : ''
                  }`}
                >
                  <div className="w-11 h-11 flex items-center justify-center bg-[#0b1020] border border-[#1a1228] shrink-0">
                    <Sprite
                      group="icons"
                      name={r.icon}
                      scale={2}
                      filter={
                        obtained
                          ? r.hue
                            ? `hue-rotate(${r.hue}deg) saturate(1.3)`
                            : undefined
                          : 'brightness(0)'
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="font-bold text-sm truncate"
                        style={{ color: obtained ? RARITY_COLOR[r.rarity] : '#7c8da6' }}
                      >
                        {obtained ? r.name : '???'}
                      </span>
                      <RarityBadge rarity={r.rarity} compact />
                    </div>
                    {obtained ? (
                      <div className="text-xs text-[#eef4ff] mt-0.5">
                        {r.desc(r.max)} <span className="text-[#9aa8b8]">(max roll)</span>
                      </div>
                    ) : (
                      <div className="text-xs text-[#64748b] italic mt-0.5">
                        Undiscovered {r.rarity} relic • Open Treasure Chests to find.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORY 4: HELPERS & BAITS COLLECTION */}
      {category === 'helpers_baits' && (
        <div className="flex flex-col gap-2.5 max-h-[430px] overflow-y-auto pr-1">
          <div className="pixel-box p-2 text-xs font-heading text-[#f2c02a]">
            DOCK HELPERS HIRED: {helpersFound} / {helpersTotal}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {HELPERS.map((h) => {
              const obtained = helperIdsFound.has(h.id);
              const curLvl = s.helpers[h.id] ?? 0;
              return (
                <div
                  key={h.id}
                  className={`pixel-box p-2 flex items-center gap-2.5 ${
                    obtained ? 'border-[#58b84a]' : 'opacity-75'
                  }`}
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-[#0b1020] border border-[#1a1228] shrink-0">
                    <Sprite
                      group="helpers"
                      name={h.id}
                      scale={2}
                      filter={obtained ? undefined : 'brightness(0)'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#eef4ff]">
                        {obtained ? h.name : '???'}
                      </span>
                      <span className="text-xs font-num text-[#58b84a]">
                        {obtained ? `Hired (Lv.${curLvl})` : 'Not Hired'}
                      </span>
                    </div>
                    <div className="text-xs text-[#b8c7e0] mt-0.5">
                      {obtained ? h.desc(Math.max(1, curLvl)) : `Hire in Helpers tab (${fmt(h.base)}c).`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pixel-box p-2 text-xs font-heading text-[#f2c02a]">
            BAIT TYPES OBTAINED: {baitsFound} / {baitsTotal}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {BAITS.map((b) => {
              const obtained = baitIdsFound.has(b.id);
              return (
                <div
                  key={b.id}
                  className={`pixel-box p-2 flex items-center gap-2.5 ${
                    obtained ? 'border-[#9ad8ff]' : 'opacity-75'
                  }`}
                >
                  <div className="w-11 h-11 flex items-center justify-center bg-[#0b1020] border border-[#1a1228] shrink-0">
                    <Sprite
                      group="bait"
                      name={b.id}
                      scale={2}
                      filter={obtained ? undefined : 'brightness(0)'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#eef4ff]">
                        {obtained ? b.name : '???'}
                      </span>
                      <span className="text-xs font-num text-[#fff6a8]">
                        {obtained ? `Owned: x${fmtInt(s.bait[b.id])}` : 'Locked'}
                      </span>
                    </div>
                    <div className="text-xs text-[#b8c7e0] mt-0.5">
                      {obtained ? b.desc : 'Buy or craft in the Bait tab to unlock.'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORY 5: BOSSES & COSMETICS COLLECTION */}
      {category === 'bosses_cosmetics' && (
        <div className="flex flex-col gap-2.5 max-h-[430px] overflow-y-auto pr-1">
          <div className="pixel-box p-2 text-xs font-heading text-[#f2c02a]">
            BOSSES DEFEATED: {bossesFound} / {bossesTotal}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {ZONES.map((z) => {
              const slain = !!s.bossDefeated[z.id];
              return (
                <div
                  key={z.id}
                  className={`pixel-box p-2 flex items-center gap-2.5 ${
                    slain ? 'border-[#f2c02a]' : 'opacity-75'
                  }`}
                >
                  <div className="w-14 h-12 flex items-center justify-center bg-[#0b1020] border border-[#1a1228] shrink-0">
                    <Sprite
                      group="fish"
                      name={z.boss.sprite}
                      scale={1}
                      filter={slain ? z.boss.tint : 'brightness(0)'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#eef4ff]">
                        {slain ? z.boss.name : '???'}
                      </span>
                      <span className="text-xs font-bold text-[#58b84a]">
                        {slain ? '✓ SLAIN' : `Zone ${z.id} Boss`}
                      </span>
                    </div>
                    <div className="text-xs text-[#b8c7e0] mt-0.5">
                      {slain
                        ? `Defeated in ${z.name} (+25% zone value)`
                        : `Challenge in ${z.name} to discover.`}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Kraken Event Boss */}
            <div
              className={`pixel-box p-2 flex items-center gap-2.5 ${
                krakenSlain ? 'border-[#ff5ac8]' : 'opacity-75'
              }`}
            >
              <div className="w-14 h-12 flex items-center justify-center bg-[#0b1020] border border-[#1a1228] shrink-0 overflow-hidden">
                <Sprite
                  group="bosses"
                  name="kraken"
                  scale={1}
                  filter={krakenSlain ? undefined : 'brightness(0)'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#ff5ac8]">
                    {krakenSlain ? 'The Kraken' : '???'}
                  </span>
                  <span className="text-xs font-bold text-[#fff6a8]">
                    {krakenSlain ? `✓ Slain (${s.stats.krakens}x)` : 'Event Boss'}
                  </span>
                </div>
                <div className="text-xs text-[#b8c7e0] mt-0.5">
                  {krakenSlain
                    ? 'Master of the Abyssal Tides.'
                    : 'Defeat during a random Kraken Shadow event.'}
                </div>
              </div>
            </div>
          </div>

          <div className="pixel-box p-2 text-xs font-heading text-[#f2c02a]">
            COSMETICS UNLOCKED: {cosmeticsFound} / {cosmeticsTotal}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {COSMETICS.map((c) => {
              const owned = s.cosmetics.owned.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`pixel-box p-2 flex items-center justify-between gap-2 ${
                    owned ? 'border-[#3cf0d0]' : 'opacity-70'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-[#eef4ff]">
                      {owned ? c.name : '???'}
                    </div>
                    <div className="text-xs text-[#9aa8b8]">
                      {owned
                        ? `${c.kind === 'line' ? 'Fishing Line' : 'Outfit Dye'}`
                        : c.source === 'chest'
                          ? 'Locked • Found in Treasure Chests'
                          : `Locked • ${c.pearlCost} Pearls in Prestige Shop`}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 ${
                      owned ? 'text-[#58b84a]' : 'text-[#64748b]'
                    }`}
                  >
                    {owned ? 'UNLOCKED' : 'LOCKED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

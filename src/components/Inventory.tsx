import { useState } from 'react';
import { actions } from '../game/actions';
import { BALANCE, RARITY_COLOR, RARITY_LABEL } from '../game/balance';
import { BAITS, baitDef } from '../game/data/bait';
import { COSMETICS } from '../game/data/cosmetics';
import { FISH_BY_ID } from '../game/data/fish';
import { RELICS, RELIC_BY_ID, relicValue } from '../game/data/relics';
import { HELPERS, RODS } from '../game/data/upgrades';
import { computeStats, mutationMultiplier, relicSlots } from '../game/engine';
import { fmt, fmtInt } from '../game/format';
import { getState, useTick } from '../game/state';
import { CHEST_TIERS, RARITIES, rarityIndex, type BaitId, type ChestTier, type Rarity } from '../game/types';
import { FishSprite, Icon, MutationBadges, RARITY_SHAPE, RarityBadge, Sprite, Tip } from './PixelUI';

export function Inventory({ section }: { section: 'inventory' | 'bait' | 'relics' }) {
  useTick();
  const s = getState();
  const st = computeStats(s);
  const zoneMult = BALANCE.zoneValueMult[s.zone - 1] ?? 1;

  const [openingTier, setOpeningTier] = useState<ChestTier | null>(null);
  const [lootReveal, setLootReveal] = useState<{
    tier: ChestTier;
    coins: number;
    baitId: BaitId;
    baitAmt: number;
    shards: number;
    relicName: string | null;
    cosmeticName: string | null;
  } | null>(null);

  const [fishRarityFilter, setFishRarityFilter] = useState<Rarity | 'all' | 'mutated'>('all');
  const [fishSort, setFishSort] = useState<'newest' | 'value' | 'size' | 'rarity'>('value');

  const handleOpenChest = (tier: ChestTier) => {
    if (s.chests[tier] <= 0) return;
    setOpeningTier(tier);
    setTimeout(() => {
      const res = actions.openChest(tier);
      setOpeningTier(null);
      if (res) setLootReveal({ tier, ...res });
    }, 320);
  };

  const fishRerollCost = Math.ceil(BALANCE.altarFishBase * Math.pow(BALANCE.altarFishGrowth, s.altarRerolls));

  // Dedicated full Inventory tab: shows ALL Fish, Auto-Sell Customizer, Owned Gear, Materials & Chests
  if (section === 'inventory') {
    const ownedRods = RODS.filter((r) => r.tier <= s.highestRodTier);
    const hiredHelpers = HELPERS.filter((h) => (s.helpers[h.id] ?? 0) > 0);
    const ownedCosmetics = COSMETICS.filter((c) => s.cosmetics.owned.includes(c.id));

    const filteredFish = s.inventory
      .filter((item) => {
        const def = FISH_BY_ID[item.fishId];
        if (!def) return false;
        if (fishRarityFilter === 'mutated') return item.mutations.length > 0;
        if (fishRarityFilter !== 'all') return def.rarity === fishRarityFilter;
        return true;
      })
      .sort((a, b) => {
        const da = FISH_BY_ID[a.fishId]!;
        const db = FISH_BY_ID[b.fishId]!;
        const va = a.preMutValue * mutationMultiplier(a.mutations, a.glitchMult, st.cursedKeep);
        const vb = b.preMutValue * mutationMultiplier(b.mutations, b.glitchMult, st.cursedKeep);
        if (fishSort === 'value') return vb - va;
        if (fishSort === 'size') return b.size - a.size;
        if (fishSort === 'rarity') return rarityIndex(db.rarity) - rarityIndex(da.rarity) || vb - va;
        return b.uid - a.uid;
      });

    return (
      <div className="flex flex-col gap-3 max-h-[540px] overflow-y-auto pr-1">
        {/* Materials, Currencies & Chests Pouch */}
        <div className="pixel-box p-2.5 flex flex-col gap-2">
          <div className="font-heading text-xs text-[#f2c02a]">BACKPACK & MATERIALS POUCH</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
            <div className="bg-[#0b1020] p-1.5 border border-[#1a1228] flex items-center gap-1.5">
              <Sprite group="items" name="coin" scale={1} />
              <div>
                <div className="text-[#9aa8b8]">Coins</div>
                <div className="font-num font-bold text-sm text-[#f2c02a]">{fmt(s.coins)}</div>
              </div>
            </div>
            <div className="bg-[#0b1020] p-1.5 border border-[#1a1228] flex items-center gap-1.5">
              <Sprite group="items" name="pearl" scale={1} />
              <div>
                <div className="text-[#9aa8b8]">Pearls</div>
                <div className="font-num font-bold text-sm text-[#ff8ad8]">{fmtInt(s.pearls)}</div>
              </div>
            </div>
            <div className="bg-[#0b1020] p-1.5 border border-[#1a1228] flex items-center gap-1.5">
              <Sprite group="items" name="cursed_shard" scale={1} />
              <div>
                <div className="text-[#9aa8b8]">Shards</div>
                <div className="font-num font-bold text-sm text-[#a45af0]">{fmtInt(s.shards)}</div>
              </div>
            </div>
            <div className="bg-[#0b1020] p-1.5 border border-[#1a1228] flex items-center gap-1.5">
              <Icon name="hook" scale={1} hue={40} />
              <div>
                <div className="text-[#9aa8b8]">Scrap</div>
                <div className="font-num font-bold text-sm text-[#d0b090]">{fmtInt(s.scrap)}</div>
              </div>
            </div>
          </div>

          {/* Owned Baits & Chests Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 pt-1">
            {BAITS.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={s.bait[b.id] <= 0 && s.equippedBait !== b.id}
                onClick={() => actions.equipBait(b.id)}
                className={`btn-pixel p-1.5 text-left flex items-center gap-1.5 text-xs ${
                  s.equippedBait === b.id ? 'is-pressed ring-1 ring-[#58b84a]' : ''
                }`}
              >
                <Sprite group="bait" name={b.id} scale={1} />
                <div className="truncate">
                  <div className="font-bold truncate">{b.name}</div>
                  <div className="font-num text-[#fff6a8]">x{fmtInt(s.bait[b.id])}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Owned Gear Summary (Rods, Helpers, Relics, Cosmetics) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-xs">
            <div className="bg-[#0b1020] p-1.5 border border-[#26395c]">
              <div className="text-[#9aa8b8]">Equipped Rod</div>
              <div className="font-bold text-[#f2c02a]">
                {RODS[s.rodTier - 1]?.name} ({ownedRods.length}/{RODS.length})
              </div>
            </div>
            <div className="bg-[#0b1020] p-1.5 border border-[#26395c]">
              <div className="text-[#9aa8b8]">Relics Owned</div>
              <div className="font-bold text-[#a45af0]">
                {s.relics.length} ({s.equippedRelics.length}/{relicSlots(s)} Eq)
              </div>
            </div>
            <div className="bg-[#0b1020] p-1.5 border border-[#26395c]">
              <div className="text-[#9aa8b8]">Helpers Hired</div>
              <div className="font-bold text-[#58b84a]">
                {hiredHelpers.length} / {HELPERS.length}
              </div>
            </div>
            <div className="bg-[#0b1020] p-1.5 border border-[#26395c]">
              <div className="text-[#9aa8b8]">Cosmetics</div>
              <div className="font-bold text-[#3cf0d0]">
                {ownedCosmetics.length} / {COSMETICS.length}
              </div>
            </div>
          </div>
        </div>

        {/* Auto-Sell Customization Section */}
        <div className="pixel-box p-2.5 flex flex-col gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-heading text-xs text-[#f2c02a]">
              AUTO-SELL CUSTOMIZATION
            </span>
            <button
              type="button"
              onClick={actions.toggleAutoSell}
              className={`btn-pixel px-2.5 py-1 text-xs font-bold ${
                s.autoSell ? 'text-[#58b84a]' : 'text-[#f2a02a]'
              }`}
            >
              Auto-Sell: {s.autoSell ? `ON (${Math.round(st.autoSellRate * 100)}%)` : 'OFF'}
            </button>
          </div>
          <div className="text-[#b8c7e0]">
            Choose which fish Rarities, Mutations, and Sizes (cm) get sold automatically. Any fish that does NOT match is stored in your Fish Inventory below!
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="font-bold text-[#eef4ff] mr-1">Rarities to Sell:</span>
            {RARITIES.map((r) => {
              const checked = s.autoSellConfig.rarities[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => actions.toggleAutoSellRarity(r)}
                  className={`btn-pixel px-2 py-0.5 text-xs font-bold flex items-center gap-1 ${
                    checked ? 'is-pressed' : 'opacity-60'
                  }`}
                  style={{ color: RARITY_COLOR[r] }}
                >
                  <span>{checked ? '☑' : '☐'}</span>
                  <span>
                    {RARITY_SHAPE[r]} {RARITY_LABEL[r]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#26395c]">
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-bold text-[#eef4ff] mr-1">Mutated Fish:</span>
              {(
                [
                  [0, 'Sell Mutated'],
                  [1, 'Keep 1+ Mut'],
                  [2, 'Keep 2+ Mut'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => actions.updateAutoSellConfig({ keepMutationsAtLeast: val })}
                  className={`btn-pixel px-2 py-0.5 text-xs ${
                    s.autoSellConfig.keepMutationsAtLeast === val
                      ? 'is-pressed text-[#f2c02a] font-bold'
                      : ''
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1">
                <span>Min cm:</span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={s.autoSellConfig.minSizeCm}
                  onChange={(e) =>
                    actions.updateAutoSellConfig({
                      minSizeCm: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-14 px-1 py-0.5 bg-[#0b1020] border border-[#26395c] text-[#eef4ff] font-num text-center"
                />
              </label>
              <label className="flex items-center gap-1">
                <span>Max cm (0=any):</span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={s.autoSellConfig.maxSizeCm}
                  onChange={(e) =>
                    actions.updateAutoSellConfig({
                      maxSizeCm: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-14 px-1 py-0.5 bg-[#0b1020] border border-[#26395c] text-[#eef4ff] font-num text-center"
                />
              </label>
            </div>
          </div>
        </div>

        {/* All Fish in Inventory */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-heading text-xs text-[#f2c02a]">
              FISH INVENTORY ({s.inventory.length}/{BALANCE.inventoryCap})
            </span>
            <button
              type="button"
              disabled={s.inventory.length === 0}
              onClick={actions.sellAllFish}
              className="btn-pixel px-2.5 py-1 text-xs font-bold text-[#f2c02a]"
            >
              Sell All Unlocked (100% Value)
            </button>
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              {(['all', 'mutated', ...RARITIES] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFishRarityFilter(f)}
                  className={`btn-pixel px-1.5 py-0.5 text-xs uppercase ${
                    fishRarityFilter === f ? 'is-pressed text-[#f2c02a] font-bold' : ''
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#9aa8b8]">Sort:</span>
              {(['value', 'size', 'rarity', 'newest'] as const).map((srt) => (
                <button
                  key={srt}
                  type="button"
                  onClick={() => setFishSort(srt)}
                  className={`btn-pixel px-1.5 py-0.5 text-xs uppercase ${
                    fishSort === srt ? 'is-pressed text-[#58b84a] font-bold' : ''
                  }`}
                >
                  {srt}
                </button>
              ))}
            </div>
          </div>

          {filteredFish.length === 0 ? (
            <div className="pixel-box p-4 text-center text-xs text-[#9aa8b8] italic">
              No fish in your inventory match this filter. Uncheck rarities in the Auto-Sell Customization above or toggle Auto-Sell OFF to store caught fish here!
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredFish.map((item) => {
                const def = FISH_BY_ID[item.fishId];
                if (!def) return null;
                const val =
                  item.preMutValue * mutationMultiplier(item.mutations, item.glitchMult, st.cursedKeep);
                return (
                  <div
                    key={item.uid}
                    className={`slot-${def.rarity} p-1.5 flex flex-wrap items-center justify-between gap-2`}
                  >
                    <div className="flex items-center gap-2">
                      <FishSprite fishId={def.id} mutations={item.mutations} baseScale={1} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm" style={{ color: RARITY_COLOR[def.rarity] }}>
                            {def.name}
                          </span>
                          <RarityBadge rarity={def.rarity} compact />
                          <MutationBadges mutations={item.mutations} glitchMult={item.glitchMult} />
                        </div>
                        <div className="text-xs text-[#9aa8b8]">
                          Size: <strong className="text-[#eef4ff]">{item.size}cm</strong> • Zone {def.zone} • Value:{' '}
                          <strong className="text-[#f2c02a]">{fmt(val)}c</strong>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => actions.toggleLockFish(item.uid)}
                        className="btn-pixel px-2 py-0.5 text-xs"
                        title="Lock fish so Sell All and Tide Reset keep it"
                      >
                        {item.locked ? '🔒' : '🔓'}
                      </button>
                      <button
                        type="button"
                        disabled={s.shards < fishRerollCost}
                        onClick={() => actions.rerollFishMutations(item.uid)}
                        className="btn-pixel px-2 py-0.5 text-xs font-bold text-[#a45af0]"
                        title="Fate Altar: Reroll this fish's mutations"
                      >
                        🔮 Reroll ({fishRerollCost})
                      </button>
                      <button
                        type="button"
                        disabled={!!item.locked}
                        onClick={() => actions.sellFish(item.uid)}
                        className="btn-pixel px-2 py-0.5 text-xs font-bold text-[#f2c02a]"
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (section === 'bait') {
    return (
      <div className="flex flex-col gap-3">
        {/* Bait Gambling & Crafting */}
        <div className="flex flex-col gap-1.5">
          <div className="font-heading text-xs text-[#f2c02a]">BAIT GAMBLING & CRAFTING</div>
          <div className="text-xs text-[#b8c7e0]">
            Click a bait to equip or unequip it. Consumed on each cast (Bait Box & skills can save bait).
          </div>
          {BAITS.map((b) => {
            const count = s.bait[b.id];
            const equipped = s.equippedBait === b.id;
            const price10 = b.price * zoneMult * 10;
            const craft = b.craft;
            const canCraft =
              craft && s.scrap >= craft.scrap && s.shards >= craft.shards && s.bait.worm >= craft.worms;

            return (
              <div
                key={b.id}
                className={`pixel-box p-2 flex flex-wrap items-center justify-between gap-2 ${
                  equipped ? 'border-[#58b84a]' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sprite group="bait" name={b.id} scale={2} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[#eef4ff]">{b.name}</span>
                      <span className="font-num text-xs px-1.5 bg-[#1a1228] text-[#fff6a8]">
                        x{fmtInt(count)}
                      </span>
                      {equipped && (
                        <span className="text-xs font-bold px-1.5 bg-[#1e4236] text-[#58b84a] border border-[#58b84a]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#b8c7e0]">{b.desc}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    disabled={count <= 0 && !equipped}
                    onClick={() => actions.equipBait(b.id)}
                    className="btn-pixel px-2 py-1 text-xs font-bold"
                  >
                    {equipped ? 'Unequip' : 'Equip'}
                  </button>
                  <button
                    type="button"
                    disabled={s.coins < price10}
                    onClick={() => actions.buyBait(b.id, 10)}
                    className="btn-pixel px-2 py-1 text-xs font-bold text-[#f2c02a]"
                  >
                    +10 ({fmt(price10)}c)
                  </button>
                  {craft && (
                    <Tip
                      label={`Craft +${craft.makes} ${b.name} using ${craft.scrap} Scrap${
                        craft.shards ? `, ${craft.shards} Shards` : ''
                      }${craft.worms ? `, ${craft.worms} Worms` : ''}`}
                    >
                      <button
                        type="button"
                        disabled={!canCraft}
                        onClick={() => actions.craftBait(b.id)}
                        className="btn-pixel px-2 py-1 text-xs font-bold text-[#3cf0d0]"
                      >
                        Craft +{craft.makes}
                      </button>
                    </Tip>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Treasure Chests */}
        <div className="flex flex-col gap-1.5">
          <div className="font-heading text-xs text-[#f2c02a]">TREASURE CHESTS</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {CHEST_TIERS.map((tier) => {
              const cnt = s.chests[tier];
              const isOpen = openingTier === tier || (lootReveal?.tier === tier && cnt === 0);
              return (
                <div key={tier} className="pixel-box p-2 flex flex-col items-center gap-1 text-center">
                  <Sprite
                    group="chests"
                    name={`${tier}_${isOpen ? 'open' : 'closed'}`}
                    scale={2}
                  />
                  <div className="text-xs font-bold uppercase text-[#eef4ff]">{tier} Chest</div>
                  <div className="font-num text-sm text-[#f2c02a]">x{fmtInt(cnt)}</div>
                  <button
                    type="button"
                    disabled={cnt <= 0 || openingTier !== null}
                    onClick={() => handleOpenChest(tier)}
                    className="btn-pixel w-full py-1 text-xs font-bold"
                  >
                    {openingTier === tier ? 'Opening...' : 'Open'}
                  </button>
                </div>
              );
            })}
          </div>

          {lootReveal && (
            <div className="panel-green p-2.5 flex items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-heading text-xs text-[#fff6a8] uppercase">
                  {lootReveal.tier} Chest Loot!
                </div>
                <div className="text-sm text-[#eef4ff] mt-0.5">
                  +{fmt(lootReveal.coins)} Coins • +{lootReveal.baitAmt}x {baitDef(lootReveal.baitId).name}
                  {lootReveal.shards > 0 && ` • +${lootReveal.shards} Cursed Shards`}
                  {lootReveal.relicName && (
                    <span className="text-[#ff5ac8] font-bold"> • Relic: {lootReveal.relicName}!</span>
                  )}
                  {lootReveal.cosmeticName && (
                    <span className="text-[#3cf0d0] font-bold"> • Cosmetic: {lootReveal.cosmeticName}!</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLootReveal(null)}
                className="btn-pixel px-2 py-0.5 text-xs"
              >
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RELICS & FATE ALTAR RELIC REROLL
  const slots = relicSlots(s);
  const uniqueOwned = new Set(s.relics.map((r) => r.id)).size;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 pixel-box p-2">
        <div>
          <div className="font-heading text-xs text-[#f2c02a]">
            RELICS ({s.equippedRelics.length}/{slots} EQUIPPED • {uniqueOwned}/{RELICS.length} DISCOVERED)
          </div>
          <div className="text-xs text-[#b8c7e0]">
            Found inside Treasure Chests. Upgrade Relic Shelf in Prestige Shop for up to 6 slots.
          </div>
        </div>
        <button
          type="button"
          disabled={s.relics.length <= uniqueOwned}
          onClick={actions.salvageDuplicateRelics}
          className="btn-pixel px-2.5 py-1 text-xs font-bold text-[#a45af0]"
        >
          Salvage Duplicates (+Shards)
        </button>
      </div>

      {s.relics.length === 0 ? (
        <div className="pixel-box p-6 text-center text-sm text-[#9aa8b8] italic">
          No relics yet! Open Treasure Chests in the Bait tab to find relics.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
          {s.relics.map((inst) => {
            const def = RELIC_BY_ID[inst.id];
            if (!def) return null;
            const equipped = s.equippedRelics.includes(inst.uid);
            const v = relicValue(def, inst.roll);
            const rerollCost = Math.ceil(BALANCE.altarRelicBase * Math.pow(BALANCE.altarRelicGrowth, inst.rerolls));

            return (
              <div
                key={inst.uid}
                className={`slot-${def.rarity} p-2 flex flex-wrap items-center justify-between gap-2 ${
                  equipped ? 'ring-2 ring-[#58b84a]' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon name={def.icon} scale={2} hue={def.hue} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base" style={{ color: RARITY_COLOR[def.rarity] }}>
                        {def.name}
                      </span>
                      <RarityBadge rarity={def.rarity} compact />
                      <span className="font-num text-xs text-[#9aa8b8]">
                        Roll {Math.round(inst.roll * 100)}%
                      </span>
                    </div>
                    <div className="text-xs text-[#eef4ff]">{def.desc(v)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Tip label="Fate Altar: Spend Cursed Shards to reroll this relic's stat quality.">
                    <button
                      type="button"
                      disabled={s.shards < rerollCost}
                      onClick={() => actions.rerollRelicStats(inst.uid)}
                      className="btn-pixel px-2 py-1 text-xs font-bold text-[#a45af0]"
                    >
                      🔮 Reroll ({rerollCost} Shards)
                    </button>
                  </Tip>
                  <button
                    type="button"
                    onClick={() => actions.toggleEquipRelic(inst.uid)}
                    className={`btn-pixel px-2.5 py-1 text-xs font-bold ${
                      equipped ? 'is-pressed text-[#58b84a]' : ''
                    }`}
                  >
                    {equipped ? 'Equipped' : 'Equip'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

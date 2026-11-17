import { useState } from 'react';
import { actions } from '../game/actions';
import { BALANCE, RARITY_COLOR } from '../game/balance';
import { BAITS, baitDef } from '../game/data/bait';
import { FISH_BY_ID } from '../game/data/fish';
import { RELICS, RELIC_BY_ID, relicValue } from '../game/data/relics';
import { computeStats, mutationMultiplier, relicSlots } from '../game/engine';
import { fmt, fmtInt } from '../game/format';
import { getState, useTick } from '../game/state';
import { CHEST_TIERS, type BaitId, type ChestTier } from '../game/types';
import { FishSprite, Icon, MutationBadges, RarityBadge, Sprite, Tip } from './PixelUI';

export function Inventory({ section }: { section: 'bait' | 'relics' }) {
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

        {/* Fish Cooler & Fate Altar Fish Mutation Reroll */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs text-[#f2c02a]">
              FISH COOLER ({s.inventory.length}/{BALANCE.inventoryCap}) & FATE ALTAR
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
          <div className="text-xs text-[#b8c7e0]">
            Toggle Auto-Sell OFF on the scene to hold fish here, sell manually for 100% value, or spend{' '}
            <strong className="text-[#a45af0]">{fishRerollCost} Cursed Shards</strong> at the Fate Altar to reroll a fish's mutations!
          </div>

          {s.inventory.length === 0 ? (
            <div className="pixel-box p-4 text-center text-xs text-[#9aa8b8] italic">
              Cooler is empty. Turn Auto-Sell OFF below the scene to keep catches for the Fate Altar.
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
              {s.inventory.map((item) => {
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
                          {item.size}cm • Value: <strong className="text-[#f2c02a]">{fmt(val)}c</strong>
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
                        🔮 Reroll ({fishRerollCost} Shards)
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
          No relics yet! Open Treasure Chests in the Bait & Chests tab to find relics.
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

import { actions } from '../game/actions';
import { BALANCE } from '../game/balance';
import { ACHIEVEMENTS, rewardLabel } from '../game/data/achievements';
import { COSMETICS } from '../game/data/cosmetics';
import { BRANCHES, SKILLS } from '../game/data/skills';
import { PRESTIGE_SHOP, costAt } from '../game/data/upgrades';
import { achievementBonus, deepDiveBonus, lvl, pearlsForReset } from '../game/engine';
import { fmt, fmtInt } from '../game/format';
import { getState, useTick } from '../game/state';
import { Icon, Sprite, Tip } from './PixelUI';

export function Prestige({ tab }: { tab: 'skills' | 'prestige' | 'achievements' }) {
  useTick();
  const s = getState();

  if (tab === 'skills') {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="pixel-box p-2.5 flex items-center justify-between">
          <div>
            <div className="font-heading text-xs text-[#f2c02a]">
              SKILL TREE • {s.skillPoints} SKILL POINTS AVAILABLE
            </div>
            <div className="text-xs text-[#b8c7e0]">
              Earn +1 Skill Point each time you level up from catching fish.
            </div>
          </div>
          <button
            type="button"
            onClick={actions.respecSkills}
            className="btn-pixel px-2.5 py-1 text-xs font-bold text-[#ff8a8a]"
          >
            Respec Skills (Free)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {BRANCHES.map((b) => {
            const branchSkills = SKILLS.filter((sk) => sk.branch === b.id);
            return (
              <div key={b.id} className="pixel-box p-2 flex flex-col gap-1.5">
                <div className="border-b border-[#26395c] pb-1">
                  <div className="font-heading text-xs" style={{ color: b.color }}>
                    {b.name}
                  </div>
                  <div className="text-xs text-[#9aa8b8]">{b.desc}</div>
                </div>
                {branchSkills.map((sk) => {
                  const cur = lvl(s.skills, sk.id);
                  const maxed = cur >= sk.max;
                  const reqOk = !sk.requires || lvl(s.skills, sk.requires) > 0;
                  const canBuy = !maxed && reqOk && s.skillPoints > 0;

                  return (
                    <div
                      key={sk.id}
                      className={`p-1.5 bg-[#0c1324] border border-[#1a1228] flex flex-col gap-1 ${
                        !reqOk ? 'opacity-55' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1.5 font-bold text-sm">
                          <Icon name={sk.icon} scale={1} />
                          <span>{sk.name}</span>
                        </span>
                        <span className="font-num text-xs text-[#9ad8ff]">
                          {cur}/{sk.max}
                        </span>
                      </div>
                      <div className="text-xs text-[#b8c7e0]">{sk.desc(Math.max(1, cur))}</div>
                      <button
                        type="button"
                        disabled={!canBuy}
                        onClick={() => actions.buySkill(sk.id)}
                        className="btn-pixel w-full py-0.5 text-xs font-bold mt-0.5"
                      >
                        {maxed ? 'MAXED' : !reqOk ? 'Locked' : 'Learn (1 SP)'}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (tab === 'achievements') {
    const unlockedCount = Object.keys(s.achievements).length;
    const bonus = achievementBonus(s);

    return (
      <div className="flex flex-col gap-2.5">
        <div className="pixel-box p-2.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-heading text-xs text-[#f2c02a]">
              ACHIEVEMENTS ({unlockedCount} / {ACHIEVEMENTS.length})
            </div>
            <div className="text-xs text-[#58b84a] mt-0.5">
              Total Permanent Bonus: +{bonus.luck} Luck • +{bonus.value}% Value • +{bonus.mutation}% Mutation • +{bonus.xp}% XP
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[450px] overflow-y-auto pr-1">
          {ACHIEVEMENTS.map((a) => {
            const done = !!s.achievements[a.id];
            return (
              <div
                key={a.id}
                className={`pixel-box p-2 flex items-center gap-2.5 ${
                  done ? 'border-[#f2c02a]' : 'opacity-65'
                }`}
              >
                <Icon name="achievement" scale={2} hue={done ? 0 : 200} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-sm text-[#eef4ff] truncate">{a.name}</span>
                    {done && <span className="text-xs font-bold text-[#58b84a]">✓ DONE</span>}
                  </div>
                  <div className="text-xs text-[#b8c7e0]">{a.desc}</div>
                  <div className="text-xs font-bold text-[#f2c02a] mt-0.5">
                    Reward: {rewardLabel(a.reward)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // PRESTIGE: TIDE RESET + PRESTIGE SHOP + DEEP DIVE + COSMETICS
  const pendingPearls = pearlsForReset(s);
  const nextPearlAt = Math.pow(s.pearlsEarned + pendingPearls + 1, 2) * BALANCE.pearlDivisor;
  const deep = deepDiveBonus(s);
  const deepUnlocked = s.prestiges >= BALANCE.deepUnlockPrestiges;

  return (
    <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1">
      {/* Tide Reset Panel */}
      <div className="panel-green p-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-heading text-xs text-[#fff6a8]">
              🌊 TIDE RESET (PRESTIGES: {s.prestiges})
            </div>
            <div className="text-xs text-[#d8f8e8] mt-0.5">
              Resets Coins, Rod, Tackle & Zones. Keeps Pearls, Relics, Codex, Skills, Shards & Locked Fish.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sprite group="items" name="pearl" scale={2} />
            <div className="text-right">
              <div className="text-xs text-[#d8f8e8]">Pearls on Reset</div>
              <div className="font-num text-xl font-bold text-[#ff8ad8]">+{fmtInt(pendingPearls)}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1a1228]">
          <div className="text-xs text-[#fff6a8]">
            Formula: <code>floor(sqrt(lifetimeCoins / 1e6))</code> • Next Pearl at{' '}
            <strong>{fmt(nextPearlAt)}</strong> lifetime coins (now {fmt(s.lifetimeCoins)}).
            Each earned Pearl grants a permanent <strong>+10% value bonus</strong> (now +
            {s.pearlsEarned * 10}%).
          </div>
          <button
            type="button"
            disabled={pendingPearls <= 0}
            onClick={actions.tideReset}
            className="btn-pixel px-4 py-1.5 font-heading text-xs text-[#fff6a8]"
          >
            Tide Reset (+{fmtInt(pendingPearls)} Pearls)
          </button>
        </div>
      </div>

      {/* Deep Dive (Layer 2 Prestige, unlocks at 5 prestiges) */}
      <div className="pixel-box p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-heading text-xs text-[#3cf0d0]">
            ⚓ DEEP DIVE (ENDLESS ABYSS METER)
          </div>
          {deepUnlocked ? (
            <div className="text-xs text-[#b8c7e0] mt-0.5">
              Depth: <strong className="text-[#fff6a8]">{Math.floor(s.deep.depth)}m</strong> (Best:{' '}
              {Math.floor(s.deep.maxDepth)}m) • Active bonus: Value x{deep.value.toFixed(2)}, Luck +
              {Math.round(deep.luck)}, Permanent Value x{deep.permValue.toFixed(2)}. Earns +2 Pearls every new 100m!
            </div>
          ) : (
            <div className="text-xs text-[#9aa8b8] mt-0.5">
              Unlocks after {BALANCE.deepUnlockPrestiges} Tide Resets (current: {s.prestiges}/
              {BALANCE.deepUnlockPrestiges}). Adds an endless depth meter with rising difficulty and rewards.
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={!deepUnlocked}
          onClick={actions.toggleDeepDive}
          className={`btn-pixel px-3 py-1.5 text-xs font-bold ${
            s.deep.active ? 'is-pressed text-[#3cf0d0]' : ''
          }`}
        >
          {!deepUnlocked ? '🔒 5 Prestiges' : s.deep.active ? 'Surface (Stop Dive)' : 'Start Deep Dive'}
        </button>
      </div>

      {/* Prestige Shop */}
      <div className="flex flex-col gap-1.5">
        <div className="font-heading text-xs text-[#f2c02a]">
          PEARL SANCTUARY ({fmtInt(s.pearls)} PEARLS AVAILABLE)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {PRESTIGE_SHOP.map((p) => {
            const cur = lvl(s.prestigeShop, p.id);
            const maxed = cur >= p.max;
            const cost = Math.ceil(costAt(p.base, p.growth, cur));
            const canBuy = !maxed && s.pearls >= cost;

            return (
              <div key={p.id} className="pixel-box p-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name={p.icon} scale={2} hue={280} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-[#eef4ff]">{p.name}</span>
                      <span className="font-num text-xs text-[#ff8ad8]">
                        {cur}/{p.max}
                      </span>
                    </div>
                    <div className="text-xs text-[#b8c7e0]">{p.desc(cur)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => actions.buyPrestigeUpgrade(p.id)}
                  className="btn-pixel px-2.5 py-1 text-xs font-bold text-[#ff8ad8] shrink-0"
                >
                  {maxed ? 'MAX' : `${cost} Pearls`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cosmetics (Fishing Line & Character Dyes) */}
      <div className="flex flex-col gap-1.5">
        <div className="font-heading text-xs text-[#f2c02a]">COSMETICS (LINES & OUTFIT DYES)</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {COSMETICS.map((c) => {
            const owned = s.cosmetics.owned.includes(c.id);
            const active = s.cosmetics.line === c.id || s.cosmetics.dye === c.id;
            const canUnlock = !owned && c.source === 'prestige' && s.pearls >= (c.pearlCost ?? 0);

            return (
              <Tip
                key={c.id}
                label={
                  owned
                    ? 'Click to equip on your character/rod.'
                    : c.source === 'chest'
                      ? 'Found randomly inside Treasure Chests.'
                      : `Unlock for ${c.pearlCost} Pearls.`
                }
              >
                <button
                  type="button"
                  disabled={!owned && !canUnlock}
                  onClick={() => actions.buyOrEquipCosmetic(c.id)}
                  className={`btn-pixel p-2 text-left flex flex-col gap-0.5 w-full ${
                    active ? 'is-pressed ring-2 ring-[#f2c02a]' : ''
                  }`}
                >
                  <div className="text-xs font-bold text-[#eef4ff]">{c.name}</div>
                  <div className="text-[11px] text-[#9ad8ff]">
                    {active
                      ? '✓ Equipped'
                      : owned
                        ? 'Owned (Click to Equip)'
                        : c.source === 'chest'
                          ? '🔒 Chest Drop'
                          : `${c.pearlCost} Pearls`}
                  </div>
                </button>
              </Tip>
            );
          })}
        </div>
      </div>
    </div>
  );
}

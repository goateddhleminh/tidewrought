import { actions } from '../game/actions';
import { RARITY_COLOR } from '../game/balance';
import { fmt } from '../game/format';
import { getState, useTick } from '../game/state';
import { rarityIndex, type Settings } from '../game/types';
import { MutationBadges, RARITY_SHAPE } from './PixelUI';

const FILTERS: { id: Settings['logFilter']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'rare', label: 'Rare+' },
  { id: 'epic', label: 'Epic+' },
  { id: 'mutated', label: 'Mutated' },
];

export function Log() {
  useTick();
  const s = getState();
  const filter = s.settings.logFilter;

  const filtered = s.log.filter((entry) => {
    if (filter === 'rare') return rarityIndex(entry.rarity) >= 2;
    if (filter === 'epic') return rarityIndex(entry.rarity) >= 3;
    if (filter === 'mutated') return entry.mutations.length > 0;
    return true;
  });

  return (
    <div className="panel-navy p-2.5 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-heading text-xs text-[#f2c02a]">
          CATCH LOG ({filtered.length}/{s.log.length})
        </span>
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => actions.updateSettings({ logFilter: f.id })}
              className={`btn-pixel px-2 py-0.5 text-xs ${
                filter === f.id ? 'is-pressed text-[#f2c02a] font-bold' : ''
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pixel-box h-36 overflow-y-auto p-1.5 flex flex-col gap-1 text-sm">
        {filtered.length === 0 ? (
          <div className="text-xs text-[#9aa8b8] italic py-4 text-center">
            No catches match this filter yet. Keep your line in the water!
          </div>
        ) : (
          filtered.map((item) => {
            const col = RARITY_COLOR[item.rarity];
            const timeStr = new Date(item.t).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-1 px-1.5 py-0.5 bg-[#0d1424] border-l-4"
                style={{ borderLeftColor: col }}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-num text-xs text-[#7c8da6]">{timeStr}</span>
                  <span style={{ color: col }} className="font-bold">
                    {RARITY_SHAPE[item.rarity]} {item.text}
                  </span>
                  <MutationBadges mutations={item.mutations} />
                  {item.quality === 'perfect' && (
                    <span className="text-[11px] px-1 bg-[#f2c02a]/20 text-[#f2c02a] font-bold">
                      PERFECT
                    </span>
                  )}
                </div>
                {item.value > 0 && (
                  <span className="font-num font-bold text-[#f2c02a]">+{fmt(item.value)}c</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Codex } from './components/Codex';
import { Inventory } from './components/Inventory';
import { Log } from './components/Log';
import { Icon, RARITY_SHAPE, Sprite } from './components/PixelUI';
import { Prestige } from './components/Prestige';
import { Scene } from './components/Scene';
import { Settings } from './components/Settings';
import { Shop } from './components/Shop';
import { Stats } from './components/Stats';
import { actions } from './game/actions';
import { preloadAll } from './game/assets';
import { RARITY_COLOR, RARITY_LABEL } from './game/balance';
import { fmt, fmtInt, fmtTime } from './game/format';
import { pearlsForReset } from './game/engine';
import { fx, getState, useTick } from './game/state';
import { RARITIES, type Rarity } from './game/types';
import { useGameLoop } from './game/useGameLoop';

type RightTab =
  | 'shop'
  | 'inventory'
  | 'codex'
  | 'helpers'
  | 'bait'
  | 'relics'
  | 'skills'
  | 'prestige'
  | 'achievements'
  | 'settings';

type MobileView = 'scene' | 'stats' | 'tabs';

const RIGHT_TABS: { id: RightTab; label: string; icon: string }[] = [
  { id: 'shop', label: 'Shop', icon: 'value' },
  { id: 'inventory', label: 'Inventory', icon: 'fish' },
  { id: 'codex', label: 'Codex', icon: 'achievement' },
  { id: 'helpers', label: 'Helpers', icon: 'heart' },
  { id: 'bait', label: 'Bait', icon: 'bait' },
  { id: 'relics', label: 'Relics', icon: 'relic' },
  { id: 'skills', label: 'Skills', icon: 'xp_star' },
  { id: 'prestige', label: 'Prestige', icon: 'offline' },
  { id: 'achievements', label: 'Feats', icon: 'luck' },
  { id: 'settings', label: 'Settings', icon: 'hook' },
];

const TUTORIAL_STEPS = [
  {
    step: 1,
    title: 'Step 1/3: Start Fishing (Manual or Auto)',
    text: 'Click ▶ START FISHING on the dock to choose between Manual Fishing (you reel each bite) or Automatic Fishing (auto-reels with an upgradeable Perfect chance)!',
  },
  {
    step: 2,
    title: 'Step 2/3: Perfect Timing & Auto-Reeler',
    text: 'In Manual mode, click REEL NOW! inside the gold bar when a fish bites. In Auto mode, upgrade "Clockwork Auto-Reeler" in the Shop to boost automatic Perfect Reels!',
  },
  {
    step: 3,
    title: 'Step 3/3: Customize Auto-Sell, Inventory & Codex',
    text: 'Use ⚙ Auto-Sell Filter to choose which sizes/rarities to sell vs. keep in your Inventory, and track all obtained Rods & Fish in the Codex!',
  },
];

export function App() {
  const [loadProgress, setLoadProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    preloadAll((p) => setLoadProgress(p)).then(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#100b1a] p-4">
        <div className="panel-navy p-6 w-full max-w-md text-center flex flex-col gap-3">
          <div className="font-heading text-sm text-[#f2c02a]">TIDEWROUGHT</div>
          <div className="text-sm text-[#b8c7e0]">Loading Pixel Asset Pack...</div>
          <div className="w-full h-4 bg-[#0b1020] border-2 border-[#1a1228]">
            <div
              className="h-full bg-[#58b84a]"
              style={{ width: `${Math.round(loadProgress * 100)}%` }}
            />
          </div>
          <div className="font-num text-sm text-[#fff6a8]">{Math.round(loadProgress * 100)}%</div>
        </div>
      </div>
    );
  }

  return <GameShell />;
}

function GameShell() {
  useTick();
  const s = getState();
  const { offlineReport, dismissOffline } = useGameLoop();

  const [rightTab, setRightTab] = useState<RightTab>('shop');
  const [mobileView, setMobileView] = useState<MobileView>('scene');
  const [toasts, setToasts] = useState<
    { id: number; title: string; text: string; color?: string }[]
  >([]);

  useEffect(() => {
    return fx.on((e) => {
      if (e.type === 'toast') {
        const id = Date.now() + Math.floor(performance.now() * 100);
        setToasts((prev) => [...prev.slice(-3), { id, title: e.title, text: e.text, color: e.color }]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3800);
      }
    });
  }, []);

  const totalChests = s.chests.wood + s.chests.silver + s.chests.gold + s.chests.cosmic;
  const resetPearls = pearlsForReset(s);
  const tut = TUTORIAL_STEPS[s.tutorialStep];

  return (
    <div
      className={`min-h-screen w-full flex flex-col bg-[#100b1a] text-[#eef4ff] pb-14 lg:pb-2 ${
        s.settings.reducedMotion ? 'reduced-motion' : ''
      }`}
    >
      {/* Top Title Bar */}
      <header className="panel-navy px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sprite group="icons" name="fish" scale={1} />
          <h1 className="font-heading text-xs sm:text-sm text-[#f2c02a] pixel-text-outline">
            TIDEWROUGHT: IDLE PIXEL FISHING
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="flex items-center gap-1 font-num font-bold text-[#f2c02a]">
            <Sprite group="items" name="coin" scale={1} /> {fmt(s.coins)}
          </span>
          <span className="flex items-center gap-1 font-num font-bold text-[#ff8ad8]">
            <Sprite group="items" name="pearl" scale={1} /> {fmtInt(s.pearls)}
          </span>
          <span className="flex items-center gap-1 font-num font-bold text-[#a45af0]">
            <Sprite group="items" name="cursed_shard" scale={1} /> {fmtInt(s.shards)}
          </span>
          <span className="text-xs text-[#9ad8ff] font-bold">Lv.{s.level}</span>
          <button
            type="button"
            onClick={actions.manualSave}
            className="btn-pixel px-2 py-0.5 text-xs font-bold text-[#58b84a]"
            title="Manually save your game progress right now"
          >
            💾 Save
          </button>
          <button
            type="button"
            onClick={() => {
              setRightTab('settings');
              setMobileView('tabs');
            }}
            className="btn-pixel px-2 py-0.5 text-xs font-bold text-[#f2c02a]"
            title="Open Audio, Save & Performance Settings"
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      {/* First-run 3-step Tutorial Banner */}
      {tut && (
        <div className="panel-green mx-2 mt-1.5 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs sm:text-sm">
            <strong className="font-heading text-xs text-[#fff6a8] mr-2">{tut.title}:</strong>
            <span>{tut.text}</span>
          </div>
          <button
            type="button"
            onClick={actions.advanceTutorial}
            className="btn-pixel px-2.5 py-0.5 text-xs font-bold"
          >
            {s.tutorialStep < 2 ? 'Next Tip →' : 'Got It ✓'}
          </button>
        </div>
      )}

      {/* Main 3-Column Responsive Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 max-w-[1680px] w-full mx-auto">
        {/* Left Column: Stats, Modifiers, Pity, Live Odds */}
        <section
          className={`lg:col-span-3 flex flex-col gap-2 ${
            mobileView === 'stats' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <Stats />
        </section>

        {/* Center Column: Scene + Scrollable Catch Log */}
        <section
          className={`lg:col-span-5 flex flex-col gap-2 ${
            mobileView === 'scene' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <Scene />
          <Log />
        </section>

        {/* Right Column: Tabbed Progression & Systems */}
        <section
          className={`lg:col-span-4 flex flex-col gap-2 ${
            mobileView === 'tabs' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div className="panel-navy p-2.5 flex flex-col gap-2.5 h-full">
            {/* Right Tab Navigation */}
            <nav className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-5 gap-1">
              {RIGHT_TABS.map((t) => {
                const active = rightTab === t.id;
                const badge =
                  (t.id === 'inventory' && s.inventory.length > 0) ||
                  (t.id === 'bait' && totalChests > 0) ||
                  (t.id === 'skills' && s.skillPoints > 0) ||
                  (t.id === 'prestige' && resetPearls > 0);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRightTab(t.id)}
                    className={`btn-pixel px-1.5 py-1 text-xs font-bold flex items-center justify-between gap-1 ${
                      active ? 'is-pressed text-[#f2c02a] ring-1 ring-[#f2c02a]' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1 truncate">
                      <Icon name={t.icon} scale={1} />
                      <span className="truncate">{t.label}</span>
                    </span>
                    {badge && (
                      <span className="w-2 h-2 bg-[#58b84a] border border-[#1a1228] shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Active Tab Body */}
            <div className="flex-1">
              {rightTab === 'shop' && <Shop mode="shop" />}
              {rightTab === 'inventory' && <Inventory section="inventory" />}
              {rightTab === 'codex' && <Codex />}
              {rightTab === 'helpers' && <Shop mode="helpers" />}
              {rightTab === 'bait' && <Inventory section="bait" />}
              {rightTab === 'relics' && <Inventory section="relics" />}
              {rightTab === 'skills' && <Prestige tab="skills" />}
              {rightTab === 'prestige' && <Prestige tab="prestige" />}
              {rightTab === 'achievements' && <Prestige tab="achievements" />}
              {rightTab === 'settings' && <Settings />}
            </div>
          </div>
        </section>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 panel-navy p-1.5 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => setMobileView('scene')}
          className={`btn-pixel py-1.5 text-xs font-bold flex items-center justify-center gap-1 ${
            mobileView === 'scene' ? 'is-pressed text-[#f2c02a]' : ''
          }`}
        >
          <Icon name="fish" scale={1} /> Dock & Log
        </button>
        <button
          type="button"
          onClick={() => setMobileView('stats')}
          className={`btn-pixel py-1.5 text-xs font-bold flex items-center justify-center gap-1 ${
            mobileView === 'stats' ? 'is-pressed text-[#f2c02a]' : ''
          }`}
        >
          <Icon name="luck" scale={1} /> Stats & Odds
        </button>
        <button
          type="button"
          onClick={() => setMobileView('tabs')}
          className={`btn-pixel py-1.5 text-xs font-bold flex items-center justify-center gap-1 ${
            mobileView === 'tabs' ? 'is-pressed text-[#f2c02a]' : ''
          }`}
        >
          <Icon name="value" scale={1} /> Shop & Menus
        </button>
      </nav>

      {/* Floating Toast Stack */}
      <div className="pointer-events-none fixed bottom-16 lg:bottom-4 right-4 z-50 flex flex-col gap-1.5 max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="panel-navy px-3 py-2 border-2"
            style={{ borderColor: t.color ?? '#f2c02a' }}
          >
            <div className="font-heading text-xs" style={{ color: t.color ?? '#f2c02a' }}>
              {t.title}
            </div>
            <div className="text-xs text-[#eef4ff] mt-0.5">{t.text}</div>
          </div>
        ))}
      </div>

      {/* Offline Progress "Welcome Back" Modal */}
      {offlineReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080510]/80 p-4">
          <div className="panel-navy p-4 max-w-md w-full flex flex-col gap-3">
            <div className="font-heading text-sm text-[#f2c02a]">WELCOME BACK, ANGLER!</div>
            <div className="text-xs text-[#b8c7e0]">
              You were away for <strong>{fmtTime(offlineReport.awaySec)}</strong> (offline cap:{' '}
              {offlineReport.capHours}h). While you rested, your dock kept fishing:
            </div>

            <div className="pixel-box p-2.5 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-[#9aa8b8]">Offline Casts</div>
                <div className="font-num text-lg font-bold text-[#eef4ff]">
                  {fmtInt(offlineReport.casts)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#9aa8b8]">Coins Earned</div>
                <div className="font-num text-lg font-bold text-[#f2c02a]">
                  +{fmt(offlineReport.coins)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#9aa8b8]">XP Gained</div>
                <div className="font-num text-lg font-bold text-[#9ad8ff]">
                  +{fmt(offlineReport.xp)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#9aa8b8]">Bonus Loot</div>
                <div className="font-num text-sm font-bold text-[#ff8ad8]">
                  +{offlineReport.chests} Chests • +{offlineReport.shards} Shards
                </div>
              </div>
            </div>

            <div className="pixel-box p-2 grid grid-cols-3 gap-1 text-xs">
              {RARITIES.map((r: Rarity) => (
                <div key={r} className="flex justify-between px-1">
                  <span style={{ color: RARITY_COLOR[r] }}>
                    {RARITY_SHAPE[r]} {RARITY_LABEL[r]}
                  </span>
                  <span className="font-num font-bold">{fmtInt(offlineReport.byRarity[r])}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={dismissOffline}
              className="btn-pixel w-full py-2 font-heading text-xs text-[#58b84a]"
            >
              Claim Offline Haul!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

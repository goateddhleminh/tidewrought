import { useRef, useState } from 'react';
import { actions } from '../game/actions';
import { exportSave, hardReset, importSave, migrateSave, saveGame } from '../game/save';
import { emit, getState, store, useTick } from '../game/state';

export function Settings() {
  useTick();
  const s = getState();
  const cfg = s.settings;
  const [saveStr, setSaveStr] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lastSavedTime = s.lastSave
    ? new Date(s.lastSave).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Never';

  const handleManualSave = () => {
    actions.manualSave();
    setStatus(`Game manually saved at ${new Date().toLocaleTimeString()}!`);
  };

  const handleExportBase64 = () => {
    const str = exportSave();
    setSaveStr(str);
    navigator.clipboard?.writeText(str).catch(() => {});
    setStatus('Base64 save string exported (and copied to clipboard)!');
  };

  const handleImportBase64 = () => {
    if (!saveStr.trim()) return;
    const ok = importSave(saveStr);
    setStatus(ok ? 'Base64 save imported successfully!' : 'Invalid Base64 save string.');
  };

  const handleDownloadJson = () => {
    saveGame();
    const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tidewrought-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Downloaded .json save backup file!');
  };

  const handleUploadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        store.state = migrateSave(parsed);
        saveGame();
        emit();
        setStatus('Save file (.json) loaded and saved!');
      } catch {
        setStatus('Invalid .json save file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const applyPreset = (preset: 'high' | 'balanced' | 'performance') => {
    if (preset === 'high') {
      actions.updateSettings({
        targetFps: 60,
        particles: 'high',
        weatherEffects: true,
        floatingText: true,
        screenShake: true,
        reducedMotion: false,
      });
      setStatus('Applied High Quality preset.');
    } else if (preset === 'balanced') {
      actions.updateSettings({
        targetFps: 30,
        particles: 'low',
        weatherEffects: true,
        floatingText: true,
        screenShake: false,
        reducedMotion: false,
      });
      setStatus('Applied Balanced preset.');
    } else {
      actions.updateSettings({
        targetFps: 30,
        particles: 'off',
        weatherEffects: false,
        floatingText: false,
        screenShake: false,
        reducedMotion: true,
      });
      setStatus('Applied Max Performance / Battery Saver preset.');
    }
  };

  return (
    <div className="flex flex-col gap-3 max-h-[540px] overflow-y-auto pr-1">
      {/* 1. MANUAL SAVE & AUTO-SAVE SECTION */}
      <div className="pixel-box p-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-heading text-xs text-[#f2c02a]">SAVE & AUTO-SAVE</div>
            <div className="text-xs text-[#58b84a] mt-0.5">
              ✓ Last saved: <strong className="font-num">{lastSavedTime}</strong> (saves automatically on catches, upgrades & tab close)
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualSave}
            className="btn-pixel px-4 py-1.5 font-heading text-xs text-[#58b84a] ring-1 ring-[#58b84a]"
          >
            💾 SAVE GAME NOW
          </button>
        </div>

        {/* Auto-save toggle & interval */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#26395c] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#eef4ff]">Automatic Save:</span>
            <button
              type="button"
              onClick={() => actions.updateSettings({ autoSaveEnabled: !cfg.autoSaveEnabled })}
              className={`btn-pixel px-2.5 py-0.5 text-xs font-bold ${
                cfg.autoSaveEnabled ? 'is-pressed text-[#58b84a]' : 'text-[#ff8a8a]'
              }`}
            >
              {cfg.autoSaveEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[#9aa8b8]">Auto-Save Interval:</span>
            {([5, 10, 30] as const).map((sec) => (
              <button
                key={sec}
                type="button"
                disabled={!cfg.autoSaveEnabled}
                onClick={() => actions.updateSettings({ autoSaveIntervalSec: sec })}
                className={`btn-pixel px-2 py-0.5 text-xs font-bold ${
                  cfg.autoSaveIntervalSec === sec ? 'is-pressed text-[#f2c02a]' : ''
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. AUDIO & SOUND CUSTOMIZATION */}
      <div className="pixel-box p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs text-[#f2c02a]">AUDIO & SOUND SETTINGS</span>
          <button
            type="button"
            onClick={() => actions.updateSettings({ muted: !cfg.muted })}
            className={`btn-pixel px-3 py-0.5 text-xs font-bold ${
              cfg.muted ? 'text-[#ff7a7a]' : 'text-[#58b84a]'
            }`}
          >
            {cfg.muted ? '🔇 All Audio Muted' : '🔊 Master Audio ON'}
          </button>
        </div>

        {/* Master Volume */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <label htmlFor="vol-slider" className="font-bold text-[#eef4ff]">
            Master Volume ({Math.round(cfg.volume * 100)}%)
          </label>
          <input
            id="vol-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={cfg.volume}
            onChange={(e) => actions.updateSettings({ volume: Number(e.target.value) })}
            className="accent-[#f2c02a] cursor-pointer w-36"
          />
        </div>

        {/* Background Music Toggle & Volume */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#26395c] text-xs">
          <div>
            <div className="font-bold text-[#eef4ff]">
              🎵 Background Music ({Math.round(cfg.musicVolume * 100)}%)
            </div>
            <div className="text-[#9aa8b8]">Gentle chiptune dock melody while playing</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              disabled={!cfg.musicEnabled || cfg.muted}
              value={cfg.musicVolume}
              onChange={(e) => actions.updateSettings({ musicVolume: Number(e.target.value) })}
              className="accent-[#f2c02a] cursor-pointer w-24"
            />
            <button
              type="button"
              onClick={() => actions.updateSettings({ musicEnabled: !cfg.musicEnabled })}
              className={`btn-pixel px-2.5 py-0.5 text-xs font-bold ${
                cfg.musicEnabled ? 'is-pressed text-[#58b84a]' : 'text-[#9aa8b8]'
              }`}
            >
              {cfg.musicEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Fishing Sounds Toggle */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-[#eef4ff]">🎣 Fishing & Catch Sounds</div>
            <div className="text-[#9aa8b8]">Cast, splash, bite alert, reel, and catch fanfares</div>
          </div>
          <button
            type="button"
            onClick={() => actions.updateSettings({ fishSounds: !cfg.fishSounds })}
            className={`btn-pixel px-2.5 py-0.5 text-xs font-bold ${
              cfg.fishSounds ? 'is-pressed text-[#58b84a]' : 'text-[#9aa8b8]'
            }`}
          >
            {cfg.fishSounds ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* UI & Coin Sounds Toggle */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-[#eef4ff]">🪙 UI, Coin & Chest Sounds</div>
            <div className="text-[#9aa8b8]">Button clicks, coin clinks, chests, and level-ups</div>
          </div>
          <button
            type="button"
            onClick={() => actions.updateSettings({ uiSounds: !cfg.uiSounds })}
            className={`btn-pixel px-2.5 py-0.5 text-xs font-bold ${
              cfg.uiSounds ? 'is-pressed text-[#58b84a]' : 'text-[#9aa8b8]'
            }`}
          >
            {cfg.uiSounds ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* 3. PERFORMANCE & VISUAL OPTIMIZATION */}
      <div className="pixel-box p-3 flex flex-col gap-2">
        <div className="font-heading text-xs text-[#f2c02a]">PERFORMANCE & VISUAL OPTIMIZATION</div>
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-[#9aa8b8] mr-1">Quick Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset('high')}
            className="btn-pixel px-2 py-0.5 text-xs font-bold text-[#58b84a]"
          >
            ✨ High Quality
          </button>
          <button
            type="button"
            onClick={() => applyPreset('balanced')}
            className="btn-pixel px-2 py-0.5 text-xs font-bold text-[#f2c02a]"
          >
            ⚖ Balanced
          </button>
          <button
            type="button"
            onClick={() => applyPreset('performance')}
            className="btn-pixel px-2 py-0.5 text-xs font-bold text-[#3cf0d0]"
          >
            ⚡ Max Performance
          </button>
        </div>

        {/* Target FPS */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#26395c]">
          <div>
            <div className="font-bold text-[#eef4ff]">Canvas Frame Rate (FPS Cap)</div>
            <div className="text-[#9aa8b8]">Lower FPS saves CPU and battery on laptops/phones</div>
          </div>
          <div className="flex items-center gap-1">
            {([60, 30, 15] as const).map((fps) => (
              <button
                key={fps}
                type="button"
                onClick={() => actions.updateSettings({ targetFps: fps })}
                className={`btn-pixel px-2 py-0.5 text-xs font-bold ${
                  cfg.targetFps === fps ? 'is-pressed text-[#f2c02a]' : ''
                }`}
              >
                {fps} FPS
              </button>
            ))}
          </div>
        </div>

        {/* Particle Density */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-[#eef4ff]">Particle Effects</div>
            <div className="text-[#9aa8b8]">Splash droplets and rarity pixel bursts</div>
          </div>
          <div className="flex items-center gap-1">
            {(['high', 'low', 'off'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => actions.updateSettings({ particles: p })}
                className={`btn-pixel px-2 py-0.5 text-xs font-bold uppercase ${
                  cfg.particles === p ? 'is-pressed text-[#f2c02a]' : ''
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Weather & Water Overlays */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-[#eef4ff]">Weather & Water Shimmer</div>
            <div className="text-[#9aa8b8]">Raindrops, fog bands, aurora ribbons, and clouds</div>
          </div>
          <button
            type="button"
            onClick={() => actions.updateSettings({ weatherEffects: !cfg.weatherEffects })}
            className={`btn-pixel px-2.5 py-0.5 text-xs font-bold ${
              cfg.weatherEffects ? 'is-pressed text-[#58b84a]' : 'text-[#9aa8b8]'
            }`}
          >
            {cfg.weatherEffects ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Floating Text */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-[#eef4ff]">Floating +Coin Numbers</div>
            <div className="text-[#9aa8b8]">Popup coin values above the dock</div>
          </div>
          <button
            type="button"
            onClick={() => actions.updateSettings({ floatingText: !cfg.floatingText })}
            className={`btn-pixel px-2.5 py-0.5 text-xs font-bold ${
              cfg.floatingText ? 'is-pressed text-[#58b84a]' : 'text-[#9aa8b8]'
            }`}
          >
            {cfg.floatingText ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Screen Shake */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-[#eef4ff]">Screen Shake on Legendary+</div>
            <div className="text-[#9aa8b8]">Camera shake when catching Legendary or Mythic fish</div>
          </div>
          <button
            type="button"
            onClick={() => actions.updateSettings({ screenShake: !cfg.screenShake })}
            className={`btn-pixel px-2.5 py-0.5 text-xs font-bold ${
              cfg.screenShake ? 'is-pressed text-[#58b84a]' : 'text-[#9aa8b8]'
            }`}
          >
            {cfg.screenShake ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Reduced Motion */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-[#eef4ff]">Reduced Motion</div>
            <div className="text-[#9aa8b8]">Disables glitch jitter and rapid animations</div>
          </div>
          <button
            type="button"
            onClick={() => actions.updateSettings({ reducedMotion: !cfg.reducedMotion })}
            className={`btn-pixel px-2.5 py-0.5 text-xs font-bold ${
              cfg.reducedMotion ? 'is-pressed text-[#58b84a]' : 'text-[#9aa8b8]'
            }`}
          >
            {cfg.reducedMotion ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Hover Tooltips */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-[#eef4ff]">Hover Tooltips</div>
            <div className="text-[#9aa8b8]">Show detailed stat breakdowns when hovering</div>
          </div>
          <button
            type="button"
            onClick={() => actions.updateSettings({ showTooltips: !cfg.showTooltips })}
            className={`btn-pixel px-2.5 py-0.5 text-xs font-bold ${
              cfg.showTooltips ? 'is-pressed text-[#58b84a]' : 'text-[#9aa8b8]'
            }`}
          >
            {cfg.showTooltips ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* 4. BACKUP EXPORT / IMPORT & HARD RESET */}
      <div className="pixel-box p-3 flex flex-col gap-2">
        <div className="font-heading text-xs text-[#f2c02a]">BACKUP EXPORT / IMPORT</div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="btn-pixel px-2.5 py-1 text-xs font-bold text-[#58b84a]"
          >
            📥 Download Save (.json)
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-pixel px-2.5 py-1 text-xs font-bold text-[#3cf0d0]"
          >
            📤 Load Save File (.json)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleUploadJson}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleExportBase64}
            className="btn-pixel px-2.5 py-1 text-xs font-bold text-[#9ad8ff]"
          >
            📋 Copy Base64
          </button>
          <button
            type="button"
            onClick={handleImportBase64}
            className="btn-pixel px-2.5 py-1 text-xs font-bold text-[#f2c02a]"
          >
            📥 Import Base64
          </button>
        </div>

        <textarea
          rows={2}
          value={saveStr}
          onChange={(e) => setSaveStr(e.target.value)}
          placeholder="Paste a Base64 save string here to import, or click Copy Base64..."
          className="w-full p-2 text-xs font-mono bg-[#0b1020] text-[#eef4ff] border-2 border-[#1a1228]"
        />

        {status && <div className="text-xs font-bold text-[#58b84a]">{status}</div>}

        <div className="pt-2 border-t border-[#26395c] flex items-center justify-between">
          <span className="text-xs text-[#ff8a8a]">Danger Zone: Wipe all progress</span>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="btn-pixel px-3 py-1 text-xs font-bold text-[#ff7a7a]"
            >
              🗑 Hard Reset
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  hardReset();
                  setConfirmReset(false);
                  setStatus('Save wiped.');
                }}
                className="btn-pixel px-3 py-1 text-xs font-bold text-[#ff5ac8]"
              >
                Confirm Wipe!
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="btn-pixel px-2 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

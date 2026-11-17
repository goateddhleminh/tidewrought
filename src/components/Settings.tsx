import { useState } from 'react';
import { actions } from '../game/actions';
import { exportSave, hardReset, importSave, saveGame } from '../game/save';
import { getState, useTick } from '../game/state';

export function Settings() {
  useTick();
  const s = getState();
  const [saveStr, setSaveStr] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleExport = () => {
    const str = exportSave();
    setSaveStr(str);
    navigator.clipboard?.writeText(str).catch(() => {});
    setStatus('Save exported to box (and copied to clipboard)!');
  };

  const handleImport = () => {
    if (!saveStr.trim()) return;
    const ok = importSave(saveStr);
    setStatus(ok ? 'Save imported successfully!' : 'Invalid Base64 save string.');
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Audio & Accessibility */}
      <div className="pixel-box p-3 flex flex-col gap-2.5">
        <div className="font-heading text-xs text-[#f2c02a]">AUDIO & ACCESSIBILITY</div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="vol-slider" className="text-sm font-bold">
            Chiptune SFX Volume ({Math.round(s.settings.volume * 100)}%)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="vol-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.settings.volume}
              onChange={(e) => actions.updateSettings({ volume: Number(e.target.value) })}
              className="accent-[#f2c02a] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => actions.updateSettings({ muted: !s.settings.muted })}
              className="btn-pixel px-2.5 py-0.5 text-xs font-bold"
            >
              {s.settings.muted ? '🔇 Muted' : '🔊 On'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">Reduced Motion</div>
            <div className="text-xs text-[#9aa8b8]">
              Disables screen shake, glitch jitter, and falling weather motion.
            </div>
          </div>
          <button
            type="button"
            onClick={() => actions.updateSettings({ reducedMotion: !s.settings.reducedMotion })}
            className="btn-pixel px-3 py-1 text-xs font-bold"
          >
            {s.settings.reducedMotion ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">Hover Tooltips</div>
            <div className="text-xs text-[#9aa8b8]">Show detailed stat breakdowns on hover.</div>
          </div>
          <button
            type="button"
            onClick={() => actions.updateSettings({ showTooltips: !s.settings.showTooltips })}
            className="btn-pixel px-3 py-1 text-xs font-bold"
          >
            {s.settings.showTooltips ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Save Management */}
      <div className="pixel-box p-3 flex flex-col gap-2">
        <div className="font-heading text-xs text-[#f2c02a]">SAVE DATA (AUTOSAVES EVERY 10S)</div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              saveGame();
              setStatus('Game saved to localStorage.');
            }}
            className="btn-pixel px-3 py-1 text-xs font-bold text-[#58b84a]"
          >
            💾 Save Now
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="btn-pixel px-3 py-1 text-xs font-bold text-[#9ad8ff]"
          >
            📤 Export Base64
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="btn-pixel px-3 py-1 text-xs font-bold text-[#f2c02a]"
          >
            📥 Import Base64
          </button>
        </div>

        <textarea
          rows={3}
          value={saveStr}
          onChange={(e) => setSaveStr(e.target.value)}
          placeholder="Paste a Base64 save string here to import, or click Export Base64..."
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

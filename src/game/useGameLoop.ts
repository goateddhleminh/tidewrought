import { useEffect, useState } from 'react';
import { stepTick } from './actions';
import { BALANCE } from './balance';
import { applyOfflineProgress, loadGame, saveGame, type OfflineReport } from './save';
import { sfx } from './sound';

/**
 * Fixed-timestep game loop at 10 ticks/s (100ms per tick), decoupled from rendering.
 * Pauses when the tab is hidden and computes offline progress when the player returns.
 */
export function useGameLoop() {
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null);

  useEffect(() => {
    const initial = loadGame();
    if (initial) setOfflineReport(initial);

    const unlockAudio = () => sfx.unlock();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    const stepMs = 1000 / BALANCE.tickRate;
    let lastTime = performance.now();
    let acc = 0;
    let saveTimer = 0;
    let hiddenAt: number | null = null;

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        saveGame();
      } else if (hiddenAt !== null) {
        const awaySec = (Date.now() - hiddenAt) / 1000;
        hiddenAt = null;
        lastTime = performance.now();
        acc = 0;
        if (awaySec >= BALANCE.offlineMinSec) {
          const rep = applyOfflineProgress(awaySec);
          if (rep) setOfflineReport(rep);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onBeforeUnload = () => saveGame();
    window.addEventListener('beforeunload', onBeforeUnload);

    const id = window.setInterval(() => {
      if (document.hidden) return;
      const now = performance.now();
      const elapsed = Math.min(2000, now - lastTime);
      lastTime = now;
      acc += elapsed;
      while (acc >= stepMs) {
        stepTick(1 / BALANCE.tickRate);
        acc -= stepMs;
      }
      saveTimer += elapsed / 1000;
      if (saveTimer >= BALANCE.saveEverySec) {
        saveTimer = 0;
        saveGame();
      }
    }, stepMs);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  return { offlineReport, dismissOffline: () => setOfflineReport(null) };
}

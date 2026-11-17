import { getState } from './state';

/**
 * Chiptune SFX & Ambient Music synthesizer using the WebAudio API.
 * Supports separate toggles for Background Music, Fishing Sounds, and UI Sounds.
 */
const MELODY_NOTES = [
  261.63, 329.63, 392.0, 523.25, 392.0, 329.63,
  293.66, 369.99, 440.0, 587.33, 440.0, 369.99,
  246.94, 329.63, 392.0, 493.88, 392.0, 329.63,
  220.0, 261.63, 329.63, 440.0, 329.63, 261.63,
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private musicTimer: number | null = null;
  private noteIdx = 0;

  unlock() {
    if (!this.unlocked) {
      this.unlocked = true;
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AC && !this.ctx) this.ctx = new AC();
      } catch {
        // WebAudio unavailable
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.syncMusic();
  }

  syncMusic() {
    const s = getState().settings;
    const shouldPlay =
      this.unlocked && !s.muted && s.musicEnabled && s.volume > 0 && s.musicVolume > 0;
    if (shouldPlay && this.musicTimer === null) {
      this.musicTimer = window.setInterval(() => this.stepMusic(), 420);
    } else if (!shouldPlay && this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private stepMusic() {
    const s = getState().settings;
    if (!this.unlocked || s.muted || !s.musicEnabled || !this.ctx || document.hidden) return;
    const g = s.volume * s.musicVolume * 0.08;
    if (g <= 0) return;

    const freq = MELODY_NOTES[this.noteIdx % MELODY_NOTES.length];
    this.noteIdx++;

    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(g, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.4);
  }

  private sfxGain(kind: 'fish' | 'ui'): number {
    const s = getState().settings;
    if (!this.unlocked || s.muted || s.volume <= 0) return 0;
    if (kind === 'fish' && !s.fishSounds) return 0;
    if (kind === 'ui' && !s.uiSounds) return 0;
    return s.volume * 0.22;
  }

  private tone(
    kind: 'fish' | 'ui',
    freq: number,
    dur: number,
    type: OscillatorType = 'square',
    delay = 0,
    slideTo?: number,
    vol = 1,
  ) {
    const g0 = this.sfxGain(kind) * vol;
    if (g0 <= 0 || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(g0, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.01);
  }

  // UI Sounds
  click() {
    this.tone('ui', 660, 0.04, 'square', 0, 880, 0.5);
  }
  coin() {
    this.tone('ui', 988, 0.05, 'square', 0, undefined, 0.5);
    this.tone('ui', 1319, 0.09, 'square', 0.05, undefined, 0.5);
  }
  chest() {
    [392, 494, 587, 784, 988].forEach((f, i) =>
      this.tone('ui', f, 0.09, 'triangle', i * 0.06, undefined, 0.85),
    );
  }
  levelUp() {
    [440, 554, 659, 880, 1109].forEach((f, i) =>
      this.tone('ui', f, 0.09, 'square', i * 0.05, undefined, 0.85),
    );
  }

  // Fishing & Catch Sounds
  cast() {
    this.tone('fish', 420, 0.08, 'triangle', 0, 180, 0.6);
  }
  bite() {
    this.tone('fish', 587, 0.06, 'square', 0, undefined, 0.8);
    this.tone('fish', 880, 0.09, 'square', 0.06, undefined, 0.9);
  }
  perfect() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone('fish', f, 0.07, 'square', i * 0.045, undefined, 0.8),
    );
  }
  good() {
    this.tone('fish', 523, 0.06, 'square', 0, undefined, 0.7);
    this.tone('fish', 659, 0.08, 'square', 0.05, undefined, 0.7);
  }
  miss() {
    this.tone('fish', 240, 0.12, 'sawtooth', 0, 110, 0.7);
  }
  catchRarity(rarityIdx: number) {
    if (rarityIdx <= 1) {
      this.tone('fish', 440 + rarityIdx * 80, 0.07, 'triangle', 0, 560, 0.5);
    } else if (rarityIdx === 2) {
      [440, 554, 659].forEach((f, i) =>
        this.tone('fish', f, 0.08, 'square', i * 0.05, undefined, 0.7),
      );
    } else if (rarityIdx === 3) {
      [440, 554, 659, 880].forEach((f, i) =>
        this.tone('fish', f, 0.09, 'square', i * 0.055, undefined, 0.85),
      );
    } else {
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
        this.tone('fish', f, 0.1, 'square', i * 0.055, undefined, 1),
      );
    }
  }
  jackpot() {
    [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) =>
      this.tone('fish', f, 0.09, 'square', i * 0.05, undefined, 1),
    );
  }
  bossHit() {
    this.tone('fish', 180, 0.05, 'sawtooth', 0, 90, 0.7);
  }
}

export const sfx = new SoundEngine();

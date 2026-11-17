import { getState } from './state';

/**
 * Tiny chiptune SFX synthesizer using the WebAudio API.
 * Off by default until the player's first pointer/key interaction.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private unlocked = false;

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC && !this.ctx) this.ctx = new AC();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      // WebAudio unavailable
    }
  }

  private gain(): number {
    const s = getState().settings;
    if (!this.unlocked || s.muted || s.volume <= 0) return 0;
    return s.volume * 0.22;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', delay = 0, slideTo?: number, vol = 1) {
    const g0 = this.gain() * vol;
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

  click() {
    this.tone(660, 0.04, 'square', 0, 880, 0.5);
  }
  cast() {
    this.tone(420, 0.08, 'triangle', 0, 180, 0.6);
  }
  bite() {
    this.tone(587, 0.06, 'square', 0, undefined, 0.8);
    this.tone(880, 0.09, 'square', 0.06, undefined, 0.9);
  }
  perfect() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.07, 'square', i * 0.045, undefined, 0.8));
  }
  good() {
    this.tone(523, 0.06, 'square', 0, undefined, 0.7);
    this.tone(659, 0.08, 'square', 0.05, undefined, 0.7);
  }
  miss() {
    this.tone(240, 0.12, 'sawtooth', 0, 110, 0.7);
  }
  catchRarity(rarityIdx: number) {
    if (rarityIdx <= 1) {
      this.tone(440 + rarityIdx * 80, 0.07, 'triangle', 0, 560, 0.5);
    } else if (rarityIdx === 2) {
      [440, 554, 659].forEach((f, i) => this.tone(f, 0.08, 'square', i * 0.05, undefined, 0.7));
    } else if (rarityIdx === 3) {
      [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.09, 'square', i * 0.055, undefined, 0.85));
    } else {
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', i * 0.055, undefined, 1));
    }
  }
  jackpot() {
    [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) =>
      this.tone(f, 0.09, 'square', i * 0.05, undefined, 1),
    );
  }
  coin() {
    this.tone(988, 0.05, 'square', 0, undefined, 0.5);
    this.tone(1319, 0.09, 'square', 0.05, undefined, 0.5);
  }
  chest() {
    [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, 0.09, 'triangle', i * 0.06, undefined, 0.85));
  }
  bossHit() {
    this.tone(180, 0.05, 'sawtooth', 0, 90, 0.7);
  }
  levelUp() {
    [440, 554, 659, 880, 1109].forEach((f, i) => this.tone(f, 0.09, 'square', i * 0.05, undefined, 0.85));
  }
}

export const sfx = new SoundEngine();

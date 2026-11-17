const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Abbreviated, safe number formatting: 1.2K, 3.4M, 5.6e12 style for huge values. */
export function fmt(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '0';
  if (n < 0) return '-' + fmt(-n, digits);
  if (n < 1000) {
    if (n < 10 && n % 1 !== 0) return n.toFixed(digits);
    return Math.floor(n).toString();
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIXES.length) {
    const scaled = n / Math.pow(1000, tier);
    const d = scaled >= 100 ? 0 : digits;
    return scaled.toFixed(d).replace(/\.0+$/, '') + SUFFIXES[tier];
  }
  return n.toExponential(1).replace('+', '');
}

export const fmtInt = (n: number) => (n < 1e6 ? Math.floor(n).toLocaleString('en-US') : fmt(n));

export function fmtPct(p: number, digits = 2): string {
  const v = p * 100;
  if (v === 0) return '0%';
  if (v < 0.01) return v.toExponential(1) + '%';
  if (v < 1) return v.toFixed(Math.max(digits, 2)) + '%';
  return v.toFixed(digits > 1 ? 1 : digits) + '%';
}

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export const fmtMult = (m: number) => 'x' + (m >= 100 ? fmt(m) : m >= 10 ? m.toFixed(1) : m.toFixed(2).replace(/0$/, ''));

/** Clamp a number and squash NaN/Infinity into something safe. */
export function safe(n: number, fallback = 0, max = 1e300): number {
  if (!Number.isFinite(n) || Number.isNaN(n)) return fallback;
  return Math.min(n, max);
}

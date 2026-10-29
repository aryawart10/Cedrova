/* Deterministic pseudo-market-data.
   Everything is seeded so a given symbol always renders the same chart,
   which means no backend and no flicker between navigations. */

export type Candle = {
  t: number; // epoch ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

/** mulberry32 — small, fast, stable across runs. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Geometric random walk with mild trend + volatility clustering. */
export function buildCandles(
  symbol: string,
  opts: { bars: number; start: number; drift?: number; vol?: number; stepMs?: number },
): Candle[] {
  const { bars, start, drift = 0.0004, vol = 0.013, stepMs = 86_400_000 } = opts;
  const r = rng(seedFrom(symbol));
  const out: Candle[] = [];
  let price = start;
  let localVol = vol;
  // end the series "today" so the x-axis reads naturally
  const t0 = Date.UTC(2026, 9, 29) - (bars - 1) * stepMs;

  for (let i = 0; i < bars; i++) {
    // volatility clusters: drift the vol itself, clamped
    localVol = Math.min(vol * 2.1, Math.max(vol * 0.45, localVol * (0.94 + r() * 0.13)));
    const shock = (r() + r() + r() - 1.5) / 1.5; // ~normal, bounded
    const open = price;
    const close = open * (1 + drift + shock * localVol);
    const wick = Math.abs(shock) * localVol * open * 0.9 + open * localVol * 0.25;
    const high = Math.max(open, close) + wick * r();
    const low = Math.min(open, close) - wick * r();
    out.push({
      t: t0 + i * stepMs,
      o: round2(open),
      h: round2(high),
      l: round2(Math.max(low, 1)),
      c: round2(close),
      v: Math.round(240_000 + r() * 2_600_000 * (1 + Math.abs(shock))),
    });
    price = close;
  }
  return out;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/* ── transforms ─────────────────────────────────────────── */

export function closes(c: Candle[]) {
  return c.map((d) => d.c);
}

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [null];
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = Math.max(d, 0);
    const l = Math.max(-d, 0);
    if (i <= period) {
      gain += g / period;
      loss += l / period;
      out.push(i === period ? 100 - 100 / (1 + gain / (loss || 1e-9)) : null);
    } else {
      gain = (gain * (period - 1) + g) / period;
      loss = (loss * (period - 1) + l) / period;
      out.push(100 - 100 / (1 + gain / (loss || 1e-9)));
    }
  }
  return out;
}

export function extent(values: (number | null)[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v == null || Number.isNaN(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (lo === Infinity) return [0, 1];
  return [lo, hi];
}

/** Build an SVG path through points, optionally smoothed with a monotone-ish cubic. */
export function linePath(pts: [number, number][], smooth = true): string {
  if (!pts.length) return '';
  if (pts.length < 3 || !smooth) {
    return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  }
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

/** Equity curve from a CAGR + drawdown profile — used by backtest cards. */
export function buildEquityCurve(seed: string, bars: number, cagr: number, noise: number) {
  const r = rng(seedFrom(seed));
  const perBar = Math.pow(1 + cagr, 1 / 252) - 1;
  const out: number[] = [100];
  for (let i = 1; i < bars; i++) {
    const shock = (r() + r() + r() - 1.5) / 1.5;
    out.push(Math.max(8, out[i - 1] * (1 + perBar + shock * noise)));
  }
  return out;
}

export function maxDrawdown(curve: number[]) {
  let peak = -Infinity;
  let worst = 0;
  for (const v of curve) {
    peak = Math.max(peak, v);
    worst = Math.min(worst, v / peak - 1);
  }
  return worst;
}

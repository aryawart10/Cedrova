import { quoteFor } from './market';

export type Holding = {
  symbol: string;
  qty: number;
  avg: number;
  broker: 'Zerodha' | 'Groww' | 'Upstox';
  sinceDays: number;
  source: string;
};

export const HOLDINGS: Holding[] = [
  { symbol: 'RELIANCE', qty: 92, avg: 2512.4, broker: 'Zerodha', sinceDays: 418, source: 'Equity Research note, Mar 2025' },
  { symbol: 'HDFCBANK', qty: 180, avg: 1498.2, broker: 'Zerodha', sinceDays: 286, source: 'Manual' },
  { symbol: 'TCS', qty: 48, avg: 4186.0, broker: 'Zerodha', sinceDays: 164, source: 'Manual' },
  { symbol: 'TATAMOTORS', qty: 140, avg: 902.6, broker: 'Zerodha', sinceDays: 22, source: 'Cross-sectional Momentum 100' },
  { symbol: 'LT', qty: 36, avg: 3402.0, broker: 'Zerodha', sinceDays: 22, source: 'Cross-sectional Momentum 100' },
  { symbol: 'BHARTIARTL', qty: 110, avg: 1402.5, broker: 'Groww', sinceDays: 212, source: 'Manual' },
  { symbol: 'ICICIBANK', qty: 210, avg: 1246.8, broker: 'Groww', sinceDays: 1, source: 'Bank Nifty Mean Reversion' },
  { symbol: 'SUNPHARMA', qty: 45, avg: 1612.0, broker: 'Zerodha', sinceDays: 96, source: 'Screener Composer shortlist' },
  { symbol: 'ITC', qty: 420, avg: 441.3, broker: 'Upstox', sinceDays: 540, source: 'Manual' },
  { symbol: 'ZOMATO', qty: 600, avg: 214.8, broker: 'Upstox', sinceDays: 332, source: 'Manual' },
];

export type HoldingRow = Holding & {
  name: string;
  sector: string;
  last: number;
  value: number;
  invested: number;
  pnl: number;
  pnlPct: number;
  dayChangePct: number;
  spark: number[];
};

export function holdingRows(): HoldingRow[] {
  return HOLDINGS.map((h) => {
    const q = quoteFor(h.symbol);
    const value = q.last * h.qty;
    const invested = h.avg * h.qty;
    return {
      ...h,
      name: q.inst.name,
      sector: q.inst.sector,
      last: q.last,
      value,
      invested,
      pnl: value - invested,
      pnlPct: (value / invested - 1) * 100,
      dayChangePct: q.changePct,
      spark: q.spark,
    };
  }).sort((a, b) => b.value - a.value);
}

export function portfolioSummary() {
  const rows = holdingRows();
  const value = rows.reduce((s, r) => s + r.value, 0);
  const invested = rows.reduce((s, r) => s + r.invested, 0);
  const dayPnl = rows.reduce((s, r) => s + r.value * (r.dayChangePct / 100), 0);
  return {
    rows,
    value,
    invested,
    pnl: value - invested,
    pnlPct: (value / invested - 1) * 100,
    dayPnl,
    dayPnlPct: (dayPnl / value) * 100,
    cash: 1_84_200,
  };
}

export function sectorAllocation() {
  const rows = holdingRows();
  const total = rows.reduce((s, r) => s + r.value, 0);
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.sector, (map.get(r.sector) ?? 0) + r.value);
  return [...map.entries()]
    .map(([sector, value]) => ({ sector, value, share: value / total }))
    .sort((a, b) => b.value - a.value);
}

/* ── What the Risk Auditor flagged on this specific book ── */

export type RiskFinding = {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  action: string;
};

export const RISK_FINDINGS: RiskFinding[] = [
  {
    severity: 'high',
    title: 'Three positions, one bet',
    detail:
      'HDFC Bank, ICICI Bank and ITC move together far more than their sector labels suggest: pairwise correlation above 0.78 over the last 250 sessions. Combined, they are 38% of the book, so the effective concentration is closer to a single 38% position than three diversified ones.',
    action: 'Trim the cluster to 24% or hedge with a Bank Nifty put spread',
  },
  {
    severity: 'medium',
    title: 'Momentum sleeve is running hot',
    detail:
      'Tata Motors and L&T entered 22 days ago via the momentum strategy and are both up more than 11%. Realised volatility on the sleeve is 26% against a 14% target, so position sizes are now larger in risk terms than intended.',
    action: 'Re-run volatility targeting and cut both to the 14% budget',
  },
  {
    severity: 'medium',
    title: 'Stop losses unmanaged overnight on Groww',
    detail:
      'The Groww adapter has no GTT endpoint, so the two positions held there carry no resting stop outside market hours. A gap-down open would be unprotected.',
    action: 'Move Groww positions to Zerodha or Dhan, or accept the gap risk explicitly',
  },
  {
    severity: 'low',
    title: 'Short-term gains approaching',
    detail:
      'Zomato crosses the 365-day mark in 33 days. Selling now realises \u20B932,000 at the 20% short-term rate instead of 12.5% long-term.',
    action: 'Defer any exit on Zomato past 1 Dec 2026 unless the thesis breaks',
  },
  {
    severity: 'low',
    title: 'Cash drag',
    detail:
      '\u20B91.84 L has been uninvested for 19 days. At the current overnight rate that is roughly \u20B9700 of foregone yield.',
    action: 'Sweep idle cash into a liquid ETF between rebalances',
  },
];

/* ── Stress replay ─────────────────────────────────────── */

export const STRESS_SCENARIOS = [
  { name: 'Mar 2020 — pandemic crash', nifty: -38.4, book: -41.2, days: 33 },
  { name: 'Oct 2021 — midcap unwind', nifty: -10.8, book: -14.6, days: 61 },
  { name: 'Jun 2022 — rate shock', nifty: -16.2, book: -13.1, days: 88 },
  { name: 'Feb 2023 — financials stress', nifty: -7.4, book: -11.9, days: 24 },
  { name: 'Jan 2008 — credit crisis', nifty: -52.6, book: -49.8, days: 364 },
];

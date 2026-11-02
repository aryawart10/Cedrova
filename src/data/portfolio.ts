import { quoteFor } from './market';

/** Scope for every figure on the Portfolio module. null means all accounts. */
export type Scope = string | null;

export type Holding = {
  symbol: string;
  qty: number;
  avg: number;
  /** Matches Broker.id, so holdings and connections are the same object graph. */
  brokerId: string;
  sinceDays: number;
  source: string;
};

export const HOLDINGS: Holding[] = [
  { symbol: 'RELIANCE', qty: 92, avg: 2512.4, brokerId: 'zerodha', sinceDays: 418, source: 'Equity Research note, Mar 2025' },
  { symbol: 'HDFCBANK', qty: 180, avg: 1498.2, brokerId: 'zerodha', sinceDays: 286, source: 'Manual' },
  { symbol: 'TCS', qty: 48, avg: 4186.0, brokerId: 'zerodha', sinceDays: 164, source: 'Manual' },
  { symbol: 'TATAMOTORS', qty: 140, avg: 902.6, brokerId: 'zerodha', sinceDays: 22, source: 'Cross-sectional Momentum 100' },
  { symbol: 'LT', qty: 36, avg: 3402.0, brokerId: 'zerodha', sinceDays: 22, source: 'Cross-sectional Momentum 100' },
  { symbol: 'BHARTIARTL', qty: 110, avg: 1402.5, brokerId: 'groww', sinceDays: 212, source: 'Manual' },
  { symbol: 'ICICIBANK', qty: 210, avg: 1246.8, brokerId: 'groww', sinceDays: 1, source: 'Bank Nifty Mean Reversion' },
  { symbol: 'SUNPHARMA', qty: 45, avg: 1612.0, brokerId: 'zerodha', sinceDays: 96, source: 'Screener Composer shortlist' },
  { symbol: 'ITC', qty: 420, avg: 441.3, brokerId: 'upstox', sinceDays: 540, source: 'Manual' },
  { symbol: 'ZOMATO', qty: 600, avg: 214.8, brokerId: 'upstox', sinceDays: 332, source: 'Manual' },
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

export function holdingRows(scope: Scope = null): HoldingRow[] {
  return HOLDINGS.filter((h) => !scope || h.brokerId === scope).map((h) => {
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

/** Idle cash sits at the broker, so it scopes like everything else. */
export const CASH_BY_BROKER: Record<string, number> = {
  zerodha: 1_12_400,
  groww: 48_900,
  upstox: 22_900,
};

export function cashFor(scope: Scope = null): number {
  if (scope) return CASH_BY_BROKER[scope] ?? 0;
  return Object.values(CASH_BY_BROKER).reduce((a, b) => a + b, 0);
}

export function portfolioSummary(scope: Scope = null) {
  const rows = holdingRows(scope);
  const value = rows.reduce((s, r) => s + r.value, 0);
  const invested = rows.reduce((s, r) => s + r.invested, 0);
  const dayPnl = rows.reduce((s, r) => s + r.value * (r.dayChangePct / 100), 0);
  return {
    rows,
    value,
    invested,
    pnl: value - invested,
    pnlPct: invested > 0 ? (value / invested - 1) * 100 : 0,
    dayPnl,
    dayPnlPct: value > 0 ? (dayPnl / value) * 100 : 0,
    cash: cashFor(scope),
  };
}

export function sectorAllocation(scope: Scope = null) {
  const rows = holdingRows(scope);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.sector, (map.get(r.sector) ?? 0) + r.value);
  return [...map.entries()]
    .map(([sector, value]) => ({ sector, value, share: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

/* ── What the Risk Auditor flagged on this specific book ── */

export type RiskFinding = {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  action: string;
  /** Broker ids this finding touches. More than one means it cannot be
      fixed inside a single account, which the UI says out loud. */
  accounts: string[];
};

export const RISK_FINDINGS: RiskFinding[] = [
  {
    severity: 'high',
    title: 'Three positions, one bet',
    detail:
      'HDFC Bank, ICICI Bank and ITC move together far more than their sector labels suggest: pairwise correlation above 0.78 over the last 250 sessions. Combined, they are 38% of the book, so the effective concentration is closer to a single 38% position than three diversified ones.',
    action: 'Trim the cluster to 24% or hedge with a Bank Nifty put spread',
    accounts: ['zerodha', 'groww', 'upstox'],
  },
  {
    severity: 'medium',
    title: 'Momentum sleeve is running hot',
    detail:
      'Tata Motors and L&T entered 22 days ago via the momentum strategy and are both up more than 11%. Realised volatility on the sleeve is 26% against a 14% target, so position sizes are now larger in risk terms than intended.',
    action: 'Re-run volatility targeting and cut both to the 14% budget',
    accounts: ['zerodha'],
  },
  {
    severity: 'medium',
    title: 'Stop losses unmanaged overnight on Groww',
    detail:
      'The Groww adapter has no GTT endpoint, so the two positions held there carry no resting stop outside market hours. A gap-down open would be unprotected.',
    action: 'Move Groww positions to Zerodha or Dhan, or accept the gap risk explicitly',
    accounts: ['groww'],
  },
  {
    severity: 'low',
    title: 'Short-term gains approaching',
    detail:
      'Zomato crosses the 365-day mark in 33 days. Selling now realises \u20B932,000 at the 20% short-term rate instead of 12.5% long-term.',
    action: 'Defer any exit on Zomato past 1 Dec 2026 unless the thesis breaks',
    accounts: ['upstox'],
  },
  {
    severity: 'low',
    title: 'Cash drag',
    detail:
      'Idle cash has sat uninvested across all three accounts for 19 days. At the current overnight rate that is roughly \u20B9700 of foregone yield.',
    action: 'Sweep idle cash into a liquid ETF between rebalances',
    accounts: ['zerodha', 'groww', 'upstox'],
  },
];

/** Findings relevant to a scope, plus whether each one spills outside it. */
export function findingsFor(scope: Scope = null) {
  return RISK_FINDINGS.filter((f) => !scope || f.accounts.includes(scope)).map((f) => ({
    ...f,
    crossAccount: f.accounts.length > 1,
  }));
}

/* ── Stress replay ─────────────────────── */

/* Peak-to-trough sector returns for each window. The book leg is the
   value-weighted sum of these over whatever is in scope, so filtering to
   one broker changes the number honestly instead of reprinting the
   whole-book figure under a different heading. */
type SectorShock = Record<string, number>;

export type StressScenario = {
  name: string;
  nifty: number;
  days: number;
  sectors: SectorShock;
};

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    name: 'Mar 2020 — pandemic crash',
    nifty: -38.4,
    days: 33,
    sectors: {
      Banking: -48.2,
      Automobile: -46.1,
      Infrastructure: -45.3,
      Energy: -37.6,
      'Consumer Tech': -34.8,
      Telecom: -24.2,
      'IT Services': -27.4,
      FMCG: -19.6,
      Pharma: -12.1,
    },
  },
  {
    name: 'Oct 2021 — midcap unwind',
    nifty: -10.8,
    days: 61,
    sectors: {
      'Consumer Tech': -34.2,
      Automobile: -14.6,
      Infrastructure: -13.8,
      Banking: -11.2,
      Energy: -9.4,
      'IT Services': -8.1,
      Telecom: -6.2,
      FMCG: -5.4,
      Pharma: -7.8,
    },
  },
  {
    name: 'Jun 2022 — rate shock',
    nifty: -16.2,
    days: 88,
    sectors: {
      'IT Services': -26.4,
      'Consumer Tech': -38.6,
      Banking: -14.1,
      Automobile: -11.2,
      Infrastructure: -15.6,
      Energy: -12.8,
      Telecom: -8.4,
      FMCG: -4.2,
      Pharma: -9.6,
    },
  },
  {
    name: 'Feb 2023 — financials stress',
    nifty: -7.4,
    days: 24,
    sectors: {
      Banking: -14.8,
      Infrastructure: -9.2,
      Energy: -16.4,
      Automobile: -6.1,
      'Consumer Tech': -8.6,
      'IT Services': -4.2,
      Telecom: -5.1,
      FMCG: -2.8,
      Pharma: -3.4,
    },
  },
  {
    name: 'Jan 2008 — credit crisis',
    nifty: -52.6,
    days: 364,
    sectors: {
      Infrastructure: -72.4,
      Banking: -58.1,
      Automobile: -56.2,
      Energy: -48.6,
      'Consumer Tech': -54.0,
      'IT Services': -42.8,
      Telecom: -38.4,
      FMCG: -22.6,
      Pharma: -24.1,
    },
  },
];

export type StressRow = {
  name: string;
  nifty: number;
  days: number;
  book: number;
  /** Loss in rupees on the book in scope, which is what the figure actually costs. */
  rupees: number;
  /** Sector carrying the most of the loss. */
  worstSector: string | null;
};

export function stressReplay(scope: Scope = null): StressRow[] {
  const alloc = sectorAllocation(scope);
  const total = alloc.reduce((a, b) => a + b.value, 0);

  return STRESS_SCENARIOS.map((sc) => {
    if (total === 0)
      return { name: sc.name, nifty: sc.nifty, days: sc.days, book: 0, rupees: 0, worstSector: null };

    let loss = 0;
    let worst = { sector: alloc[0]?.sector ?? null, rupees: 0 };
    for (const a of alloc) {
      const shock = sc.sectors[a.sector] ?? sc.nifty;
      const rupees = a.value * (shock / 100);
      loss += rupees;
      if (rupees < worst.rupees) worst = { sector: a.sector, rupees };
    }
    return {
      name: sc.name,
      nifty: sc.nifty,
      days: sc.days,
      book: (loss / total) * 100,
      rupees: loss,
      worstSector: worst.sector,
    };
  });
}

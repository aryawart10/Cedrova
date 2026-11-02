import { buildEquityCurve, maxDrawdown } from '../lib/series';

export type StrategyStatus = 'live' | 'paper' | 'draft' | 'retired';

export type Strategy = {
  id: string;
  name: string;
  author: 'you' | 'Cedrova' | string;
  thesis: string;
  universe: string;
  signal: string;
  rebalance: string;
  status: StrategyStatus;
  createdBy: string;
  deployedOn?: string;
  capital?: number;
  cagr: number;
  noise: number;
  sharpe: number;
  winRate: number;
  trades: number;
  exposure: string;
  /** Honest caveats the backtest agent attached. */
  caveats: string[];
};

export const STRATEGIES: Strategy[] = [
  {
    id: 'str-momentum-100',
    name: 'Cross-sectional Momentum 100',
    author: 'you',
    thesis:
      'Twelve-month winners in liquid large caps keep winning for roughly a quarter. Skip the most recent month to avoid short-term reversal.',
    universe: 'NIFTY 100',
    signal: '12-1 momentum, top decile',
    rebalance: 'Monthly, last Thursday',
    status: 'live',
    createdBy: 'Trading Strategy Maker',
    deployedOn: 'Zerodha Kite',
    capital: 8_50_000,
    cagr: 0.244,
    noise: 0.0112,
    sharpe: 1.31,
    winRate: 0.56,
    trades: 412,
    exposure: '95-100% long',
    caveats: [
      'Return is concentrated: removing FY21 drops CAGR to 17.8%.',
      'Assumes 12 bps round-trip cost. At 25 bps the Sharpe falls to 1.04.',
    ],
  },
  {
    id: 'str-bank-reversion',
    name: 'Bank Nifty Mean Reversion',
    author: 'you',
    thesis:
      'Private bank names overshoot on index-driven flows. A two-sigma dislocation against the sector mean reverts within three sessions more often than not.',
    universe: 'Bank & NBFC basket',
    signal: 'Z-score < \u22122 on 20-day residual',
    rebalance: 'Daily at 09:20',
    status: 'paper',
    createdBy: 'Trading Strategy Maker',
    capital: 2_00_000,
    cagr: 0.186,
    noise: 0.0094,
    sharpe: 1.52,
    winRate: 0.63,
    trades: 1_186,
    exposure: '0-40% long, market neutral by design',
    caveats: [
      'Edge decays sharply after 2022 \u2014 last 24 months contribute only 21% of total P&L.',
      'Sensitive to the 3-day time stop. At 5 days the Sharpe halves.',
    ],
  },
  {
    id: 'str-trend-overlay',
    name: 'Index Trend Overlay',
    author: 'Cedrova',
    thesis:
      'Hold the broad market only while it is above its 200-day average. The point is not extra return, it is cutting the left tail.',
    universe: 'NIFTY 50 ETF',
    signal: 'Price > 200 DMA, 2-day confirmation',
    rebalance: 'Weekly',
    status: 'live',
    createdBy: 'Cedrova template library',
    deployedOn: 'Groww',
    capital: 12_00_000,
    cagr: 0.138,
    noise: 0.0071,
    sharpe: 1.08,
    winRate: 0.48,
    trades: 86,
    exposure: '0% or 100%',
    caveats: [
      'Underperforms buy-and-hold in sustained bull phases by design.',
      'Whipsaw cost in 2015 and 2018 was 7 round trips for no net gain.',
    ],
  },
  {
    id: 'str-quality-midcap',
    name: 'Quality Midcap Accumulation',
    author: 'you',
    thesis:
      'Midcaps with high ROCE and falling debt compound faster than the index, but only when the broad market trend is intact. Gate the entries on the index.',
    universe: 'NIFTY Midcap 150',
    signal: 'Quality composite, top quintile + index filter',
    rebalance: 'Quarterly',
    status: 'draft',
    createdBy: 'Trading Strategy Maker',
    cagr: 0.291,
    noise: 0.0148,
    sharpe: 1.19,
    winRate: 0.59,
    trades: 164,
    exposure: '0-100% long',
    caveats: [
      'Not yet walk-forward validated. Treat the curve as in-sample.',
      'Midcap impact cost at \u20B925L capital is materially higher than modelled.',
    ],
  },
  {
    id: 'str-pairs-it',
    name: 'IT Pairs: TCS / Infosys',
    author: 'you',
    thesis:
      'Two businesses with near-identical revenue drivers trade apart on sentiment. The spread is stationary enough to trade, with far less market risk than either leg.',
    universe: 'TCS, INFY',
    signal: 'Spread z-score, 60-day lookback',
    rebalance: 'Intraday monitoring',
    status: 'retired',
    createdBy: 'Trading Strategy Maker',
    cagr: 0.072,
    noise: 0.0048,
    sharpe: 0.61,
    winRate: 0.54,
    trades: 298,
    exposure: 'Market neutral',
    caveats: [
      'Retired: cointegration broke after the 2024 deal-win divergence.',
      'Short leg borrow cost was not modelled and is material.',
    ],
  },
];

export type StrategyMetrics = {
  curve: number[];
  benchmark: number[];
  maxDD: number;
  totalReturn: number;
};

const metricCache = new Map<string, StrategyMetrics>();

export function metricsFor(s: Strategy, bars = 756): StrategyMetrics {
  const hit = metricCache.get(s.id);
  if (hit) return hit;
  const curve = buildEquityCurve(s.id, bars, s.cagr, s.noise);
  const benchmark = buildEquityCurve('nifty-benchmark', bars, 0.132, 0.0086);
  const m: StrategyMetrics = {
    curve,
    benchmark,
    maxDD: maxDrawdown(curve),
    totalReturn: curve[curve.length - 1] / curve[0] - 1,
  };
  metricCache.set(s.id, m);
  return m;
}

export const STATUS_COPY: Record<StrategyStatus, string> = {
  live: 'Executing with real capital',
  paper: 'Simulated fills, no capital at risk',
  draft: 'Not validated, not deployed',
  retired: 'Stopped, kept for the record',
};

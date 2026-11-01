/* ──────────────────────────────────────────────────────────────
   Hardcoded research payloads for the prompt bar.

   Every number here comes from one illustrative engine covering
   Apr 2010 – Oct 2026, after Indian costs and tax. Nothing is fetched.
   Swap these objects for API responses later; the components do not
   care where the data came from.
   ────────────────────────────────────────────────────────────── */

export const BACKTEST_PERIOD = 'Apr 2010 \u2013 Oct 2026';
export const BACKTEST_YEARS = 16.5;

/* ── The two questions asked before any strategy work ───────── */

export const CAPITAL_PRESETS = [100000, 500000, 1000000, 5000000];
export const RISK_PRESETS = [10, 15, 20, 30];

/* ── Strategy ideas offered once capital and risk are known ─── */

export type StrategyIdea = {
  id: string;
  name: string;
  oneLine: string;
  horizon: string;
  turnover: string;
  fitsRisk: boolean;
  fitNote: string;
  verdictHint: 'fails' | 'marginal' | 'passes';
};

export const STRATEGY_IDEAS: StrategyIdea[] = [
  {
    id: 'mean-reversion',
    name: 'Mean reversion in quality stocks',
    oneLine:
      'Every 5 trading days, buy the 15 profitable, high-ROE NIFTY 100 stocks that fell most over the last 5 days. Sell 5 trading days later.',
    horizon: '5 trading days',
    turnover: '~2,400% a year',
    fitsRisk: false,
    fitNote: 'Fits your loss limit only if 54% stays in a liquid fund, which drags the return to 8.3% a year.',
    verdictHint: 'fails',
  },
  {
    id: 'dip-uptrend',
    name: 'Buy the dip inside an uptrend',
    oneLine:
      'Buy NIFTY 100 names trading above their 200-day average that have fallen 4% or more in three days. Hold 10 trading days.',
    horizon: '10 trading days',
    turnover: '~900% a year',
    fitsRisk: true,
    fitNote: 'Sits inside your loss limit on its own, no cash buffer needed.',
    verdictHint: 'marginal',
  },
  {
    id: 'quality-momentum',
    name: 'Quality momentum, monthly',
    oneLine:
      'Hold the 20 NIFTY 100 names with the best 12-month return and positive 3-year earnings growth. Rebalance monthly.',
    horizon: '1 month',
    turnover: '~310% a year',
    fitsRisk: true,
    fitNote: 'Lowest turnover of the three, so costs eat the least.',
    verdictHint: 'passes',
  },
];

/* ── The full answer for the mean-reversion idea ────────────── */

export type Rule = { step: string; why: string };

export const MR_IDEA =
  'Strong companies sometimes drop for a few days for reasons that have nothing to do with the business: a big fund selling in a hurry, a scary headline, a bad day for the whole market. Once that selling stops, the price usually climbs back. This strategy tries to catch that bounce. Every 5 trading days, it buys the 15 healthy companies that fell the most, and sells them 5 trading days later, win or lose.';

export const MR_RULES: Rule[] = [
  {
    step: 'Start with the NIFTY 100, India\u2019s 100 largest listed companies.',
    why: 'These are the most heavily traded stocks in India, so your orders fill quickly at a fair price and you can always buy or sell when you need to.',
  },
  {
    step: 'Keep only companies that made a profit in each of the last four quarters and earn a return on equity above 15%.',
    why: 'A company that is actually profitable is far more likely to recover from a short drop than one that is losing money, where the fall may be the market seeing something real.',
  },
  {
    step: 'Measure how much each remaining company fell over the last 5 trading days.',
    why: 'Five days is long enough for panic selling to show up, but short enough that the business itself has not changed.',
  },
  {
    step: 'Buy the 15 that fell the most, putting the same rupee amount into each.',
    why: 'Fifteen names spread the risk so one bad surprise cannot sink the month. Equal amounts stop a single large company from dominating the result.',
  },
  {
    step: 'Sell every position exactly 5 trading days later, win or lose.',
    why: 'A fixed exit removes the hardest decision from your hands. The bounce, when it happens, usually happens quickly; holding longer just adds market risk.',
  },
  {
    step: 'Repeat on the same 5-day cycle, always fully invested.',
    why: 'A steady cycle means you are not trying to time when to start, which is where most discretionary versions of this idea fall apart.',
  },
];

export type ExampleLeg = { symbol: string; fall: number; entry: number; exit: number };

export const MR_EXAMPLE: { date: string; legs: ExampleLeg[] } = {
  date: '14 Mar 2026',
  legs: [
    { symbol: 'TATAMOTORS', fall: -9.4, entry: 712.4, exit: 758.2 },
    { symbol: 'HINDALCO', fall: -8.1, entry: 618.9, exit: 641.0 },
    { symbol: 'BAJFINANCE', fall: -7.6, entry: 6842.0, exit: 6701.5 },
    { symbol: 'TECHM', fall: -7.2, entry: 1402.3, exit: 1455.8 },
    { symbol: 'ADANIPORTS', fall: -6.9, entry: 1188.0, exit: 1149.2 },
  ],
};

/* ── The nine research steps, each owned by a desk ───────────── */

export type ResearchStep = {
  no: number;
  desk: 'Equity research' | 'F&O research' | 'Macro' | 'Strategy builder' | 'Quant' | 'Execution';
  title: string;
  finding: string;
  detail: string;
  tone: 'ok' | 'warn' | 'bad';
};

export const MR_STEPS: ResearchStep[] = [
  {
    no: 1,
    desk: 'Quant',
    title: 'Checked the data before trusting it',
    finding: '4,082 trading days, 138 names, 11 index exits included',
    detail:
      'Stocks that were later dropped from the NIFTY 100 are kept in the test for the years they were in it. Leaving them out is the most common way a backtest flatters itself, because the index only keeps winners.',
    tone: 'ok',
  },
  {
    no: 2,
    desk: 'Strategy builder',
    title: 'Wrote the rules out in full',
    finding: '6 rules, no ambiguity left',
    detail:
      'Every threshold is fixed in advance: 5-day look-back, 15 names, equal weight, 5-day exit. Nothing is decided while the test is running.',
    tone: 'ok',
  },
  {
    no: 3,
    desk: 'Quant',
    title: 'Tested whether the signal predicts anything',
    finding: 'Weak but real: +0.38% average 5-day excess return',
    detail:
      'Sorting the NIFTY 100 into five buckets by 5-day fall, the worst bucket does beat the best by 0.38% over the following week. The pattern is in the right direction and survives a Newey-West t-stat of 2.1.',
    tone: 'ok',
  },
  {
    no: 4,
    desk: 'Equity research',
    title: 'Found out why the losers fell',
    finding: '31% of falls were company-specific bad news',
    detail:
      'Of 1,842 positions taken, 579 fell on a genuine company event: a profit warning, a regulatory action, a block deal by a promoter. These did not bounce. The rest fell on sector or market moves and did.',
    tone: 'warn',
  },
  {
    no: 5,
    desk: 'Quant',
    title: 'Ran the backtest after real costs',
    finding: '9.4% a year after costs and tax, against 11.3% for an index fund',
    detail:
      'Gross of everything the strategy earns 13.8% a year. Costs take 3.2 points and tax takes another 1.2, because every trade is short-term. The index fund is taxed once, at a lower rate, decades later.',
    tone: 'bad',
  },
  {
    no: 6,
    desk: 'Quant',
    title: 'Diagnosed where the money went',
    finding: 'Costs, not the signal, are the problem',
    detail:
      'At 2,400% turnover a year the strategy pays roughly 2.9% of capital annually in costs. The raw edge is 4.6% a year. Two thirds of it is consumed before it reaches you.',
    tone: 'bad',
  },
  {
    no: 7,
    desk: 'Strategy builder',
    title: 'Tested fixes one at a time',
    finding: 'Holding 21 days helps most, but not enough',
    detail:
      'Four fixes tested separately: hold longer, trade fewer names, skip earnings weeks, cap single-sector weight. Only the longer hold meaningfully improves things, lifting the return to 10.8% a year. It still loses to the index fund.',
    tone: 'warn',
  },
  {
    no: 8,
    desk: 'Quant',
    title: 'Checked whether the improvement is luck',
    finding: 'Probabilistic Sharpe 0.61 after adjusting for 14 versions tried',
    detail:
      'A block bootstrap of 10,000 resamples, penalised for the number of variants tested, puts the chance of a genuinely positive Sharpe at 61%. That is barely better than a coin toss.',
    tone: 'bad',
  },
  {
    no: 9,
    desk: 'Execution',
    title: 'Checked you could actually place these trades',
    finding: 'Yes up to about \u20B98 crore, with 0.18% slippage',
    detail:
      'At your capital the orders are a rounding error against daily volume. Execution is not what breaks this strategy.',
    tone: 'ok',
  },
];

/* ── Twelve headline metrics ────────────────────────────────── */

export type Metric = {
  key: string;
  label: string;
  value: string;
  bench?: string;
  help: string;
  tone: 'ok' | 'warn' | 'bad' | 'flat';
};

export const MR_METRICS: Metric[] = [
  { key: 'cagr', label: 'CAGR', value: '9.4%', bench: '11.3%', help: 'Average yearly growth, after costs and tax, smoothed over the whole period.', tone: 'bad' },
  { key: 'total', label: 'Total return', value: '+340%', bench: '+485%', help: 'Growth over the whole 16.5 years, not per year. +340% means \u20B910 lakh became \u20B944 lakh.', tone: 'bad' },
  { key: 'vol', label: 'Annualized volatility', value: '19.6%', bench: '16.4%', help: 'How much the account value swings in a typical year. Higher means a bumpier ride.', tone: 'warn' },
  { key: 'dd', label: 'Drawdown from peak', value: '\u221238.2%', bench: '\u221238.0%', help: 'The worst fall from the highest value the account had reached up to that point.', tone: 'warn' },
  { key: 'sharpe', label: 'Sharpe', value: '0.52', bench: '0.68', help: 'Return earned per unit of total volatility. Above 1.0 is good; below 0.5 is weak.', tone: 'bad' },
  { key: 'sortino', label: 'Sortino', value: '0.71', bench: '0.94', help: 'Like Sharpe but only counts downward volatility, which is the kind that actually hurts.', tone: 'bad' },
  { key: 'calmar', label: 'Calmar', value: '0.25', bench: '0.30', help: 'Yearly return divided by the worst drawdown. How much pain you took per unit of gain.', tone: 'bad' },
  { key: 'beta', label: 'Beta to NIFTY', value: '0.94', help: 'How much the strategy moves when the market moves. 0.94 means it tracks the market closely.', tone: 'flat' },
  { key: 'alpha', label: 'Alpha', value: '\u22121.8%', help: 'Return left over after accounting for market exposure. Negative means you were paid less than the risk deserved.', tone: 'bad' },
  { key: 'win', label: 'Win rate', value: '53.1%', help: 'Share of positions that made money. On its own this number means little without the payoff ratio.', tone: 'flat' },
  { key: 'pf', label: 'Profit factor', value: '1.08', help: 'Total rupees won divided by total rupees lost. 1.08 is uncomfortably close to breaking even.', tone: 'warn' },
  { key: 'costs', label: 'Costs a year', value: '2.9%', help: 'All-in trading costs as a share of capital: brokerage, STT, stamp duty, exchange and SEBI fees, GST, slippage, depository charges.', tone: 'bad' },
];

/* ── Cost and tax breakdown ─────────────────────────────────── */

export const COST_LINES = [
  { label: 'Slippage and impact', value: '1.42%' },
  { label: 'STT', value: '0.61%' },
  { label: 'Exchange transaction charges', value: '0.34%' },
  { label: 'Brokerage', value: '0.28%' },
  { label: 'Stamp duty', value: '0.11%' },
  { label: 'GST on charges', value: '0.09%' },
  { label: 'SEBI turnover fees', value: '0.03%' },
  { label: 'Depository charges', value: '0.02%' },
];

export const TAX_LINES = [
  { label: 'Short-term capital gains on the strategy', value: '20%' },
  { label: 'Slab rate on the liquid-fund portion', value: '30%' },
  { label: 'Long-term gains on the index fund, above \u20B91.25 lakh', value: '12.5%' },
];

/* ── Indian market stress tests ─────────────────────────────── */

export const STRESS_TESTS = [
  { name: '2011 euro-zone crisis', strategy: -24.1, bench: -27.4 },
  { name: '2013 taper tantrum', strategy: -16.8, bench: -14.2 },
  { name: '2015\u201316 China slowdown', strategy: -19.3, bench: -21.0 },
  { name: '2016 demonetisation', strategy: -11.2, bench: -9.6 },
  { name: '2018 IL&FS credit freeze', strategy: -17.9, bench: -14.8 },
  { name: '2020 Covid crash', strategy: -38.2, bench: -38.0 },
  { name: '2020 Covid recovery', strategy: 54.6, bench: 71.2 },
  { name: '2022 rate-hike cycle', strategy: -13.4, bench: -11.9 },
  { name: '2024\u201325 correction', strategy: -15.1, bench: -13.3 },
];

/* ── Parameter sensitivity: the same rule at nearby settings ── */

export const SENSITIVITY = {
  rowLabel: 'Holding period',
  colLabel: 'Look-back: the fall is measured over the last',
  rows: ['3 days', '5 days', '10 days', '21 days'],
  cols: ['3 days', '5 days', '10 days'],
  /** CAGR after costs and tax, percent. */
  grid: [
    [7.1, 8.2, 8.0],
    [8.6, 9.4, 9.1],
    [9.8, 10.2, 9.7],
    [10.4, 10.8, 10.1],
  ],
};

/* ── The verdict, deliberately decision-first ───────────────── */

export const MR_VERDICT = {
  call: 'no' as 'no' | 'yes' | 'maybe',
  headline: 'No, don\u2019t trade this strategy.',
  body:
    'Over Apr 2010 to Oct 2026 it returned 9.4% a year after Indian costs and tax. A NIFTY 50 index fund returned 11.3% over the same period with less turnover, fewer decisions and a lower tax bill. You would have taken a 38% drawdown to finish nearly 2 points a year behind a fund you can buy in one click.',
  fix:
    'Stretching the holding period to 21 trading days does improve it, to 10.8% a year, because it cuts turnover by about three quarters and so cuts costs. That is a real improvement and worth knowing. It is still behind the index fund, so it does not change the answer.',
  moneyline: { strategy: 4400000, bench: 5850000, fixed: 5440000, capital: 1000000 },
};

/* ── Smaller single-shot answers ────────────────────────────── */

export const SIGNAL_CHECK = {
  question: 'Does a sharp 5-day fall predict a bounce in NIFTY 100 names?',
  answer: 'Weakly yes, and the effect is real but small.',
  buckets: [
    { label: 'Fell most', fwd: 0.31 },
    { label: 'Bucket 2', fwd: 0.14 },
    { label: 'Bucket 3', fwd: 0.05 },
    { label: 'Bucket 4', fwd: -0.02 },
    { label: 'Rose most', fwd: -0.07 },
  ],
  stats: [
    { label: 'Average 5-day excess return, worst minus best', value: '+0.38%' },
    { label: 'Newey-West t-stat', value: '2.1' },
    { label: 'Share of 5-day windows positive', value: '54.2%' },
    { label: 'Monotonic across buckets', value: 'Yes' },
  ],
  caveat:
    'A 0.38% edge per week sounds usable until you price the trading. At the turnover this signal demands, costs are about 0.22% per round trip, which removes more than half of it.',
};

export const NEWS_DIAGNOSIS = [
  {
    symbol: 'TATAMOTORS',
    fall: -9.4,
    cause: 'Sector, not company',
    detail:
      'JLR volume data from a peer disappointed and the whole auto basket sold off. No company-specific news in the window. This is the kind of fall that tends to bounce.',
    tone: 'ok' as const,
  },
  {
    symbol: 'BAJFINANCE',
    fall: -7.6,
    cause: 'Company-specific',
    detail:
      'RBI flagged concerns on a digital lending product and the company withdrew it. This is a real change to the business, not a mood swing. Falls like this keep falling.',
    tone: 'bad' as const,
  },
  {
    symbol: 'HINDALCO',
    fall: -8.1,
    cause: 'Commodity cycle',
    detail:
      'LME aluminium fell 6% in the same window on Chinese demand data. The stock is doing exactly what its input price did. Mean reversion here is a bet on the commodity, not the company.',
    tone: 'warn' as const,
  },
  {
    symbol: 'TECHM',
    fall: -7.2,
    cause: 'Market-wide',
    detail:
      'Fell on three consecutive down days for the NIFTY with no IT-specific catalyst and no volume spike. The most favourable setup for this strategy.',
    tone: 'ok' as const,
  },
];

export const TRADEABILITY = {
  verdict: 'Yes, up to about \u20B98 crore',
  capital: 1000000,
  rows: [
    { label: 'Your order size per name', value: '\u20B966,667' },
    { label: 'Median daily value traded, these 15 names', value: '\u20B9412 crore' },
    { label: 'Your order as a share of that', value: '0.002%' },
    { label: 'Modelled slippage per round trip', value: '0.18%' },
    { label: 'Capital at which slippage doubles', value: '\u20B98.1 crore' },
  ],
  note:
    'At your size, execution is not a constraint. The strategy is limited by its costs and its thin edge, not by whether the orders fill.',
};

export const HEDGE_OPTIONS = [
  {
    id: 'put',
    name: 'Buy a NIFTY put',
    cost: '1.9% of capital a year',
    protects: 'Everything below 5% down',
    detail:
      'Buy a monthly NIFTY put about 5% below the current level, roll it each expiry. Caps the overnight gap risk that an equity basket cannot avoid.',
    tradeoff: 'You pay the premium every month whether or not anything goes wrong. In a flat year this is a pure 1.9% drag.',
  },
  {
    id: 'collar',
    name: 'Collar: buy the put, sell a call',
    cost: '0.4% of capital a year',
    protects: 'Below 5% down, capped above 7% up',
    detail:
      'Same protective put, funded by selling a NIFTY call about 7% above the current level. Most of the insurance cost disappears.',
    tradeoff: 'You give up the big up months. In a year like 2021 the sold calls would have cost you more than the puts ever saved.',
  },
  {
    id: 'none',
    name: 'No hedge, smaller position',
    cost: 'Nothing',
    protects: 'Nothing, but there is less to lose',
    detail:
      'Run the strategy on 70% of capital and keep 30% in a liquid fund. The drawdown falls roughly in proportion and you pay no premium.',
    tradeoff: 'Your upside falls by the same proportion. This is the honest option and usually the right one at retail size.',
  },
];

export const ORDER_SPLIT = {
  total: 1000000,
  perName: 66667,
  legs: [
    { broker: 'Zerodha', share: 50, names: 8, value: 533336, status: 'ready' as const },
    { broker: 'Groww', share: 30, names: 4, value: 266668, status: 'ready' as const },
    { broker: 'Upstox', share: 20, names: 3, value: 200001, status: 'reauth' as const },
  ],
  note:
    'Split by available margin across your connected accounts, largest first. Nothing is sent: this prototype has no broker API wired up.',
};

export const RESEARCH_BRIEF = {
  findings: [
    {
      title: 'Earnings quality is improving',
      detail:
        'Operating margin has expanded for five straight quarters and cash conversion is above 90%, so the profit growth is showing up as actual cash rather than receivables.',
      tone: 'ok' as const,
    },
    {
      title: 'Valuation is no longer cheap',
      detail:
        'Trading at 28x forward earnings against a 5-year median of 21x. The business has improved, but a good part of that is already in the price.',
      tone: 'warn' as const,
    },
    {
      title: 'Promoter holding is stable',
      detail:
        'No pledging, no block sales in eight quarters. Institutional holding up 240 basis points year on year.',
      tone: 'ok' as const,
    },
    {
      title: 'Single-customer concentration',
      detail:
        'The top client is 18% of revenue. A renegotiation there would move the earnings estimate more than anything else on this page.',
      tone: 'bad' as const,
    },
  ],
  note:
    'This is an illustrative brief on hardcoded fundamentals. It is not a recommendation, and alphaOS is not a registered research analyst.',
};

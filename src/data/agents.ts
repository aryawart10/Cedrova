export type AgentId =
  | 'equity-research'
  | 'strategy-maker'
  | 'backtest'
  | 'options'
  | 'risk-audit'
  | 'macro-news'
  | 'screener';

export type Agent = {
  id: AgentId;
  name: string;
  discipline: string;
  /** One line a human would actually say about this agent. */
  pitch: string;
  about: string;
  status: 'live' | 'beta' | 'waitlist';
  /** Index number shown in the broadsheet-style card. */
  no: string;
  horizon: string;
  consumes: string[];
  produces: string[];
  skills: string[];
  prompts: string[];
  runsThisWeek: number;
  medianRuntime: string;
  groundedOn: string[];
};

export const AGENTS: Agent[] = [
  {
    id: 'equity-research',
    name: 'Equity Research Specialist',
    discipline: 'Fundamental analysis',
    pitch: 'Reads the filings so you can read one page instead of three hundred.',
    about:
      'Builds a bottom-up view of a listed company: segment revenue, margin trajectory, working-capital quality, promoter and institutional holding changes, and the two or three things that would actually break the thesis.',
    status: 'live',
    no: '01',
    horizon: '3 months to 3 years',
    consumes: ['Annual reports', 'Quarterly filings', 'Earnings call transcripts', 'Shareholding patterns'],
    produces: ['Initiating-coverage note', 'Three-scenario valuation', 'Red-flag checklist', 'Peer comparison table'],
    skills: [
      'DCF and relative valuation with sensitivity bands',
      'Accounting-quality forensics (receivable days, related-party, capitalisation)',
      'Management commentary vs. delivered numbers, quarter over quarter',
      'Sector pass-through: input cost to realised margin',
    ],
    prompts: [
      'Build an initiating note on Titan with a bear case that assumes gold at \u20B91.1 lakh per 10g.',
      'Compare HDFC Bank and ICICI Bank on deposit franchise quality over the last eight quarters.',
      'What does Infosys management keep repeating on calls that has not shown up in the numbers yet?',
    ],
    runsThisWeek: 184,
    medianRuntime: '3m 40s',
    groundedOn: ['NSE/BSE filings', 'Transcript archive', 'Shareholding history'],
  },
  {
    id: 'strategy-maker',
    name: 'Trading Strategy Maker',
    discipline: 'Systematic design',
    pitch: 'Turns "buy strong stocks when the market is calm" into rules a machine can obey.',
    about:
      'Takes an idea in plain language and compiles it into an explicit rule set: universe, entry and exit conditions, sizing, and the exact edge cases that usually get hand-waved. Output is readable by a human and executable by a broker adapter.',
    status: 'live',
    no: '02',
    horizon: 'Intraday to positional',
    consumes: ['Plain-language intent', 'Universe constraints', 'Risk budget', 'Capital and leverage limits'],
    produces: ['Rule specification', 'Entry/exit pseudocode', 'Position sizing model', 'Broker order plan'],
    skills: [
      'Signal composition across trend, mean-reversion and carry',
      'Explicit handling of gaps, circuits, halts and illiquid prints',
      'Position sizing by volatility target rather than fixed quantity',
      'Translation to GTT, bracket and basket orders per broker',
    ],
    prompts: [
      'Momentum on NIFTY 100, rebalanced monthly, skip anything with an F&O ban history.',
      'Mean reversion on bank stocks using 2-sigma bands with a 3-day time stop.',
      'Convert my manual breakout checklist into rules and tell me what I left ambiguous.',
    ],
    runsThisWeek: 301,
    medianRuntime: '1m 12s',
    groundedOn: ['Strategy pattern library', 'Broker order semantics', 'Exchange circuit rules'],
  },
  {
    id: 'backtest',
    name: 'Backtesting Specialist',
    discipline: 'Validation',
    pitch: 'Exists to find the reason your beautiful equity curve is a lie.',
    about:
      'Runs a strategy over history with costs, slippage and survivorship handled honestly, then attacks the result: walk-forward splits, parameter sensitivity, regime breakdowns, and a blunt verdict on whether the edge survives.',
    status: 'live',
    no: '03',
    horizon: '2008 to date',
    consumes: ['Rule specification', 'Universe and date range', 'Cost assumptions'],
    produces: ['Equity curve and drawdown profile', 'Walk-forward report', 'Sensitivity heat map', 'Overfitting verdict'],
    skills: [
      'Point-in-time universe reconstruction (no survivorship bleed)',
      'Realistic cost stack: STT, brokerage, impact, stamp duty',
      'Walk-forward and purged cross-validation',
      'Regime slicing: 2008, 2013 taper, 2020 crash, 2022 rate shock',
    ],
    prompts: [
      'Backtest this on NIFTY 500 from 2010 and show me the worst 12-month stretch.',
      'How much of the return disappears if I add 15 bps of slippage per leg?',
      'Is this curve a product of two lucky years? Slice it by calendar year.',
    ],
    runsThisWeek: 426,
    medianRuntime: '48s',
    groundedOn: ['Adjusted price history', 'Corporate action archive', 'Index constituent history'],
  },
  {
    id: 'options',
    name: 'Futures & Options Specialist',
    discipline: 'Derivatives',
    pitch: 'Picks the structure, not just the direction.',
    about:
      'Given a view and a risk appetite, proposes the structure that expresses it most cheaply: spreads, calendars, ratios or plain directional. Prices the greeks, shows the payoff, and flags margin and expiry-day behaviour.',
    status: 'beta',
    no: '04',
    horizon: 'Weekly to quarterly expiries',
    consumes: ['Directional or volatility view', 'Margin available', 'Max loss tolerance'],
    produces: ['Payoff diagram', 'Greeks exposure table', 'Margin and breakeven map', 'Adjustment triggers'],
    skills: [
      'IV surface reading: skew, term structure, event premium',
      'Structure selection by cost of carry and theta burn',
      'Margin computation under SPAN plus exposure',
      'Pre-defined adjustment ladders instead of panic rolls',
    ],
    prompts: [
      'I think Bank Nifty stays in a 1,200-point range until expiry. Cheapest way to own that?',
      'Build a hedge for my \u20B918L cash portfolio that costs under 1.2% for the quarter.',
      'Compare a bull call spread and a naked call on Reliance ahead of results.',
    ],
    runsThisWeek: 157,
    medianRuntime: '2m 05s',
    groundedOn: ['Option chain snapshots', 'IV history', 'Exchange margin files'],
  },
  {
    id: 'risk-audit',
    name: 'Portfolio Risk Auditor',
    discipline: 'Risk',
    pitch: 'Tells you the four stocks that are secretly one bet.',
    about:
      'Looks through your holdings to the factors underneath: concentration, correlation clusters, sector and factor tilts, liquidity under stress, and what a 2020-style drawdown would do to this specific book.',
    status: 'live',
    no: '05',
    horizon: 'Continuous',
    consumes: ['Broker holdings', 'Open positions', 'Target allocation'],
    produces: ['Factor exposure report', 'Stress-test table', 'Concentration alerts', 'Rebalance proposal'],
    skills: [
      'Correlation clustering to find hidden single bets',
      'Historical stress replay across six named drawdowns',
      'Liquidity-adjusted exit horizon per position',
      'Tax-aware rebalancing with LTCG/STCG split',
    ],
    prompts: [
      'What is the real factor exposure of my portfolio, not the sector labels?',
      'If IT falls 18% in a month, what happens to this book?',
      'Rebalance me towards equal risk contribution without triggering STCG.',
    ],
    runsThisWeek: 243,
    medianRuntime: '55s',
    groundedOn: ['Connected broker holdings', 'Factor return history', 'Delivery volume history'],
  },
  {
    id: 'macro-news',
    name: 'Macro & Event Analyst',
    discipline: 'Top-down',
    pitch: 'Separates the headline that matters from the ninety that do not.',
    about:
      'Watches policy, flows, commodities and the currency, then maps each development to the handful of positions in your universe it can actually move. Everything comes with a stated transmission mechanism, not a vibe.',
    status: 'beta',
    no: '06',
    horizon: '1 week to 2 quarters',
    consumes: ['Policy calendar', 'FII/DII flow data', 'Commodity and FX prints', 'Filings feed'],
    produces: ['Morning desk note', 'Event impact map', 'Positioning shift suggestions', 'Calendar of known risks'],
    skills: [
      'Rate path to sector earnings transmission',
      'Crude, gold and USDINR pass-through by sector',
      'Flow divergence between FII and DII as a positioning signal',
      'Pre-event vs. post-event drift statistics for Indian large caps',
    ],
    prompts: [
      'What in this week\u2019s calendar can actually move my portfolio?',
      'Trace how a 10% crude move reaches Asian Paints\u2019 gross margin.',
      'FIIs have sold for three weeks while DIIs bought. What usually happens next?',
    ],
    runsThisWeek: 512,
    medianRuntime: '1m 28s',
    groundedOn: ['RBI and MoSPI releases', 'Exchange flow data', 'Commodity settlement prices'],
  },
  {
    id: 'screener',
    name: 'Screener Composer',
    discipline: 'Discovery',
    pitch: 'You describe the kind of company you want. It writes the filter.',
    about:
      'Converts a qualitative description into a precise, runnable screen over the listed universe, then explains why each survivor passed and shows which single condition is doing most of the filtering.',
    status: 'waitlist',
    no: '07',
    horizon: 'Point in time',
    consumes: ['Plain-language description', 'Universe', 'Hard constraints'],
    produces: ['Executable screen', 'Ranked result set', 'Per-condition attribution', 'Watchlist export'],
    skills: [
      'Natural language to filter algebra',
      'Condition attribution: which filter removed what',
      'Automatic guardrails against microcap and low-liquidity noise',
      'One-click promotion of results into a strategy universe',
    ],
    prompts: [
      'Profitable manufacturers under \u20B915,000 Cr that cut debt three years running.',
      'Companies where promoter holding rose while the stock fell more than 20%.',
      'Show me the screen you would write for a quality-at-reasonable-price mandate.',
    ],
    runsThisWeek: 0,
    medianRuntime: '\u2014',
    groundedOn: ['Fundamental database', 'Liquidity history'],
  },
];

export const agentById = (id: AgentId) => AGENTS.find((a) => a.id === id)!;

/* ── "Which agent do I need?" — 3 questions, weighted routing ── */

export type PickerOption = { label: string; detail: string; weights: Partial<Record<AgentId, number>> };
export type PickerQuestion = { id: string; question: string; note: string; options: PickerOption[] };

export const PICKER: PickerQuestion[] = [
  {
    id: 'goal',
    question: 'What are you actually trying to decide right now?',
    note: 'Pick the closest. You can run more than one agent afterwards.',
    options: [
      {
        label: 'Whether to own a specific company',
        detail: 'You have a name in mind and want a defensible view on it.',
        weights: { 'equity-research': 3, 'macro-news': 1 },
      },
      {
        label: 'How to trade a view I already hold',
        detail: 'The direction feels clear; the structure and rules do not.',
        weights: { 'strategy-maker': 3, options: 2 },
      },
      {
        label: 'Whether my existing system actually works',
        detail: 'You have rules and a curve you do not fully trust.',
        weights: { backtest: 3, 'risk-audit': 1 },
      },
      {
        label: 'What is wrong with my current portfolio',
        detail: 'Holdings exist. The risk in them is unclear.',
        weights: { 'risk-audit': 3, 'macro-news': 1 },
      },
      {
        label: 'What to even look at',
        detail: 'No specific name yet, you want a shortlist worth reading.',
        weights: { screener: 3, 'macro-news': 1, 'equity-research': 1 },
      },
    ],
  },
  {
    id: 'horizon',
    question: 'How long would you hold the thing you decide on?',
    note: 'Horizon changes which evidence matters.',
    options: [
      {
        label: 'Within the day',
        detail: 'Square off before close.',
        weights: { 'strategy-maker': 2, options: 2 },
      },
      {
        label: 'Days to a few weeks',
        detail: 'Swing positions, weekly expiries.',
        weights: { 'strategy-maker': 2, backtest: 1, options: 1 },
      },
      {
        label: 'Months',
        detail: 'Positional, quarterly results matter.',
        weights: { 'equity-research': 2, backtest: 1, 'macro-news': 1 },
      },
      {
        label: 'Years',
        detail: 'You care about the business, not the chart.',
        weights: { 'equity-research': 3, 'risk-audit': 1, screener: 1 },
      },
    ],
  },
  {
    id: 'rigour',
    question: 'What would make you trust the answer?',
    note: 'This decides how much the agent argues against itself.',
    options: [
      {
        label: 'Numbers I can reproduce',
        detail: 'Show the data, the assumptions and the code path.',
        weights: { backtest: 3, 'risk-audit': 2 },
      },
      {
        label: 'A written argument with a bear case',
        detail: 'Prose, sourced, with the thesis-breakers stated up front.',
        weights: { 'equity-research': 3, 'macro-news': 2 },
      },
      {
        label: 'Rules precise enough to automate',
        detail: 'No ambiguity left for a human to resolve at 09:15.',
        weights: { 'strategy-maker': 3, options: 1 },
      },
      {
        label: 'A payoff I can see before I commit',
        detail: 'Draw me the worst case in rupees.',
        weights: { options: 3, 'risk-audit': 2 },
      },
    ],
  },
];

export function recommend(answers: Record<string, number>) {
  const score = new Map<AgentId, number>();
  for (const q of PICKER) {
    const idx = answers[q.id];
    if (idx == null) continue;
    const opt = q.options[idx];
    for (const [id, w] of Object.entries(opt.weights)) {
      score.set(id as AgentId, (score.get(id as AgentId) ?? 0) + (w as number));
    }
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, s]) => ({ agent: agentById(id), score: s }));
}

/* ── Builder vocabulary ─────────────────────────────────── */

export const BUILD_UNIVERSES = [
  { id: 'nifty50', label: 'NIFTY 50', detail: '50 names, deepest liquidity' },
  { id: 'nifty100', label: 'NIFTY 100', detail: 'Large cap, F&O eligible' },
  { id: 'nifty500', label: 'NIFTY 500', detail: 'Broad market, includes midcap' },
  { id: 'banking', label: 'Bank & NBFC', detail: 'Rate-sensitive basket' },
  { id: 'watchlist', label: 'My watchlist', detail: '16 symbols from the Markets tab' },
];

export const BUILD_SIGNALS = [
  { id: 'momentum', label: 'Momentum', detail: '12-month return, 1-month skip' },
  { id: 'trend', label: 'Trend following', detail: 'Price above 50 and 200 DMA' },
  { id: 'reversion', label: 'Mean reversion', detail: 'Z-score below \u22122 on 20-day' },
  { id: 'breakout', label: 'Breakout', detail: '20-day high with volume expansion' },
  { id: 'quality', label: 'Quality tilt', detail: 'ROCE, low debt, earnings stability' },
  { id: 'lowvol', label: 'Low volatility', detail: 'Bottom quintile realised vol' },
];

export const BUILD_RISK = [
  { id: 'conservative', label: 'Conservative', detail: '8% target vol, 6% per-name cap' },
  { id: 'balanced', label: 'Balanced', detail: '14% target vol, 10% per-name cap' },
  { id: 'aggressive', label: 'Aggressive', detail: '22% target vol, 18% per-name cap' },
];

export const BUILD_REBALANCE = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
];

export const BUILD_EXAMPLES = [
  'Buy the strongest 15 names in NIFTY 100, equal risk weighted, exit when they drop out of the top 30.',
  'Short volatility on Bank Nifty weeklies, but stand aside in the week of a policy decision.',
  'Accumulate quality midcaps when the index is above its 200 DMA, stop entirely when it is below.',
];

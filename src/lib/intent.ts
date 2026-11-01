/* ──────────────────────────────────────────────────────────────
   Intent routing for the universal prompt bar.

   The prompt bar is not a chat box that returns prose. It classifies
   what you typed and hands off to a purpose-built answer surface.
   Scoring is keyword-weight based rather than a single regex so that
   partial, messy, real-world phrasing still lands somewhere useful.
   ────────────────────────────────────────────────────────────── */

export type IntentId =
  | 'strategy-build'
  | 'market-view'
  | 'signal-check'
  | 'why-fell'
  | 'tradeable'
  | 'hedge'
  | 'place-orders'
  | 'research'
  | 'backtest';

type Rule = {
  id: IntentId;
  /** Phrases worth 3 points each. Strong, near-unambiguous signals. */
  strong: string[];
  /** Phrases worth 1 point each. Supporting evidence. */
  weak: string[];
  /** If any of these match, the intent is vetoed outright. */
  veto?: string[];
};

const RULES: Rule[] = [
  {
    id: 'strategy-build',
    strong: [
      'build a trading strategy',
      'build a strategy',
      'make a strategy',
      'create a strategy',
      'build me a',
      'mean reversion',
      'trading strategy',
      'investing strategy',
      'buy quality',
      'buy the dip',
    ],
    weak: ['strategy', 'build', 'rules', 'systematic', 'rebalance', 'nifty 100', 'screen'],
    veto: ['backtest the', 'hedge', 'place the order'],
  },
  {
    id: 'market-view',
    strong: [
      'i think',
      'i believe',
      'i expect',
      'my view',
      'bullish on',
      'bearish on',
      'will fall',
      'will rise',
      'will crash',
      'will rally',
      'going to fall',
      'going to go up',
    ],
    weak: ['view', 'expect', 'rates', 'inflation', 'earnings', 'next quarter', 'sector'],
  },
  {
    id: 'signal-check',
    strong: [
      'does this signal',
      'signal work',
      'check the signal',
      'is the signal',
      'does it actually work',
      'validate',
      'edge real',
      'is this edge',
    ],
    weak: ['signal', 'predictive', 'works', 'significant', 'noise'],
  },
  {
    id: 'why-fell',
    strong: ['why did', 'why is', 'why has', 'what happened to', 'reason for the fall', 'why down'],
    weak: ['fell', 'fall', 'drop', 'dropped', 'down', 'crashed', 'news', 'happened'],
  },
  {
    id: 'tradeable',
    strong: [
      'can i actually trade',
      'can i trade this',
      'is this tradeable',
      'can i execute',
      'will my orders fill',
      'is it liquid enough',
    ],
    weak: ['liquidity', 'slippage', 'impact', 'fill', 'execute', 'realistic'],
  },
  {
    id: 'hedge',
    strong: [
      'hedge',
      'overnight risk',
      'protect my',
      'downside protection',
      'nifty put',
      'collar',
      'insurance',
    ],
    weak: ['put', 'option', 'gap', 'overnight', 'crash protection'],
  },
  {
    id: 'place-orders',
    strong: [
      'place the order',
      'place orders',
      'send the order',
      'execute the order',
      'split across',
      'across my brokers',
      'buy now',
    ],
    weak: ['order', 'broker', 'zerodha', 'groww', 'upstox', 'basket', 'quantity'],
  },
  {
    id: 'research',
    strong: [
      'research on',
      'is it a good buy',
      'is this a good buy',
      'should i buy',
      'tell me about',
      'fundamentals of',
      'valuation of',
      'analyse',
      'analyze',
    ],
    weak: ['research', 'company', 'fundamentals', 'valuation', 'moat', 'margins', 'roe', 'good buy'],
  },
  {
    id: 'backtest',
    strong: ['backtest', 'back test', 'historical performance', 'how would this have done'],
    weak: ['test', 'history', 'since 2010', 'drawdown', 'sharpe'],
  },
];

export type Match = {
  id: IntentId;
  score: number;
  /** The phrases that fired, so the UI can show *why* it routed this way. */
  hits: string[];
};

/** Score every rule against the prompt. Highest score wins. */
export function classify(prompt: string): Match | null {
  const q = ` ${prompt.toLowerCase().replace(/[^a-z0-9₹%. ]/g, ' ').replace(/\s+/g, ' ')} `;
  if (q.trim().length < 2) return null;

  const scored: Match[] = [];

  for (const rule of RULES) {
    if (rule.veto?.some((v) => q.includes(v))) continue;

    const hits: string[] = [];
    let score = 0;

    for (const p of rule.strong) {
      if (q.includes(p)) {
        score += 3;
        hits.push(p);
      }
    }
    for (const p of rule.weak) {
      if (q.includes(` ${p} `) || q.includes(` ${p}`) || q.includes(`${p} `)) {
        score += 1;
        hits.push(p);
      }
    }
    if (score > 0) scored.push({ id: rule.id, score, hits });
  }

  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

/** Pull a known ticker out of free text, for intents that target one name. */
export function extractSymbol(prompt: string, universe: string[]): string | null {
  const up = prompt.toUpperCase();
  // Longest first so RELIANCE wins over any hypothetical substring match.
  const sorted = [...universe].sort((a, b) => b.length - a.length);
  return sorted.find((sym) => new RegExp(`\\b${sym}\\b`).test(up)) ?? null;
}

/** Pull a rupee amount, understanding Indian magnitude words. */
export function extractAmount(prompt: string): number | null {
  const q = prompt.toLowerCase().replace(/,/g, '');
  const m = q.match(/(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|l|k|thousand)?/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  switch (m[2]) {
    case 'crore':
    case 'cr':
      return n * 1e7;
    case 'lakh':
    case 'lac':
    case 'l':
      return n * 1e5;
    case 'k':
    case 'thousand':
      return n * 1e3;
    default:
      return n;
  }
}

export const INTENT_LABEL: Record<IntentId, string> = {
  'strategy-build': 'Strategy builder',
  'market-view': 'Market view to strategy',
  'signal-check': 'Signal check',
  'why-fell': 'News diagnosis',
  tradeable: 'Tradeability check',
  hedge: 'Overnight risk',
  'place-orders': 'Order routing',
  research: 'Equity research',
  backtest: 'Backtest engine',
};

/** Which desk owns each intent. Mirrors the research-team framing. */
export const INTENT_DESK: Record<IntentId, string> = {
  'strategy-build': 'Strategy builder',
  'market-view': 'Macro desk',
  'signal-check': 'Quant desk',
  'why-fell': 'Equity research',
  tradeable: 'Execution desk',
  hedge: 'F&O research',
  'place-orders': 'Execution desk',
  research: 'Equity research',
  backtest: 'Quant desk',
};

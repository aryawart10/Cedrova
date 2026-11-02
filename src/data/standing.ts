import type { AgentId } from './agents';
import { INDICES, UNIVERSE, instrumentFor, quoteFor, seriesFor } from './market';
import { holdingRows } from './portfolio';

/* ──────────────────────────────────────────────────────────────
   Standing agents: the ones a customer builds for themselves.

   A specialist in AGENTS is a capability. A standing agent is a
   *job* — a watch list, a definition of what counts as a change,
   and a crew of specialists it delegates to when something fires.
   It is a thin wrapper, deliberately: the intelligence stays in
   the specialists, and this layer only decides when to wake them.
   ────────────────────────────────────────────────────────────── */

export type Cadence = 'intraday' | 'daily' | 'weekly';

export const CADENCE_LABEL: Record<Cadence, string> = {
  intraday: 'As it happens',
  daily: 'Once a day, after close',
  weekly: 'Weekly digest',
};

export type TriggerKind = 'price' | 'volume' | 'filing' | 'news' | 'rating' | 'drawdown';

export const TRIGGER_LABEL: Record<TriggerKind, string> = {
  price: 'Unusual price move',
  volume: 'Unusual volume',
  filing: 'Exchange filing',
  news: 'News or event',
  rating: 'Analyst action',
  drawdown: 'Drawdown breach',
};

export type Trigger = {
  kind: TriggerKind;
  /** The threshold in words, with the number that makes it real. */
  detail: string;
};

/** One specialist inside the wrapper, and what it is asked for. */
export type CrewRole = { agent: AgentId; asked: string };

export type Finding = {
  at: string;
  kind: TriggerKind;
  /** Which crew member produced this entry. */
  by: AgentId;
  headline: string;
  body: string;
  /** Null when the honest answer is that nothing needs doing. */
  action: string | null;
};

export type StandingAgent = {
  id: string;
  name: string;
  /** The sentence the customer actually typed. Kept verbatim. */
  brief: string;
  scope: 'symbols' | 'portfolio' | 'market';
  watch: string[];
  triggers: Trigger[];
  crew: CrewRole[];
  cadence: Cadence;
  delivery: string[];
  limits: string[];
  status: 'live' | 'paused';
  created: string;
  lastRun: string;
  findings: Finding[];
};

/* ── the parse ───────────────────────────────────────────── */

export type JobDraft = Omit<StandingAgent, 'id' | 'name' | 'status' | 'created' | 'lastRun' | 'findings'> & {
  /** Phrases that fired, so the customer can see why it read the request this way. */
  hits: string[];
  /** Things the sentence did not say, stated instead of guessed silently. */
  unresolved: string[];
  suggestedName: string;
};

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Every universe name mentioned, by ticker or by company name. */
export function extractSymbols(prompt: string): string[] {
  const up = prompt.toUpperCase();
  const flat = norm(prompt);
  const found = new Set<string>();
  for (const i of UNIVERSE) {
    if (new RegExp(`\\b${i.symbol}\\b`).test(up)) found.add(i.symbol);
    else if (norm(i.name).length > 4 && flat.includes(norm(i.name))) found.add(i.symbol);
  }
  return [...found];
}

/** Two sigma of the name's own daily move, rounded to a readable step. */
function sigmaBand(symbol: string): number {
  const inst = instrumentFor(symbol);
  const pct = (inst?.vol ?? 0.012) * 2 * 100;
  return Math.round(pct * 10) / 10;
}

const HEDGE_WORDS = ['hedge', 'protect', 'downside protection', 'insurance'];
const HISTORY_WORDS = ['has this happened before', 'historically', 'how often', 'in the past'];

/** The thresholds in words. Re-derived whenever the customer edits the spec,
 *  so the numbers on screen always match the triggers actually selected. */
/** What it will not do, stated at creation rather than discovered later.
 *  Re-derived from the edited spec, so turning a watch intraday adds the
 *  live-feed caveat instead of leaving the old list in place. */
export function limitsFor(
  scope: JobDraft['scope'],
  watch: string[],
  kinds: Set<TriggerKind> | TriggerKind[],
  cadence: Cadence,
): string[] {
  const set = kinds instanceof Set ? kinds : new Set(kinds);
  const limits = [
    'It reports, it does not trade. Placing an order still needs the execution desk and your confirmation on each basket.',
  ];
  if (cadence === 'intraday') {
    limits.push(
      'An as-it-happens watch needs a live tick subscription. This build has no live feed, so the agent is created and evaluated on demand instead.',
    );
  }
  if (scope === 'symbols' && watch.length) {
    limits.push(
      `It watches ${watch.join(', ')} and nothing else. A move in a peer that does not reach ${
        watch.length === 1 ? 'this name' : 'these names'
      } will not fire.`,
    );
  }
  if (set.has('news')) {
    limits.push(
      'News means the exchange filings feed plus wire headlines. It will miss a story that only exists in a broker group.',
    );
  }
  if (set.has('drawdown') && scope === 'portfolio') {
    limits.push(
      'The high-water mark is taken from holdings at connected brokers only. A demat held elsewhere is invisible to it.',
    );
  }
  return limits;
}

export function triggersFor(
  scope: JobDraft['scope'],
  watch: string[],
  kinds: Set<TriggerKind> | TriggerKind[],
): Trigger[] {
  const set = kinds instanceof Set ? kinds : new Set(kinds);
  const band = watch.length && scope === 'symbols' ? sigmaBand(watch[0]) : 1.6;
  const detailFor: Record<TriggerKind, string> = {
    price:
      watch.length && scope === 'symbols'
        ? `Beyond ${band}% from the previous close, which is two sigma of ${watch[0]}'s own daily move rather than a round number`
        : `Beyond ${band}% on the day, two sigma of the index's own daily move`,
    volume: 'Above twice the 20-day average delivery volume in the first hour',
    filing: 'Any disclosure on the NSE or BSE filings feed for a watched name, same day',
    news: 'A wire headline that names a watched company, deduplicated to one report per story',
    rating: 'A published change in rating or target price from a covering broker',
    drawdown:
      scope === 'portfolio'
        ? 'The book falls more than 6% from its own high-water mark'
        : 'A watched name falls more than 10% from its 60-day high',
  };
  return TRIGGER_ORDER.filter((k) => set.has(k)).map((kind) => ({ kind, detail: detailFor[kind] }));
}

const TRIGGER_ORDER: TriggerKind[] = ['price', 'volume', 'filing', 'news', 'rating', 'drawdown'];

/** Which specialists the wrapper delegates to, and what each is asked for.
 *  The monitor is always first: it owns *when*, never *what it means*. */
export function crewFor(
  scope: JobDraft['scope'],
  kinds: Set<TriggerKind> | TriggerKind[],
  prompt: string,
): CrewRole[] {
  const set = kinds instanceof Set ? kinds : new Set(kinds);
  const q = ` ${prompt.toLowerCase()} `;
  const says = (words: string[]) => words.some((w) => q.includes(w));

  const crew: CrewRole[] = [
    {
      agent: 'monitor',
      asked:
        'Watch the feeds, decide when something has crossed a threshold above, and stay silent when nothing has.',
    },
  ];
  if (scope === 'symbols' || set.has('filing') || set.has('rating')) {
    crew.push({
      agent: 'equity-research',
      asked:
        'When something fires, say whether it is about the business or only about the price, and whether it touches the thesis.',
    });
  }
  if (set.has('news') || scope === 'market') {
    crew.push({
      agent: 'macro-news',
      asked:
        'When the trigger is a headline or an event, trace whether it actually reaches this name or stops at the sector.',
    });
  }
  if (scope === 'portfolio' || set.has('drawdown')) {
    crew.push({
      agent: 'risk-audit',
      asked: 'Re-check concentration, correlation and stress on the book after every change reported.',
    });
  }
  if (says(HEDGE_WORDS)) {
    crew.push({
      agent: 'options',
      asked: 'Propose a structure when the monitor reports downside the book is not protected against.',
    });
  }
  if (says(HISTORY_WORDS)) {
    crew.push({
      agent: 'backtest',
      asked: 'Look up how often this trigger has fired historically and what followed each time.',
    });
  }
  return crew;
}

export function composeJob(prompt: string): JobDraft {
  const q = ` ${prompt.toLowerCase().replace(/[^a-z0-9₹%. ]/g, ' ').replace(/\s+/g, ' ')} `;
  const hits: string[] = [];
  const fired = (...phrases: string[]) => {
    const got = phrases.filter((p) => q.includes(p));
    hits.push(...got);
    return got.length > 0;
  };

  const watch = extractSymbols(prompt);
  const wantsPortfolio = fired('my portfolio', 'my book', 'my holdings', 'my positions', 'portfolio');
  const wantsMarket = fired('the market', 'nifty', 'the index', 'sensex');
  /* Which index, if they named one. Longest name first so "bank nifty"
     is not swallowed by "nifty". */
  const index =
    [...INDICES]
      .sort((x, y) => y.name.length - x.name.length)
      .find((i) => q.includes(` ${i.name.toLowerCase()} `))?.name ?? 'NIFTY 50';

  const scope: JobDraft['scope'] = watch.length ? 'symbols' : wantsPortfolio ? 'portfolio' : 'market';

  /* What counts as a change. The specific words are read first: someone
     who said "rating change" asked for one thing, and letting the bare
     word "change" widen that to everything would bury the signal. */
  const kinds = new Set<TriggerKind>();
  if (fired('news', 'announcement', 'headline', 'event', 'story')) kinds.add('news');
  if (
    fired(
      'results',
      'earnings',
      'filing',
      'filings',
      'files',
      'discloses',
      'quarterly',
      'annual report',
      'disclosure',
    )
  )
    kinds.add('filing');
  if (fired('rating', 'analyst', 'target price', 'downgrade', 'upgrade', 'broker note')) kinds.add('rating');
  if (fired('falls', 'drops', 'drawdown', 'stop loss', 'loses', 'goes down')) kinds.add('drawdown');

  /* "any change" is deliberately open-ended, so it is read widely. */
  const openEnded = fired('any change', 'any changes', 'anything changes', 'everything');
  const vague = fired('changes', 'change', 'moves', 'movement', 'unusual', 'spike', 'swing');
  let askedAboutMoves = false;
  if (openEnded) {
    for (const k of ['price', 'volume', 'news', 'filing'] as TriggerKind[]) kinds.add(k);
    askedAboutMoves = true;
  } else if (vague && kinds.size === 0) {
    kinds.add('price');
    kinds.add('volume');
    askedAboutMoves = true;
  }

  const unresolved: string[] = [];
  if (kinds.size === 0) {
    kinds.add('price');
    kinds.add('news');
    unresolved.push(
      'You did not say what counts as a change, so this watches price and news. Narrow it with the toggles if you meant something more specific.',
    );
  }

  /* Recorded here so the phrases show up in `hits`; the crew itself is
     derived by crewFor, which the editor re-runs when triggers change. */
  fired(...HEDGE_WORDS);
  fired(...HISTORY_WORDS);

  const triggers = triggersFor(scope, watch, kinds);
  const crew = crewFor(scope, kinds, prompt);

  /* How often it reports. */
  let cadence: Cadence = 'daily';
  if (fired('immediately', 'as it happens', 'right away', 'intraday', 'real time', 'straight away'))
    cadence = 'intraday';
  else if (fired('weekly', 'every week', 'once a week')) cadence = 'weekly';
  else if (fired('daily', 'every day', 'morning', 'end of day', 'after close')) cadence = 'daily';
  /* Only an explicit interest in moves justifies an as-it-happens watch.
     Defaulting a risk question to intraday would just make it noisy. */
  else if (askedAboutMoves) cadence = 'intraday';

  const delivery = ['Feed on this page'];
  if (fired('email', 'mail me')) delivery.push('Email digest');
  if (fired('notify', 'alert me', 'ping me', 'push')) delivery.push('Push notification');

  /* What it will not do. Stated at creation, not discovered later. */
  if (scope === 'market' && !wantsMarket && !watch.length) {
    unresolved.push(
      'No company, index or portfolio was named, so this defaults to a whole-market watch. Name something to narrow it.',
    );
  }

  return {
    brief: prompt.trim(),
    hits: [...new Set(hits)],
    unresolved,
    scope,
    watch: scope === 'symbols' ? watch : scope === 'portfolio' ? ['Portfolio'] : [index],
    triggers,
    crew,
    cadence,
    delivery,
    limits: limitsFor(scope, watch, kinds, cadence),
    suggestedName: suggestName(
      scope,
      scope === 'symbols' ? watch : scope === 'portfolio' ? ['Portfolio'] : [index],
      kinds,
    ),
  };
}

/** The shortest form of a company name that is still unambiguous in the
 *  universe. "Reliance Industries" is Reliance; "Tata Motors" cannot shrink
 *  to Tata, because Tata Consultancy Services is also in here. */
export function shortName(symbol: string): string {
  const inst = instrumentFor(symbol);
  if (!inst) return symbol;
  const words = inst.name.split(' ');
  const clash = UNIVERSE.some((o) => o.symbol !== symbol && o.name.split(' ')[0] === words[0]);
  return clash ? words.slice(0, 2).join(' ') : words[0];
}

export function suggestName(scope: JobDraft['scope'], watch: string[], kinds: Set<TriggerKind>): string {
  const only = kinds.size === 1 ? [...kinds][0] : null;
  const TAIL: Partial<Record<TriggerKind, string>> = {
    filing: 'Results Watch',
    news: 'News Watch',
    rating: 'Rating Watch',
    drawdown: 'Risk Watch',
    volume: 'Volume Watch',
  };
  const tail = (only && TAIL[only]) || 'Watch';
  if (scope === 'portfolio') return `Portfolio ${tail}`;
  if (scope === 'market') return `${watch[0] ?? 'Market'} ${tail}`;
  if (watch.length === 1) return `${shortName(watch[0])} ${tail}`;
  return `${watch.length}-name ${tail}`;
}

/* ── running one ─────────────────────────────────────────── */

/* Evaluated against the same quotes the rest of the app uses, so a report
   can never claim a move the Markets module does not show. Everything it
   says is derived; it is not allowed to cite a threshold the agent does
   not actually hold. */

/** Threshold percentage pulled back out of the trigger sentence, so the
 *  number in the report is the number the customer agreed to. */
function bandOf(a: StandingAgent, kind: TriggerKind, fallback: number): number {
  const t = a.triggers.find((x) => x.kind === kind);
  if (!t) return fallback;
  return parseFloat(t.detail.match(/([\d.]+)%/)?.[1] ?? String(fallback));
}

/** The sentence for a day on which nothing fired, assembled from the
 *  triggers this agent really has. Silence is reported, not implied. */
function quietLines(a: StandingAgent, moves: string[]): string {
  const kinds = new Set(a.triggers.map((t) => t.kind));
  const lines = [...moves];
  if (kinds.has('filing')) lines.push('no filing on the NSE or BSE feed');
  if (kinds.has('news')) lines.push('nothing on the wire that names it');
  if (kinds.has('rating')) lines.push('no rating or target change from a covering broker');
  const joined = lines.join(', ');
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}

const upDown = (x: number) => (x >= 0 ? 'up' : 'down');

export function runOnce(a: StandingAgent, at: string): Finding {
  const kinds = new Set(a.triggers.map((t) => t.kind));

  if (a.scope === 'portfolio') {
    const rows = holdingRows(null);
    const total = rows.reduce((n, r) => n + r.value, 0);
    const worst = rows.reduce((x, y) => (y.dayChangePct < x.dayChangePct ? y : x));
    const band = bandOf(a, 'price', 2);
    const crossed = kinds.has('price') && Math.abs(worst.dayChangePct) >= band;
    if (crossed) {
      /* Whether this is one name or the whole book decides what to do about
         it, so the count is checked rather than asserted. */
      const others = rows.filter((r) => r.symbol !== worst.symbol && Math.abs(r.dayChangePct) >= band);
      return {
        at,
        kind: 'price',
        by: 'risk-audit',
        headline: `${worst.symbol} moved ${worst.dayChangePct.toFixed(2)}% and is ${((worst.value / total) * 100).toFixed(1)}% of the book`,
        body:
          others.length === 0
            ? `The only holding to cross ${band}% today, so this is a single-name event rather than a factor one.`
            : `${others.length} other holding${others.length === 1 ? '' : 's'} also crossed ${band}% today (${others
                .map((r) => r.symbol)
                .join(', ')}), which makes this a factor move rather than a single-name one.`,
        action: 'Open the risk auditor if you want the book re-stressed on current weights',
      };
    }
    const moves = kinds.has('price')
      ? [`the widest move in the book was ${worst.symbol} at ${worst.dayChangePct.toFixed(2)}%, inside the ${band}% threshold`]
      : [];
    return {
      at,
      kind: a.triggers[0]?.kind ?? 'price',
      by: 'monitor',
      headline: 'Nothing crossed the triggers',
      body: `Across ${rows.length} holdings. ${quietLines(a, moves)}`,
      action: null,
    };
  }

  if (a.scope === 'market') {
    const idx = INDICES.find((i) => i.name === a.watch[0]) ?? INDICES[0];
    const band = bandOf(a, 'price', 1.6);
    const crossed = kinds.has('price') && Math.abs(idx.changePct) >= band;
    if (crossed) {
      return {
        at,
        kind: 'price',
        by: 'macro-news',
        headline: `${idx.name} moved ${idx.changePct.toFixed(2)}%, past the ${band}% threshold`,
        body: `The index closed at ${idx.value.toFixed(2)}. A move of this size at index level is usually a factor event, so the question is which sector carried it rather than which company.`,
        action: 'Ask the macro desk which sector carried the move',
      };
    }
    const moves = kinds.has('price')
      ? [`${idx.name} is ${upDown(idx.changePct)} ${Math.abs(idx.changePct).toFixed(2)}% at ${idx.value.toFixed(2)}, inside the ${band}% threshold`]
      : [];
    return {
      at,
      kind: a.triggers[0]?.kind ?? 'price',
      by: 'monitor',
      headline: 'Nothing crossed the triggers',
      body: quietLines(a, moves),
      action: null,
    };
  }

  const sym = a.watch[0];
  const q = quoteFor(sym);
  const band = bandOf(a, 'price', 2);

  if (kinds.has('price') && Math.abs(q.changePct) >= band) {
    return {
      at,
      kind: 'price',
      by: 'equity-research',
      headline: `${sym} moved ${q.changePct.toFixed(2)}%, past the ${band}% threshold`,
      body:
        `Last ${q.last.toFixed(2)}, day range ${q.dayLow.toFixed(2)} to ${q.dayHigh.toFixed(2)}. ` +
        (kinds.has('filing')
          ? 'Nothing on the filings feed today, so on the evidence this agent can see it is a price event rather than a business one.'
          : 'This agent watches the price and not the filings feed, so it cannot tell you whether something was disclosed. The research desk can.'),
      action: 'Ask the equity research desk whether the thesis changed',
    };
  }

  /* Volume is checked against the series the charts are drawn from, so the
     multiple quoted here is the one a customer could verify by eye. */
  const vols = seriesFor(sym, '1M').slice(-20).map((c) => c.v);
  const avgVol = vols.reduce((n, v) => n + v, 0) / vols.length;
  const volX = q.volume / avgVol;
  if (kinds.has('volume') && volX >= 2) {
    return {
      at,
      kind: 'volume',
      by: 'equity-research',
      headline: `${sym} traded ${volX.toFixed(1)}x its 20-day average volume`,
      body: `Volume crossed while the price only moved ${q.changePct.toFixed(2)}%, which is the shape of a large order being worked rather than a repricing. Worth a look at the delivery percentage tomorrow.`,
      action: 'Ask the equity research desk who is likely on the other side',
    };
  }

  const moves: string[] = [];
  if (kinds.has('price'))
    moves.push(
      `${sym} is ${upDown(q.changePct)} ${Math.abs(q.changePct).toFixed(2)}% at ${q.last.toFixed(2)}, inside the ${band}% threshold`,
    );
  if (kinds.has('volume')) moves.push(`volume ran at ${volX.toFixed(1)}x the 20-day average`);
  if (kinds.has('drawdown')) {
    const highs = seriesFor(sym, '1Y').slice(-60).map((c) => c.h);
    const peak = Math.max(...highs);
    const off = ((q.last - peak) / peak) * 100;
    const limit = bandOf(a, 'drawdown', 10);
    moves.push(
      `${kinds.has('price') ? 'and it' : sym} is ${Math.abs(off).toFixed(1)}% off its 60-day high, inside the ${limit}% limit`,
    );
  }
  return {
    at,
    kind: a.triggers[0]?.kind ?? 'price',
    by: 'monitor',
    headline: 'Nothing crossed the triggers',
    body: quietLines(a, moves),
    action: null,
  };
}

/* ── what the customer already has ───────────────────────── */

export const SEED_AGENTS: StandingAgent[] = [
  {
    id: 'sa-1',
    name: 'Portfolio Watch',
    brief: 'Keep an eye on my portfolio and tell me if the risk in it gets worse.',
    scope: 'portfolio',
    watch: ['Portfolio'],
    triggers: [
      { kind: 'drawdown', detail: 'The book falls more than 6% from its own high-water mark' },
      { kind: 'price', detail: 'Any held name beyond 2.4% from the previous close' },
    ],
    crew: [
      {
        agent: 'monitor',
        asked:
          'Watch the feeds, decide when something has crossed a threshold above, and stay silent when nothing has.',
      },
      {
        agent: 'risk-audit',
        asked: 'Re-check concentration, correlation and stress on the book after every change reported.',
      },
    ],
    cadence: 'daily',
    delivery: ['Feed on this page'],
    limits: [
      'It reports, it does not trade. Placing an order still needs the execution desk and your confirmation on each basket.',
      'It can only see holdings at connected brokers. A demat held elsewhere is invisible to it.',
    ],
    status: 'live',
    created: '18 Sep 2026',
    lastRun: 'Today, 15:34',
    findings: [
      {
        at: 'Today, 15:34',
        kind: 'drawdown',
        by: 'risk-audit',
        headline: 'Concentration crossed back above the 24% target',
        body: 'HDFC Bank, ICICI Bank and ITC are 38% of the book between them and move together at a correlation above 0.78. The cluster grew because ICICI Bank was added on 1 Nov, not because prices moved.',
        action: 'Trim the cluster to 24% or hedge it with a Bank Nifty put spread',
      },
      {
        at: 'Yesterday, 15:31',
        kind: 'price',
        by: 'monitor',
        headline: 'Nothing crossed the triggers',
        body: 'Widest move in the book was Zomato at 1.9%, inside the threshold. No filings on any held name.',
        action: null,
      },
    ],
  },
  {
    id: 'sa-2',
    name: 'Tata Motors Results Watch',
    brief: 'Watch for any filing from Tata Motors and flag it the same day.',
    scope: 'symbols',
    watch: ['TATAMOTORS'],
    triggers: [
      { kind: 'filing', detail: 'Any disclosure on the NSE or BSE filings feed for a watched name, same day' },
    ],
    crew: [
      {
        agent: 'monitor',
        asked:
          'Watch the feeds, decide when something has crossed a threshold above, and stay silent when nothing has.',
      },
      {
        agent: 'equity-research',
        asked:
          'When something fires, say whether it is about the business or only about the price, and whether it touches the thesis.',
      },
    ],
    cadence: 'daily',
    delivery: ['Feed on this page', 'Email digest'],
    limits: [
      'It reports, it does not trade. Placing an order still needs the execution desk and your confirmation on each basket.',
      'It watches TATAMOTORS and nothing else. A move in a peer that does not reach this name will not fire.',
    ],
    status: 'paused',
    created: '2 Oct 2026',
    lastRun: '21 Oct 2026, 16:02',
    findings: [
      {
        at: '21 Oct 2026, 16:02',
        kind: 'filing',
        by: 'equity-research',
        headline: 'Q2 filing: JLR margin held, India CV volumes soft',
        body: 'EBITDA margin at JLR came in 40 bps better than the guided range while domestic CV volumes fell 7% year on year. The mix is doing the work, which is the part of the thesis worth re-checking next quarter.',
        action: 'Re-run the initiating note with the new CV volume assumption',
      },
    ],
  },
];

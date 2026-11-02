import { buildCandles, closes, type Candle } from '../lib/series';

export type Instrument = {
  symbol: string;
  name: string;
  sector: string;
  exchange: 'NSE' | 'BSE';
  base: number;
  drift: number;
  vol: number;
  mcap: number; // in rupees
  lot?: number;
};

/* Hardcoded universe. Prices are illustrative, not live quotes. */
export const UNIVERSE: Instrument[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', exchange: 'NSE', base: 2780, drift: 0.00042, vol: 0.0118, mcap: 18_80_000e5 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT Services', exchange: 'NSE', base: 3990, drift: 0.00031, vol: 0.0104, mcap: 14_42_000e5 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', exchange: 'NSE', base: 1686, drift: 0.00038, vol: 0.0112, mcap: 12_85_000e5 },
  { symbol: 'INFY', name: 'Infosys', sector: 'IT Services', exchange: 'NSE', base: 1842, drift: 0.00022, vol: 0.0131, mcap: 7_64_000e5 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking', exchange: 'NSE', base: 1248, drift: 0.00051, vol: 0.0121, mcap: 8_78_000e5 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom', exchange: 'NSE', base: 1612, drift: 0.00062, vol: 0.0139, mcap: 9_61_000e5 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Automobile', exchange: 'NSE', base: 958, drift: 0.00074, vol: 0.0196, mcap: 3_52_000e5 },
  { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Infrastructure', exchange: 'NSE', base: 3612, drift: 0.00048, vol: 0.0128, mcap: 4_96_000e5 },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', exchange: 'NSE', base: 812, drift: 0.00044, vol: 0.0154, mcap: 7_24_000e5 },
  { symbol: 'ITC', name: 'ITC', sector: 'FMCG', exchange: 'NSE', base: 462, drift: 0.00018, vol: 0.0091, mcap: 5_78_000e5 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Pharma', exchange: 'NSE', base: 1794, drift: 0.00039, vol: 0.0133, mcap: 4_30_000e5 },
  { symbol: 'ZOMATO', name: 'Eternal (Zomato)', sector: 'Consumer Tech', exchange: 'NSE', base: 268, drift: 0.00096, vol: 0.0268, mcap: 2_36_000e5 },
  { symbol: 'DMART', name: 'Avenue Supermarts', sector: 'Retail', exchange: 'NSE', base: 4186, drift: -0.00014, vol: 0.0162, mcap: 2_72_000e5 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', sector: 'Conglomerate', exchange: 'NSE', base: 2410, drift: -0.00028, vol: 0.0249, mcap: 2_78_000e5 },
  { symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer', exchange: 'NSE', base: 3298, drift: 0.00029, vol: 0.0147, mcap: 2_93_000e5 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Automobile', exchange: 'NSE', base: 11_240, drift: 0.00036, vol: 0.0126, mcap: 3_53_000e5 },
];

export const TIMEFRAMES = [
  { id: '1W', bars: 7, stepMs: 86_400_000, label: '1 week' },
  { id: '1M', bars: 22, stepMs: 86_400_000, label: '1 month' },
  { id: '6M', bars: 126, stepMs: 86_400_000, label: '6 months' },
  { id: '1Y', bars: 252, stepMs: 86_400_000, label: '1 year' },
  { id: '5Y', bars: 260, stepMs: 604_800_000, label: '5 years' },
] as const;

export type TimeframeId = (typeof TIMEFRAMES)[number]['id'];

const cache = new Map<string, Candle[]>();

export function seriesFor(symbol: string, tf: TimeframeId): Candle[] {
  const key = `${symbol}:${tf}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const inst = UNIVERSE.find((i) => i.symbol === symbol) ?? UNIVERSE[0];
  const frame = TIMEFRAMES.find((f) => f.id === tf) ?? TIMEFRAMES[3];
  const weekly = frame.stepMs > 86_400_000;
  const built = buildCandles(`${symbol}|${tf}`, {
    bars: frame.bars,
    start: inst.base * (tf === '5Y' ? 0.34 : tf === '1Y' ? 0.82 : 0.96),
    drift: inst.drift * (weekly ? 5 : 1),
    vol: inst.vol * (weekly ? 2.2 : 1),
    stepMs: frame.stepMs,
  });
  cache.set(key, built);
  return built;
}

export type Quote = {
  inst: Instrument;
  last: number;
  change: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  spark: number[];
};

/** Universe lookup. Returns undefined rather than guessing, so callers
 *  decide whether a missing ticker is survivable. */
export const instrumentFor = (symbol: string): Instrument | undefined =>
  UNIVERSE.find((i) => i.symbol === symbol);

export function quoteFor(symbol: string): Quote {
  const found = instrumentFor(symbol);
  // Falling back silently means a card labelled with one ticker renders
  // another company's price. Shout about it in dev instead.
  if (!found && import.meta.env.DEV) {
    console.warn(
      `[cedrova] quoteFor('${symbol}'): not in UNIVERSE, falling back to ${UNIVERSE[0].symbol}.`,
    );
  }
  const inst = found ?? UNIVERSE[0];
  const s = seriesFor(symbol, '1M');
  const last = s[s.length - 1];
  const prev = s[s.length - 2] ?? last;
  const change = last.c - prev.c;
  return {
    inst,
    last: last.c,
    change,
    changePct: (change / prev.c) * 100,
    dayHigh: last.h,
    dayLow: last.l,
    volume: last.v,
    spark: closes(s).slice(-22),
  };
}

export const ALL_QUOTES = (): Quote[] => UNIVERSE.map((i) => quoteFor(i.symbol));

/* ── index strip ────────────────────────────────────────── */

export type IndexQuote = {
  name: string;
  value: number;
  change: number;
  changePct: number;
  spark: number[];
};

const INDEX_DEFS = [
  { name: 'NIFTY 50', base: 25_842, drift: 0.0004, vol: 0.0062 },
  { name: 'SENSEX', base: 84_610, drift: 0.00038, vol: 0.0061 },
  { name: 'BANK NIFTY', base: 58_204, drift: 0.00046, vol: 0.0084 },
  { name: 'NIFTY IT', base: 38_915, drift: 0.00012, vol: 0.0096 },
  { name: 'NIFTY MIDCAP 100', base: 60_488, drift: 0.00059, vol: 0.0091 },
  { name: 'INDIA VIX', base: 12.4, drift: -0.0006, vol: 0.034 },
];

export const INDICES: IndexQuote[] = INDEX_DEFS.map((d) => {
  const c = buildCandles(`IDX|${d.name}`, { bars: 40, start: d.base, drift: d.drift, vol: d.vol });
  const last = c[c.length - 1];
  const prev = c[c.length - 2];
  return {
    name: d.name,
    value: last.c,
    change: last.c - prev.c,
    changePct: ((last.c - prev.c) / prev.c) * 100,
    spark: closes(c).slice(-26),
  };
});

/* ── sector heat ────────────────────────────────────────── */

export const SECTOR_HEAT = [
  { sector: 'Banking', changePct: 1.42, weight: 34 },
  { sector: 'IT Services', changePct: -0.88, weight: 23 },
  { sector: 'Automobile', changePct: 2.16, weight: 12 },
  { sector: 'Pharma', changePct: 0.54, weight: 9 },
  { sector: 'FMCG', changePct: -0.21, weight: 8 },
  { sector: 'Energy', changePct: 0.97, weight: 14 },
  { sector: 'Metals', changePct: -1.64, weight: 6 },
  { sector: 'Realty', changePct: 3.08, weight: 3 },
];

/* ── desk notes: what the news agent surfaced this morning ── */

export type DeskNote = {
  time: string;
  tag: 'FILING' | 'MACRO' | 'FLOW' | 'RESULT' | 'RATING';
  headline: string;
  symbols: string[];
  impact: 'high' | 'medium' | 'low';
};

export const DESK_NOTES: DeskNote[] = [
  {
    time: '09:04',
    tag: 'RESULT',
    headline: 'Q2 margin beat on lower fuel cost; management guides 14-16% EBITDA growth for FY27',
    symbols: ['RELIANCE'],
    impact: 'high',
  },
  {
    time: '09:21',
    tag: 'MACRO',
    headline: 'RBI holds repo at 5.75%, shifts stance to neutral; rate-sensitive basket bid up',
    symbols: ['HDFCBANK', 'SBIN', 'ICICIBANK'],
    impact: 'high',
  },
  {
    time: '10:12',
    tag: 'FLOW',
    headline: 'FII net buy \u20B92,840 Cr in cash segment, third straight session of inflows',
    symbols: [],
    impact: 'medium',
  },
  {
    time: '11:38',
    tag: 'RATING',
    headline: 'Brokerage cuts target to \u20B91,720 citing deal-win slowdown in BFSI vertical',
    symbols: ['INFY'],
    impact: 'medium',
  },
  {
    time: '13:02',
    tag: 'FILING',
    headline: 'Promoter pledge released on 1.2% of equity; disclosure filed with exchanges',
    symbols: ['ADANIENT'],
    impact: 'low',
  },
  {
    time: '14:26',
    tag: 'FLOW',
    headline: 'Unusual options activity: 26,000 CE open interest up 3.1x on weekly expiry',
    symbols: ['TATAMOTORS'],
    impact: 'medium',
  },
];

import { useMemo, useState } from 'react';
import { PriceChart } from '../components/PriceChart';
import { Sparkline } from '../components/Sparkline';
import { Button, Delta, Panel, SectionHead, Segmented, Tag } from '../components/ui';
import {
  ALL_QUOTES,
  DESK_NOTES,
  SECTOR_HEAT,
  TIMEFRAMES,
  quoteFor,
  seriesFor,
  type TimeframeId,
} from '../data/market';
import { compactINR, compactQty, money, num, pct } from '../lib/format';
import s from './MarketsTab.module.css';

type Props = { symbol: string; onSymbol: (s: string) => void; onGoBuild: () => void };

export function MarketsTab({ symbol, onSymbol, onGoBuild }: Props) {
  const [tf, setTf] = useState<TimeframeId>('1Y');
  const [mode, setMode] = useState<'area' | 'candle'>('area');
  const [sma20, setSma20] = useState(true);
  const [sma50, setSma50] = useState(false);
  const [volume, setVolume] = useState(true);
  const [sort, setSort] = useState<'name' | 'change'>('change');

  const quote = quoteFor(symbol);
  const candles = seriesFor(symbol, tf);

  const quotes = useMemo(() => {
    const all = ALL_QUOTES();
    return sort === 'change'
      ? [...all].sort((a, b) => b.changePct - a.changePct)
      : [...all].sort((a, b) => a.inst.symbol.localeCompare(b.inst.symbol));
  }, [sort]);

  const movers = useMemo(() => {
    const all = [...ALL_QUOTES()].sort((a, b) => b.changePct - a.changePct);
    return { up: all.slice(0, 4), down: all.slice(-4).reverse() };
  }, []);

  const periodReturn = ((candles[candles.length - 1].c / candles[0].o - 1) * 100);
  const high52 = Math.max(...seriesFor(symbol, '1Y').map((d) => d.h));
  const low52 = Math.min(...seriesFor(symbol, '1Y').map((d) => d.l));
  const fromHigh = (quote.last / high52 - 1) * 100;

  return (
    <div className={s.tab}>
      <SectionHead
        no="01"
        title="Markets"
        lede={
          <>
            Sixteen liquid NSE names with daily and weekly history. Prices here are generated from a
            fixed seed, so the charts are stable and nothing on this screen is a live quote.
          </>
        }
        aside={
          <>
            <Tag>NSE cash</Tag>
            <Tag tone="accent">Mock feed</Tag>
          </>
        }
      />

      {/* ── instrument headline ─────────────────────────── */}
      <div className={`${s.hero} u-rise`}>
        <div className={s.heroId}>
          <div className={s.heroTags}>
            <Tag solid>{quote.inst.exchange}</Tag>
            <Tag>{quote.inst.sector}</Tag>
          </div>
          <h3 className={`u-display ${s.heroName}`}>{quote.inst.name}</h3>
          <div className={s.heroSym}>
            <span className="u-num">{quote.inst.symbol}</span>
            <span className={s.heroMcap}>Mkt cap {compactINR(quote.inst.mcap)}</span>
          </div>
        </div>

        <div className={s.heroPrice}>
          <div className={`u-num ${s.price}`}>{money(quote.last)}</div>
          <div className={s.priceMeta}>
            <Delta value={quote.changePct} size="lg" />
            <span className={`u-num ${s.priceAbs}`}>
              {quote.change >= 0 ? '+' : '\u2212'}
              {num(Math.abs(quote.change))} today
            </span>
          </div>
        </div>

        <dl className={s.heroStats}>
          <div>
            <dt>Day range</dt>
            <dd className="u-num">
              {num(quote.dayLow)} &ndash; {num(quote.dayHigh)}
            </dd>
          </div>
          <div>
            <dt>52-week</dt>
            <dd className="u-num">
              {num(low52, 0)} &ndash; {num(high52, 0)}
            </dd>
          </div>
          <div>
            <dt>From high</dt>
            <dd className="u-num" style={{ color: fromHigh < -10 ? 'var(--loss)' : undefined }}>
              {pct(fromHigh, 1)}
            </dd>
          </div>
          <div>
            <dt>Volume</dt>
            <dd className="u-num">{compactQty(quote.volume)}</dd>
          </div>
        </dl>
      </div>

      {/* ── chart + watchlist ───────────────────────────── */}
      <div className={s.grid}>
        <Panel
          className={s.chartPanel}
          title={
            <>
              {symbol} &middot; {TIMEFRAMES.find((f) => f.id === tf)?.label}
            </>
          }
          meta={
            <>
              <span className={periodReturn >= 0 ? 'u-gain' : 'u-loss'}>
                {pct(periodReturn, 1)} over period
              </span>
            </>
          }
          pad={false}
        >
          <div className={s.chartControls}>
            <Segmented
              label="Timeframe"
              value={tf}
              onChange={setTf}
              options={TIMEFRAMES.map((f) => ({ id: f.id, label: f.id, title: f.label }))}
            />
            <Segmented
              label="Chart type"
              value={mode}
              onChange={setMode}
              options={[
                { id: 'area', label: 'Line' },
                { id: 'candle', label: 'Candles' },
              ]}
            />
            <div className={s.overlayRow}>
              <OverlayToggle on={sma20} onClick={() => setSma20(!sma20)} swatch="var(--accent)">
                20 DMA
              </OverlayToggle>
              <OverlayToggle on={sma50} onClick={() => setSma50(!sma50)} swatch="var(--agent)">
                50 DMA
              </OverlayToggle>
              <OverlayToggle on={volume} onClick={() => setVolume(!volume)} swatch="var(--text-mute)">
                Volume
              </OverlayToggle>
            </div>
          </div>
          <div className={s.chartBody}>
            <PriceChart
              candles={candles}
              mode={mode}
              weekly={tf === '5Y'}
              overlays={{ sma20, sma50, volume }}
              height={386}
            />
          </div>
          <div className={s.chartFoot}>
            <span>
              Hover the plot for OHLC. {candles.length} bars, {tf === '5Y' ? 'weekly' : 'daily'} resolution.
            </span>
            <Button size="sm" variant="ghost" onClick={onGoBuild}>
              Ask Equity Research about {symbol} &rarr;
            </Button>
          </div>
        </Panel>

        <Panel
          className={s.watchPanel}
          title="Watchlist"
          meta={
            <Segmented
              label="Sort watchlist"
              value={sort}
              onChange={setSort}
              options={[
                { id: 'change', label: '%' },
                { id: 'name', label: 'A\u2013Z' },
              ]}
            />
          }
          pad={false}
        >
          <ul className={s.watchList}>
            {quotes.map((q) => (
              <li key={q.inst.symbol}>
                <button
                  className={`${s.watchRow} ${q.inst.symbol === symbol ? s.watchOn : ''}`}
                  onClick={() => onSymbol(q.inst.symbol)}
                  aria-current={q.inst.symbol === symbol}
                >
                  <span className={s.watchId}>
                    <span className={`u-num ${s.watchSym}`}>{q.inst.symbol}</span>
                    <span className={s.watchName}>{q.inst.sector}</span>
                  </span>
                  <Sparkline values={q.spark} width={64} height={22} />
                  <span className={s.watchNums}>
                    <span className="u-num">{num(q.last, q.last > 2000 ? 0 : 1)}</span>
                    <Delta value={q.changePct} size="sm" arrow={false} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ── sector heat + movers ────────────────────────── */}
      <div className={s.lowerGrid}>
        <Panel title="Sector heat" meta="Today, index-weighted">
          <ul className={s.heatList}>
            {SECTOR_HEAT.map((h) => {
              const up = h.changePct >= 0;
              const width = Math.min(100, (Math.abs(h.changePct) / 3.2) * 100);
              return (
                <li key={h.sector} className={s.heatRow}>
                  <span className={s.heatName}>{h.sector}</span>
                  <span className={s.heatTrack}>
                    <span className={s.heatMid} />
                    <span
                      className={s.heatBar}
                      style={{
                        width: `${width / 2}%`,
                        background: up ? 'var(--gain)' : 'var(--loss)',
                        left: up ? '50%' : `${50 - width / 2}%`,
                      }}
                    />
                  </span>
                  <Delta value={h.changePct} size="sm" arrow={false} />
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Movers" meta="Session change">
          <div className={s.moverCols}>
            <MoverCol label="Leading" rows={movers.up} onPick={onSymbol} />
            <MoverCol label="Lagging" rows={movers.down} onPick={onSymbol} />
          </div>
        </Panel>

        <Panel
          title="Desk notes"
          meta={
            <>
              <Tag tone="agent">Macro &amp; Event Analyst</Tag>
            </>
          }
        >
          <ul className={s.notes}>
            {DESK_NOTES.map((n) => (
              <li key={n.time + n.tag} className={s.note}>
                <div className={s.noteTop}>
                  <span className="u-num">{n.time}</span>
                  <Tag tone={n.impact === 'high' ? 'accent' : 'neutral'}>{n.tag}</Tag>
                  {n.symbols.length > 0 && (
                    <span className={s.noteSyms}>
                      {n.symbols.map((sym) => (
                        <button key={sym} className={s.symLink} onClick={() => onSymbol(sym)}>
                          {sym}
                        </button>
                      ))}
                    </span>
                  )}
                </div>
                <p className={s.noteText}>{n.headline}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function OverlayToggle({
  children,
  on,
  onClick,
  swatch,
}: {
  children: React.ReactNode;
  on: boolean;
  onClick: () => void;
  swatch: string;
}) {
  return (
    <button className={`${s.ovl} ${on ? s.ovlOn : ''}`} onClick={onClick} aria-pressed={on}>
      <span className={s.ovlSwatch} style={{ background: on ? swatch : 'transparent', borderColor: swatch }} />
      {children}
    </button>
  );
}

function MoverCol({
  label,
  rows,
  onPick,
}: {
  label: string;
  rows: ReturnType<typeof ALL_QUOTES>;
  onPick: (s: string) => void;
}) {
  return (
    <div>
      <div className="u-eyebrow">{label}</div>
      <ul className={s.moverList}>
        {rows.map((q) => (
          <li key={q.inst.symbol}>
            <button className={s.moverRow} onClick={() => onPick(q.inst.symbol)}>
              <span className={`u-num ${s.moverSym}`}>{q.inst.symbol}</span>
              <Delta value={q.changePct} size="sm" arrow={false} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

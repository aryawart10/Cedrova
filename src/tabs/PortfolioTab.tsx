import { useState } from 'react';
import { Donut, donutHue } from '../components/Donut';
import { Sparkline } from '../components/Sparkline';
import { Button, Delta, Panel, SectionHead, Stat, Tag } from '../components/ui';
import { RISK_FINDINGS, STRESS_SCENARIOS, portfolioSummary, sectorAllocation } from '../data/portfolio';
import { compactINR, money, num, pct } from '../lib/format';
import s from './PortfolioTab.module.css';

type SortKey = 'value' | 'pnl' | 'day';

export function PortfolioTab({ onGoAgents }: { onGoAgents: () => void }) {
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [hoverSlice, setHoverSlice] = useState<number | null>(null);

  const p = portfolioSummary();
  const alloc = sectorAllocation();

  const rows = [...p.rows].sort((a, b) =>
    sortKey === 'value' ? b.value - a.value : sortKey === 'pnl' ? b.pnl - a.pnl : b.dayChangePct - a.dayChangePct,
  );

  return (
    <div className={s.tab}>
      <SectionHead
        no="05"
        title="Portfolio"
        lede={
          <>
            Holdings pulled from every connected broker and treated as one book, because that is how the
            risk actually behaves. The findings below come from the Portfolio Risk Auditor.
          </>
        }
        aside={
          <>
            <Tag>3 accounts</Tag>
            <Tag tone="accent">Synced 2 min ago</Tag>
          </>
        }
      />

      {/* ── headline figures, asymmetric ─────────────────── */}
      <div className={`${s.summary} u-rise`}>
        <div className={s.summaryMain}>
          <div className="u-eyebrow">Current value</div>
          <div className={`u-num ${s.bigValue}`}>{money(p.value, 0)}</div>
          <div className={s.summaryDeltas}>
            <span className={s.deltaBlock}>
              <Delta value={p.pnlPct} size="lg" />
              <span className={`u-num ${s.deltaAbs}`}>
                {p.pnl >= 0 ? '+' : '\u2212'}
                {compactINR(Math.abs(p.pnl))} overall
              </span>
            </span>
            <span className={s.deltaBlock}>
              <Delta value={p.dayPnlPct} size="md" />
              <span className={`u-num ${s.deltaAbs}`}>
                {p.dayPnl >= 0 ? '+' : '\u2212'}
                {compactINR(Math.abs(p.dayPnl))} today
              </span>
            </span>
          </div>
        </div>

        <dl className={s.summaryFacts}>
          <div>
            <dt>Invested</dt>
            <dd className="u-num">{compactINR(p.invested)}</dd>
          </div>
          <div>
            <dt>Idle cash</dt>
            <dd className="u-num">{compactINR(p.cash)}</dd>
          </div>
          <div>
            <dt>Positions</dt>
            <dd className="u-num">{p.rows.length}</dd>
          </div>
          <div>
            <dt>Largest holding</dt>
            <dd className="u-num">{((rows[0].value / p.value) * 100).toFixed(1)}%</dd>
          </div>
        </dl>
      </div>

      {/* ── allocation + risk ───────────────────────────── */}
      <div className={s.midGrid}>
        <Panel title="Allocation" meta="By sector, at market value">
          <div className={s.allocWrap}>
            <div className={s.donutWrap}>
              <Donut
                slices={alloc.map((a) => ({ label: a.sector, value: a.value, share: a.share }))}
                size={172}
                thickness={20}
                activeIndex={hoverSlice}
                onHover={setHoverSlice}
              />
              <div className={s.donutCenter}>
                {hoverSlice != null ? (
                  <>
                    <span className={s.donutCenterLabel}>{alloc[hoverSlice].sector}</span>
                    <span className={`u-num ${s.donutCenterValue}`}>
                      {(alloc[hoverSlice].share * 100).toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className={s.donutCenterLabel}>{alloc.length} sectors</span>
                    <span className={`u-num ${s.donutCenterValue}`}>{compactINR(p.value)}</span>
                  </>
                )}
              </div>
            </div>
            <ul className={s.legend}>
              {alloc.map((a, i) => (
                <li
                  key={a.sector}
                  className={`${s.legendRow} ${hoverSlice === i ? s.legendOn : ''}`}
                  onMouseEnter={() => setHoverSlice(i)}
                  onMouseLeave={() => setHoverSlice(null)}
                >
                  <span
                    className={s.swatch}
                    style={{ background: `oklch(0.64 0.11 ${donutHue(i, alloc.length)})` }}
                  />
                  <span className={s.legendName}>{a.sector}</span>
                  <span className={`u-num ${s.legendPct}`}>{(a.share * 100).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel
          title="Risk findings"
          meta={
            <>
              <Tag tone="agent">Portfolio Risk Auditor</Tag>
              <Tag tone="loss">1 high</Tag>
            </>
          }
        >
          <ul className={s.findings}>
            {RISK_FINDINGS.map((f) => (
              <li key={f.title} className={`${s.finding} ${s[`f_${f.severity}`]}`}>
                <div className={s.findingTop}>
                  <span className={s.severity}>{f.severity}</span>
                  <h4 className={s.findingTitle}>{f.title}</h4>
                </div>
                <p className={s.findingDetail}>{f.detail}</p>
                <div className={s.findingAction}>
                  <span className="u-eyebrow">Suggested</span>
                  <span>{f.action}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className={s.findingsFoot}>
            <Button size="sm" variant="ghost" onClick={onGoAgents}>
              Re-run the auditor
            </Button>
          </div>
        </Panel>
      </div>

      {/* ── holdings ────────────────────────────────────── */}
      <Panel
        title="Holdings"
        meta={
          <div className={s.sortRow}>
            {(
              [
                ['value', 'Value'],
                ['pnl', 'P&L'],
                ['day', 'Today'],
              ] as [SortKey, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                className={`${s.sortBtn} ${sortKey === k ? s.sortOn : ''}`}
                onClick={() => setSortKey(k)}
              >
                {label}
              </button>
            ))}
          </div>
        }
        pad={false}
      >
        <div className={s.tableScroll}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Instrument</th>
                <th className={s.right}>Qty</th>
                <th className={s.right}>Avg</th>
                <th className={s.right}>Last</th>
                <th className={s.right}>Value</th>
                <th className={s.right}>P&amp;L</th>
                <th className={s.right}>Today</th>
                <th>22-day</th>
                <th>Broker</th>
                <th>Entered via</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol}>
                  <td>
                    <div className={s.instCell}>
                      <span className={`u-num ${s.instSym}`}>{r.symbol}</span>
                      <span className={s.instName}>{r.name}</span>
                    </div>
                  </td>
                  <td className={`u-num ${s.right}`}>{num(r.qty, 0)}</td>
                  <td className={`u-num ${s.right} ${s.dim}`}>{num(r.avg)}</td>
                  <td className={`u-num ${s.right}`}>{num(r.last)}</td>
                  <td className={`u-num ${s.right}`}>{compactINR(r.value)}</td>
                  <td className={s.right}>
                    <div className={`u-num ${r.pnl >= 0 ? 'u-gain' : 'u-loss'}`}>
                      {r.pnl >= 0 ? '+' : '\u2212'}
                      {compactINR(Math.abs(r.pnl))}
                    </div>
                    <div className={s.subPct}>{pct(r.pnlPct, 1)}</div>
                  </td>
                  <td className={s.right}>
                    <Delta value={r.dayChangePct} size="sm" arrow={false} />
                  </td>
                  <td>
                    <Sparkline values={r.spark} width={70} height={22} />
                  </td>
                  <td className={s.dim}>{r.broker}</td>
                  <td className={s.source}>{r.source}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total</td>
                <td className={`u-num ${s.right}`}>{compactINR(p.value)}</td>
                <td className={s.right}>
                  <div className={`u-num ${p.pnl >= 0 ? 'u-gain' : 'u-loss'}`}>
                    {p.pnl >= 0 ? '+' : '\u2212'}
                    {compactINR(Math.abs(p.pnl))}
                  </div>
                  <div className={s.subPct}>{pct(p.pnlPct, 1)}</div>
                </td>
                <td className={s.right}>
                  <Delta value={p.dayPnlPct} size="sm" arrow={false} />
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {/* ── stress replay ───────────────────────────────── */}
      <Panel title="Stress replay" meta="This exact book, through past drawdowns">
        <div className={s.stressGrid}>
          <ul className={s.stressList}>
            {STRESS_SCENARIOS.map((sc) => {
              const worse = sc.book < sc.nifty;
              return (
                <li key={sc.name} className={s.stressRow}>
                  <span className={s.stressName}>{sc.name}</span>
                  <span className={s.stressBars}>
                    <span className={s.stressBarWrap}>
                      <span className={s.barLabel}>NIFTY</span>
                      <span className={s.barTrack}>
                        <span
                          className={s.barFill}
                          style={{ width: `${(Math.abs(sc.nifty) / 55) * 100}%`, background: 'var(--text-mute)' }}
                        />
                      </span>
                      <span className="u-num">{pct(sc.nifty, 1)}</span>
                    </span>
                    <span className={s.stressBarWrap}>
                      <span className={s.barLabel}>Book</span>
                      <span className={s.barTrack}>
                        <span
                          className={s.barFill}
                          style={{ width: `${(Math.abs(sc.book) / 55) * 100}%`, background: 'var(--loss)' }}
                        />
                      </span>
                      <span className={`u-num ${worse ? 'u-loss' : ''}`}>{pct(sc.book, 1)}</span>
                    </span>
                  </span>
                  <span className={s.stressDays}>
                    <span className="u-num">{sc.days}</span> days to trough
                  </span>
                </li>
              );
            })}
          </ul>
          <aside className={s.stressNote}>
            <h4 className={`u-display ${s.stressNoteTitle}`}>How to read this</h4>
            <p>
              Each row replays a historical drawdown over today&rsquo;s weights, not over whatever you
              held at the time. It answers one question: if that month happened again tomorrow, what
              would this book do?
            </p>
            <p>
              Four of the five scenarios hurt more than the index. That is the concentration finding
              above, expressed in rupees instead of correlation numbers.
            </p>
            <Stat
              label="Worst case on current weights"
              value={pct(-41.2, 1)}
              sub="Mar 2020 replay, 33 sessions"
              tone="loss"
            />
          </aside>
        </div>
      </Panel>
    </div>
  );
}

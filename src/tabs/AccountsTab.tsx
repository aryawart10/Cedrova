import { useEffect, useMemo, useRef, useState } from 'react';
import { Donut, donutHue } from '../components/Donut';
import { Sparkline } from '../components/Sparkline';
import { Button, Delta, Empty, Panel, SectionHead, Segmented, Stat, Tag } from '../components/ui';
import {
  BROKERS,
  ORDER_LOG,
  STATUS_LABEL,
  brokerName,
  type Broker,
  type BrokerStatus,
} from '../data/brokers';
import {
  findingsFor,
  holdingRows,
  portfolioSummary,
  sectorAllocation,
  stressReplay,
  type Scope,
} from '../data/portfolio';
import { compactINR, money, num, pct } from '../lib/format';
import s from './AccountsTab.module.css';

const CONNECT_STEPS = [
  'Opening broker login in a new window',
  'Awaiting your consent on the broker screen',
  'Exchanging request token for an access token',
  'Fetching holdings, positions and order history',
  'Subscribing to the tick stream',
];

type SortKey = 'value' | 'pnl' | 'day';

/* Connection state lives in the component, not in the data module. BROKERS is a
   module constant, and a user who adds a broker has to see it join the rail. */
type StatusMap = Record<string, BrokerStatus>;
const SEED_STATUS: StatusMap = Object.fromEntries(BROKERS.map((b) => [b.id, b.status]));

const isLinked = (st: BrokerStatus) => st === 'connected' || st === 'needs-reauth';

export function AccountsTab({
  focus,
  onFocus,
  onGoBuild,
}: {
  /** Which account the page is scoped to. null means all accounts. Lifted to
      App so the command palette can deep-link straight to one broker. */
  focus: string | null;
  onFocus: (id: string | null) => void;
  onGoBuild: () => void;
}) {
  const [status, setStatus] = useState<StatusMap>(SEED_STATUS);
  const [adding, setAdding] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [hoverSlice, setHoverSlice] = useState<number | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'rejected'>('all');

  const linked = BROKERS.filter((b) => isLinked(status[b.id]));
  const candidates = BROKERS.filter((b) => !isLinked(status[b.id]));

  /* Asking for an account that is not connected yet opens the add panel
     instead of showing an empty page under its name. */
  const focusStatus = focus ? status[focus] : undefined;
  const active = focusStatus && isLinked(focusStatus) ? BROKERS.find((b) => b.id === focus) ?? null : null;
  const scope: Scope = active ? active.id : null;

  useEffect(() => {
    if (focus && focusStatus && !isLinked(focusStatus)) setAdding(true);
  }, [focus, focusStatus]);

  /* Per-broker figures for the rail, derived from the holdings themselves so a
     tile can never disagree with the table underneath it. */
  const perBroker = useMemo(() => {
    const out: Record<string, { value: number; count: number }> = {};
    for (const b of BROKERS) {
      const rows = holdingRows(b.id);
      out[b.id] = { value: rows.reduce((a, r) => a + r.value, 0), count: rows.length };
    }
    return out;
  }, []);

  const all = useMemo(() => portfolioSummary(null), []);
  const p = useMemo(() => portfolioSummary(scope), [scope]);
  const alloc = useMemo(() => sectorAllocation(scope), [scope]);
  const findings = useMemo(() => findingsFor(scope), [scope]);
  const stress = useMemo(() => stressReplay(scope), [scope]);

  const hasRows = p.rows.length > 0;
  const rows = [...p.rows].sort((a, b) =>
    sortKey === 'value' ? b.value - a.value : sortKey === 'pnl' ? b.pnl - a.pnl : b.dayChangePct - a.dayChangePct,
  );

  const highs = findings.filter((f) => f.severity === 'high').length;
  const worseThanIndex = stress.filter((r) => r.book < r.nifty).length;
  const worst = stress.reduce((a, b) => (b.book < a.book ? b : a));
  const barMax = Math.max(55, ...stress.map((r) => Math.abs(r.book)));

  const logRows = ORDER_LOG.filter((o) => !scope || o.brokerId === scope).filter(
    (o) => logFilter === 'all' || o.status === 'REJECTED',
  );

  function setBrokerStatus(id: string, next: BrokerStatus) {
    setStatus((m) => ({ ...m, [id]: next }));
    if (!isLinked(next) && focus === id) onFocus(null);
  }

  return (
    <div className={s.tab}>
      <SectionHead
        no="03"
        title="Accounts"
        lede={
          <>
            Every broker you have connected, and the book they add up to, on one screen. Cedrova does
            not hold your money &mdash; it holds a token, routes orders to the broker you already use,
            and reads back what actually filled. Pick an account to see only that account.
          </>
        }
        aside={
          <>
            <Stat
              label={active ? active.name : `Across ${linked.length} accounts`}
              value={compactINR(p.value)}
              align="right"
            />
            <Button size="sm" variant="solid" onClick={() => setAdding(true)}>
              Add broker
            </Button>
          </>
        }
      />

      {/* ── active accounts: the switcher for the whole page ── */}
      <div className={s.rail} role="group" aria-label="Active accounts">
        <button
          type="button"
          className={`${s.tile} ${scope === null ? s.tileOn : ''}`}
          aria-pressed={scope === null}
          onClick={() => onFocus(null)}
        >
          <span className={s.tileTop}>
            <span className={s.markStack} aria-hidden>
              {linked.slice(0, 4).map((b) => (
                <span
                  key={b.id}
                  className={s.markMini}
                  style={{
                    background: `oklch(0.92 0.045 ${b.markHue})`,
                    color: `oklch(0.36 0.12 ${b.markHue})`,
                  }}
                >
                  {b.mark}
                </span>
              ))}
            </span>
            {scope === null && <span className={s.onTag}>Viewing</span>}
          </span>
          <span className={`u-display ${s.tileName}`}>All accounts</span>
          <span className={`u-num ${s.tileValue}`}>{compactINR(all.value)}</span>
          <span className={s.tileSub}>
            {linked.length} brokers &middot; {all.rows.length} positions
          </span>
        </button>

        {linked.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`${s.tile} ${scope === b.id ? s.tileOn : ''}`}
            aria-pressed={scope === b.id}
            onClick={() => onFocus(b.id)}
          >
            <span className={s.tileTop}>
              <span
                className={s.mark}
                style={{
                  background: `oklch(0.92 0.045 ${b.markHue})`,
                  color: `oklch(0.36 0.12 ${b.markHue})`,
                }}
                aria-hidden
              >
                {b.mark}
              </span>
              {scope === b.id ? <span className={s.onTag}>Viewing</span> : <StatusChip status={status[b.id]} />}
            </span>
            <span className={`u-display ${s.tileName}`}>{b.name}</span>
            <span className={`u-num ${s.tileValue}`}>
              {perBroker[b.id].count > 0 ? compactINR(perBroker[b.id].value) : '\u2014'}
            </span>
            <span className={s.tileSub}>
              {perBroker[b.id].count} positions &middot; {b.lastSync ?? 'never synced'}
            </span>
          </button>
        ))}

        <button type="button" className={`${s.tile} ${s.tileAdd}`} onClick={() => setAdding(true)}>
          <span className={s.plus} aria-hidden>
            +
          </span>
          <span className={`u-display ${s.tileName}`}>Add broker</span>
          <span className={s.tileSub}>
            {candidates.length} more {candidates.length === 1 ? 'adapter' : 'adapters'} available
          </span>
        </button>
      </div>

      {adding && (
        <AddBrokerPanel
          candidates={candidates}
          status={status}
          onConnected={(id) => setBrokerStatus(id, 'connected')}
          onClose={() => setAdding(false)}
        />
      )}

      {active && (
        <div className={s.scopeBar}>
          <span>
            Showing <strong>{active.name}</strong> only. Allocation, risk, stress and orders below are
            this account alone.
          </span>
          <Button size="sm" variant="quiet" onClick={() => onFocus(null)}>
            Show all accounts
          </Button>
        </div>
      )}

      {/* ── headline figures ─────────────────────────────── */}
      {hasRows ? (
        <div className={`${s.summary} u-rise`}>
          <div>
            <div className="u-eyebrow">{active ? `${active.name} value` : 'Current value'}</div>
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
      ) : (
        <Empty
          title="No holdings synced yet"
          body={
            active
              ? `${active.name} is connected, but this build ships with fixed demo data and carries no rows for it. Nothing here is invented to fill the gap.`
              : 'No connected account has any holdings.'
          }
          action={
            <Button size="sm" variant="ghost" onClick={() => onFocus(null)}>
              Back to all accounts
            </Button>
          }
        />
      )}

      {/* ── connection detail, only when scoped to one broker ── */}
      {active && (
        <>
          <div className={s.detailHero}>
            <div>
              <div className={s.detailTop}>
                <StatusChip status={status[active.id]} />
                <Tag>{active.legal}</Tag>
              </div>
              <p className={s.detailNote}>{active.note}</p>
              <dl className={s.detailFacts}>
                <div>
                  <dt>Authentication</dt>
                  <dd>{active.authKind}</dd>
                </div>
                <div>
                  <dt>Client</dt>
                  <dd className="u-num">{active.clients ?? 'Not assigned'}</dd>
                </div>
                <div>
                  <dt>Last sync</dt>
                  <dd>{active.lastSync ?? 'Never'}</dd>
                </div>
                <div>
                  <dt>Charges</dt>
                  <dd>{active.charges}</dd>
                </div>
              </dl>
            </div>

            <Connection
              key={active.id}
              broker={active}
              status={status[active.id]}
              onStatus={(next) => setBrokerStatus(active.id, next)}
            />
          </div>

          <Panel title="Capability matrix" meta="What this adapter can and cannot do">
            <CapabilityList broker={active} />
          </Panel>
        </>
      )}

      {hasRows && (
        <>
          {/* ── allocation + risk ─────────────────────────── */}
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
                    {hoverSlice != null && alloc[hoverSlice] ? (
                      <>
                        <span className={s.donutCenterLabel}>{alloc[hoverSlice].sector}</span>
                        <span className={`u-num ${s.donutCenterValue}`}>
                          {(alloc[hoverSlice].share * 100).toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={s.donutCenterLabel}>
                          {alloc.length} {alloc.length === 1 ? 'sector' : 'sectors'}
                        </span>
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
                  {highs > 0 && <Tag tone="loss">{highs} high</Tag>}
                </>
              }
            >
              {findings.length === 0 ? (
                <Empty title="Nothing flagged" body="The auditor found no open risks on this account." />
              ) : (
                <ul className={s.findings}>
                  {findings.map((f) => (
                    <li key={f.title} className={`${s.finding} ${s[`f_${f.severity}`]}`}>
                      <div className={s.findingTop}>
                        <span className={s.severity}>{f.severity}</span>
                        <h4 className={s.findingTitle}>{f.title}</h4>
                        {active && f.crossAccount && (
                          <span className={s.crossTag}>spans {f.accounts.length} accounts</span>
                        )}
                      </div>
                      <p className={s.findingDetail}>{f.detail}</p>
                      <div className={s.findingAction}>
                        <span className="u-eyebrow">Suggested</span>
                        <span>{f.action}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className={s.findingsFoot}>
                {active && findings.some((f) => f.crossAccount) && (
                  <p className={s.footNote}>
                    Findings marked as spanning accounts cannot be fixed inside {active.name} alone.
                    Switch to all accounts to act on them.
                  </p>
                )}
                <Button size="sm" variant="ghost" onClick={onGoBuild}>
                  Ask the risk auditor &rarr;
                </Button>
              </div>
            </Panel>
          </div>

          {/* ── holdings ──────────────────────────────────── */}
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
                    {!active && <th>Broker</th>}
                    <th>Entered via</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.brokerId}-${r.symbol}`}>
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
                      {!active && <td className={s.dim}>{brokerName(r.brokerId)}</td>}
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
                    <td colSpan={active ? 2 : 3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>

          {/* ── stress replay ─────────────────────────────── */}
          <Panel
            title="Stress replay"
            meta={active ? `${active.name} weights, through past drawdowns` : 'This exact book, through past drawdowns'}
          >
            <div className={s.stressGrid}>
              <ul className={s.stressList}>
                {stress.map((sc) => {
                  const worseRow = sc.book < sc.nifty;
                  return (
                    <li key={sc.name} className={s.stressRow}>
                      <span className={s.stressNameCell}>
                        <span className={s.stressName}>{sc.name}</span>
                        <span className={s.stressCarried}>
                          {'\u2212'}
                          {compactINR(Math.abs(sc.rupees))}
                          {sc.worstSector ? `, mostly ${sc.worstSector}` : ''}
                        </span>
                      </span>
                      <span className={s.stressBars}>
                        <span className={s.stressBarWrap}>
                          <span className={s.barLabel}>NIFTY</span>
                          <span className={s.barTrack}>
                            <span
                              className={s.barFill}
                              style={{
                                width: `${(Math.abs(sc.nifty) / barMax) * 100}%`,
                                background: 'var(--text-mute)',
                              }}
                            />
                          </span>
                          <span className="u-num">{pct(sc.nifty, 1)}</span>
                        </span>
                        <span className={s.stressBarWrap}>
                          <span className={s.barLabel}>Book</span>
                          <span className={s.barTrack}>
                            <span
                              className={s.barFill}
                              style={{
                                width: `${(Math.abs(sc.book) / barMax) * 100}%`,
                                background: 'var(--loss)',
                              }}
                            />
                          </span>
                          <span className={`u-num ${worseRow ? 'u-loss' : ''}`}>{pct(sc.book, 1)}</span>
                        </span>
                      </span>
                      <span className={s.stressDays}>
                        <span className="u-num">{sc.days}</span> sessions to trough
                      </span>
                    </li>
                  );
                })}
              </ul>
              <aside className={s.stressNote}>
                <h4 className={`u-display ${s.stressNoteTitle}`}>How to read this</h4>
                <p>
                  Each row replays a historical drawdown over today&rsquo;s weights, not over whatever
                  you held at the time. It answers one question: if that month happened again tomorrow,
                  what would this book do?
                </p>
                <p>
                  {worseThanIndex} of the {stress.length} windows hurt more than the index on{' '}
                  {active ? `the ${active.name} book.` : 'these weights.'} Sector mix, not the number of
                  holdings, is what decides that.
                </p>
                <Stat
                  label="Worst case on current weights"
                  value={pct(worst.book, 1)}
                  sub={`${worst.name.split('\u2014')[0].trim()} replay, ${worst.days} sessions`}
                  tone="loss"
                />
              </aside>
            </div>
          </Panel>
        </>
      )}

      {/* ── order log ───────────────────────────────────── */}
      <Panel
        title="Order log"
        meta={
          <Segmented
            label="Filter orders"
            value={logFilter}
            onChange={setLogFilter}
            options={[
              { id: 'all', label: 'All' },
              { id: 'rejected', label: 'Problems' },
            ]}
          />
        }
        pad={false}
      >
        {logRows.length === 0 ? (
          <div className={s.emptyPad}>
            <Empty
              title="No orders here"
              body={
                logFilter === 'rejected'
                  ? 'Nothing was rejected or cancelled in this scope today.'
                  : 'No orders were routed to this account today.'
              }
            />
          </div>
        ) : (
          <div className={s.tableScroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Instrument</th>
                  <th>Side</th>
                  <th className={s.right}>Qty</th>
                  <th className={s.right}>Price</th>
                  <th>Product</th>
                  {!active && <th>Broker</th>}
                  <th>Origin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logRows.map((o, i) => (
                  <tr key={i}>
                    <td className="u-num">{o.time}</td>
                    <td className={s.sym}>{o.symbol}</td>
                    <td>
                      <span className={o.side === 'BUY' ? s.buy : s.sell}>{o.side}</span>
                    </td>
                    <td className={`u-num ${s.right}`}>{num(o.qty, 0)}</td>
                    <td className={`u-num ${s.right}`}>{num(o.price)}</td>
                    <td className={s.dim}>{o.product}</td>
                    {!active && <td className={s.dim}>{brokerName(o.brokerId)}</td>}
                    <td className={s.origin}>{o.origin}</td>
                    <td>
                      <span className={`${s.orderStatus} ${s[`os_${o.status}`]}`}>{o.status}</span>
                      {o.reason && <div className={s.reason}>{o.reason}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className={s.disclaimer}>
        Nothing on this screen talks to a real broker. The adapters, capability gaps and charges listed
        are accurate as of October 2026, but connecting is simulated in this build and the holdings are
        fixed demo data.
      </p>
    </div>
  );
}

/* ── status chip ─────────────────────────────────────────── */

function StatusChip({ status }: { status: BrokerStatus }) {
  return (
    <span className={`${s.chip} ${s[`c_${status}`]}`}>
      <span className={s.chipDot} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ── capability matrix ───────────────────────────────────── */

function CapabilityList({ broker }: { broker: Broker }) {
  return (
    <>
      <ul className={s.capList}>
        {broker.capabilities.map((c) => (
          <li key={c.label} className={`${s.cap} ${c.supported ? s.capYes : s.capNo}`}>
            <span className={s.capMark}>{c.supported ? '\u2713' : '\u2715'}</span>
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
      {broker.capabilities.some((c) => !c.supported) && (
        <p className={s.capNote}>
          Unsupported capabilities are emulated by Cedrova where it is safe to do so, and refused where
          it is not. A stop loss that only exists on our side during market hours is refused for
          overnight positions.
        </p>
      )}
    </>
  );
}

/* ── the simulated connection run ────────────────────────── */

function useConnect(opts: { initialDone?: boolean; onDone?: () => void }) {
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(!!opts.initialDone);
  const timers = useRef<number[]>([]);
  const cb = useRef(opts.onDone);

  useEffect(() => {
    cb.current = opts.onDone;
  });

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function start() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setDone(false);
    setStep(0);
    CONNECT_STEPS.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setStep(i + 1);
          if (i === CONNECT_STEPS.length - 1) {
            setDone(true);
            cb.current?.();
          }
        }, 520 * (i + 1)),
      );
    });
  }

  return { step, done, running: step >= 0 && !done, start };
}

function Stepper({ step, done }: { step: number; done: boolean }) {
  return (
    <ol className={s.steps}>
      {CONNECT_STEPS.map((st, i) => {
        const state = done || i < step ? 'done' : i === step ? 'now' : 'todo';
        return (
          <li key={st} className={`${s.step} ${s[`st_${state}`]}`}>
            <span className={s.stepMark}>
              {state === 'done' ? '\u2713' : state === 'now' ? '\u25CF' : '\u25CB'}
            </span>
            {st}
          </li>
        );
      })}
    </ol>
  );
}

const TOKEN_FINE =
  'Cedrova stores only the access token, never your password or TOTP secret. Simulated in this build: no window opens and no request leaves your machine.';

/* Connection panel for the account currently in view. */
function Connection({
  broker,
  status,
  onStatus,
}: {
  broker: Broker;
  status: BrokerStatus;
  onStatus: (next: BrokerStatus) => void;
}) {
  const { step, done, running, start } = useConnect({
    initialDone: status === 'connected',
    onDone: () => onStatus('connected'),
  });
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  return (
    <Panel
      title="Connection"
      meta={done ? <Tag tone="gain">Live</Tag> : running ? <Tag tone="accent">Working</Tag> : <Tag tone="loss">Expired</Tag>}
    >
      <Stepper step={step} done={done} />
      <div className={s.connActions}>
        <Button variant="solid" size="sm" onClick={start} disabled={running}>
          {running ? 'Connecting\u2026' : done ? 'Re-authenticate' : 'Reconnect'}
        </Button>
        {done && !confirmRevoke && (
          <Button variant="danger" size="sm" onClick={() => setConfirmRevoke(true)}>
            Revoke token
          </Button>
        )}
        {confirmRevoke && (
          <>
            <Button variant="danger" size="sm" onClick={() => onStatus('disconnected')}>
              Confirm revoke
            </Button>
            <Button variant="quiet" size="sm" onClick={() => setConfirmRevoke(false)}>
              Keep it
            </Button>
          </>
        )}
      </div>
      {confirmRevoke && (
        <p className={s.warnNote}>
          Revoking drops {broker.name} out of the account list and removes its holdings from the book
          until you connect it again.
        </p>
      )}
      <p className={s.connFine}>{TOKEN_FINE}</p>
    </Panel>
  );
}

/* ── add broker ──────────────────────────────────────────── */

function AddBrokerPanel({
  candidates,
  status,
  onConnected,
  onClose,
}: {
  candidates: Broker[];
  status: StatusMap;
  onConnected: (id: string) => void;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);

  return (
    <Panel
      title="Add a broker"
      meta={
        <Button size="sm" variant="quiet" onClick={onClose}>
          Close
        </Button>
      }
    >
      <p className={s.addLede}>
        Connect as many accounts as you like. Cedrova treats them as one book for risk, and still lets
        you look at each one on its own.
      </p>

      {added.length > 0 && (
        <p className={s.addedNote}>
          Connected just now: <strong>{added.join(', ')}</strong>. Pick another, or close this panel and
          it is in the list above.
        </p>
      )}

      {candidates.length === 0 ? (
        <Empty
          title="Every adapter is connected"
          body="All the brokers Cedrova supports are linked to this account. New adapters appear here as they ship."
        />
      ) : (
        <div className={s.addGrid}>
          {candidates.map((b, i) => (
            <AddCard
              key={b.id}
              broker={b}
              status={status[b.id]}
              index={i}
              open={target === b.id}
              onOpen={() => setTarget(b.id)}
              onCancel={() => setTarget(null)}
              onDone={() => {
                onConnected(b.id);
                setAdded((a) => [...a, b.name]);
                setTarget(null);
              }}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function AddCard({
  broker,
  status,
  index,
  open,
  onOpen,
  onCancel,
  onDone,
}: {
  broker: Broker;
  status: BrokerStatus;
  index: number;
  open: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  const supported = broker.capabilities.filter((c) => c.supported).length;
  const soon = status === 'coming-soon';

  return (
    <article className={`${s.card} u-rise`} style={{ ['--i' as string]: index }}>
      <div className={s.tileTop}>
        <span
          className={s.mark}
          style={{
            background: `oklch(0.92 0.045 ${broker.markHue})`,
            color: `oklch(0.36 0.12 ${broker.markHue})`,
          }}
          aria-hidden
        >
          {broker.mark}
        </span>
        <StatusChip status={status} />
      </div>

      <h4 className={`u-display ${s.cardName}`}>{broker.name}</h4>
      <div className={s.cardLegal}>{broker.legal}</div>

      <dl className={s.cardFacts}>
        <div>
          <dt>Auth</dt>
          <dd>{broker.authKind}</dd>
        </div>
        <div>
          <dt>Supports</dt>
          <dd className="u-num">
            {supported}/{broker.capabilities.length} capabilities
          </dd>
        </div>
        <div>
          <dt>Charges</dt>
          <dd>{broker.charges}</dd>
        </div>
      </dl>

      <p className={s.cardNote}>{broker.note}</p>

      {open ? (
        <ConnectRun onDone={onDone} onCancel={onCancel} />
      ) : (
        <div className={s.cardActions}>
          <Button size="sm" variant={soon ? 'quiet' : 'solid'} disabled={soon} onClick={onOpen}>
            {soon ? 'Not available yet' : 'Connect'}
          </Button>
        </div>
      )}
    </article>
  );
}

/* Starts on mount: the user already pressed Connect to get here. */
function ConnectRun({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { step, done, running, start } = useConnect({ onDone });

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={s.runBox}>
      <Stepper step={step} done={done} />
      <div className={s.connActions}>
        {running ? (
          <Button size="sm" variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Tag tone="gain">Connected</Tag>
        )}
      </div>
      <p className={s.connFine}>{TOKEN_FINE}</p>
    </div>
  );
}

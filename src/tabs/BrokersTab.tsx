import { useEffect, useRef, useState } from 'react';
import { Button, Panel, SectionHead, Segmented, Stat, Tag } from '../components/ui';
import { BROKERS, ORDER_LOG, STATUS_LABEL, type Broker } from '../data/brokers';
import { compactINR, num } from '../lib/format';
import s from './BrokersTab.module.css';

const CONNECT_STEPS = [
  'Opening broker login in a new window',
  'Awaiting your consent on the broker screen',
  'Exchanging request token for an access token',
  'Fetching holdings, positions and order history',
  'Subscribing to the tick stream',
];

export function BrokersTab() {
  const [focus, setFocus] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'rejected'>('all');
  const selected = focus ? BROKERS.find((b) => b.id === focus)! : null;

  const connectedValue = BROKERS.filter((b) => b.status === 'connected').reduce(
    (a, b) => a + (b.holdingsValue ?? 0),
    0,
  );
  const rows = logFilter === 'all' ? ORDER_LOG : ORDER_LOG.filter((o) => o.status === 'REJECTED');

  return (
    <div className={s.tab}>
      <SectionHead
        no="04"
        title="Brokers"
        lede={
          <>
            alphaOS does not hold your money. It holds a token, routes orders to the broker you already
            use, and reads back what actually filled. Every adapter is listed with what it cannot do.
          </>
        }
        aside={
          <>
            <Stat label="Across connected accounts" value={compactINR(connectedValue)} align="right" />
          </>
        }
      />

      {selected ? (
        <BrokerDetail broker={selected} onBack={() => setFocus(null)} />
      ) : (
        <div className={s.grid}>
          {BROKERS.map((b, i) => (
            <BrokerCard key={b.id} broker={b} index={i} onOpen={() => setFocus(b.id)} />
          ))}
        </div>
      )}

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
                <th>Broker</th>
                <th>Origin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o, i) => (
                <tr key={i}>
                  <td className="u-num">{o.time}</td>
                  <td className={s.sym}>{o.symbol}</td>
                  <td>
                    <span className={o.side === 'BUY' ? s.buy : s.sell}>{o.side}</span>
                  </td>
                  <td className={`u-num ${s.right}`}>{num(o.qty, 0)}</td>
                  <td className={`u-num ${s.right}`}>{num(o.price)}</td>
                  <td className={s.dim}>{o.product}</td>
                  <td className={s.dim}>{o.broker}</td>
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
      </Panel>

      <p className={s.disclaimer}>
        Nothing on this screen talks to a real broker. The adapters, capability gaps and charges listed
        are accurate as of October 2026, but connecting is simulated in this build.
      </p>
    </div>
  );
}

function BrokerCard({ broker, index, onOpen }: { broker: Broker; index: number; onOpen: () => void }) {
  const supported = broker.capabilities.filter((c) => c.supported).length;
  return (
    <article className={`${s.card} u-rise`} style={{ ['--i' as string]: index }}>
      <div className={s.cardTop}>
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
        <StatusChip status={broker.status} />
      </div>

      <h3 className={`u-display ${s.cardName}`}>{broker.name}</h3>
      <div className={s.cardLegal}>{broker.legal}</div>

      {broker.status === 'connected' || broker.status === 'needs-reauth' ? (
        <dl className={s.cardFacts}>
          <div>
            <dt>Client</dt>
            <dd className="u-num">{broker.clients}</dd>
          </div>
          <div>
            <dt>Holdings</dt>
            <dd className="u-num">{compactINR(broker.holdingsValue ?? 0)}</dd>
          </div>
          <div>
            <dt>Open positions</dt>
            <dd className="u-num">{broker.positions ?? 0}</dd>
          </div>
          <div>
            <dt>Last sync</dt>
            <dd>{broker.lastSync}</dd>
          </div>
        </dl>
      ) : (
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
      )}

      <p className={s.cardNote}>{broker.note}</p>

      <div className={s.cardActions}>
        <Button size="sm" variant="ghost" onClick={onOpen}>
          {broker.status === 'connected' ? 'Manage' : broker.status === 'needs-reauth' ? 'Reconnect' : 'Details'}
        </Button>
        {broker.status === 'disconnected' && (
          <Button size="sm" variant="solid" onClick={onOpen}>
            Connect
          </Button>
        )}
      </div>
    </article>
  );
}

function StatusChip({ status }: { status: Broker['status'] }) {
  return (
    <span className={`${s.chip} ${s[`c_${status}`]}`}>
      <span className={s.chipDot} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function BrokerDetail({ broker, onBack }: { broker: Broker; onBack: () => void }) {
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(broker.status === 'connected');
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function connect() {
    timers.current.forEach(clearTimeout);
    setDone(false);
    setStep(0);
    CONNECT_STEPS.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setStep(i + 1);
          if (i === CONNECT_STEPS.length - 1) setDone(true);
        }, 520 * (i + 1)),
      );
    });
  }

  const running = step >= 0 && !done;

  return (
    <div className={s.detail}>
      <button className={s.backBtn} onClick={onBack}>
        &larr; All brokers
      </button>

      <div className={s.detailHero}>
        <div>
          <div className={s.cardTop} style={{ justifyContent: 'flex-start', gap: 'var(--s-3)' }}>
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
            <StatusChip status={broker.status} />
            <Tag>{broker.legal}</Tag>
          </div>
          <h3 className={`u-display ${s.detailName}`}>{broker.name}</h3>
          <p className={s.detailNote}>{broker.note}</p>
          <dl className={s.detailFacts}>
            <div>
              <dt>Authentication</dt>
              <dd>{broker.authKind}</dd>
            </div>
            <div>
              <dt>Charges</dt>
              <dd>{broker.charges}</dd>
            </div>
          </dl>
        </div>

        <Panel
          title={broker.status === 'coming-soon' ? 'Not available yet' : 'Connection'}
          meta={done ? <Tag tone="gain">Connected</Tag> : running ? <Tag tone="accent">Working</Tag> : <Tag>Idle</Tag>}
        >
          {broker.status === 'coming-soon' ? (
            <>
              <p className={s.connText}>
                The {broker.name} adapter is still in internal testing. You can register interest and
                alphaOS will enable it on your account when it ships.
              </p>
              <Button size="sm" variant="ghost" full>
                Notify me
              </Button>
            </>
          ) : (
            <>
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
              <div className={s.connActions}>
                <Button variant="solid" size="sm" onClick={connect} disabled={running}>
                  {running ? 'Connecting\u2026' : done ? 'Re-authenticate' : 'Start connection'}
                </Button>
                {done && (
                  <Button variant="danger" size="sm">
                    Revoke token
                  </Button>
                )}
              </div>
              <p className={s.connFine}>
                alphaOS stores only the access token, never your password or TOTP secret. Simulated in
                this build: no window opens and no request leaves your machine.
              </p>
            </>
          )}
        </Panel>
      </div>

      <Panel title="Capability matrix" meta="What this adapter can and cannot do">
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
            Unsupported capabilities are emulated by alphaOS where it is safe to do so, and refused
            where it is not. A stop loss that only exists on our side during market hours is refused
            for overnight positions.
          </p>
        )}
      </Panel>
    </div>
  );
}

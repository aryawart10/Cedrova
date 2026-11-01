import {
  HEDGE_OPTIONS,
  NEWS_DIAGNOSIS,
  ORDER_SPLIT,
  RESEARCH_BRIEF,
  SIGNAL_CHECK,
  TRADEABILITY,
} from '../data/research';
import { Sparkline } from '../components/Sparkline';
import { Button, Tag } from '../components/ui';
import { compactINR, money, pct } from '../lib/format';
import { quoteFor } from '../data/market';
import s from './answers.module.css';

/* ── Signal check ──────────────────────────────────────────── */

export function SignalCheckAnswer() {
  const max = Math.max(...SIGNAL_CHECK.buckets.map((b) => Math.abs(b.fwd)));
  return (
    <div className={s.answer}>
      <section className={s.block}>
        <p className={s.leadQ}>{SIGNAL_CHECK.question}</p>
        <h3 className={`u-display ${s.lead}`}>{SIGNAL_CHECK.answer}</h3>

        <p className="u-eyebrow">Average return over the next 5 days, by how much the stock just fell</p>
        <ul className={s.bucketList}>
          {SIGNAL_CHECK.buckets.map((b) => (
            <li key={b.label} className={s.bucketRow}>
              <span className={s.bucketLabel}>{b.label}</span>
              <div className={s.bucketTrack}>
                <div
                  className={`${s.bucketFill} ${b.fwd >= 0 ? s.fillGain : s.fillLoss}`}
                  style={{ width: `${(Math.abs(b.fwd) / max) * 100}%` }}
                />
              </div>
              <span className={`u-num ${s.bucketValue} ${b.fwd >= 0 ? s.gain : s.loss}`}>{pct(b.fwd)}</span>
            </li>
          ))}
        </ul>

        <div className={s.statRow}>
          {SIGNAL_CHECK.stats.map((st) => (
            <div key={st.label} className={s.statCell}>
              <span className={s.statLabel}>{st.label}</span>
              <strong className={`u-num ${s.statValue}`}>{st.value}</strong>
            </div>
          ))}
        </div>

        <p className={s.caveat}>
          <span className={s.caveatTag}>But</span>
          {SIGNAL_CHECK.caveat}
        </p>
      </section>
    </div>
  );
}

/* ── Why did these stocks fall ─────────────────────────────── */

export function NewsAnswer() {
  const bounceable = NEWS_DIAGNOSIS.filter((n) => n.tone === 'ok').length;
  return (
    <div className={s.answer}>
      <section className={s.block}>
        <h3 className={`u-display ${s.lead}`}>
          {bounceable} of these {NEWS_DIAGNOSIS.length} fell for reasons unrelated to the business.
        </h3>
        <p className={s.leadSub}>
          This is the distinction that decides whether a mean-reversion trade works. A stock that fell because the market
          fell tends to come back. A stock that fell because something changed does not.
        </p>

        <ul className={s.newsList}>
          {NEWS_DIAGNOSIS.map((n) => {
            const q = quoteFor(n.symbol);
            return (
              <li key={n.symbol} className={`${s.newsCard} ${s[`n_${n.tone}`]}`}>
                <div className={s.newsTop}>
                  <span className={s.newsSym}>{n.symbol}</span>
                  <span className={`u-num ${s.loss}`}>{pct(n.fall)}</span>
                  <Tag tone={n.tone === 'ok' ? 'gain' : n.tone === 'bad' ? 'loss' : 'neutral'}>{n.cause}</Tag>
                  <span className={s.newsSpark}>
                    <Sparkline values={q.spark} width={72} height={22} />
                  </span>
                </div>
                <p className={s.newsDetail}>{n.detail}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/* ── Can I actually trade this ─────────────────────────────── */

export function TradeabilityAnswer() {
  return (
    <div className={s.answer}>
      <section className={s.block}>
        <h3 className={`u-display ${s.lead}`}>{TRADEABILITY.verdict}</h3>
        <p className={s.leadSub}>Checked against median traded value in the 15 names the strategy would buy.</p>

        <ul className={s.kvList}>
          {TRADEABILITY.rows.map((r) => (
            <li key={r.label} className={s.kvRow}>
              <span className={s.kvLabel}>{r.label}</span>
              <span className={`u-num ${s.kvValue}`}>{r.value}</span>
            </li>
          ))}
        </ul>

        <p className={s.caveat}>
          <span className={s.caveatTag}>Note</span>
          {TRADEABILITY.note}
        </p>
      </section>
    </div>
  );
}

/* ── Overnight risk ────────────────────────────────────────── */

export function HedgeAnswer() {
  return (
    <div className={s.answer}>
      <section className={s.block}>
        <h3 className={`u-display ${s.lead}`}>Three ways to cover the overnight gap</h3>
        <p className={s.leadSub}>
          An equity basket held overnight cannot be stopped out. If the market gaps down 6% at open, your stop never
          trades. These are the three honest answers.
        </p>

        <ul className={s.hedgeList}>
          {HEDGE_OPTIONS.map((h) => (
            <li key={h.id} className={s.hedgeCard}>
              <div className={s.hedgeTop}>
                <strong className={s.hedgeName}>{h.name}</strong>
                <span className={`u-num ${s.hedgeCost}`}>{h.cost}</span>
              </div>
              <p className={s.hedgeProtects}>
                <span className={s.hedgeKey}>Protects</span>
                {h.protects}
              </p>
              <p className={s.hedgeDetail}>{h.detail}</p>
              <p className={s.hedgeTradeoff}>
                <span className={s.hedgeKey}>Trade-off</span>
                {h.tradeoff}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ── Order routing ─────────────────────────────────────────── */

export function OrderAnswer() {
  return (
    <div className={s.answer}>
      <section className={s.block}>
        <h3 className={`u-display ${s.lead}`}>
          {compactINR(ORDER_SPLIT.total)} across 15 names, split over 3 brokers
        </h3>
        <p className={s.leadSub}>
          {money(ORDER_SPLIT.perName, 0)} per name, equal weight. Allocated by available margin, largest first.
        </p>

        <ul className={s.legList}>
          {ORDER_SPLIT.legs.map((l) => (
            <li key={l.broker} className={s.legRow}>
              <span className={s.legBroker}>{l.broker}</span>
              <div className={s.legTrack}>
                <div className={s.legFill} style={{ width: `${l.share}%` }} />
              </div>
              <span className={`u-num ${s.legShare}`}>{l.share}%</span>
              <span className={`u-num ${s.legNames}`}>{l.names} names</span>
              <span className={`u-num ${s.legValue}`}>{compactINR(l.value)}</span>
              {l.status === 'reauth' ? (
                <Tag tone="loss">Reauth needed</Tag>
              ) : (
                <Tag tone="gain">Ready</Tag>
              )}
            </li>
          ))}
        </ul>

        <div className={s.legActions}>
          <Button variant="solid" size="sm" disabled>
            Send 15 orders
          </Button>
          <span className={s.legDisabled}>Disabled in this prototype</span>
        </div>

        <p className={s.caveat}>
          <span className={s.caveatTag}>Note</span>
          {ORDER_SPLIT.note}
        </p>
      </section>
    </div>
  );
}

/* ── Equity research brief ─────────────────────────────────── */

export function ResearchAnswer({ symbol }: { symbol: string }) {
  const q = quoteFor(symbol);
  return (
    <div className={s.answer}>
      <section className={s.block}>
        <div className={s.resHead}>
          <div>
            <h3 className={`u-display ${s.lead}`}>{symbol}</h3>
            <p className={s.leadSub}>Four things that matter, from the equity research desk.</p>
          </div>
          <div className={s.resPrice}>
            <strong className={`u-num ${s.resLast}`}>{money(q.last)}</strong>
            <span className={`u-num ${q.changePct >= 0 ? s.gain : s.loss}`}>{pct(q.changePct)}</span>
          </div>
        </div>

        <ul className={s.findList}>
          {RESEARCH_BRIEF.findings.map((f) => (
            <li key={f.title} className={`${s.findCard} ${s[`n_${f.tone}`]}`}>
              <p className={s.findTitle}>{f.title}</p>
              <p className={s.findDetail}>{f.detail}</p>
            </li>
          ))}
        </ul>

        <p className={s.caveat}>
          <span className={s.caveatTag}>Note</span>
          {RESEARCH_BRIEF.note}
        </p>
      </section>
    </div>
  );
}

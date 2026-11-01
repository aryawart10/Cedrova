import { useMemo, useState } from 'react';
import {
  BACKTEST_PERIOD,
  COST_LINES,
  MR_EXAMPLE,
  MR_IDEA,
  MR_METRICS,
  MR_RULES,
  MR_STEPS,
  MR_VERDICT,
  SENSITIVITY,
  STRESS_TESTS,
  TAX_LINES,
} from '../data/research';
import { EquityCurve } from '../components/EquityCurve';
import { Button, Tag } from '../components/ui';
import { buildEquityCurve } from '../lib/series';
import { compactINR, pct } from '../lib/format';
import s from './answers.module.css';

/* The answer is ordered the way a research note should be: what the thing
   is, how we tested it, what it cost, then the call. The verdict sits last
   on purpose. Leading with it invites you to skip the evidence. */

export function StrategyAnswer({ capital, onOpenBacktest }: { capital: number; onOpenBacktest: () => void }) {
  const [teamOpen, setTeamOpen] = useState(true);
  const [showExample, setShowExample] = useState(false);

  const scale = capital / MR_VERDICT.moneyline.capital;
  const money = useMemo(
    () => ({
      strategy: MR_VERDICT.moneyline.strategy * scale,
      bench: MR_VERDICT.moneyline.bench * scale,
      fixed: MR_VERDICT.moneyline.fixed * scale,
    }),
    [scale],
  );

  const curves = useMemo(
    () => ({
      strategy: buildEquityCurve('mr-strategy', 198, 0.094, 0.055),
      bench: buildEquityCurve('mr-nifty-tri', 198, 0.113, 0.038),
    }),
    [],
  );

  return (
    <div className={s.answer}>
      {/* ── 1. How this strategy works ── */}
      <section className={s.block}>
        <h3 className={`u-display ${s.blockTitle}`}>How this strategy works</h3>
        <p className={s.idea}>{MR_IDEA}</p>

        <ol className={s.rules}>
          {MR_RULES.map((r, i) => (
            <li key={i} className={s.rule}>
              <span className={s.ruleNo}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className={s.ruleStep}>{r.step}</p>
                <p className={s.ruleWhy}>
                  <span className={s.whyTag}>Why</span>
                  {r.why}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <button className={s.discloseBtn} onClick={() => setShowExample((v) => !v)} aria-expanded={showExample}>
          <span className={`${s.caret} ${showExample ? s.caretOpen : ''}`} aria-hidden>
            &#9656;
          </span>
          One round, as it actually happened
        </button>

        {showExample && (
          <div className={s.example}>
            <p className={s.exampleHead}>
              Bought on <strong>{MR_EXAMPLE.date}</strong>, sold 5 trading days later. Showing 5 of the 15 names.
            </p>
            <table className={s.exTable}>
              <thead>
                <tr>
                  <th>Stock</th>
                  <th className={s.r}>5-day fall</th>
                  <th className={s.r}>Bought</th>
                  <th className={s.r}>Sold</th>
                  <th className={s.r}>Result</th>
                </tr>
              </thead>
              <tbody>
                {MR_EXAMPLE.legs.map((l) => {
                  const ret = ((l.exit - l.entry) / l.entry) * 100;
                  return (
                    <tr key={l.symbol}>
                      <td className={s.sym}>{l.symbol}</td>
                      <td className={`u-num ${s.r} ${s.loss}`}>{pct(l.fall)}</td>
                      <td className={`u-num ${s.r}`}>{l.entry.toFixed(1)}</td>
                      <td className={`u-num ${s.r}`}>{l.exit.toFixed(1)}</td>
                      <td className={`u-num ${s.r} ${ret >= 0 ? s.gain : s.loss}`}>{pct(ret)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className={s.exampleFoot}>
              Three of these five bounced. That ratio, a little better than half, is the whole strategy in one picture.
            </p>
          </div>
        )}
      </section>

      {/* ── 2. The research team ── */}
      <section className={s.block}>
        <button className={s.teamHead} onClick={() => setTeamOpen((v) => !v)} aria-expanded={teamOpen}>
          <span className={`${s.caret} ${teamOpen ? s.caretOpen : ''}`} aria-hidden>
            &#9656;
          </span>
          <span className={`u-display ${s.blockTitle}`}>Your research team</span>
          <span className={s.teamCount}>{MR_STEPS.length} steps</span>
        </button>

        {teamOpen && (
          <ol className={s.steps}>
            {MR_STEPS.map((st) => (
              <li key={st.no} className={s.step}>
                <div className={s.stepTop}>
                  <span className={s.stepNo}>{String(st.no).padStart(2, '0')}</span>
                  <span className={s.stepTitle}>{st.title}</span>
                  <span className={s.stepDesk}>{st.desk}</span>
                </div>
                <p className={`${s.stepFinding} ${s[`f_${st.tone}`]}`}>{st.finding}</p>
                <p className={s.stepDetail}>{st.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── 3. Backtest engine card ── */}
      <section className={s.block}>
        <div className={s.btHead}>
          <h3 className={`u-display ${s.blockTitle}`}>Backtest engine</h3>
          <span className={s.btPeriod}>{BACKTEST_PERIOD}</span>
        </div>

        <div className={s.moneyRow}>
          <div className={s.moneyCell}>
            <span className="u-eyebrow">This strategy</span>
            <strong className={`u-num ${s.moneyBad}`}>{compactINR(money.strategy)}</strong>
            <span className={s.moneySub}>after costs and tax</span>
          </div>
          <div className={s.moneyVs} aria-hidden>
            vs
          </div>
          <div className={s.moneyCell}>
            <span className="u-eyebrow">NIFTY 50 index fund</span>
            <strong className={`u-num ${s.moneyGood}`}>{compactINR(money.bench)}</strong>
            <span className={s.moneySub}>after tax, bought once</span>
          </div>
        </div>
        <p className={s.moneyNote}>
          Starting from {compactINR(capital)}. The index fund ends {compactINR(money.bench - money.strategy)} ahead.
        </p>

        <div className={s.curveWrap}>
          <EquityCurve curve={curves.strategy} benchmark={curves.bench} height={170} label="Strategy vs NIFTY 50 TRI" />
        </div>

        <div className={s.metrics}>
          {MR_METRICS.map((m) => (
            <div key={m.key} className={s.metric} title={m.help}>
              <span className={s.metricLabel}>
                {m.label}
                <span className={s.info} aria-hidden>
                  i
                </span>
              </span>
              <strong className={`u-num ${s.metricValue} ${s[`m_${m.tone}`]}`}>{m.value}</strong>
              {m.bench && <span className={`u-num ${s.metricBench}`}>index {m.bench}</span>}
            </div>
          ))}
        </div>

        <details className={s.details}>
          <summary className={s.summary}>Where the costs go, and the tax assumed</summary>
          <div className={s.costGrid}>
            <div>
              <p className="u-eyebrow">Trading costs, yearly</p>
              <ul className={s.costList}>
                {COST_LINES.map((c) => (
                  <li key={c.label}>
                    <span>{c.label}</span>
                    <span className="u-num">{c.value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="u-eyebrow">Tax assumed</p>
              <ul className={s.costList}>
                {TAX_LINES.map((t) => (
                  <li key={t.label}>
                    <span>{t.label}</span>
                    <span className="u-num">{t.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>

        <details className={s.details}>
          <summary className={s.summary}>How it held up in Indian market stress</summary>
          <ul className={s.stressList}>
            {STRESS_TESTS.map((t) => (
              <li key={t.name} className={s.stressRow}>
                <span className={s.stressName}>{t.name}</span>
                <span className={`u-num ${t.strategy < 0 ? s.loss : s.gain}`}>{pct(t.strategy, 1)}</span>
                <span className={`u-num ${s.stressBench}`}>index {pct(t.bench, 1)}</span>
              </li>
            ))}
          </ul>
        </details>

        <details className={s.details}>
          <summary className={s.summary}>The same rule at nearby settings</summary>
          <p className={s.sensNote}>
            A real edge survives small changes to its settings. If one cell is far better than its neighbours, that cell
            is luck.
          </p>
          <div className={s.sensWrap}>
            <table className={s.sensTable}>
              <thead>
                <tr>
                  <th className={s.sensCorner}>
                    <span className={s.sensColLabel}>{SENSITIVITY.colLabel}</span>
                  </th>
                  {SENSITIVITY.cols.map((c) => (
                    <th key={c} className={`u-num ${s.sensCol}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SENSITIVITY.rows.map((r, ri) => (
                  <tr key={r}>
                    <th className={s.sensRow}>
                      {ri === 0 && <span className={s.sensRowLabel}>{SENSITIVITY.rowLabel}</span>}
                      {r}
                    </th>
                    {SENSITIVITY.grid[ri].map((v, ci) => (
                      <td
                        key={ci}
                        className={`u-num ${s.sensCell}`}
                        style={{ background: `color-mix(in oklch, var(--accent) ${(v - 6.2) * 11}%, transparent)` }}
                      >
                        {v.toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={s.sensNote}>
            Every cell is below the 11.3% an index fund returned. The idea is not fragile, it is just not good enough.
          </p>
        </details>

        <Button variant="ghost" size="sm" onClick={onOpenBacktest}>
          Open the full backtest &rarr;
        </Button>
      </section>

      {/* ── 4. The verdict, last ── */}
      <section className={`${s.block} ${s.verdict}`}>
        <div className={s.verdictTop}>
          <Tag tone="loss" solid>
            Verdict
          </Tag>
          <h3 className={`u-display ${s.verdictHead}`}>{MR_VERDICT.headline}</h3>
        </div>
        <p className={s.verdictBody}>{MR_VERDICT.body}</p>

        <div className={s.fix}>
          <p className={s.fixHead}>The one fix that genuinely helped</p>
          <p className={s.fixBody}>{MR_VERDICT.fix}</p>
          <div className={s.fixBars}>
            {[
              { label: 'As you described it', v: money.strategy, tone: 'bad' as const },
              { label: 'Holding 21 days instead of 5', v: money.fixed, tone: 'warn' as const },
              { label: 'NIFTY 50 index fund', v: money.bench, tone: 'good' as const },
            ].map((b) => (
              <div key={b.label} className={s.fixBar}>
                <span className={s.fixBarLabel}>{b.label}</span>
                <div className={s.fixBarTrack}>
                  <div
                    className={`${s.fixBarFill} ${s[`fb_${b.tone}`]}`}
                    style={{ width: `${(b.v / money.bench) * 100}%` }}
                  />
                </div>
                <span className={`u-num ${s.fixBarValue}`}>{compactINR(b.v)}</span>
              </div>
            ))}
          </div>
        </div>

        <p className={s.disclaimer}>
          Illustrative results from hardcoded data, not a recommendation. Past behaviour of a rule does not predict its
          future behaviour.
        </p>
      </section>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { EquityCurve } from '../components/EquityCurve';
import { Button, Chip, Empty, Panel, Stat, Tag } from '../components/ui';
import {
  AGENTS,
  BUILD_EXAMPLES,
  BUILD_REBALANCE,
  BUILD_RISK,
  BUILD_SIGNALS,
  BUILD_UNIVERSES,
  PICKER,
  agentById,
  recommend,
  type Agent,
  type AgentId,
} from '../data/agents';
import { buildEquityCurve, maxDrawdown, seedFrom, rng } from '../lib/series';
import { pct } from '../lib/format';
import s from './panels.module.css';

/* ──────────────────────────────────────────
   Agent panels.

   These were module 02 until the prompt bar absorbed it. There is no
   reason to make someone leave the place where they are working to
   read an agent's brief or to compile a rule set, so all four
   surfaces now mount inside module 00:

   - BuildStudio  structured rule compiler (the form, not the bar)
   - Specialists  the seven-card gallery
   - AgentDetail  one agent's full brief, with its canned console
   - Matcher      three questions, then a ranked recommendation
   ──────────────────────────────────────────── */

/* ══════════════════════════════════════════════════════════
   BUILD STUDIO
   ══════════════════════════════════════════════════════════ */

type Spec = {
  name: string;
  universe: string;
  rules: string[];
  sizing: string[];
  ambiguities: string[];
  metrics: { cagr: number; sharpe: number; maxDD: number; winRate: number; trades: number };
  curve: number[];
  benchmark: number[];
};

const COMPILE_STEPS = [
  'Parsing intent',
  'Resolving universe and point-in-time constituents',
  'Composing signals',
  'Attaching risk and sizing model',
  'Checking for ambiguous conditions',
  'Running a fast in-sample pass',
];

export function BuildStudio({ onGoStrategies }: { onGoStrategies: () => void }) {
  const [intent, setIntent] = useState(BUILD_EXAMPLES[0]);
  const [universe, setUniverse] = useState('nifty100');
  const [signals, setSignals] = useState<string[]>(['momentum']);
  const [risk, setRisk] = useState('balanced');
  const [rebalance, setRebalance] = useState('monthly');
  const [step, setStep] = useState(-1);
  const [spec, setSpec] = useState<Spec | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const compiling = step >= 0 && step < COMPILE_STEPS.length;

  function compile() {
    timers.current.forEach(clearTimeout);
    setSpec(null);
    setStep(0);
    COMPILE_STEPS.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setStep(i + 1);
          if (i === COMPILE_STEPS.length - 1) {
            setSpec(makeSpec({ intent, universe, signals, risk, rebalance }));
          }
        }, 380 * (i + 1)),
      );
    });
  }

  function toggleSignal(id: string) {
    setSignals((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const ready = signals.length > 0 && intent.trim().length > 12;

  return (
    <div className={s.buildGrid}>
      <div className={s.buildLeft}>
        <Panel
          title="Describe the strategy"
          meta={<Tag tone="agent">Trading Strategy Maker</Tag>}
        >
          <label className="u-sr" htmlFor="intent">
            Strategy description
          </label>
          <textarea
            id="intent"
            className={s.textarea}
            rows={4}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="Plain language is fine. Say what you want to own, when you want out, and what you refuse to do."
          />
          <div className={s.examples}>
            <span className="u-eyebrow">Try</span>
            {BUILD_EXAMPLES.map((ex, i) => (
              <button key={i} className={s.exampleBtn} onClick={() => setIntent(ex)}>
                {ex.length > 64 ? `${ex.slice(0, 62)}\u2026` : ex}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Universe" meta="Pick one">
          <div className={s.chipRow}>
            {BUILD_UNIVERSES.map((u) => (
              <Chip key={u.id} on={universe === u.id} onClick={() => setUniverse(u.id)} detail={u.detail}>
                {u.label}
              </Chip>
            ))}
          </div>
        </Panel>

        <Panel title="Signals" meta={`${signals.length} selected \u00b7 combine freely`}>
          <div className={s.chipRow}>
            {BUILD_SIGNALS.map((sg) => (
              <Chip key={sg.id} on={signals.includes(sg.id)} onClick={() => toggleSignal(sg.id)} detail={sg.detail}>
                {sg.label}
              </Chip>
            ))}
          </div>
        </Panel>

        <div className={s.pairRow}>
          <Panel title="Risk budget" meta="Pick one">
            <div className={s.chipRow}>
              {BUILD_RISK.map((r) => (
                <Chip key={r.id} on={risk === r.id} onClick={() => setRisk(r.id)} detail={r.detail}>
                  {r.label}
                </Chip>
              ))}
            </div>
          </Panel>
          <Panel title="Rebalance" meta="Pick one">
            <div className={s.chipRow}>
              {BUILD_REBALANCE.map((r) => (
                <Chip key={r.id} on={rebalance === r.id} onClick={() => setRebalance(r.id)}>
                  {r.label}
                </Chip>
              ))}
            </div>
          </Panel>
        </div>

        <div className={s.compileBar}>
          <Button variant="solid" onClick={compile} disabled={!ready || compiling}>
            {compiling ? 'Compiling\u2026' : spec ? 'Recompile' : 'Compile strategy'}
          </Button>
          <span className={s.compileHint}>
            {ready
              ? 'Output is a rule set you can read, argue with and send to the backtester.'
              : 'Write at least a sentence and pick one signal.'}
          </span>
        </div>
      </div>

      <div className={s.buildRight}>
        {step < 0 && !spec && (
          <Empty
            title="Nothing compiled yet"
            body="The builder turns a sentence into explicit rules, then tells you which parts of your description were ambiguous. That second part is usually the useful one."
          />
        )}

        {step >= 0 && (
          <Panel title="Compiler" meta={spec ? 'Done' : `Step ${Math.min(step + 1, COMPILE_STEPS.length)} of ${COMPILE_STEPS.length}`}>
            <ol className={s.steps}>
              {COMPILE_STEPS.map((st, i) => (
                <li key={st} className={`${s.step} ${i < step ? s.stepDone : i === step ? s.stepNow : ''}`}>
                  <span className={s.stepMark}>{i < step ? '\u2713' : i === step ? '\u25CF' : '\u25CB'}</span>
                  {st}
                </li>
              ))}
            </ol>
          </Panel>
        )}

        {spec && <SpecCard spec={spec} onGoStrategies={onGoStrategies} />}
      </div>
    </div>
  );
}

function SpecCard({ spec, onGoStrategies }: { spec: Spec; onGoStrategies: () => void }) {
  return (
    <>
      <Panel
        className="u-rise"
        title="Compiled specification"
        meta={<Tag tone="accent">Draft</Tag>}
      >
        <h4 className={`u-display ${s.specName}`}>{spec.name}</h4>
        <p className={s.specUniverse}>{spec.universe}</p>

        <div className="u-eyebrow" style={{ marginTop: 'var(--s-4)' }}>
          Rules
        </div>
        <ol className={s.ruleList}>
          {spec.rules.map((r, i) => (
            <li key={i} className={s.rule}>
              <span className="u-num">{String(i + 1).padStart(2, '0')}</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>

        <div className="u-eyebrow" style={{ marginTop: 'var(--s-5)' }}>
          Position sizing
        </div>
        <ul className={s.sizeList}>
          {spec.sizing.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </Panel>

      <Panel
        className="u-rise"
        title="What you left ambiguous"
        meta={<Tag tone="loss">{spec.ambiguities.length} open</Tag>}
      >
        <ul className={s.ambList}>
          {spec.ambiguities.map((a, i) => (
            <li key={i} className={s.amb}>
              {a}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="u-rise" title="In-sample preview" meta="Not validated. Treat with suspicion.">
        <div className={s.previewStats}>
          <Stat label="CAGR" value={pct(spec.metrics.cagr * 100, 1)} tone={spec.metrics.cagr > 0 ? 'gain' : 'loss'} />
          <Stat label="Sharpe" value={spec.metrics.sharpe.toFixed(2)} />
          <Stat label="Max DD" value={pct(spec.metrics.maxDD * 100, 1)} tone="loss" />
          <Stat label="Win rate" value={`${(spec.metrics.winRate * 100).toFixed(0)}%`} />
        </div>
        <div style={{ marginTop: 'var(--s-4)' }}>
          <EquityCurve curve={spec.curve} benchmark={spec.benchmark} height={148} label="Preview equity curve" />
        </div>
        <p className={s.previewNote}>
          Dashed line is NIFTY 50 over the same window. This pass has no walk-forward split and no
          slippage model, which is exactly why the next step belongs to the Backtesting Specialist.
        </p>
        <div className={s.previewActions}>
          <Button variant="solid" onClick={onGoStrategies}>
            Save as draft strategy
          </Button>
          <Button variant="ghost">Send to Backtesting Specialist</Button>
        </div>
      </Panel>
    </>
  );
}

function makeSpec(input: {
  intent: string;
  universe: string;
  signals: string[];
  risk: string;
  rebalance: string;
}): Spec {
  const uni = BUILD_UNIVERSES.find((u) => u.id === input.universe)!;
  const sigs = BUILD_SIGNALS.filter((x) => input.signals.includes(x.id));
  const rk = BUILD_RISK.find((r) => r.id === input.risk)!;
  const rb = BUILD_REBALANCE.find((r) => r.id === input.rebalance)!;

  const entry: Record<string, string> = {
    momentum: 'Rank the universe on 12-month return excluding the most recent month; take the top decile.',
    trend: 'Require close above both the 50 and 200 day moving average, confirmed for two sessions.',
    reversion: 'Enter when the 20-day z-score of the residual against the sector mean falls below \u22122.0.',
    breakout: 'Enter on a close above the prior 20-day high with volume at least 1.8x the 20-day average.',
    quality: 'Keep only names in the top quintile of a composite of ROCE, debt-to-equity and five-year earnings stability.',
    lowvol: 'Keep only names in the bottom quintile of 60-day realised volatility.',
  };

  const exit: Record<string, string> = {
    momentum: 'Exit when the name falls out of the top three deciles on the next rebalance.',
    trend: 'Exit on a close below the 50 day moving average, no confirmation delay.',
    reversion: 'Exit at z-score above \u22120.3 or after three sessions, whichever comes first.',
    breakout: 'Exit on a close back inside the breakout range or at 2x average true range below entry.',
    quality: 'Exit only on a composite score fall below the median, checked at rebalance.',
    lowvol: 'Exit when realised volatility rises above the universe median.',
  };

  const riskParams: Record<string, { vol: number; cap: number; cagr: number; noise: number }> = {
    conservative: { vol: 8, cap: 6, cagr: 0.142, noise: 0.0072 },
    balanced: { vol: 14, cap: 10, cagr: 0.218, noise: 0.0108 },
    aggressive: { vol: 22, cap: 18, cagr: 0.312, noise: 0.0176 },
  };
  const rp = riskParams[input.risk];

  const rules = [
    `Trade only the ${uni.label} universe, reconstructed point-in-time at each rebalance.`,
    ...sigs.map((sg) => entry[sg.id]),
    ...(sigs.length > 1
      ? ['Require every selected signal to agree; a name enters only on unanimous confirmation.']
      : []),
    ...sigs.map((sg) => exit[sg.id]),
    `Rebalance ${rb.label.toLowerCase()}, placing orders in the first fifteen minutes of the session.`,
    'Skip any name under a 2% circuit, in an F&O ban, or with a 20-day median turnover below \u20B95 Cr.',
    'Hold cash rather than force a position when fewer than three names qualify.',
  ];

  const sizing = [
    `Volatility targeting at ${rp.vol}% annualised portfolio volatility, measured on a 60-day window.`,
    `Hard cap of ${rp.cap}% of capital per name, and 30% per sector.`,
    'Round every quantity down to a whole share; never use margin on the cash leg.',
    'Reduce gross exposure by half when portfolio volatility exceeds 1.5x target for five sessions.',
  ];

  const r = rng(seedFrom(input.intent + input.universe + input.signals.join()));
  const pool = [
    'You said "strong" but not over what lookback. The compiler assumed 12 months; change it if you meant something else.',
    'No instruction for a gap-down open beyond your stop. Default is to exit at market on the open, which can be costly.',
    'Nothing specified about dividends and splits. The backtest will use adjusted prices.',
    'You did not say what happens on a rebalance day that is a market holiday. Default is the next trading day.',
    'Position count is unbounded. With this universe that can mean 40 names and a lot of brokerage.',
    'No maximum holding period. Mean-reversion rules without a time stop tend to accumulate dead positions.',
    'Taxes are not in the rules. Monthly rebalancing on this universe will realise mostly short-term gains.',
  ];
  const ambiguities = pool.filter(() => r() > 0.45).slice(0, 4);
  if (ambiguities.length < 2) ambiguities.push(pool[0], pool[1]);

  const curve = buildEquityCurve(input.intent + input.risk, 504, rp.cagr, rp.noise);
  const benchmark = buildEquityCurve('nifty-benchmark', 504, 0.132, 0.0086);

  const nameBits = sigs.map((x) => x.label).join(' + ');
  return {
    name: `${nameBits || 'Unnamed'} on ${uni.label}`,
    universe: `${uni.label} \u00b7 ${rb.label} rebalance \u00b7 ${rk.label} risk`,
    rules,
    sizing,
    ambiguities,
    metrics: {
      cagr: rp.cagr,
      sharpe: Number((0.7 + r() * 0.9).toFixed(2)),
      maxDD: maxDrawdown(curve),
      winRate: 0.46 + r() * 0.18,
      trades: Math.round(120 + r() * 700),
    },
    curve,
    benchmark,
  };
}

/* ══════════════════════════════════════════════════════════
   SPECIALISTS
   ══════════════════════════════════════════════════════════ */

export function Specialists({
  focus,
  onFocus,
  onUse,
  active,
}: {
  focus: AgentId | null;
  onFocus: (id: AgentId | null) => void;
  /** Pin this specialist as the active model in the prompt bar. */
  onUse?: (id: AgentId) => void;
  active?: AgentId | null;
}) {
  const selected = focus ? agentById(focus) : null;

  if (selected)
    return <AgentDetail agent={selected} onBack={() => onFocus(null)} onUse={onUse} active={active} />;

  return (
    <>
      <p className={s.sectionNote}>
        Seven specialists, each with a narrow brief. Narrow is the point: an agent that will only talk
        about backtest validity is far more useful than one that will cheerfully answer anything.
      </p>
      <div className={s.agentGrid}>
        {AGENTS.map((a, i) => (
          <article key={a.id} className={`${s.agentCard} u-rise`} style={{ ['--i' as string]: i }}>
            <div className={s.agentTop}>
              <span className={`u-num ${s.agentNo}`}>{a.no}</span>
              <StatusDot status={a.status} />
            </div>
            <h3 className={`u-display ${s.agentName}`}>{a.name}</h3>
            <div className={s.agentDiscipline}>{a.discipline}</div>
            <p className={s.agentPitch}>{a.pitch}</p>
            <dl className={s.agentFacts}>
              <div>
                <dt>Horizon</dt>
                <dd>{a.horizon}</dd>
              </div>
              <div>
                <dt>Runs this week</dt>
                <dd className="u-num">{a.runsThisWeek || '\u2014'}</dd>
              </div>
              <div>
                <dt>Median runtime</dt>
                <dd className="u-num">{a.medianRuntime}</dd>
              </div>
            </dl>
            <div className={s.agentActions}>
              <Button size="sm" variant="ghost" onClick={() => onFocus(a.id)}>
                Open brief
              </Button>
              <Button
                size="sm"
                variant="quiet"
                disabled={a.status === 'waitlist'}
                onClick={() => onUse?.(a.id)}
              >
                {a.status === 'waitlist' ? 'Join waitlist' : active === a.id ? 'In use' : 'Use this model'}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function StatusDot({ status }: { status: Agent['status'] }) {
  const label = status === 'live' ? 'Live' : status === 'beta' ? 'Beta' : 'Waitlist';
  return (
    <span className={`${s.statusDot} ${s[`sd_${status}`]}`}>
      <span className={s.statusDotMark} />
      {label}
    </span>
  );
}

export function AgentDetail({
  agent,
  onBack,
  onUse,
  active,
}: {
  agent: Agent;
  onBack: () => void;
  onUse?: (id: AgentId) => void;
  active?: AgentId | null;
}) {
  const [sent, setSent] = useState<string | null>(null);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!sent) return;
    setTyped('');
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setTyped(sent.slice(0, i));
      if (i >= sent.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [sent]);

  return (
    <div className={s.detail}>
      <button className={s.backBtn} onClick={onBack}>
        &larr; All specialists
      </button>

      <div className={s.detailHero}>
        <div>
          <div className={s.detailTop}>
            <span className={`u-num ${s.agentNo}`}>{agent.no}</span>
            <StatusDot status={agent.status} />
            <Tag>{agent.discipline}</Tag>
          </div>
          <h3 className={`u-display ${s.detailName}`}>{agent.name}</h3>
          <p className={s.detailPitch}>{agent.pitch}</p>
          <p className={s.detailAbout}>{agent.about}</p>
          {onUse && agent.status !== 'waitlist' ? (
            <div className={s.detailActions}>
              <Button
                variant={active === agent.id ? 'quiet' : 'solid'}
                disabled={active === agent.id}
                onClick={() => onUse(agent.id)}
              >
                {active === agent.id ? 'Already your model' : 'Use as my model'}
              </Button>
            </div>
          ) : null}
        </div>
        <dl className={s.detailStats}>
          <div>
            <dt>Horizon</dt>
            <dd>{agent.horizon}</dd>
          </div>
          <div>
            <dt>Runs this week</dt>
            <dd className="u-num">{agent.runsThisWeek || '\u2014'}</dd>
          </div>
          <div>
            <dt>Median runtime</dt>
            <dd className="u-num">{agent.medianRuntime}</dd>
          </div>
          <div>
            <dt>Grounded on</dt>
            <dd>{agent.groundedOn.join(', ')}</dd>
          </div>
        </dl>
      </div>

      <div className={s.detailGrid}>
        <Panel title="What it can do">
          <ul className={s.skillList}>
            {agent.skills.map((sk, i) => (
              <li key={i} className={s.skill}>
                <span className="u-num">{String(i + 1).padStart(2, '0')}</span>
                {sk}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Inputs and outputs">
          <div className="u-eyebrow">Consumes</div>
          <ul className={s.ioList}>
            {agent.consumes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="u-eyebrow" style={{ marginTop: 'var(--s-4)' }}>
            Produces
          </div>
          <ul className={s.ioList}>
            {agent.produces.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Panel>

        <Panel
          className={s.consolePanel}
          title="Ask it something"
          meta={sent ? <Tag tone="agent">Responding</Tag> : <Tag>Idle</Tag>}
        >
          <div className={s.promptList}>
            {agent.prompts.map((p) => (
              <button key={p} className={s.promptBtn} onClick={() => setSent(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className={s.console}>
            {!sent ? (
              <p className={s.consoleIdle}>
                Pick a question above. This build has no model wired in, so the response is a canned
                transcript that shows the shape of the answer.
              </p>
            ) : (
              <>
                <div className={s.consoleUser}>
                  <span className="u-eyebrow">You</span>
                  <p>{sent}</p>
                </div>
                <div className={s.consoleAgent}>
                  <span className="u-eyebrow">{agent.name}</span>
                  <p className={s.consoleText}>
                    {typed}
                    {typed.length < canned(agent, sent).length && <span className={s.caret} />}
                  </p>
                </div>
              </>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function canned(agent: Agent, _prompt: string) {
  return `Working on it. In the shipped version this is where ${agent.name.toLowerCase()} streams its reasoning, cites the filings or price series it used, and ends with the specific thing it wants you to decide. Nothing here is a real model call.`;
}

/* ══════════════════════════════════════════════════════════
   MATCHER
   ══════════════════════════════════════════════════════════ */

export function Matcher({ onPick }: { onPick: (id: AgentId) => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answered = PICKER.filter((q) => answers[q.id] != null).length;
  const done = answered === PICKER.length;
  const ranked = useMemo(() => (done ? recommend(answers) : []), [answers, done]);
  const top = ranked[0];

  return (
    <div className={s.matchWrap}>
      <div className={s.matchLeft}>
        <div className={s.progress}>
          <span className="u-eyebrow">
            {answered} of {PICKER.length} answered
          </span>
          <div className={s.progressTrack}>
            <div className={s.progressFill} style={{ width: `${(answered / PICKER.length) * 100}%` }} />
          </div>
        </div>

        {PICKER.map((q, qi) => (
          <fieldset key={q.id} className={s.question}>
            <legend className={s.questionLegend}>
              <span className={`u-num ${s.questionNo}`}>Q{qi + 1}</span>
              <span className={`u-display ${s.questionText}`}>{q.question}</span>
            </legend>
            <p className={s.questionNote}>{q.note}</p>
            <div className={s.optionList}>
              {q.options.map((o, oi) => (
                <button
                  key={o.label}
                  className={`${s.option} ${answers[q.id] === oi ? s.optionOn : ''}`}
                  aria-pressed={answers[q.id] === oi}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                >
                  <span className={s.optionLabel}>{o.label}</span>
                  <span className={s.optionDetail}>{o.detail}</span>
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        {done && (
          <Button variant="quiet" size="sm" onClick={() => setAnswers({})}>
            Start over
          </Button>
        )}
      </div>

      <aside className={s.matchRight}>
        {!done ? (
          <Empty
            title="Answer three questions"
            body="The routing is deliberately simple: your goal, your horizon and what would convince you. Those three decide which specialist is worth your time."
          />
        ) : (
          <>
            <Panel className="u-rise" title="Recommended" meta={<Tag tone="accent">Best fit</Tag>}>
              <h4 className={`u-display ${s.recName}`}>{top.agent.name}</h4>
              <p className={s.recPitch}>{top.agent.pitch}</p>
              <p className={s.recWhy}>{top.agent.about}</p>
              <div className={s.recActions}>
                <Button variant="solid" onClick={() => onPick(top.agent.id)}>
                  Open {top.agent.name.split(' ')[0]} brief
                </Button>
              </div>
            </Panel>

            <Panel className="u-rise" title="Full ranking" meta="Weighted by your answers">
              <ul className={s.rankList}>
                {ranked.map(({ agent, score }) => {
                  const share = score / (top.score || 1);
                  return (
                    <li key={agent.id}>
                      <button className={s.rankBtn} onClick={() => onPick(agent.id)}>
                        <span className={s.rankName}>{agent.name}</span>
                        <span className={s.rankTrack}>
                          <span className={s.rankFill} style={{ width: `${share * 100}%` }} />
                        </span>
                        <span className={`u-num ${s.rankScore}`}>{score}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className={s.rankNote}>
                Agents not listed scored zero on all three answers. Running more than one is normal:
                research then backtest then risk is the usual chain.
              </p>
            </Panel>
          </>
        )}
      </aside>
    </div>
  );
}

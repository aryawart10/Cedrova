import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { classify, extractAmount, extractSymbol, INTENT_DESK, INTENT_LABEL } from '../lib/intent';
import type { Match } from '../lib/intent';
import { UNIVERSE } from '../data/market';
import type { StrategyIdea } from '../data/research';
import { StrategyAnswer } from '../answers/StrategyAnswer';
import { ClarifyStep, IdeaStep, MarketViewAnswer } from '../answers/Flow';
import {
  HedgeAnswer,
  NewsAnswer,
  OrderAnswer,
  ResearchAnswer,
  SignalCheckAnswer,
  TradeabilityAnswer,
} from '../answers/QuickAnswers';
import { AGENTS, agentById } from '../data/agents';
import type { AgentId } from '../data/agents';
import { AGENT_SCOPE, inScope, ownerOf } from '../lib/desk';
import { SectionHead, Tag } from '../components/ui';
import s from './AskTab.module.css';

/* ──────────────────────────────────────────────────────────────
   The universal prompt bar.

   One input, nine destinations. The bar classifies the prompt and
   mounts a purpose-built answer surface rather than returning prose.
   Routing is shown openly on each answer so the demo explains itself.
   ────────────────────────────────────────────────────────────── */

const SUGGESTIONS: { desk: string; items: string[] }[] = [
  {
    desk: 'Strategy builder',
    items: [
      'I want to build a trading strategy',
      'Build me a mean reversion strategy on NIFTY 100',
      'Backtest buying the dip inside an uptrend',
    ],
  },
  {
    desk: 'Macro desk',
    items: ['I think IT stocks will fall over the next quarter', 'I am bullish on private banks'],
  },
  {
    desk: 'Equity research',
    items: ['Why did these stocks fall?', 'Research on RELIANCE', 'Should I buy TCS at this price?'],
  },
  {
    desk: 'Quant and execution',
    items: [
      'Does this signal actually work?',
      'Can I actually trade this with 10 lakh?',
      'How do I hedge the overnight risk?',
      'Place the orders across my brokers',
    ],
  },
];

type Turn = {
  id: number;
  prompt: string;
  match: Match | null;
  working: boolean;
  /** strategy-build is the only multi-step flow */
  stage: 'clarify' | 'ideas' | 'answer';
  capital: number;
  riskPct: number;
  idea: StrategyIdea | null;
  symbol: string | null;
  /** Specialist pinned when the prompt was sent; null means Auto. */
  agent: AgentId | null;
  /** Set when the user tells an out-of-remit specialist to answer anyway. */
  override: boolean;
};

const SYMBOLS = UNIVERSE.map((i) => i.symbol);

/** Desk chatter shown while an answer is being prepared. */
function deskTrace(match: Match | null, agent: AgentId | null): string[] {
  const steps = intentTrace(match);
  if (!agent) return steps;
  return [`${agentById(agent).name} picked it up`, ...steps.slice(1)];
}

function intentTrace(match: Match | null): string[] {
  if (!match) return ['Reading your question'];
  switch (match.id) {
    case 'strategy-build':
      return ['Reading your question', 'Checking the data for survivorship bias', 'Writing the rules'];
    case 'market-view':
      return ['Reading your view', 'Macro desk: finding what would prove it wrong', 'Pricing three expressions'];
    case 'signal-check':
      return ['Sorting the NIFTY 100 into buckets', 'Running the t-test', 'Pricing the trading cost'];
    case 'why-fell':
      return ['Pulling the news window', 'Separating company news from market moves'];
    case 'tradeable':
      return ['Loading traded volumes', 'Modelling slippage at your size'];
    case 'hedge':
      return ['F&O desk: reading the option chain', 'Pricing put and collar'];
    case 'place-orders':
      return ['Checking margin at each broker', 'Splitting the basket'];
    case 'research':
      return ['Equity research: reading four quarters', 'Checking valuation against history'];
    case 'backtest':
      return ['Loading 4,082 trading days', 'Applying Indian costs and tax'];
  }
}

export function AskTab({ onGoStrategies }: { onGoStrategies: () => void }) {
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [agent, setAgent] = useState<AgentId | null>(null);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = (text: string) => {
    const prompt = text.trim();
    if (!prompt) return;
    const match = classify(prompt);
    const amount = extractAmount(prompt);
    const turn: Turn = {
      id: nextId.current++,
      prompt,
      match,
      working: true,
      stage: 'clarify',
      capital: amount && amount >= 10000 ? amount : 1000000,
      riskPct: 20,
      idea: null,
      symbol: extractSymbol(prompt, SYMBOLS),
      agent,
      override: false,
    };
    setTurns((t) => [...t, turn]);
    setDraft('');
  };

  const patch = (id: number, next: Partial<Turn>) =>
    setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...next } : t)));

  /** Handoff: move the turn to the owning desk and pin it going forward. */
  const handoff = (id: number, to: AgentId) => {
    setAgent(to);
    patch(id, { agent: to });
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  const empty = turns.length === 0;
  const pinned = agent ? agentById(agent) : null;

  return (
    <div className={`${s.wrap} ${empty ? s.wrapEmpty : ''}`}>
      {empty ? (
        <div className={s.hero}>
          <p className="u-eyebrow">Module 00 &middot; Build</p>
          <h1 className={`u-display ${s.heroTitle}`}>
            Let&rsquo;s build. <em>Say it in plain English.</em>
          </h1>
          <p className={s.heroLede}>
            {pinned
              ? pinned.about
              : 'One bar for everything: build a strategy, test a signal, find out why a stock fell, check whether you could actually trade it. Leave it on Auto and the right desk picks it up, or pin a specialist below.'}
          </p>

          <Roster active={agent} onPick={setAgent} />

          <PromptBar
            ref={inputRef}
            value={draft}
            onChange={setDraft}
            onSubmit={submit}
            agent={agent}
            big
            placeholder={
              pinned
                ? `Ask ${pinned.name} something\u2026`
                : 'I want to build a mean reversion strategy on NIFTY 100 stocks\u2026'
            }
          />

          {agent && pinned ? (
            <div className={s.suggests}>
              <div className={s.suggestGroup}>
                <p className={s.suggestDesk}>
                  {pinned.name} &middot; {pinned.discipline}
                </p>
                <ul className={s.suggestList}>
                  {pinned.prompts.map((item) => (
                    <li key={item}>
                      <button className={s.suggestBtn} onClick={() => submit(item)}>
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={s.suggestGroup}>
                <p className={s.suggestDesk}>What this desk will take</p>
                <ul className={s.scopeList}>
                  {AGENT_SCOPE[agent].map((i) => (
                    <li key={i}>{INTENT_LABEL[i]}</li>
                  ))}
                </ul>
                <p className={s.scopeNote}>
                  Anything else and it will tell you which desk owns it instead of guessing.
                </p>
              </div>
            </div>
          ) : (
            <div className={s.suggests}>
              {SUGGESTIONS.map((g) => (
                <div key={g.desk} className={s.suggestGroup}>
                  <p className={s.suggestDesk}>{g.desk}</p>
                  <ul className={s.suggestList}>
                    {g.items.map((item) => (
                      <li key={item}>
                        <button className={s.suggestBtn} onClick={() => submit(item)}>
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <SectionHead
            no="00"
            title="Build"
            lede="Each answer shows which desk handled it and what in your wording triggered that."
            aside={
              <button className={s.clearBtn} onClick={() => setTurns([])}>
                Clear thread
              </button>
            }
          />

          <div className={s.thread}>
            {turns.map((t) => (
              <article key={t.id} className={s.turn}>
                <div className={s.promptRow}>
                  <span className={s.promptMark} aria-hidden>
                    &rsaquo;
                  </span>
                  <p className={s.promptText}>{t.prompt}</p>
                </div>

                {t.working ? (
                  <Working steps={deskTrace(t.match, t.agent)} onDone={() => patch(t.id, { working: false })} />
                ) : (
                  <Resolved turn={t} patch={patch} onHandoff={handoff} onGoStrategies={onGoStrategies} />
                )}
              </article>
            ))}
            <div ref={endRef} />
          </div>

          <div className={s.dock}>
            <Roster active={agent} onPick={setAgent} compact />
            <PromptBar
              value={draft}
              onChange={setDraft}
              onSubmit={submit}
              agent={agent}
              placeholder="Ask a follow-up&#8230;"
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ── The desk roster: Auto, or pin one specialist ───────── */

function Roster({
  active,
  onPick,
  compact,
}: {
  active: AgentId | null;
  onPick: (id: AgentId | null) => void;
  compact?: boolean;
}) {
  return (
    <div className={`${s.roster} ${compact ? s.rosterCompact : ''}`}>
      <p className={s.rosterLabel} id="roster-label">
        Model
      </p>
      <div className={s.rosterRow} role="radiogroup" aria-labelledby="roster-label">
        <button
          type="button"
          role="radio"
          aria-checked={active === null}
          className={`${s.pill} ${active === null ? s.pillOn : ''}`}
          onClick={() => onPick(null)}
        >
          <span className={s.pillNo}>00</span>
          Auto
          <span className={s.pillSub}>route for me</span>
        </button>
        {AGENTS.map((a) => {
          const off = a.status === 'waitlist';
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={active === a.id}
              disabled={off}
              title={off ? `${a.name} is on the waitlist and not wired up in this prototype` : a.pitch}
              className={`${s.pill} ${active === a.id ? s.pillOn : ''} ${off ? s.pillOff : ''}`}
              onClick={() => onPick(a.id)}
            >
              <span className={s.pillNo}>{a.no}</span>
              {a.name}
              <span className={s.pillSub}>{off ? 'waitlist' : a.discipline}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Answer, or an honest handoff ─────────────────── */

function Resolved({
  turn,
  patch,
  onHandoff,
  onGoStrategies,
}: {
  turn: Turn;
  patch: (id: number, next: Partial<Turn>) => void;
  onHandoff: (id: number, to: AgentId) => void;
  onGoStrategies: () => void;
}) {
  const intent = turn.match?.id;
  const misrouted = Boolean(turn.agent && intent && !turn.override && !inScope(turn.agent, intent));

  if (misrouted && turn.agent && intent) {
    return (
      <>
        <RouteNote match={turn.match} agent={turn.agent} misrouted />
        <Handoff
          from={turn.agent}
          to={ownerOf(intent)}
          intent={INTENT_LABEL[intent]}
          onHandoff={() => onHandoff(turn.id, ownerOf(intent))}
          onAnyway={() => patch(turn.id, { override: true })}
        />
      </>
    );
  }

  return (
    <>
      <RouteNote match={turn.match} agent={turn.agent} override={turn.override} />
      <AnswerFor turn={turn} patch={patch} onGoStrategies={onGoStrategies} />
    </>
  );
}

function Handoff({
  from,
  to,
  intent,
  onHandoff,
  onAnyway,
}: {
  from: AgentId;
  to: AgentId;
  intent: string;
  onHandoff: () => void;
  onAnyway: () => void;
}) {
  const a = agentById(from);
  const b = agentById(to);
  return (
    <div className={s.handoff}>
      <p className={s.handoffLead}>
        That is a <strong>{intent.toLowerCase()}</strong> question. {a.name} does not cover it &mdash; its remit is{' '}
        {a.discipline.toLowerCase()}, and it would be guessing.
      </p>
      <p className={s.handoffOwner}>
        <span className={s.handoffNo}>{b.no}</span>
        <span>
          <strong>{b.name}</strong> owns this one. {b.pitch}
        </span>
      </p>
      <div className={s.handoffActions}>
        <button className={s.handoffGo} onClick={onHandoff}>
          Hand it to {b.name}
        </button>
        <button className={s.handoffStay} onClick={onAnyway}>
          Let {a.name} try anyway
        </button>
      </div>
    </div>
  );
}

/* ── Routing explainer: makes the mechanism visible ─────────── */

function RouteNote({
  match,
  agent,
  misrouted,
  override,
}: {
  match: Match | null;
  agent: AgentId | null;
  misrouted?: boolean;
  override?: boolean;
}) {
  if (!match) {
    return (
      <p className={s.route}>
        <Tag tone="neutral">No desk matched</Tag>
      </p>
    );
  }
  const a = agent ? agentById(agent) : null;
  return (
    <p className={s.route}>
      <Tag tone={misrouted ? 'loss' : 'agent'}>{a ? a.name : INTENT_DESK[match.id]}</Tag>
      <span className={s.routeLabel}>{INTENT_LABEL[match.id]}</span>
      <span className={s.routeHits}>
        {misrouted
          ? 'outside this desk\u2019s remit'
          : `matched on ${match.hits.slice(0, 3).map((h) => `\u201C${h}\u201D`).join(', ')}`}
      </span>
      {override ? <span className={s.routeWarn}>answered outside remit at your request</span> : null}
    </p>
  );
}

/* ── Simulated desk work ────────────────────────────────────── */

function Working({ steps, onDone }: { steps: string[]; onDone: () => void }) {
  const [at, setAt] = useState(0);

  useEffect(() => {
    if (at >= steps.length) {
      const done = setTimeout(onDone, 260);
      return () => clearTimeout(done);
    }
    const t = setTimeout(() => setAt((v) => v + 1), 420);
    return () => clearTimeout(t);
    // onDone is stable enough for a prototype; re-running on identity
    // changes would restart the trace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, steps.length]);

  return (
    <ul className={s.working} aria-live="polite">
      {steps.slice(0, Math.max(at, 1)).map((st, i) => (
        <li key={st} className={s.workRow}>
          <span className={`${s.workDot} ${i < at ? s.workDone : s.workNow}`} aria-hidden />
          {st}
        </li>
      ))}
    </ul>
  );
}

/* ── Intent to surface ──────────────────────────────────────── */

function AnswerFor({
  turn,
  patch,
  onGoStrategies,
}: {
  turn: Turn;
  patch: (id: number, next: Partial<Turn>) => void;
  onGoStrategies: () => void;
}) {
  const id = turn.match?.id;

  if (id === 'strategy-build' || id === 'backtest') {
    if (turn.stage === 'clarify') {
      return (
        <ClarifyStep
          onDone={(capital, riskPct) => patch(turn.id, { capital, riskPct, stage: 'ideas' })}
        />
      );
    }
    if (turn.stage === 'ideas') {
      return (
        <IdeaStep
          capital={turn.capital}
          riskPct={turn.riskPct}
          onPick={(idea) => patch(turn.id, { idea, stage: 'answer' })}
        />
      );
    }
    return <StrategyAnswer capital={turn.capital} onOpenBacktest={onGoStrategies} />;
  }

  switch (id) {
    case 'market-view':
      return <MarketViewAnswer prompt={turn.prompt} />;
    case 'signal-check':
      return <SignalCheckAnswer />;
    case 'why-fell':
      return <NewsAnswer />;
    case 'tradeable':
      return <TradeabilityAnswer />;
    case 'hedge':
      return <HedgeAnswer />;
    case 'place-orders':
      return <OrderAnswer />;
    case 'research':
      return <ResearchAnswer symbol={turn.symbol ?? 'RELIANCE'} />;
    default:
      return <Unmatched />;
  }
}

function Unmatched() {
  const examples = useMemo(() => SUGGESTIONS.flatMap((g) => g.items).slice(0, 5), []);
  return (
    <div className={s.unmatched}>
      <p className={s.unmatchedLead}>
        I could not tell which desk should take that. This prototype routes nine kinds of request. Try one of these
        shapes:
      </p>
      <ul className={s.unmatchedList}>
        {examples.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

/* ── The bar itself ─────────────────────────────────────────── */

type BarProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  placeholder?: string;
  big?: boolean;
  agent: AgentId | null;
};

const PromptBar = forwardRef<HTMLTextAreaElement, BarProps>(function PromptBar(
  { value, onChange, onSubmit, placeholder, big, agent },
  ref,
) {
  const live = classify(value);
  const pinned = agent ? agentById(agent) : null;
  const strays = Boolean(pinned && live && !inScope(agent!, live.id));
  return (
    <form
      className={`${s.bar} ${big ? s.barBig : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <textarea
        ref={ref}
        className={s.input}
        rows={big ? 3 : 2}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(value);
          }
        }}
        aria-label="Describe what you want to build"
      />
      <div className={s.barFoot}>
        {live ? (
          <span className={`${s.barRoute} ${strays ? s.barStray : ''}`}>
            <span className={s.barRouteDot} aria-hidden />
            {pinned
              ? strays
                ? `${pinned.name} will hand this to ${agentById(ownerOf(live.id)).name}`
                : `${pinned.name} \u00B7 ${INTENT_LABEL[live.id]}`
              : `Routing to ${INTENT_DESK[live.id]}`}
          </span>
        ) : (
          <span className={s.barHint}>
            {pinned ? `${pinned.name} is listening. Shift + Enter for a new line.` : 'Plain English. Shift + Enter for a new line.'}
          </span>
        )}
        <button className={s.send} type="submit" disabled={!value.trim()}>
          Build <kbd className={s.kbd}>&crarr;</kbd>
        </button>
      </div>
    </form>
  );
});

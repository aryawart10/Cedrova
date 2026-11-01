import { useState } from 'react';
import { CAPITAL_PRESETS, RISK_PRESETS, STRATEGY_IDEAS } from '../data/research';
import type { StrategyIdea } from '../data/research';
import { Button, Tag } from '../components/ui';
import { compactINR, money } from '../lib/format';
import s from './answers.module.css';

/* ── The two questions, asked before any strategy work ──────
   Deliberately only two. Every extra field here is a person who
   leaves. Capital sets position size; the loss limit decides whether
   a strategy is even offerable. ── */

export function ClarifyStep({
  onDone,
}: {
  onDone: (capital: number, riskPct: number) => void;
}) {
  const [capital, setCapital] = useState<number | null>(null);
  const [risk, setRisk] = useState<number | null>(null);
  const [custom, setCustom] = useState('');

  const parsed = capital ?? (custom ? Number(custom.replace(/[^0-9]/g, '')) : null);
  const effective = parsed && parsed > 0 ? parsed : null;
  const ready = effective !== null && risk !== null;

  return (
    <div className={s.answer}>
      <section className={s.block}>
        <p className={s.clarifyIntro}>
          Two questions first. Both change the answer, so there is no point guessing them.
        </p>

        <div className={s.question}>
          <p className={s.qLabel}>
            <span className={s.qNo}>01</span>
            How much capital are you putting into this?
          </p>
          <div className={s.qOptions}>
            {CAPITAL_PRESETS.map((c) => (
              <button
                key={c}
                className={`${s.qChip} ${capital === c ? s.qChipOn : ''}`}
                onClick={() => {
                  setCapital(c);
                  setCustom('');
                }}
              >
                {compactINR(c)}
              </button>
            ))}
            <input
              className={s.qInput}
              placeholder="Other amount"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setCapital(null);
              }}
              aria-label="Custom capital amount in rupees"
            />
          </div>
        </div>

        <div className={s.question}>
          <p className={s.qLabel}>
            <span className={s.qNo}>02</span>
            What is the most you can afford to lose on the whole amount?
          </p>
          <div className={s.qOptions}>
            {RISK_PRESETS.map((r) => (
              <button
                key={r}
                className={`${s.qChip} ${risk === r ? s.qChipOn : ''}`}
                onClick={() => setRisk(r)}
              >
                {r}%
              </button>
            ))}
          </div>
          {effective && risk !== null && (
            <p className={s.qEcho}>
              That is {money(effective * (risk / 100), 0)} of {compactINR(effective)}. If a strategy has ever fallen
              further than that, it will not be offered to you.
            </p>
          )}
        </div>

        <Button
          variant="solid"
          onClick={() => {
            if (effective !== null && risk !== null) onDone(effective, risk);
          }}
          disabled={!ready}
        >
          Find strategies that fit
        </Button>
      </section>
    </div>
  );
}

/* ── Three ideas, filtered against the stated loss limit ───── */

export function IdeaStep({
  capital,
  riskPct,
  onPick,
}: {
  capital: number;
  riskPct: number;
  onPick: (idea: StrategyIdea) => void;
}) {
  return (
    <div className={s.answer}>
      <section className={s.block}>
        <h3 className={`u-display ${s.lead}`}>Three ideas that match what you described</h3>
        <p className={s.leadSub}>
          Ranked by how well they fit a {riskPct}% loss limit on {compactINR(capital)}. Each one has been tested; two of
          the three do not beat an index fund, and the cards say so before you pick.
        </p>

        <ul className={s.ideaList}>
          {STRATEGY_IDEAS.map((idea, i) => (
            <li key={idea.id} className={s.ideaCard}>
              <div className={s.ideaTop}>
                <span className={s.ideaNo}>{String(i + 1).padStart(2, '0')}</span>
                <strong className={s.ideaName}>{idea.name}</strong>
                {idea.verdictHint === 'fails' && <Tag tone="loss">Fails the test</Tag>}
                {idea.verdictHint === 'marginal' && <Tag tone="neutral">Marginal</Tag>}
                {idea.verdictHint === 'passes' && <Tag tone="gain">Beats the index</Tag>}
              </div>
              <p className={s.ideaLine}>{idea.oneLine}</p>
              <div className={s.ideaFacts}>
                <span>
                  <span className={s.ideaKey}>Holds</span>
                  {idea.horizon}
                </span>
                <span>
                  <span className={s.ideaKey}>Turnover</span>
                  {idea.turnover}
                </span>
              </div>
              <p className={`${s.ideaFit} ${idea.fitsRisk ? s.fitOk : s.fitBad}`}>
                {idea.fitsRisk ? '\u2713 ' : '\u26A0 '}
                {idea.fitNote}
              </p>
              <Button size="sm" variant={i === 0 ? 'solid' : 'ghost'} onClick={() => onPick(idea)}>
                Research this one
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ── Market view translated into a rule ────────────────────── */

const VIEW_READS = [
  { key: 'Direction', value: 'Down, over weeks rather than days' },
  { key: 'What you are really saying', value: 'The sector reprices lower, not that any one company breaks' },
  { key: 'Cleanest expression', value: 'Short the sector index, or underweight it against NIFTY' },
  { key: 'What would prove you wrong', value: 'Two consecutive quarters of margin expansion in the sector' },
];

const VIEW_ROUTES = [
  {
    name: 'Pair trade: short the sector, long NIFTY',
    fit: 'Best match for the view',
    detail:
      'Short the sector index future, hold an equal rupee amount of NIFTY 50. You are paid if the sector underperforms, regardless of whether the whole market rises or falls.',
    cost: 'Carry about 0.9% a year, plus rollover slippage each expiry',
    tone: 'ok' as const,
  },
  {
    name: 'Buy puts on the sector index',
    fit: 'Use if you think the fall is fast',
    detail:
      'Defined loss, and it pays off most when the move is sharp. If the sector drifts sideways for three months you lose the premium even though your view was not wrong.',
    cost: '2.1% of notional a quarter at current implied volatility',
    tone: 'warn' as const,
  },
  {
    name: 'Simply hold less of it',
    fit: 'The option most people should take',
    detail:
      'If the sector is 14% of your portfolio and you think it falls, taking it to 7% expresses the view with no derivatives, no carry and no expiry.',
    cost: 'Only the tax on what you sell',
    tone: 'ok' as const,
  },
];

export function MarketViewAnswer({ prompt }: { prompt: string }) {
  return (
    <div className={s.answer}>
      <section className={s.block}>
        <p className="u-eyebrow">Your view, as the macro desk read it</p>
        <blockquote className={s.quote}>{prompt}</blockquote>

        <ul className={s.kvList}>
          {VIEW_READS.map((r) => (
            <li key={r.key} className={s.kvRow}>
              <span className={s.kvLabel}>{r.key}</span>
              <span className={s.kvValue}>{r.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.block}>
        <h3 className={`u-display ${s.lead}`}>Three ways to actually trade that view</h3>
        <p className={s.leadSub}>
          A view is not a position. The gap between them is where most money is lost, so here is the same opinion
          expressed three ways, with what each one costs you.
        </p>

        <ul className={s.hedgeList}>
          {VIEW_ROUTES.map((r) => (
            <li key={r.name} className={`${s.hedgeCard} ${s[`n_${r.tone}`]}`}>
              <div className={s.hedgeTop}>
                <strong className={s.hedgeName}>{r.name}</strong>
                <Tag tone={r.tone === 'ok' ? 'gain' : 'neutral'}>{r.fit}</Tag>
              </div>
              <p className={s.hedgeDetail}>{r.detail}</p>
              <p className={s.hedgeTradeoff}>
                <span className={s.hedgeKey}>Costs you</span>
                {r.cost}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Chip, Empty, Panel, SectionHead, Segmented, Stat, Tag } from '../components/ui';
import { agentById } from '../data/agents';
import type { AgentId } from '../data/agents';
import {
  CADENCE_LABEL,
  composeJob,
  crewFor,
  limitsFor,
  runOnce,
  suggestName,
  TRIGGER_LABEL,
  triggersFor,
} from '../data/standing';
import type { Cadence, Finding, JobDraft, StandingAgent, TriggerKind } from '../data/standing';
import s from './AgentsTab.module.css';

/* ──────────────────────────────────────────────────────────────
   Module 04 — the customer's own standing agents.

   The specialists in module 00 are capabilities. An agent here is a
   job: a watch list, a definition of what counts as a change, and a
   crew of specialists it wakes when something crosses. You describe
   the job in a sentence, correct whatever it misread, name it, and
   it starts reporting.
   ────────────────────────────────────────────────────────────── */

type Props = {
  agents: StandingAgent[];
  onAgents: (next: StandingAgent[]) => void;
  /** A sentence handed over from the prompt bar in module 00. */
  seed: string | null;
  onSeedConsumed: () => void;
  /** Agent the command palette asked for; its card opens and scrolls into view. */
  focus: string | null;
  onFocusConsumed: () => void;
  onGoBuild: (agent: AgentId) => void;
};

const EXAMPLES = [
  'Monitor Reliance for me and let me know on any changes that you see',
  'Keep an eye on my portfolio and tell me if the risk gets worse',
  'Watch for any filing from Tata Motors and flag it the same day',
  'Let me know if TCS or Infosys gets a rating change',
];

const TRIGGER_CHOICES: TriggerKind[] = ['price', 'volume', 'filing', 'news', 'rating', 'drawdown'];

const today = () =>
  new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const stamp = () =>
  `Today, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

export function AgentsTab({
  agents,
  onAgents,
  seed,
  onSeedConsumed,
  focus,
  onFocusConsumed,
  onGoBuild,
}: Props) {
  /* A sentence handed over from module 00 is composed at mount, not in an
     effect, so the panel is there on the first paint instead of flashing an
     empty task box first. */
  const [boot] = useState(() => (seed ? composeJob(seed) : null));
  const [task, setTask] = useState(seed ?? '');
  const [draft, setDraft] = useState<JobDraft | null>(boot);
  const [kinds, setKinds] = useState<TriggerKind[]>(boot ? boot.triggers.map((x) => x.kind) : []);
  const [cadence, setCadence] = useState<Cadence>(boot?.cadence ?? 'daily');
  const [name, setName] = useState(boot?.suggestedName ?? '');
  const [renamed, setRenamed] = useState(false);
  const [justMade, setJustMade] = useState<string | null>(null);
  const handled = useRef(seed);

  const compose = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const d = composeJob(t);
    setDraft(d);
    setKinds(d.triggers.map((x) => x.kind));
    setCadence(d.cadence);
    setName(d.suggestedName);
    setRenamed(false);
    setJustMade(null);
  };

  /* Release the sentence back to App once. The tab normally remounts on the
     way in, so `boot` has already done the work; the recompose below only
     matters if a seed ever arrives while this tab is already mounted. */
  useEffect(() => {
    if (!seed) return;
    if (handled.current !== seed) {
      handled.current = seed;
      setTask(seed);
      compose(seed);
    }
    onSeedConsumed();
    // compose and onSeedConsumed are stable for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  /* Everything downstream of the trigger list is re-derived, so editing the
     spec cannot leave a stale crew or a threshold that no longer applies. */
  const triggers = useMemo(
    () => (draft ? triggersFor(draft.scope, draft.watch, kinds) : []),
    [draft, kinds],
  );
  const crew = useMemo(() => (draft ? crewFor(draft.scope, kinds, draft.brief) : []), [draft, kinds]);
  const suggested = useMemo(
    () => (draft ? suggestName(draft.scope, draft.watch, new Set(kinds)) : ''),
    [draft, kinds],
  );
  const limits = useMemo(
    () => (draft ? limitsFor(draft.scope, draft.watch, kinds, cadence) : []),
    [draft, kinds, cadence],
  );
  const shownName = renamed ? name : suggested;

  const reset = () => {
    setDraft(null);
    setTask('');
    setKinds([]);
    setName('');
    setRenamed(false);
  };

  const create = () => {
    if (!draft || !triggers.length || !shownName.trim()) return;
    const made: StandingAgent = {
      id: `sa-${Date.now()}`,
      name: shownName.trim(),
      brief: draft.brief,
      scope: draft.scope,
      watch: draft.watch,
      triggers,
      crew,
      cadence,
      delivery: draft.delivery,
      limits,
      status: 'live',
      created: today(),
      lastRun: 'Not run yet',
      findings: [],
    };
    onAgents([made, ...agents]);
    setJustMade(made.id);
    reset();
  };

  const patch = (id: string, next: Partial<StandingAgent>) =>
    onAgents(agents.map((a) => (a.id === id ? { ...a, ...next } : a)));

  const live = agents.filter((a) => a.status === 'live').length;
  const reports = agents.reduce((n, a) => n + a.findings.length, 0);

  return (
    <div className={s.tab}>
      <SectionHead
        no="04"
        title="Your agents"
        lede={
          <>
            A specialist in module 00 answers one question. An agent here is a standing job: it keeps
            watching, and it says something only when what you asked about actually changes. Describe
            the job in a sentence and it is assembled out of the specialists you already have.
          </>
        }
        aside={
          <>
            <Stat
              label="Standing agents"
              value={`${live} live`}
              sub={agents.length - live > 0 ? `${agents.length - live} paused` : 'none paused'}
              align="right"
            />
            <Stat label="Reports filed" value={reports} align="right" />
          </>
        }
      />

      {/* ── the task box ─────────────────────────────────── */}
      <Panel
        title="Describe the job"
        meta={draft ? 'Step 2 of 2 \u00B7 check and name it' : 'Step 1 of 2'}
      >
        <form
          className={s.taskForm}
          onSubmit={(e) => {
            e.preventDefault();
            compose(task);
          }}
        >
          <textarea
            className={s.taskInput}
            rows={2}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Monitor Reliance for me and let me know on any changes that you see"
            aria-label="Describe what you want an agent to watch"
          />
          <div className={s.taskFoot}>
            <span className={s.taskHint}>
              Plain English. Say what to watch and what would count as worth telling you.
            </span>
            <Button type="submit" variant="solid" disabled={!task.trim()}>
              Compose the agent
            </Button>
          </div>
        </form>

        {!draft && (
          <div className={s.examples}>
            <span className="u-eyebrow">Or start from one of these</span>
            <ul className={s.exampleList}>
              {EXAMPLES.map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    className={s.exampleBtn}
                    onClick={() => {
                      setTask(e);
                      compose(e);
                    }}
                  >
                    {e}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      {/* ── what it read, and what it guessed ────────────── */}
      {draft && (
        <Panel title="The job as I read it" meta={`Wraps ${crew.length} specialists`}>
          <div className={s.spec}>
            <section className={s.specBlock}>
              <span className="u-eyebrow">Watching</span>
              <div className={s.watchRow}>
                {draft.watch.map((w) => (
                  <Tag key={w} tone="accent" solid>
                    {w}
                  </Tag>
                ))}
                <span className={s.scopeNote}>
                  {draft.scope === 'symbols'
                    ? 'Named in your sentence'
                    : draft.scope === 'portfolio'
                      ? 'Every holding at your connected brokers'
                      : 'The index, not a single name'}
                </span>
              </div>
              {draft.hits.length > 0 && (
                <p className={s.hits}>
                  <span className={s.hitsKey}>Read from</span>
                  {draft.hits.map((h) => (
                    <code key={h} className={s.hit}>
                      {h}
                    </code>
                  ))}
                </p>
              )}
            </section>

            <section className={s.specBlock}>
              <span className="u-eyebrow">What counts as a change</span>
              <ul className={s.chipRow}>
                {TRIGGER_CHOICES.map((k) => (
                  <li key={k}>
                    <Chip
                      on={kinds.includes(k)}
                      onClick={() =>
                        setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
                      }
                    >
                      {TRIGGER_LABEL[k]}
                    </Chip>
                  </li>
                ))}
              </ul>
              {triggers.length === 0 ? (
                <p className={s.warn}>
                  With nothing selected this agent can never fire. Pick at least one thing that would
                  be worth waking you for.
                </p>
              ) : (
                <ul className={s.trigList}>
                  {triggers.map((t) => (
                    <li key={t.kind} className={s.trigRow}>
                      <span className={s.trigName}>{TRIGGER_LABEL[t.kind]}</span>
                      <span className={s.trigDetail}>{t.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={s.specBlock}>
              <span className="u-eyebrow">How often it reports</span>
              <Segmented
                label="Reporting cadence"
                value={cadence}
                onChange={setCadence}
                options={[
                  { id: 'intraday', label: CADENCE_LABEL.intraday },
                  { id: 'daily', label: CADENCE_LABEL.daily },
                  { id: 'weekly', label: CADENCE_LABEL.weekly },
                ]}
              />
              <p className={s.deliveryNote}>Delivered to {draft.delivery.join(' and ').toLowerCase()}.</p>
            </section>

            <section className={s.specBlock}>
              <span className="u-eyebrow">The crew inside it</span>
              <p className={s.crewLede}>
                This agent is a wrapper, deliberately. It decides <em>when</em> something has happened;
                the reading of what it means comes from specialists you can also use on their own.
              </p>
              <CrewChain crew={crew} onOpen={onGoBuild} />
            </section>

            {draft.unresolved.length > 0 && (
              <section className={s.specBlock}>
                <span className="u-eyebrow">What your sentence did not say</span>
                <ul className={s.unresolvedList}>
                  {draft.unresolved.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className={s.specBlock}>
              <span className="u-eyebrow">What it will not do</span>
              <ul className={s.limitList}>
                {limits.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </section>

            {/* ── the name ─────────────────────────────── */}
            <section className={`${s.specBlock} ${s.nameBlock}`}>
              <label className={s.nameLabel} htmlFor="agent-name">
                <span className="u-eyebrow">What should it be called?</span>
                <span className={s.nameHint}>
                  {renamed
                    ? 'Your name, kept as typed.'
                    : `Suggested from the job. Edit it and the suggestion stops following your changes.`}
                </span>
              </label>
              <div className={s.nameRow}>
                <input
                  id="agent-name"
                  className={s.nameInput}
                  value={shownName}
                  onChange={(e) => {
                    setRenamed(true);
                    setName(e.target.value);
                  }}
                  placeholder={suggested}
                />
                <Button variant="solid" onClick={create} disabled={!triggers.length || !shownName.trim()}>
                  Create agent
                </Button>
                <Button variant="quiet" onClick={reset}>
                  Discard
                </Button>
              </div>
            </section>
          </div>
        </Panel>
      )}

      {/* ── the roster ───────────────────────────────────── */}
      <div className={s.roster}>
        <h3 className={`u-display ${s.rosterTitle}`}>
          {agents.length > 0 ? 'Running for you' : 'Nothing running yet'}
        </h3>
        {agents.length === 0 ? (
          <Empty
            title="No standing agents"
            body="Describe a job above and it will appear here with its own feed. Until then nothing is watching anything on your behalf."
          />
        ) : (
          <ul className={s.cards}>
            {agents.map((a, i) => (
              <li key={a.id} style={{ ['--i' as string]: i }} className="u-rise">
                <AgentCard
                  agent={a}
                  fresh={a.id === justMade || a.id === focus}
                  reveal={a.id === focus}
                  onRevealed={onFocusConsumed}
                  onOpen={onGoBuild}
                  onRun={() =>
                    patch(a.id, {
                      lastRun: stamp(),
                      findings: [runOnce(a, stamp()), ...a.findings],
                    })
                  }
                  onToggle={() => patch(a.id, { status: a.status === 'live' ? 'paused' : 'live' })}
                  onDelete={() => onAgents(agents.filter((x) => x.id !== a.id))}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── the wrapper, drawn ─────────────────────────────────── */

function CrewChain({ crew, onOpen }: { crew: { agent: AgentId; asked: string }[]; onOpen: (a: AgentId) => void }) {
  return (
    <ol className={s.crew}>
      {crew.map((c, i) => {
        const spec = agentById(c.agent);
        return (
          <li key={c.agent} className={s.crewRow}>
            <span className={s.crewNo} aria-hidden>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className={s.crewBody}>
              <button type="button" className={s.crewName} onClick={() => onOpen(c.agent)}>
                {spec.name}
                <span className={s.crewDisc}>{spec.discipline}</span>
              </button>
              <p className={s.crewAsked}>{c.asked}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── one standing agent ─────────────────────────────────── */

function AgentCard({
  agent,
  fresh,
  reveal,
  onRevealed,
  onOpen,
  onRun,
  onToggle,
  onDelete,
}: {
  agent: StandingAgent;
  fresh: boolean;
  reveal: boolean;
  onRevealed: () => void;
  onOpen: (a: AgentId) => void;
  onRun: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(fresh);
  const quiet = agent.findings.filter((f) => f.action === null).length;
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!reveal) return;
    box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setOpen(true);
    onRevealed();
    // onRevealed is stable; re-running on identity would fight the scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal]);

  return (
    <article
      ref={box}
      className={`${s.card} ${agent.status === 'paused' ? s.cardPaused : ''} ${reveal ? s.cardFocus : ''}`}
    >
      <header className={s.cardHead}>
        <div className={s.cardIdent}>
          <h4 className={`u-display ${s.cardName}`}>{agent.name}</h4>
          <div className={s.cardTags}>
            <Tag tone={agent.status === 'live' ? 'gain' : 'neutral'} solid={agent.status === 'live'}>
              {agent.status === 'live' ? 'Live' : 'Paused'}
            </Tag>
            {agent.watch.map((w) => (
              <Tag key={w} tone="accent">
                {w}
              </Tag>
            ))}
            <Tag tone="agent">{`${agent.crew.length} specialists`}</Tag>
          </div>
        </div>
        <div className={s.cardActions}>
          <Button size="sm" onClick={onRun} disabled={agent.status === 'paused'}>
            Run now
          </Button>
          <Button size="sm" variant="quiet" onClick={onToggle}>
            {agent.status === 'live' ? 'Pause' : 'Resume'}
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </header>

      <p className={s.cardBrief}>
        <span className={s.cardBriefKey}>You asked for</span>
        {agent.brief}
      </p>

      <ul className={s.cardMeta}>
        <li>
          <span className={s.metaKey}>Reports</span>
          {CADENCE_LABEL[agent.cadence]}
        </li>
        <li>
          <span className={s.metaKey}>Last run</span>
          {agent.lastRun}
        </li>
        <li>
          <span className={s.metaKey}>Created</span>
          {agent.created}
        </li>
        <li>
          <span className={s.metaKey}>Fires on</span>
          {agent.triggers.map((t) => TRIGGER_LABEL[t.kind].toLowerCase()).join(', ')}
        </li>
      </ul>

      <button
        type="button"
        className={s.disclose}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`${s.caret} ${open ? s.caretOpen : ''}`} aria-hidden>
          &#9656;
        </span>
        {open ? 'Hide how it is wired' : 'Show how it is wired'}
      </button>

      {open && (
        <div className={s.wiring}>
          <section>
            <span className="u-eyebrow">Thresholds</span>
            <ul className={s.trigList}>
              {agent.triggers.map((t) => (
                <li key={t.kind} className={s.trigRow}>
                  <span className={s.trigName}>{TRIGGER_LABEL[t.kind]}</span>
                  <span className={s.trigDetail}>{t.detail}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <span className="u-eyebrow">Crew</span>
            <CrewChain crew={agent.crew} onOpen={onOpen} />
          </section>
          <section>
            <span className="u-eyebrow">Limits</span>
            <ul className={s.limitList}>
              {agent.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section className={s.feed}>
        <header className={s.feedHead}>
          <span className="u-eyebrow">Feed</span>
          <span className={s.feedCount}>
            {agent.findings.length === 0
              ? 'Nothing filed yet'
              : `${agent.findings.length} report${agent.findings.length === 1 ? '' : 's'}${
                  quiet > 0 ? `, ${quiet} of them nothing-happened` : ''
                }`}
          </span>
        </header>
        {agent.findings.length === 0 ? (
          <p className={s.feedEmpty}>
            It has not reported yet. Run it once if you want to see what it would say today.
          </p>
        ) : (
          <ul className={s.findings}>
            {agent.findings.map((f, i) => (
              <FindingRow key={`${f.at}-${i}`} finding={f} />
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const nothing = finding.action === null;
  return (
    <li className={`${s.finding} ${nothing ? s.findingQuiet : ''}`}>
      <div className={s.findingTop}>
        <span className={`u-num ${s.findingAt}`}>{finding.at}</span>
        <span className={s.findingBy}>{agentById(finding.by).name}</span>
        <Tag tone={nothing ? 'neutral' : 'accent'}>{TRIGGER_LABEL[finding.kind]}</Tag>
      </div>
      <p className={s.findingHead}>{finding.headline}</p>
      <p className={s.findingBody}>{finding.body}</p>
      <p className={s.findingAction}>
        <span className={s.findingActionKey}>{nothing ? 'Nothing to do' : 'Suggested'}</span>
        {finding.action ?? 'No action. This entry exists so a quiet day is visible rather than looking like downtime.'}
      </p>
    </li>
  );
}

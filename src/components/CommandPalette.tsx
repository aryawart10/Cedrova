import { useEffect, useMemo, useRef, useState } from 'react';
import { AGENTS } from '../data/agents';
import { STRATEGIES } from '../data/strategies';
import { UNIVERSE } from '../data/market';
import { BROKERS, type BrokerStatus } from '../data/brokers';
import s from './CommandPalette.module.css';

export type Command = {
  id: string;
  group: 'Modules' | 'Symbols' | 'Agents' | 'Strategies' | 'Brokers' | 'Settings';
  label: string;
  hint?: string;
  run: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  commands: Command[];
};

const linkedStatus = (st: BrokerStatus) => st === 'connected' || st === 'needs-reauth';

export function buildCommands(opts: {
  goModule: (id: string) => void;
  openSymbol: (sym: string) => void;
  openAgent: (id: string) => void;
  openStrategy: (id: string) => void;
  openAccount: (id: string) => void;
  toggleTheme: () => void;
}): Command[] {
  const modules = [
    { id: 'build', label: 'Build' },
    { id: 'markets', label: 'Markets' },
    { id: 'strategies', label: 'Strategies' },
    { id: 'accounts', label: 'Accounts' },
  ];
  return [
    ...modules.map((m) => ({
      id: `mod-${m.id}`,
      group: 'Modules' as const,
      label: `Go to ${m.label}`,
      hint: 'module',
      run: () => opts.goModule(m.id),
    })),
    ...UNIVERSE.map((i) => ({
      id: `sym-${i.symbol}`,
      group: 'Symbols' as const,
      label: i.symbol,
      hint: i.name,
      run: () => opts.openSymbol(i.symbol),
    })),
    ...AGENTS.map((a) => ({
      id: `agent-${a.id}`,
      group: 'Agents' as const,
      label: a.name,
      hint: a.discipline,
      run: () => opts.openAgent(a.id),
    })),
    ...STRATEGIES.map((st) => ({
      id: `str-${st.id}`,
      group: 'Strategies' as const,
      label: st.name,
      hint: st.status,
      run: () => opts.openStrategy(st.id),
    })),
    ...BROKERS.map((b) => ({
      id: `brk-${b.id}`,
      group: 'Brokers' as const,
      label: linkedStatus(b.status) ? `View ${b.name} account` : `Connect ${b.name}`,
      hint: b.legal,
      run: () => opts.openAccount(b.id),
    })),
    {
      id: 'theme',
      group: 'Settings',
      label: 'Switch between paper and ink theme',
      hint: 'appearance',
      run: opts.toggleTheme,
    },
  ];
}

function score(q: string, text: string) {
  const t = text.toLowerCase();
  const i = t.indexOf(q);
  if (i === 0) return 3;
  if (i > 0) return 2;
  // loose subsequence match, so "csm" finds "Cross-sectional Momentum"
  let k = 0;
  for (const ch of t) if (ch === q[k]) k++;
  return k === q.length ? 1 : 0;
}

export function CommandPalette({ open, onClose, commands }: Props) {
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return commands.slice(0, 9);
    return commands
      .map((c) => ({ c, sc: Math.max(score(query, c.label), score(query, c.hint ?? '') * 0.8) }))
      .filter((r) => r.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 24)
      .map((r) => r.c);
  }, [q, commands]);

  useEffect(() => {
    if (open) {
      setQ('');
      setCursor(0);
      // focus after paint so the overlay transition does not eat it
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector('[data-on="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor, results]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') return onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[cursor];
      if (pick) {
        pick.run();
        onClose();
      }
    }
  }

  let lastGroup = '';

  return (
    <div className={s.overlay} onMouseDown={onClose} role="presentation">
      <div
        className={s.sheet}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className={s.inputRow}>
          <span className={s.prompt}>&rsaquo;</span>
          <input
            ref={inputRef}
            className={s.input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            placeholder="Jump to a module, symbol, agent or strategy"
            aria-label="Search commands"
          />
          <kbd className={s.kbd}>esc</kbd>
        </div>

        {results.length === 0 ? (
          <p className={s.none}>Nothing matches &ldquo;{q}&rdquo;.</p>
        ) : (
          <ul className={s.list} ref={listRef}>
            {results.map((c, i) => {
              const showGroup = c.group !== lastGroup;
              lastGroup = c.group;
              return (
                <li key={c.id}>
                  {showGroup && <div className={s.group}>{c.group}</div>}
                  <button
                    type="button"
                    data-on={i === cursor}
                    className={`${s.row} ${i === cursor ? s.rowOn : ''}`}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => {
                      c.run();
                      onClose();
                    }}
                  >
                    <span className={s.rowLabel}>{c.label}</span>
                    {c.hint && <span className={s.rowHint}>{c.hint}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <footer className={s.foot}>
          <span>
            <kbd className={s.kbd}>&uarr;</kbd>
            <kbd className={s.kbd}>&darr;</kbd> navigate
          </span>
          <span>
            <kbd className={s.kbd}>&crarr;</kbd> open
          </span>
        </footer>
      </div>
    </div>
  );
}

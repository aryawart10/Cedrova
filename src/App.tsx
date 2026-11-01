import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brand } from './components/Brand';
import { TickerTape } from './components/TickerTape';
import { CommandPalette, buildCommands } from './components/CommandPalette';
import { AskTab } from './tabs/AskTab';
import { MarketsTab } from './tabs/MarketsTab';
import { AgentsTab } from './tabs/AgentsTab';
import { StrategiesTab } from './tabs/StrategiesTab';
import { BrokersTab } from './tabs/BrokersTab';
import { PortfolioTab } from './tabs/PortfolioTab';
import { BROKERS } from './data/brokers';
import { marketSession, timeLabel } from './lib/format';
import type { AgentId } from './data/agents';
import s from './App.module.css';

export type ModuleId = 'build' | 'markets' | 'agents' | 'strategies' | 'brokers' | 'portfolio';

const MODULES: { id: ModuleId; label: string; no: string }[] = [
  { id: 'build', label: 'Build', no: '00' },
  { id: 'markets', label: 'Markets', no: '01' },
  { id: 'agents', label: 'AI Agents', no: '02' },
  { id: 'strategies', label: 'Strategies', no: '03' },
  { id: 'brokers', label: 'Brokers', no: '04' },
  { id: 'portfolio', label: 'Portfolio', no: '05' },
];

type Theme = 'paper' | 'ink';

export default function App() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('alphaos:theme') as Theme) ?? 'paper',
  );
  const [module, setModule] = useState<ModuleId>('build');
  const [symbol, setSymbol] = useState('RELIANCE');
  const [focusAgent, setFocusAgent] = useState<AgentId | null>(null);
  const [focusStrategy, setFocusStrategy] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('alphaos:theme', theme);
  }, [theme]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'paper' ? 'ink' : 'paper')), []);

  const goModule = useCallback((id: string) => {
    setModule(id as ModuleId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const commands = useMemo(
    () =>
      buildCommands({
        goModule,
        openSymbol: (sym) => {
          setSymbol(sym);
          goModule('markets');
        },
        openAgent: (id) => {
          setFocusAgent(id as AgentId);
          goModule('agents');
        },
        openStrategy: (id) => {
          setFocusStrategy(id);
          goModule('strategies');
        },
        toggleTheme,
      }),
    [goModule, toggleTheme],
  );

  const session = marketSession(clock);
  const connected = BROKERS.filter((b) => b.status === 'connected').length;
  const needsAttention = BROKERS.filter((b) => b.status === 'needs-reauth').length;

  return (
    <div className={s.app}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <button className={s.brandBtn} onClick={() => goModule('build')} aria-label="alphaOS home">
            <Brand />
          </button>

          <nav className={s.nav} aria-label="Modules">
            {MODULES.map((m) => (
              <button
                key={m.id}
                className={`${s.navBtn} ${module === m.id ? s.navOn : ''}`}
                aria-current={module === m.id ? 'page' : undefined}
                onClick={() => goModule(m.id)}
              >
                <span className={s.navNo}>{m.no}</span>
                {m.label}
              </button>
            ))}
          </nav>

          <div className={s.headerRight}>
            <button className={s.search} onClick={() => setPaletteOpen(true)}>
              <span className={s.searchText}>Search</span>
              <kbd className={s.kbd}>&#8984;K</kbd>
            </button>
            <button
              className={s.iconBtn}
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'paper' ? 'ink' : 'paper'} theme`}
              title={`${theme === 'paper' ? 'Ink' : 'Paper'} theme`}
            >
              {theme === 'paper' ? '\u25D1' : '\u25D0'}
            </button>
            <div className={s.account}>
              <span className={s.avatar}>AW</span>
              <span className={s.accountName}>Arya W.</span>
            </div>
          </div>
        </div>
        <TickerTape />
      </header>

      <main className={s.main}>
        {module === 'build' && <AskTab onGoStrategies={() => goModule('strategies')} />}
        {module === 'markets' && <MarketsTab symbol={symbol} onSymbol={setSymbol} onGoAgents={() => goModule('agents')} />}
        {module === 'agents' && (
          <AgentsTab
            focus={focusAgent}
            onFocus={setFocusAgent}
            onGoStrategies={() => goModule('strategies')}
          />
        )}
        {module === 'strategies' && (
          <StrategiesTab
            focus={focusStrategy}
            onFocus={setFocusStrategy}
            onGoAgents={() => goModule('agents')}
            onGoBrokers={() => goModule('brokers')}
          />
        )}
        {module === 'brokers' && <BrokersTab />}
        {module === 'portfolio' && <PortfolioTab onGoAgents={() => goModule('agents')} />}
      </main>

      <footer className={s.status} aria-label="System status">
        <span className={s.statusGroup}>
          <span className={`${s.dot} ${s[`dot_${session.state}`]}`} aria-hidden />
          <strong className={s.statusKey}>
            {session.state === 'open' ? 'Market open' : session.state === 'pre' ? 'Pre-open' : 'Market closed'}
          </strong>
          <span className={s.statusDim}>{session.label}</span>
        </span>
        <span className={`u-num ${s.statusGroup}`}>
          {timeLabel(clock)} <span className={s.statusDim}>IST</span>
        </span>
        <span className={s.spacer} />
        <span className={s.statusGroup}>
          <span className={s.statusDim}>Agents</span> 3 idle &middot; 1 running
        </span>
        <span className={s.statusGroup}>
          <span className={s.statusDim}>Brokers</span> {connected} connected
          {needsAttention > 0 && <span className={s.warn}>{needsAttention} needs reauth</span>}
        </span>
        <span className={`${s.statusGroup} ${s.hideSm}`}>
          <span className={s.statusDim}>Data</span> mock &middot; v0.1.0
        </span>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
}

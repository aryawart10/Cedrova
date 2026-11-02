import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brand } from './components/Brand';
import { TickerTape } from './components/TickerTape';
import { CommandPalette, buildCommands } from './components/CommandPalette';
import { AskTab } from './tabs/AskTab';
import type { BuildEntry } from './tabs/AskTab';
import { MarketsTab } from './tabs/MarketsTab';
import { StrategiesTab } from './tabs/StrategiesTab';
import { PortfolioTab } from './tabs/PortfolioTab';
import { AgentsTab } from './tabs/AgentsTab';
import { SEED_AGENTS } from './data/standing';
import type { StandingAgent } from './data/standing';
import { BROKERS } from './data/brokers';
import { marketSession, timeLabel } from './lib/format';
import type { AgentId } from './data/agents';
import s from './App.module.css';

export type ModuleId = 'build' | 'markets' | 'strategies' | 'portfolio' | 'agents';

const MODULES: { id: ModuleId; label: string; no: string }[] = [
  { id: 'build', label: 'Build', no: '00' },
  { id: 'markets', label: 'Markets', no: '01' },
  { id: 'strategies', label: 'Strategies', no: '02' },
  { id: 'portfolio', label: 'Portfolio', no: '03' },
  { id: 'agents', label: 'Agents', no: '04' },
];

type Theme = 'paper' | 'ink';

export default function App() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('cedrova:theme') as Theme) ?? 'paper',
  );
  const [module, setModule] = useState<ModuleId>('build');
  const [symbol, setSymbol] = useState('RELIANCE');
  const [buildEntry, setBuildEntry] = useState<BuildEntry | null>(null);
  const [focusStrategy, setFocusStrategy] = useState<string | null>(null);
  const [focusAccount, setFocusAccount] = useState<string | null>(null);
  /* Standing agents live here, not in the tab, so the status bar can count
     them and a created agent survives switching modules. */
  const [agents, setAgents] = useState<StandingAgent[]>(SEED_AGENTS);
  const [agentSeed, setAgentSeed] = useState<string | null>(null);
  const [focusAgent, setFocusAgent] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('cedrova:theme', theme);
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
          setBuildEntry({ kind: 'brief', agent: id as AgentId });
          goModule('build');
        },
        openStrategy: (id) => {
          setFocusStrategy(id);
          goModule('strategies');
        },
        openAccount: (id) => {
          setFocusAccount(id);
          goModule('portfolio');
        },
        standing: agents,
        openStanding: (id) => {
          setFocusAgent(id);
          goModule('agents');
        },
        toggleTheme,
      }),
    [goModule, toggleTheme, agents],
  );

  const session = marketSession(clock);
  const connected = BROKERS.filter((b) => b.status === 'connected').length;
  const liveAgents = agents.filter((a) => a.status === 'live').length;
  const needsAttention = BROKERS.filter((b) => b.status === 'needs-reauth').length;

  return (
    <div className={s.app}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <button className={s.brandBtn} onClick={() => goModule('build')} aria-label="Cedrova AI home">
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
        {module === 'build' && (
          <AskTab
            entry={buildEntry}
            onEntryConsumed={() => setBuildEntry(null)}
            onGoStrategies={() => goModule('strategies')}
            onGoAgents={(prompt) => {
              setAgentSeed(prompt);
              goModule('agents');
            }}
          />
        )}
        {module === 'markets' && (
          <MarketsTab
            symbol={symbol}
            onSymbol={setSymbol}
            onGoBuild={() => {
              setBuildEntry({
                kind: 'model',
                agent: 'equity-research',
                prompt: `Research on ${symbol}`,
              });
              goModule('build');
            }}
          />
        )}
        {module === 'strategies' && (
          <StrategiesTab
            focus={focusStrategy}
            onFocus={setFocusStrategy}
            onGoBuild={() => {
              setBuildEntry({ kind: 'studio' });
              goModule('build');
            }}
            onGoPortfolio={() => goModule('portfolio')}
          />
        )}
        {module === 'agents' && (
          <AgentsTab
            agents={agents}
            onAgents={setAgents}
            seed={agentSeed}
            onSeedConsumed={() => setAgentSeed(null)}
            focus={focusAgent}
            onFocusConsumed={() => setFocusAgent(null)}
            onGoBuild={(id) => {
              setBuildEntry({ kind: 'brief', agent: id });
              goModule('build');
            }}
          />
        )}
        {module === 'portfolio' && (
          <PortfolioTab
            focus={focusAccount}
            onFocus={setFocusAccount}
            onGoBuild={() => {
              setBuildEntry({ kind: 'model', agent: 'risk-audit' });
              goModule('build');
            }}
          />
        )}
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
          <span className={s.statusDim}>Agents</span> {liveAgents} live
          {agents.length - liveAgents > 0 && (
            <span className={s.statusDim}>&middot; {agents.length - liveAgents} paused</span>
          )}
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

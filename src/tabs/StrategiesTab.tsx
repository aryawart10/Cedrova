import { useState } from 'react';
import { EquityCurve } from '../components/EquityCurve';
import { Button, Panel, SectionHead, Segmented, Stat, Tag } from '../components/ui';
import { STATUS_COPY, STRATEGIES, metricsFor, type Strategy } from '../data/strategies';
import { compactINR, pct } from '../lib/format';
import s from './StrategiesTab.module.css';

type Props = {
  focus: string | null;
  onFocus: (id: string | null) => void;
  onGoBuild: () => void;
  onGoPortfolio: () => void;
};

type Filter = 'all' | 'live' | 'paper' | 'draft' | 'retired';

export function StrategiesTab({ focus, onFocus, onGoBuild, onGoPortfolio }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = filter === 'all' ? STRATEGIES : STRATEGIES.filter((x) => x.status === filter);
  const selected = focus ? STRATEGIES.find((x) => x.id === focus) : null;

  const liveCapital = STRATEGIES.filter((x) => x.status === 'live').reduce(
    (a, b) => a + (b.capital ?? 0),
    0,
  );

  return (
    <div className={s.tab}>
      <SectionHead
        no="02"
        title="Strategies"
        lede={
          <>
            Everything the builder has compiled, with the backtester&rsquo;s caveats attached. A
            strategy without its caveats is marketing, so they travel together.
          </>
        }
        aside={
          <>
            <Stat label="Live capital" value={compactINR(liveCapital)} align="right" />
            <Segmented
              label="Filter strategies"
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'all', label: 'All' },
                { id: 'live', label: 'Live' },
                { id: 'paper', label: 'Paper' },
                { id: 'draft', label: 'Draft' },
                { id: 'retired', label: 'Retired' },
              ]}
            />
          </>
        }
      />

      {selected ? (
        <Detail strategy={selected} onBack={() => onFocus(null)} onGoPortfolio={onGoPortfolio} />
      ) : (
        <>
          <div className={s.list}>
            {shown.map((st, i) => (
              <Row key={st.id} strategy={st} index={i} onOpen={() => onFocus(st.id)} />
            ))}
          </div>
          <div className={s.ctaRow}>
            <p className={s.ctaText}>
              Need another one? The builder writes the rules, the backtester tries to break them.
            </p>
            <Button variant="solid" onClick={onGoBuild}>
              Open the strategy builder
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ strategy, index, onOpen }: { strategy: Strategy; index: number; onOpen: () => void }) {
  const m = metricsFor(strategy);
  return (
    <article className={`${s.row} u-rise`} style={{ ['--i' as string]: index }}>
      <div className={s.rowId}>
        <div className={s.rowTags}>
          <StatusTag status={strategy.status} />
          <Tag>{strategy.universe}</Tag>
        </div>
        <h3 className={`u-display ${s.rowName}`}>{strategy.name}</h3>
        <p className={s.rowThesis}>{strategy.thesis}</p>
        <div className={s.rowMeta}>
          <span>{strategy.signal}</span>
          <span className={s.dot} />
          <span>{strategy.rebalance}</span>
          <span className={s.dot} />
          <span>
            by {strategy.createdBy}
            {strategy.deployedOn ? ` \u00b7 ${strategy.deployedOn}` : ''}
          </span>
        </div>
      </div>

      <div className={s.rowChart}>
        <EquityCurve curve={m.curve} benchmark={m.benchmark} height={104} showDrawdown={false} />
      </div>

      <dl className={s.rowStats}>
        <div>
          <dt>CAGR</dt>
          <dd className="u-num" style={{ color: 'var(--gain)' }}>
            {pct(strategy.cagr * 100, 1)}
          </dd>
        </div>
        <div>
          <dt>Sharpe</dt>
          <dd className="u-num">{strategy.sharpe.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Max DD</dt>
          <dd className="u-num" style={{ color: 'var(--loss)' }}>
            {pct(m.maxDD * 100, 1)}
          </dd>
        </div>
        <div>
          <dt>Win rate</dt>
          <dd className="u-num">{(strategy.winRate * 100).toFixed(0)}%</dd>
        </div>
      </dl>

      <div className={s.rowAction}>
        <Button size="sm" variant="ghost" onClick={onOpen}>
          Open
        </Button>
      </div>
    </article>
  );
}

function StatusTag({ status }: { status: Strategy['status'] }) {
  const tone = status === 'live' ? 'gain' : status === 'paper' ? 'agent' : status === 'draft' ? 'accent' : 'neutral';
  return (
    <Tag tone={tone as 'gain' | 'agent' | 'accent' | 'neutral'}>
      {status === 'live' ? '\u25CF Live' : status}
    </Tag>
  );
}

function Detail({
  strategy,
  onBack,
  onGoPortfolio,
}: {
  strategy: Strategy;
  onBack: () => void;
  onGoPortfolio: () => void;
}) {
  const m = metricsFor(strategy);
  const years = [
    { y: '2021', r: 0.412 },
    { y: '2022', r: -0.064 },
    { y: '2023', r: 0.238 },
    { y: '2024', r: 0.184 },
    { y: '2025', r: 0.296 },
    { y: '2026 YTD', r: 0.118 },
  ];

  return (
    <div className={s.detail}>
      <button className={s.backBtn} onClick={onBack}>
        &larr; All strategies
      </button>

      <div className={s.detailHero}>
        <div>
          <div className={s.rowTags}>
            <StatusTag status={strategy.status} />
            <Tag>{strategy.universe}</Tag>
          </div>
          <h3 className={`u-display ${s.detailName}`}>{strategy.name}</h3>
          <p className={s.detailThesis}>{strategy.thesis}</p>
          <p className={s.statusCopy}>{STATUS_COPY[strategy.status]}</p>
        </div>
        <dl className={s.detailFacts}>
          <div>
            <dt>Signal</dt>
            <dd>{strategy.signal}</dd>
          </div>
          <div>
            <dt>Rebalance</dt>
            <dd>{strategy.rebalance}</dd>
          </div>
          <div>
            <dt>Exposure</dt>
            <dd>{strategy.exposure}</dd>
          </div>
          <div>
            <dt>Capital</dt>
            <dd className="u-num">{strategy.capital ? compactINR(strategy.capital) : 'Not deployed'}</dd>
          </div>
          <div>
            <dt>Built by</dt>
            <dd>{strategy.createdBy}</dd>
          </div>
        </dl>
      </div>

      <Panel title="Backtest" meta={`${strategy.trades} trades \u00b7 3 years shown`}>
        <div className={s.detailStats}>
          <Stat label="Total return" value={pct(m.totalReturn * 100, 1)} tone="gain" />
          <Stat label="CAGR" value={pct(strategy.cagr * 100, 1)} tone="gain" />
          <Stat label="Sharpe" value={strategy.sharpe.toFixed(2)} />
          <Stat label="Max drawdown" value={pct(m.maxDD * 100, 1)} tone="loss" />
          <Stat label="Win rate" value={`${(strategy.winRate * 100).toFixed(0)}%`} />
        </div>
        <div className={s.detailChart}>
          <EquityCurve curve={m.curve} benchmark={m.benchmark} height={240} />
        </div>
        <p className={s.chartLegend}>
          Solid line is the strategy, dashed is NIFTY 50, and the band underneath is the underwater
          curve. Both start at 100.
        </p>
      </Panel>

      <div className={s.detailGrid}>
        <Panel title="Calendar returns" meta="Gross of tax">
          <ul className={s.yearList}>
            {years.map((yr) => (
              <li key={yr.y} className={s.yearRow}>
                <span className="u-num">{yr.y}</span>
                <span className={s.yearTrack}>
                  <span
                    className={s.yearBar}
                    style={{
                      width: `${Math.min(100, (Math.abs(yr.r) / 0.45) * 100)}%`,
                      background: yr.r >= 0 ? 'var(--gain)' : 'var(--loss)',
                    }}
                  />
                </span>
                <span className={`u-num ${yr.r >= 0 ? 'u-gain' : 'u-loss'}`}>{pct(yr.r * 100, 1)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Caveats from the backtester" meta={<Tag tone="loss">Read these</Tag>}>
          <ul className={s.caveatList}>
            {strategy.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          <p className={s.caveatNote}>
            The Backtesting Specialist attaches these automatically and refuses to remove them. If a
            caveat looks wrong, change the strategy, not the report.
          </p>
        </Panel>

        <Panel title="Execution" meta={strategy.deployedOn ?? 'Not routed'}>
          {strategy.deployedOn ? (
            <>
              <p className={s.execText}>
                Orders route to <strong>{strategy.deployedOn}</strong> in the first fifteen minutes of
                the session. Fills, rejections and partial executions appear in the broker order log.
              </p>
              <Button size="sm" variant="ghost" onClick={onGoPortfolio}>
                View order log
              </Button>
            </>
          ) : (
            <>
              <p className={s.execText}>
                This strategy is not connected to a broker. Paper and draft strategies simulate fills
                at the next bar&rsquo;s open with a 10 bps haircut.
              </p>
              <Button size="sm" variant="ghost" onClick={onGoPortfolio}>
                Connect a broker
              </Button>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

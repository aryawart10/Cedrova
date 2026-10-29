import { useMemo, useState } from 'react';
import { closes, extent, linePath, sma, type Candle } from '../lib/series';
import { dayLabel, monthLabel, num } from '../lib/format';
import { useMeasure } from '../lib/useMeasure';
import s from './PriceChart.module.css';

type Props = {
  candles: Candle[];
  mode: 'area' | 'candle';
  overlays: { sma20: boolean; sma50: boolean; volume: boolean };
  weekly?: boolean;
  height?: number;
};

const PAD = { top: 14, right: 62, bottom: 26, left: 0 };

export function PriceChart({ candles, mode, overlays, weekly = false, height = 360 }: Props) {
  const [box, rect] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const w = rect.width || 800;
  const volH = overlays.volume ? Math.round(height * 0.17) : 0;
  const plotH = height - PAD.top - PAD.bottom - volH - (overlays.volume ? 10 : 0);
  const plotW = Math.max(40, w - PAD.right);

  const geo = useMemo(() => {
    const c = closes(candles);
    const lows = candles.map((d) => d.l);
    const highs = candles.map((d) => d.h);
    const m20 = sma(c, 20);
    const m50 = sma(c, 50);

    const pool =
      mode === 'candle'
        ? [...lows, ...highs]
        : [...c, ...(overlays.sma20 ? m20 : []), ...(overlays.sma50 ? m50 : [])].filter(
            (v): v is number => v != null,
          );
    const [lo, hi] = extent(pool);
    const span = hi - lo || 1;
    const yMin = lo - span * 0.08;
    const yMax = hi + span * 0.08;

    const x = (i: number) => (candles.length === 1 ? plotW / 2 : (i / (candles.length - 1)) * plotW);
    const y = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    const pts = c.map((v, i) => [x(i), y(v)] as [number, number]);
    const linePts = (arr: (number | null)[]) =>
      arr
        .map((v, i) => (v == null ? null : ([x(i), y(v)] as [number, number])))
        .filter((p): p is [number, number] => p != null);

    const ticks: number[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) ticks.push(yMin + ((yMax - yMin) * i) / steps);

    const maxVol = Math.max(...candles.map((d) => d.v));
    const barW = Math.max(1.5, (plotW / candles.length) * 0.62);

    return { c, m20, m50, x, y, pts, linePts, ticks, yMin, yMax, maxVol, barW };
  }, [candles, mode, overlays.sma20, overlays.sma50, plotW, plotH]);

  const first = candles[0];
  const last = candles[candles.length - 1];
  const up = last.c >= first.o;
  const trendColor = up ? 'var(--gain)' : 'var(--loss)';

  const active = hover != null ? candles[hover] : null;
  const areaPath = linePath(geo.pts);
  const pathLen = Math.round(plotW * 1.5);

  const xLabels = useMemo(() => {
    const count = Math.min(6, candles.length);
    const step = Math.max(1, Math.floor((candles.length - 1) / (count - 1 || 1)));
    const out: { i: number; label: string }[] = [];
    for (let i = 0; i < candles.length; i += step) {
      out.push({ i, label: weekly ? monthLabel(candles[i].t) : dayLabel(candles[i].t) });
    }
    return out;
  }, [candles, weekly]);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const bounds = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - bounds.left;
    if (px > plotW + 6) return setHover(null);
    const idx = Math.round((px / plotW) * (candles.length - 1));
    setHover(Math.min(candles.length - 1, Math.max(0, idx)));
  }

  return (
    <div className={s.wrap} ref={box}>
      <svg
        className={s.svg}
        width={w}
        height={height}
        role="img"
        aria-label={`Price chart, ${candles.length} bars, last traded ${num(last.c)}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.2" />
            <stop offset="92%" stopColor={trendColor} stopOpacity="0" />
          </linearGradient>
          <clipPath id="plotClip">
            <rect x="0" y={PAD.top - 4} width={plotW} height={plotH + 8} />
          </clipPath>
        </defs>

        {/* price gridlines + right-hand scale */}
        {geo.ticks.map((t, i) => (
          <g key={i}>
            <line
              x1="0"
              x2={plotW}
              y1={geo.y(t)}
              y2={geo.y(t)}
              stroke="var(--rule-faint)"
              strokeWidth="1"
            />
            <text className={s.axis} x={plotW + 8} y={geo.y(t) + 3.5}>
              {num(t, t > 2000 ? 0 : 1)}
            </text>
          </g>
        ))}

        {/* date scale */}
        {xLabels.map(({ i, label }) => (
          <text
            key={i}
            className={s.axis}
            x={Math.min(geo.x(i), plotW - 2)}
            y={height - 8}
            textAnchor={i === 0 ? 'start' : i >= candles.length - 2 ? 'end' : 'middle'}
          >
            {label}
          </text>
        ))}

        <g clipPath="url(#plotClip)">
          {mode === 'area' ? (
            <>
              <path
                d={`${areaPath} L${plotW} ${PAD.top + plotH} L0 ${PAD.top + plotH} Z`}
                fill="url(#chartFill)"
              />
              <path
                className={s.draw}
                style={{ ['--len' as string]: pathLen }}
                d={areaPath}
                fill="none"
                stroke={trendColor}
                strokeWidth="1.9"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={pathLen}
              />
            </>
          ) : (
            candles.map((d, i) => {
              const cx = geo.x(i);
              const rise = d.c >= d.o;
              const col = rise ? 'var(--gain)' : 'var(--loss)';
              const yo = geo.y(d.o);
              const yc = geo.y(d.c);
              return (
                <g key={d.t} opacity={hover == null || hover === i ? 1 : 0.55}>
                  <line x1={cx} x2={cx} y1={geo.y(d.h)} y2={geo.y(d.l)} stroke={col} strokeWidth="1" />
                  <rect
                    x={cx - geo.barW / 2}
                    y={Math.min(yo, yc)}
                    width={geo.barW}
                    height={Math.max(1, Math.abs(yc - yo))}
                    fill={rise ? 'none' : col}
                    stroke={col}
                    strokeWidth="1"
                  />
                </g>
              );
            })
          )}

          {overlays.sma20 && (
            <path
              d={linePath(geo.linePts(geo.m20))}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.2"
              strokeDasharray="1 0"
            />
          )}
          {overlays.sma50 && (
            <path
              d={linePath(geo.linePts(geo.m50))}
              fill="none"
              stroke="var(--agent)"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
          )}
        </g>

        {/* volume */}
        {overlays.volume &&
          candles.map((d, i) => {
            const h = (d.v / geo.maxVol) * volH;
            return (
              <rect
                key={d.t}
                x={geo.x(i) - geo.barW / 2}
                y={height - PAD.bottom - h}
                width={geo.barW}
                height={h}
                fill={d.c >= d.o ? 'var(--gain)' : 'var(--loss)'}
                opacity={hover === i ? 0.5 : 0.17}
              />
            );
          })}

        {/* last price marker */}
        <g>
          <line
            x1="0"
            x2={plotW}
            y1={geo.y(last.c)}
            y2={geo.y(last.c)}
            stroke={trendColor}
            strokeWidth="1"
            strokeDasharray="3 4"
            opacity="0.6"
          />
          <rect
            x={plotW + 3}
            y={geo.y(last.c) - 9}
            width={PAD.right - 6}
            height="18"
            rx="2"
            fill={trendColor}
          />
          <text
            className={s.lastTag}
            x={plotW + PAD.right / 2}
            y={geo.y(last.c) + 4}
            textAnchor="middle"
          >
            {num(last.c, last.c > 2000 ? 0 : 1)}
          </text>
        </g>

        {/* crosshair */}
        {active && hover != null && (
          <g pointerEvents="none">
            <line
              x1={geo.x(hover)}
              x2={geo.x(hover)}
              y1={PAD.top - 6}
              y2={height - PAD.bottom}
              stroke="var(--rule-strong)"
              strokeWidth="1"
            />
            <circle cx={geo.x(hover)} cy={geo.y(active.c)} r="3.5" fill="var(--surface)" stroke={trendColor} strokeWidth="1.6" />
          </g>
        )}
      </svg>

      {active && hover != null && (
        <div
          className={s.tip}
          style={{
            left: `${Math.min(Math.max(geo.x(hover), 8), plotW - 150)}px`,
            top: `${PAD.top}px`,
          }}
        >
          <div className={s.tipDate}>{weekly ? monthLabel(active.t) : dayLabel(active.t)}</div>
          <dl className={s.tipGrid}>
            <dt>O</dt>
            <dd className="u-num">{num(active.o)}</dd>
            <dt>H</dt>
            <dd className="u-num">{num(active.h)}</dd>
            <dt>L</dt>
            <dd className="u-num">{num(active.l)}</dd>
            <dt>C</dt>
            <dd className="u-num" style={{ color: active.c >= active.o ? 'var(--gain)' : 'var(--loss)' }}>
              {num(active.c)}
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
}

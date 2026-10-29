import { extent, linePath } from '../lib/series';
import { useMeasure } from '../lib/useMeasure';
import s from './EquityCurve.module.css';

type Props = {
  curve: number[];
  benchmark?: number[];
  height?: number;
  showDrawdown?: boolean;
  label?: string;
};

export function EquityCurve({ curve, benchmark, height = 150, showDrawdown = true, label }: Props) {
  const [box, rect] = useMeasure<HTMLDivElement>();
  const w = rect.width || 600;
  const pad = 2;
  const ddH = showDrawdown ? Math.round(height * 0.26) : 0;
  const plotH = height - ddH - (showDrawdown ? 8 : 0);

  const pool = benchmark ? [...curve, ...benchmark] : curve;
  const [lo, hi] = extent(pool);
  const span = hi - lo || 1;

  const x = (i: number, n: number) => (i / (n - 1)) * (w - pad * 2) + pad;
  const y = (v: number) => plotH - ((v - (lo - span * 0.06)) / (span * 1.12)) * plotH;

  const main = linePath(curve.map((v, i) => [x(i, curve.length), y(v)]), false);
  const bench = benchmark
    ? linePath(benchmark.map((v, i) => [x(i, benchmark.length), y(v)]), false)
    : null;

  // underwater curve
  let peak = -Infinity;
  const dd = curve.map((v) => {
    peak = Math.max(peak, v);
    return v / peak - 1;
  });
  const worst = Math.min(...dd) || -0.01;
  const ddPath = showDrawdown
    ? linePath(dd.map((v, i) => [x(i, dd.length), plotH + 8 + (v / worst) * ddH]), false)
    : null;

  const final = curve[curve.length - 1];
  const rising = final >= curve[0];
  const col = rising ? 'var(--gain)' : 'var(--loss)';

  return (
    <div className={s.wrap} ref={box}>
      <svg width={w} height={height} aria-label={label ?? 'Equity curve'} role="img">
        <defs>
          <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.16" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>

        <line x1="0" x2={w} y1={y(curve[0])} y2={y(curve[0])} stroke="var(--rule-faint)" strokeWidth="1" />
        <path d={`${main} L${w - pad} ${plotH} L${pad} ${plotH} Z`} fill="url(#eqFill)" />
        {bench && (
          <path d={bench} fill="none" stroke="var(--text-mute)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
        )}
        <path d={main} fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" />

        {ddPath && (
          <>
            <line x1="0" x2={w} y1={plotH + 8} y2={plotH + 8} stroke="var(--rule-faint)" />
            <path
              d={`${ddPath} L${w - pad} ${plotH + 8} L${pad} ${plotH + 8} Z`}
              fill="var(--loss)"
              opacity="0.16"
            />
            <path d={ddPath} fill="none" stroke="var(--loss)" strokeWidth="1" opacity="0.55" />
          </>
        )}
      </svg>
      {showDrawdown && <span className={s.ddLabel}>drawdown</span>}
    </div>
  );
}

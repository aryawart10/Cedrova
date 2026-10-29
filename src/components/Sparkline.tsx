import { extent, linePath } from '../lib/series';

type Props = {
  values: number[];
  width?: number;
  height?: number;
  tone?: 'auto' | 'gain' | 'loss' | 'accent' | 'mute';
  area?: boolean;
  strokeWidth?: number;
};

let uid = 0;

export function Sparkline({
  values,
  width = 84,
  height = 26,
  tone = 'auto',
  area = true,
  strokeWidth = 1.4,
}: Props) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden />;

  const rising = values[values.length - 1] >= values[0];
  const resolved = tone === 'auto' ? (rising ? 'gain' : 'loss') : tone;
  const stroke =
    resolved === 'gain'
      ? 'var(--gain)'
      : resolved === 'loss'
        ? 'var(--loss)'
        : resolved === 'accent'
          ? 'var(--accent)'
          : 'var(--text-mute)';

  const [lo, hi] = extent(values);
  const pad = (hi - lo) * 0.14 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;
  const inset = strokeWidth;

  const pts = values.map(
    (v, i) =>
      [
        (i / (values.length - 1)) * (width - inset * 2) + inset,
        height - inset - ((v - yMin) / (yMax - yMin)) * (height - inset * 2),
      ] as [number, number],
  );

  const d = linePath(pts);
  const gid = `spk${uid++}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden focusable="false">
      {area && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.26" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L${width - inset} ${height} L${inset} ${height} Z`} fill={`url(#${gid})`} />
        </>
      )}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

import s from './Donut.module.css';

type Slice = { label: string; value: number; share: number };

type Props = { slices: Slice[]; size?: number; thickness?: number; activeIndex?: number | null; onHover?: (i: number | null) => void };

/* Hues walk a controlled range so the ring reads as one family,
   not a rainbow of default chart colours. */
const hueFor = (i: number, n: number) => 38 + (i / Math.max(1, n - 1)) * 232;

export function Donut({ slices, size = 180, thickness = 22, activeIndex = null, onHover }: Props) {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={s.svg} role="img" aria-label="Allocation by sector">
      <g transform={`rotate(-90 ${c} ${c})`}>
        {slices.map((sl, i) => {
          const len = sl.share * circ;
          const dash = `${Math.max(0, len - 1.5)} ${circ - len + 1.5}`;
          const el = (
            <circle
              key={sl.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={`oklch(${activeIndex === i ? 0.58 : 0.64} 0.11 ${hueFor(i, slices.length)})`}
              strokeWidth={activeIndex === i ? thickness + 5 : thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              className={s.arc}
              onMouseEnter={() => onHover?.(i)}
              onMouseLeave={() => onHover?.(null)}
            />
          );
          offset += len;
          return el;
        })}
      </g>
    </svg>
  );
}

export const donutHue = hueFor;

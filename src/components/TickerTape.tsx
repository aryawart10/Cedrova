import { INDICES } from '../data/market';
import { num, pct } from '../lib/format';
import s from './TickerTape.module.css';

export function TickerTape() {
  // duplicated once so the marquee can loop seamlessly
  const run = [...INDICES, ...INDICES];
  return (
    <div className={s.tape} aria-label="Index levels">
      <div className={s.track}>
        {run.map((ix, i) => (
          <span className={s.item} key={`${ix.name}-${i}`} aria-hidden={i >= INDICES.length}>
            <span className={s.name}>{ix.name}</span>
            <span className={`u-num ${s.value}`}>{num(ix.value, ix.value < 100 ? 2 : 0)}</span>
            <span className={`u-num ${ix.changePct >= 0 ? s.up : s.down}`}>{pct(ix.changePct)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

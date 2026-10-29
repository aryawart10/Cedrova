import type { ReactNode } from 'react';
import { pct } from '../lib/format';
import s from './ui.module.css';

/* ── Section heading: numeral + serif title + optional aside ── */

export function SectionHead({
  no,
  title,
  lede,
  aside,
}: {
  no: string;
  title: string;
  lede?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className={s.head}>
      <div className={s.headMain}>
        <span className={s.headNo}>{no}</span>
        <h2 className={`u-display ${s.headTitle}`}>{title}</h2>
        {lede && <p className={s.headLede}>{lede}</p>}
      </div>
      {aside && <div className={s.headAside}>{aside}</div>}
    </header>
  );
}

/* ── Delta: the single most-repeated element in the whole app ── */

export function Delta({
  value,
  dp = 2,
  size = 'md',
  arrow = true,
}: {
  value: number;
  dp?: number;
  size?: 'sm' | 'md' | 'lg';
  arrow?: boolean;
}) {
  const t = value > 0 ? 'gain' : value < 0 ? 'loss' : 'flat';
  return (
    <span className={`u-num ${s.delta} ${s[`d_${t}`]} ${s[`ds_${size}`]}`}>
      {arrow && <span className={s.deltaArrow}>{value > 0 ? '\u25B2' : value < 0 ? '\u25BC' : '\u2014'}</span>}
      {pct(value, dp)}
    </span>
  );
}

/* ── Tag / status pill ─────────────────────────────────── */

export function Tag({
  children,
  tone = 'neutral',
  solid = false,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'agent' | 'gain' | 'loss';
  solid?: boolean;
}) {
  return <span className={`${s.tag} ${s[`t_${tone}`]} ${solid ? s.tagSolid : ''}`}>{children}</span>;
}

/* ── Segmented control (timeframe, chart mode, etc.) ───── */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className={s.seg} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.title}
          aria-pressed={value === o.id}
          className={`${s.segBtn} ${value === o.id ? s.segOn : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Toggle chip (multi-select) ─────────────────────────── */

export function Chip({
  children,
  on,
  onClick,
  detail,
}: {
  children: ReactNode;
  on: boolean;
  onClick: () => void;
  detail?: string;
}) {
  return (
    <button type="button" className={`${s.chip} ${on ? s.chipOn : ''}`} aria-pressed={on} onClick={onClick}>
      <span className={s.chipLabel}>{children}</span>
      {detail && <span className={s.chipDetail}>{detail}</span>}
    </button>
  );
}

/* ── Stat: label over large tabular figure ─────────────── */

export function Stat({
  label,
  value,
  sub,
  tone,
  align = 'left',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'gain' | 'loss';
  align?: 'left' | 'right';
}) {
  return (
    <div className={s.stat} style={{ textAlign: align }}>
      <div className="u-eyebrow">{label}</div>
      <div
        className={`u-num ${s.statValue}`}
        style={tone ? { color: tone === 'gain' ? 'var(--gain)' : 'var(--loss)' } : undefined}
      >
        {value}
      </div>
      {sub && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}

/* ── Button ────────────────────────────────────────────── */

export function Button({
  children,
  onClick,
  variant = 'ghost',
  size = 'md',
  disabled,
  type = 'button',
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'ghost' | 'quiet' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit';
  full?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${s.btn} ${s[`b_${variant}`]} ${s[`bs_${size}`]} ${full ? s.btnFull : ''}`}
    >
      {children}
    </button>
  );
}

/* ── Panel: hairline-bounded region, no drop shadow ────── */

export function Panel({
  children,
  title,
  meta,
  pad = true,
  className = '',
}: {
  children: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  pad?: boolean;
  className?: string;
}) {
  return (
    <section className={`${s.panel} ${className}`}>
      {(title || meta) && (
        <div className={s.panelBar}>
          {title && <h3 className={s.panelTitle}>{title}</h3>}
          {meta && <div className={s.panelMeta}>{meta}</div>}
        </div>
      )}
      <div className={pad ? s.panelBody : ''}>{children}</div>
    </section>
  );
}

/* ── Empty state that teaches rather than apologises ───── */

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <h4 className={`u-display ${s.emptyTitle}`}>{title}</h4>
      <p className={s.emptyBody}>{body}</p>
      {action}
    </div>
  );
}

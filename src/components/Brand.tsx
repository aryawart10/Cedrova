import s from './Brand.module.css';

/** Wordmark is typographic, not an imported asset: serif italic "alpha"
    locked against a monospace "OS", with a rising tick as the mark. */
export function Brand() {
  return (
    <span className={s.brand}>
      <svg className={s.mark} width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        <rect x="0.5" y="0.5" width="19" height="19" rx="2.5" fill="none" stroke="currentColor" opacity="0.28" />
        <path d="M3.5 14.5 L7.5 9.5 L11 12 L16.5 5" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16.5" cy="5" r="1.8" fill="var(--accent)" />
      </svg>
      <span className={s.word}>
        <span className={s.alpha}>alpha</span>
        <span className={s.os}>OS</span>
      </span>
    </span>
  );
}

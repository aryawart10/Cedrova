const inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1,24,500.50 — Indian digit grouping, no symbol (symbol is set typographically). */
export const num = (n: number, dp = 2) => (dp === 0 ? inr0 : inr2).format(n);

export const money = (n: number, dp = 2) => `\u20B9${num(n, dp)}`;

/** 1.2Cr / 45.6L / 8,900 — how Indian desks actually read size. */
export function compactINR(n: number) {
  const a = Math.abs(n);
  if (a >= 1e7) return `\u20B9${(n / 1e7).toFixed(a >= 1e8 ? 0 : 2)} Cr`;
  if (a >= 1e5) return `\u20B9${(n / 1e5).toFixed(a >= 1e6 ? 0 : 1)} L`;
  return `\u20B9${inr0.format(n)}`;
}

export function compactQty(n: number) {
  const a = Math.abs(n);
  if (a >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return inr0.format(n);
}

export const pct = (n: number, dp = 2) => `${n > 0 ? '+' : n < 0 ? '\u2212' : ''}${Math.abs(n).toFixed(dp)}%`;

export const signed = (n: number, dp = 2) =>
  `${n > 0 ? '+' : n < 0 ? '\u2212' : ''}${num(Math.abs(n), dp)}`;

export type Tone = 'gain' | 'loss' | 'flat';
export const tone = (n: number): Tone => (n > 0 ? 'gain' : n < 0 ? 'loss' : 'flat');

const dayFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });
const monFmt = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' });

export const dayLabel = (t: number) => dayFmt.format(new Date(t));
export const monthLabel = (t: number) => monFmt.format(new Date(t));

export const timeLabel = (d: Date) =>
  new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  }).format(d);

/** NSE/BSE cash session: Mon-Fri 09:15-15:30 IST. */
export function marketSession(now = new Date()) {
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  if (day === 0 || day === 6) return { state: 'closed' as const, label: 'Weekend' };
  if (mins < 540) return { state: 'closed' as const, label: 'Pre-open at 09:00' };
  if (mins < 555) return { state: 'pre' as const, label: 'Pre-open' };
  if (mins <= 930) return { state: 'open' as const, label: 'Regular session' };
  return { state: 'closed' as const, label: 'Session closed' };
}

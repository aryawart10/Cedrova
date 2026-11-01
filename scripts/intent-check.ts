/* Routing check for the universal prompt bar.
   Run with:  npx tsx scripts/intent-check.ts
   No test runner is wired up; this is deliberately a plain script so it
   stays runnable without adding a dependency. */

import { classify, extractAmount, extractSymbol } from '../src/lib/intent';
import type { IntentId } from '../src/lib/intent';

/* 'backtest' and 'strategy-build' intentionally converge on the same
   multi-step surface in AskTab, so either is acceptable where noted. */
const cases: [string, IntentId | IntentId[]][] = [
  ['I want to build a trading strategy', 'strategy-build'],
  ['Build me a mean reversion strategy on NIFTY 100', 'strategy-build'],
  ['buy quality NIFTY 100 stocks after a sharp 5-day fall', 'strategy-build'],
  ['Backtest buying the dip inside an uptrend', ['strategy-build', 'backtest']],
  ['backtest this idea', ['strategy-build', 'backtest']],
  ['I think IT stocks will fall over the next quarter', 'market-view'],
  ['I am bullish on private banks', 'market-view'],
  ['Does this signal actually work?', 'signal-check'],
  ['check the signal please', 'signal-check'],
  ['Why did these stocks fall?', 'why-fell'],
  ['why is RELIANCE down today', 'why-fell'],
  ['Can I actually trade this with 10 lakh?', 'tradeable'],
  ['will my orders fill at that size', 'tradeable'],
  ['How do I hedge the overnight risk?', 'hedge'],
  ['should I buy a nifty put', 'hedge'],
  ['Place the orders across my brokers', 'place-orders'],
  ['Research on RELIANCE', 'research'],
  ['Should I buy TCS at this price?', 'research'],
];

let pass = 0;
const fails: string[] = [];

for (const [prompt, want] of cases) {
  const got = classify(prompt)?.id ?? null;
  const allowed = Array.isArray(want) ? want : [want];
  const ok = got !== null && allowed.includes(got);
  if (ok) pass++;
  else fails.push(`  want ${allowed.join('|')}, got ${got} \u2014 "${prompt}"`);
}

/* Prompts with no trading intent must fall through to the teaching state
   rather than being force-fitted into the nearest desk. */
const shouldBeNull = ['hello', 'what is the weather', 'asdfgh', ''];
for (const p of shouldBeNull) {
  const got = classify(p)?.id ?? null;
  if (got === null) pass++;
  else fails.push(`  want null, got ${got} \u2014 "${p}"`);
}

const amounts: [string, number | null][] = [
  ['I have 10 lakh', 1_000_000],
  ['\u20B95,00,000 capital', 500_000],
  ['with 2 crore', 20_000_000],
  ['50k to start', 50_000],
  ['no amount here', null],
];
for (const [p, want] of amounts) {
  const got = extractAmount(p);
  if (got === want) pass++;
  else fails.push(`  amount: want ${want}, got ${got} \u2014 "${p}"`);
}

const uni = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'];
const syms: [string, string | null][] = [
  ['Research on RELIANCE', 'RELIANCE'],
  ['is TCS good', 'TCS'],
  ['nothing here', null],
];
for (const [p, want] of syms) {
  const got = extractSymbol(p, uni);
  if (got === want) pass++;
  else fails.push(`  symbol: want ${want}, got ${got} \u2014 "${p}"`);
}

const total = cases.length + shouldBeNull.length + amounts.length + syms.length;
if (fails.length) {
  console.error(`\n${fails.length} of ${total} checks failed:\n${fails.join('\n')}\n`);
  process.exit(1);
}
console.log(`\nAll ${total} routing checks passed.\n`);

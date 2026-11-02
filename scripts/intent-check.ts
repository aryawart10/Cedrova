/* Routing check for the universal prompt bar.
   Run with:  npx tsx scripts/intent-check.ts
   No test runner is wired up; this is deliberately a plain script so it
   stays runnable without adding a dependency. */

import { classify, extractAmount, extractSymbol, INTENT_LABEL } from '../src/lib/intent';
import type { IntentId } from '../src/lib/intent';
import { AGENT_SCOPE, INTENT_OWNER, inScope } from '../src/lib/desk';
import { AGENTS } from '../src/data/agents';
import { composeJob, crewFor, triggersFor } from '../src/data/standing';

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
  ['Monitor Reliance for me and let me know on any changes that you see', 'monitor'],
  ['keep an eye on my portfolio', 'monitor'],
  ['alert me if TATAMOTORS files anything', 'monitor'],
  ['watch for a rating change on INFY and notify me', 'monitor'],
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

/* Specialist routing. Pinning an agent only makes sense if every intent
   has exactly one owning desk and every owner accepts its own work. */
const allIntents = Object.keys(INTENT_LABEL) as IntentId[];
let deskChecks = 0;

for (const i of allIntents) {
  deskChecks++;
  const owner = INTENT_OWNER[i];
  if (!owner) fails.push(`  desk: no owner for intent ${i}`);
  else if (!inScope(owner, i)) fails.push(`  desk: owner ${owner} does not accept its own intent ${i}`);
  else pass++;
}

for (const a of AGENTS) {
  deskChecks++;
  const scope = AGENT_SCOPE[a.id];
  if (!scope || scope.length === 0) fails.push(`  desk: ${a.id} has an empty scope`);
  else if (scope.some((i) => !allIntents.includes(i))) fails.push(`  desk: ${a.id} scopes an unknown intent`);
  else pass++;
}

/* Standing agents. A wrapper that resolves to no symbols, no triggers or
   no crew is worse than useless: it would sit there reporting nothing. */
const jobs: [string, { watch: string[]; crew: string[] }][] = [
  [
    'Monitor Reliance for me and let me know on any changes that you see',
    { watch: ['RELIANCE'], crew: ['monitor', 'equity-research', 'macro-news'] },
  ],
  [
    'Keep an eye on my portfolio and tell me if the risk gets worse',
    { watch: ['Portfolio'], crew: ['monitor', 'macro-news', 'risk-audit'] },
  ],
  [
    'Watch for any filing from Tata Motors and flag it the same day',
    { watch: ['TATAMOTORS'], crew: ['monitor', 'equity-research'] },
  ],
];
let jobChecks = 0;
for (const [prompt, want] of jobs) {
  jobChecks += 4;
  const d = composeJob(prompt);
  const watch = d.watch.join(',');
  if (watch === want.watch.join(',')) pass++;
  else fails.push(`  job: watch want ${want.watch.join(',')}, got ${watch} \u2014 "${prompt}"`);

  const crew = d.crew.map((c) => c.agent).join(',');
  if (crew === want.crew.join(',')) pass++;
  else fails.push(`  job: crew want ${want.crew.join(',')}, got ${crew} \u2014 "${prompt}"`);

  // The monitor owns 'when'. If anything else leads, the wrapper is wrong.
  if (d.crew[0]?.agent === 'monitor') pass++;
  else fails.push(`  job: monitor is not first in the crew \u2014 "${prompt}"`);

  if (d.triggers.length > 0) pass++;
  else fails.push(`  job: no triggers, the agent could never fire \u2014 "${prompt}"`);
}

/* Editing the spec must re-derive, not drift: clearing every trigger has to
   produce an empty trigger list, and the crew must follow the new kinds. */
jobChecks += 2;
if (triggersFor('symbols', ['RELIANCE'], []).length === 0) pass++;
else fails.push('  job: triggersFor with no kinds still produced a trigger');
if (crewFor('market', ['news'], 'watch the market').some((c) => c.agent === 'macro-news')) pass++;
else fails.push('  job: a news trigger did not pull in the macro desk');

const total =
  cases.length + shouldBeNull.length + amounts.length + syms.length + deskChecks + jobChecks;
if (fails.length) {
  console.error(`\n${fails.length} of ${total} checks failed:\n${fails.join('\n')}\n`);
  process.exit(1);
}
console.log(`\nAll ${total} routing checks passed.\n`);

import type { AgentId } from '../data/agents';
import type { IntentId } from './intent';

/* ──────────────────────────────────────────────────────────────
   Who does what.

   Module 00 can run in two modes. Left on Auto, the prompt bar
   classifies the request and hands it to whichever desk owns it.
   Pin a specialist and the model changes: that agent takes every
   prompt, and anything outside its remit produces an explicit
   handoff rather than a confident answer from the wrong desk.

   Two maps do the work. AGENT_SCOPE is what an agent will accept.
   INTENT_OWNER is the single desk that owns a request when nobody
   has been pinned, and the desk a handoff points at.
   ────────────────────────────────────────────────────────────── */

export const AGENT_SCOPE: Record<AgentId, IntentId[]> = {
  'equity-research': ['research', 'why-fell'],
  'strategy-maker': ['strategy-build', 'place-orders'],
  backtest: ['backtest', 'signal-check', 'tradeable', 'strategy-build'],
  options: ['hedge', 'market-view'],
  'risk-audit': ['tradeable', 'hedge'],
  'macro-news': ['market-view', 'why-fell'],
  screener: ['research'],
  monitor: ['monitor', 'why-fell'],
};

export const INTENT_OWNER: Record<IntentId, AgentId> = {
  'strategy-build': 'strategy-maker',
  'market-view': 'macro-news',
  'signal-check': 'backtest',
  'why-fell': 'macro-news',
  tradeable: 'backtest',
  hedge: 'options',
  'place-orders': 'strategy-maker',
  research: 'equity-research',
  backtest: 'backtest',
  monitor: 'monitor',
};

/** Will this agent take this request, or does it belong elsewhere? */
export function inScope(agent: AgentId, intent: IntentId): boolean {
  return AGENT_SCOPE[agent].includes(intent);
}

/** The desk a handoff should point at. */
export function ownerOf(intent: IntentId): AgentId {
  return INTENT_OWNER[intent];
}

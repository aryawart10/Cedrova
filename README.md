# alphaOS

An operating system for trading research on Indian equity markets: market charts, AI
agents that build and validate strategies, and broker integrations, in one desk.

**This is a front-end prototype.** There is no backend, no model inference and no broker
connection. All prices, portfolios, backtests and agent responses are generated from fixed
seeds so the UI is stable and reviewable. Nothing here is investment advice or a live quote.

---

## Module 00 - Build: the universal prompt bar

The landing surface is a single input that classifies what you typed and mounts a
purpose-built answer surface. It does not return prose. Each answer shows which desk
handled it and which phrases in your wording triggered that routing, so the mechanism
is visible rather than magic.

Nine intents are recognised:

| Intent | Try typing | What you get |
| --- | --- | --- |
| `strategy-build` | "I want to build a trading strategy" | Two questions (capital, loss limit), then three ranked ideas, then a full research answer |
| `market-view` | "I think IT stocks will fall next quarter" | Your view read back, plus three priced ways to express it |
| `signal-check` | "Does this signal actually work?" | Bucketed forward returns, t-stat, and the cost that eats the edge |
| `why-fell` | "Why did these stocks fall?" | Per-stock split of company news vs sector vs market-wide |
| `tradeable` | "Can I actually trade this with 10 lakh?" | Order size against traded volume, modelled slippage, capacity ceiling |
| `hedge` | "How do I hedge the overnight risk?" | Protective put, collar, or smaller position, each with its trade-off |
| `place-orders` | "Place the orders across my brokers" | Basket split across Zerodha, Groww and Upstox by margin |
| `research` | "Research on RELIANCE" | Four findings from the equity desk, with the concentration risk flagged |
| `backtest` | "Backtest buying the dip in an uptrend" | Same pipeline as `strategy-build` |

Anything with no trading intent falls through to a state that shows the recognised
shapes rather than guessing a desk.

### Changing the model: Auto, or pin a specialist

The bar runs in two modes, picked from the **Model** roster above the input.

**Auto** (the default) classifies the prompt and hands it to whichever desk owns that
kind of request.

**Pinned** puts one of the seven specialists in charge of every prompt. The hero copy,
the example prompts and the live routing hint all change to that desk, and the answer is
attributed to it by name. Each specialist accepts only the request types in its remit:

| Specialist | Accepts |
| --- | --- |
| **Equity Research Specialist** | `research`, `why-fell` |
| **Trading Strategy Maker** | `strategy-build`, `place-orders` |
| **Backtesting Specialist** | `backtest`, `signal-check`, `tradeable`, `strategy-build` |
| **Futures & Options Specialist** | `hedge`, `market-view` |
| **Portfolio Risk Auditor** | `tradeable`, `hedge` |
| **Macro & Event Analyst** | `market-view`, `why-fell` |
| **Screener Composer** | `research` (waitlist, not selectable) |

Ask a pinned specialist something outside its remit and it does **not** answer. It names
the request type, says why this desk is the wrong one, names the desk that owns it, and
offers two buttons: hand it over, or let this desk try anyway. Answering anyway is
allowed but gets labelled as such on the answer. The point of seven narrow desks is lost
if any of them will confidently answer anything.

The maps live in `src/lib/desk.ts`: `AGENT_SCOPE` (what a desk accepts) and
`INTENT_OWNER` (the single desk that owns each request type).

### The strategy answer is ordered deliberately

How it works, then the research steps, then the backtest, then the verdict. The verdict
sits last because leading with it invites you to skip the evidence. When a strategy
fails, the answer says so plainly and shows the one fix that helped without changing
the conclusion.

### Checking the routing

```bash
npx tsx scripts/intent-check.ts   # or: npm run check:intent
```

46 assertions covering intent routing, fallback behaviour, rupee-amount parsing
(lakh / crore / k), ticker extraction, and the specialist maps - every intent has exactly
one owning desk, and every owner accepts its own work.

### Where to plug in real logic

- `classify()` in `src/lib/intent.ts` - swap keyword scoring for a model call; the
  return shape (`id`, `score`, `hits`) is all the UI depends on
- `src/data/research.ts` - every number rendered by every answer surface
- `src/answers/` - one component per answer shape, each taking plain props

## Running it

```bash
npm install
npm run dev
```

Vite serves on <http://localhost:5273>.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Types only, no emit |

Requires Node 18 or newer.

---

## The six modules

| # | Module | What is in it |
| --- | --- | --- |
| 00 | **Build** | The universal prompt bar. Classifies a plain-English request into one of nine intents and mounts a purpose-built answer surface. Runs on Auto or with one of seven specialists pinned. Detailed above. |
| 01 | **Markets** | 16 NSE instruments with daily and weekly history. Line and candlestick charts with 20/50 DMA overlays, volume, hover OHLC crosshair. Watchlist, sector heat, movers, and a morning desk note feed. |
| 02 | **AI Agents** | Three views. **Build** compiles a plain-language description into an explicit rule set, position sizing model, and a list of what you left ambiguous. **Specialists** is a gallery of seven narrow agents with full briefs. **Which agent?** routes you to the right specialist from three questions. |
| 03 | **Strategies** | Saved strategies with equity curves, calendar returns, drawdown profile, and the backtester's caveats attached to every one of them. |
| 04 | **Brokers** | Zerodha, Groww, Upstox, Angel One, Dhan, Fyers and ICICI Direct adapters. Per-broker capability matrix (including what each one *cannot* do), a simulated connection stepper, and an order log. |
| 05 | **Portfolio** | Holdings across all connected accounts treated as one book. Sector allocation ring, risk findings from the auditor agent, and a stress replay of five historical drawdowns over today's weights. |

Press <kbd>⌘K</kbd> (or <kbd>Ctrl</kbd>+<kbd>K</kbd>) anywhere for the command palette:
jump to a module, symbol, agent, strategy or broker.

---

## Design

Editorial broadsheet rather than dashboard. Hairline rules and a shared ruled grid do the
work that drop-shadowed cards usually do. Instrument Serif for display, Instrument Sans for
body, IBM Plex Mono with tabular figures for every number on screen.

Two committed palettes, toggled in the header and persisted to `localStorage`:

- **paper** (default): warm newsprint surface, navy-tinted ink, saffron accent
- **ink**: dark desk, same accent relationships

Market semantics are deliberately muted: forest green for gains, brick red for losses, never
neon. Colour tokens are written in `oklch` with `color-mix` for derived values, all in
`src/styles/tokens.css`.

---

## Layout

```
src/
├── main.tsx                 entry
├── App.tsx                  shell: header, module nav, status bar, ⌘K palette
├── styles/
│   ├── tokens.css           both palettes, type scale, spacing, motion
│   └── global.css           reset, typographic primitives, grain, animations
├── lib/
│   ├── series.ts            seeded PRNG, OHLC generation, SMA/RSI, SVG path builders
│   ├── format.ts            Indian digit grouping, lakh/crore compaction, NSE session clock
│   └── useMeasure.ts        ResizeObserver hook so charts render at real pixel sizes
├── data/
│   ├── market.ts            instrument universe, index strip, sector heat, desk notes
│   ├── agents.ts            seven specialists, routing weights, builder vocabulary
│   ├── strategies.ts        saved strategies and their caveats
│   ├── brokers.ts           broker adapters, capability matrices, order log
│   └── portfolio.ts         holdings, risk findings, stress scenarios
├── components/
│   ├── PriceChart.tsx       candlestick + area chart, crosshair, overlays, volume
│   ├── EquityCurve.tsx      equity curve with benchmark and underwater band
│   ├── Sparkline.tsx        inline micro chart
│   ├── Donut.tsx            allocation ring
│   ├── CommandPalette.tsx   ⌘K, subsequence matching
│   ├── TickerTape.tsx       index marquee
│   ├── Brand.tsx            typographic wordmark
│   └── ui.tsx               SectionHead, Delta, Tag, Segmented, Chip, Stat, Button, Panel, Empty
└── tabs/                    one file per module, each with a CSS module
```

Every chart is hand-rolled SVG. There is no charting library, no CSS framework and no UI kit;
runtime dependencies are React and React DOM only.

---

## Wiring in real data later

The seams are deliberate:

- **Quotes and history** — replace `seriesFor()` and `quoteFor()` in `src/data/market.ts`.
  Everything downstream consumes the `Candle` and `Quote` types, so nothing else changes.
- **Brokers** — `src/data/brokers.ts` already describes each adapter's real auth model and
  capability gaps. `BrokerDetail`'s `connect()` is where an OAuth redirect would go.
- **Agents** — `makeSpec()` in `src/tabs/AgentsTab.tsx` is a deterministic stand-in for a
  model call. It returns the shape a real response should take, including the ambiguity list.
- **Portfolio** — `holdingRows()` derives everything from `HOLDINGS`; point that at broker
  holdings and the summary, allocation ring and risk table follow.

---

## Not built yet

Options chain and payoff builder, screener execution, live tick streaming, order placement
confirmation flow, alerts, and anything resembling authentication.

---

## Licence

Private prototype. Not for distribution or use as the basis of real trading decisions.

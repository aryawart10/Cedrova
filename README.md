# alphaOS

An operating system for trading research on Indian equity markets: market charts, AI
agents that build and validate strategies, and broker integrations, in one desk.

**This is a front-end prototype.** There is no backend, no model inference and no broker
connection. All prices, portfolios, backtests and agent responses are generated from fixed
seeds so the UI is stable and reviewable. Nothing here is investment advice or a live quote.

---

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

## The five modules

| # | Module | What is in it |
| --- | --- | --- |
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

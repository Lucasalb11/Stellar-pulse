---
sidebar_position: 9
title: Data Architecture (spec)
---

# Stellar Pulse — Data Architecture

> **Status:** draft for alignment. Nothing in `lib/` is migrated yet.
> **Goal:** replace the deterministic mock layer in `lib/mock-data.ts` with real data from public Stellar and DeFi endpoints, **without** sacrificing build-time prerender, layout stability, or the editorial pacing of the UI.
> **Stack constraint:** Next.js 16.2.9 (App Router, Turbopack). APIs here are verified against `node_modules/next/dist/docs/` — read those before editing this doc.

---

## 1. Principles

1. **Public endpoints only, for v1.** No keys, no signed requests, no env vars on first pass. Everything runs from public Horizon / Soroban RPC / stellar.expert / DefiLlama / CoinGecko. Auth is a v2 concern.
2. **Server Components fetch, Client Components present.** No client-side fetching of Stellar data. The browser sees pre-rendered HTML + a small slice of hydration data.
3. **Cache aggressively, revalidate on a schedule, never block the page.** Each module owns one or more `fetch(...)` calls or `'use cache'` functions. A slow Horizon response **must never** make the homepage hang — fall back to the previous cache or to a typed mock.
4. **Type contracts are the seam.** Every data module exports a function that returns a typed shape from `lib/types.ts`. Adapters live inside each module. Pages and components never see raw Horizon/Soroban JSON.
5. **`verified: boolean` everywhere it matters.** Where a number is canonical (e.g. issuer TVL pulled from on-chain balances) we mark `verified: true`. Where we synthesize, estimate, or mock, we mark `verified: false` and the UI shows a small "illustrative" badge. This is the same pattern already used in `rwaIssuers`.
6. **No fake methodology numbers.** Pulse Score either gets a real input pipeline or it gets removed. We do not ship invented `audits: 98` numbers as if they came from anywhere.

---

## 2. The five data sources

| # | Source | What it gives us | Auth | Rate limit (public) | Region |
|---|--------|------------------|------|---------------------|--------|
| 1 | **Horizon** (`https://horizon.stellar.org`) | Classic Stellar accounts, assets, balances, payments, trades, order books, anchor activity | None | Fair-use (typically 3,600 req/h / IP, soft) | SDF public; mirrors exist |
| 2 | **Soroban RPC** (`https://soroban-rpc.mainnet.stellar.gateway.fm` or any public mainnet RPC) | Smart contract events, ledger entries, contract data, simulated invocations | None | Per provider | Multiple public providers |
| 3 | **stellar.expert API** (`https://api.stellar.expert/explorer/public/`) | Pre-indexed views: contract stats, asset holders, directory metadata, contract call counts, asset categorization | None | ~30 req/min (soft) | Lobstr-operated |
| 4 | **DefiLlama** (`https://api.llama.fi`, `https://stablecoins.llama.fi`) | Cross-chain TVL by protocol & category, historical TVL series, stablecoin supply by chain | None | Generous | Global CDN |
| 5 | **CoinGecko** (`https://api.coingecko.com/api/v3`) primary; **Reflector** on-chain oracle as fallback | XLM/USD, USDC/USD, token prices, market caps; Reflector gives Soroban-native pricing for SAC assets and survives CoinGecko outages | None (free tier for CG; on-chain reads for Reflector) | CG: 10–30 req/min · Reflector: gated by Soroban RPC throughput | Global |

> **Why these five and not, say, Horizon alone?**
> Horizon answers "what happened on Stellar" but not "what is on Stellar worth in USD this minute" and not "which protocol category is this contract". DefiLlama already does the protocol-category accounting; reimplementing it from raw Horizon is a multi-engineer project. stellar.expert already maintains the contract directory we'd otherwise have to build. CoinGecko/Reflector give USD prices that Horizon explicitly does not provide.

### 2.1 Source-by-source detail

#### Horizon
- Endpoints we'll use:
  - `GET /assets?asset_issuer={G…}` — list assets per issuer (RWA tracking)
  - `GET /accounts/{G…}` — balances per account (anchor wallets, foundation pools)
  - `GET /order_book?selling_asset_type=…&buying_asset_type=…` — spot prices for XLM pairs (price fallback if CoinGecko fails)
  - `GET /payments?cursor=now&limit=200` — recent on-chain payments (Capital Flows feed)
  - `GET /trades?limit=200` — recent DEX trades (volume sanity check)
- **Pagination model:** cursor-based, `_links.next.href` chain. We never paginate beyond one page in v1.
- **Failure modes:** intermittent 429 under load; sometimes 504 from front-door. Treat both as "use stale cache."

#### Soroban RPC
- Endpoints we'll use (JSON-RPC):
  - `getEvents` — protocol-level event stream (e.g. Blend `Borrow`, Soroswap `Swap`)
  - `getLedgerEntries` — read contract storage (e.g. pool reserves)
  - `simulateTransaction` — only if needed for derived state; avoided in v1
- **Provider choice:** start with one provider (Gateway.fm), but the URL is a constant — switching providers is a single-line change. We do **not** run our own RPC.
- **Failure modes:** event windows have an ~24h retention on public providers. If we miss a window, we accept a gap rather than re-indexing.

#### stellar.expert API
- Endpoints we'll use:
  - `GET /contract/{C…}` — contract metadata, call count, deploy time
  - `GET /contract/{C…}/stats` — daily call series
  - `GET /asset/{code-issuer}/holders` — holder distribution
  - `GET /directory` — labeled accounts (helpful for naming anchors)
- **Why it's the cheapest source for `topContracts` and Soroban breakdowns:** it ships pre-aggregated, so we don't need our own event indexer.
- **Failure modes:** undocumented schema changes (small risk); rate-limit by IP.

#### DefiLlama
- Endpoints we'll use:
  - `GET /protocols` (filter `chains: ["Stellar"]`) — protocol list, TVL, change %
  - `GET /protocol/{slug}` — historical TVL series per protocol
  - `GET /charts/Stellar` — Stellar-chain TVL series (90-day)
  - `GET stablecoins.llama.fi/stablecoincharts/Stellar` — stablecoin supply on Stellar
- **Critical correctness note:** DefiLlama's protocol category is **the canonical category source**, not our own taxonomy. If they say Phoenix is `Dexes`, we don't override it.
- **Failure modes:** rare 502s; protocol slugs occasionally rename — we keep a slug-alias map.

#### CoinGecko (primary) + Reflector (fallback)
- Endpoints we'll use:
  - `GET /simple/price?ids=stellar,usd-coin&vs_currencies=usd` — spot prices
  - `GET /coins/stellar/market_chart?vs_currency=usd&days=90` — XLM 90-day series
- **Reflector** is a Soroban-native price oracle (contract IDs published at reflector.network). We read it via Soroban RPC `simulateTransaction` against the oracle contract's `lastprice` / `prices` functions.
- **Fallback chain:** `coingecko → reflector → horizon-orderbook → last-cached`. The `PriceSnapshot.source` field reflects which leg won.

---

## 3. Module layout

```
lib/
├── types.ts                      # Shared type contracts (section 4)
├── mock-data.ts                  # Stays as the fallback layer (verified: false)
└── stellar/
    ├── index.ts                  # Public API the rest of the app imports from
    ├── horizon.ts                # Horizon adapter
    ├── soroban-rpc.ts            # Soroban RPC adapter
    ├── stellar-expert.ts         # stellar.expert adapter
    ├── defillama.ts              # DefiLlama adapter
    ├── prices.ts                 # CoinGecko + Horizon order-book fallback
    ├── cache.ts                  # cacheLife profiles + tag constants
    └── fallback.ts               # withFallback() wrapper (section 7)
```

- **Rule:** pages and components only ever import from `lib/stellar/index.ts` or `lib/types.ts`. They never touch a source-specific module directly. This keeps the swap surface small.
- **Rule:** each source-specific module is the **only** place a given external URL appears. If `horizon.stellar.org` shows up in two files, that's a bug.

---

## 4. Type contracts

These live in `lib/types.ts`. They are a superset of what `lib/mock-data.ts` already exposes today — the existing pages and components don't change.

```ts
// lib/types.ts

export type Category =
  | "DEX" | "Lending" | "Yield" | "Stablecoin"
  | "RWA" | "Derivatives" | "Bridge";

export interface OverviewMetrics {
  totalTVL: number;
  totalTVLChange: number;       // % vs 24h ago
  volume24h: number;
  volume24hChange: number;
  stablecoinSupply: number;
  stablecoinSupplyChange: number;
  activeProtocols: number;
  activeProtocolsChange: number;
  activeContracts: number;
  activeContractsChange: number;
  rwaMarketSize: number;
  rwaMarketSizeChange: number;
  asOf: string;                 // ISO timestamp of the freshest input
  verified: boolean;            // false if any input fell back to mock
}

export interface TimePoint {
  date: string;                 // YYYY-MM-DD
  label: string;
  value: number;
}

export interface CategoryTVL {
  category: Category;
  value: number;
  change: number;
  color: string;                // kept for chart compatibility
}

export interface Protocol {
  slug: string;
  name: string;
  category: Category;
  tvl: number;
  tvlChange: number;
  volume24h: number;
  users24h: number;             // may be 0 when source is DefiLlama only
  yieldApy: number;             // 0 when not applicable
  riskScore: number;            // see section 9
  spark: number[];              // last 24 sparkline points
  tag?: string;
  source: "defillama" | "horizon" | "mock";
  verified: boolean;
}

export interface StablecoinSupply {
  symbol: string;               // "USDC", "EURC", "AQUA"
  issuer: string;               // classic G… or SAC C…
  kind: "classic" | "sac";
  supply: number;
  change24h: number;
  verified: boolean;
}

export interface RwaIssuer {
  name: string;
  tvl: number;
  share: number;
  apy: number;
  category: "Treasuries" | "Funds" | "Bonds" | "Private Credit";
  verified: boolean;
}

export interface SorobanContract {
  id: string;                   // C…
  name: string;                 // from stellar.expert directory, or "Unknown"
  calls: number;
  type: string;                 // free-form, sourced from directory
  verified: boolean;
}

export interface CapitalFlow {
  id: string;
  source: string;
  destination: string;
  amount: number;
  asset: string;
  time: string;                 // relative; rendered server-side
  type: "inflow" | "outflow" | "swap";
}

export interface PulseScore {
  protocol: string;
  category: Category;
  total: number;
  audits: number;
  liquidity: number;
  tvlStability: number;
  age: number;
  concentration: number;
  verdict: "Trusted" | "Solid" | "Watch" | "Risky";
  methodology: "v1-heuristic" | "mock";   // see section 9
}

export interface PriceSnapshot {
  xlmUsd: number;
  usdcUsd: number;
  asOf: string;
  source: "coingecko" | "reflector" | "horizon-orderbook" | "cache" | "mock";
}

export interface YieldPool {
  protocol: string;
  symbol: string;
  apy: number;             // base + reward, normalized
  tvl: number;
  source: "defillama-yields" | "mock";
  verified: boolean;
}

export interface FlowEdge {
  source: string;          // protocol name OR truncated address "GBOND…WX7A"
  sourceAddress: string;   // full G… / C… for tooltip + click-through
  sourceKnown: boolean;
  destination: string;
  destinationAddress: string;
  destinationKnown: boolean;
  amount: number;          // USD-equivalent, summed over window
  asset: string;           // dominant asset on the edge
  window: "24h" | "7d";
  verified: boolean;       // true only when both ends are known
}
```

**Why every shape carries `verified` / `source`:** so the UI can render an "illustrative data" badge truthfully on a per-row basis. Today we show one global banner; with `verified` per record we can show it only on the rows that need it, which is more honest.

---

## 5. Cache strategy

We use Next 16's caching primitives. The configuration is:

```ts
// next.config.ts
{
  cacheComponents: true,                   // enables 'use cache' directive
  cacheLife: {
    // Custom profiles, named for our domain
    market: {                              // prices, volume — short
      stale: 30,
      revalidate: 60,                      // 1 min
      expire: 300,                         // 5 min
    },
    tvl: {                                 // protocol/category TVL — medium
      stale: 60,
      revalidate: 300,                     // 5 min
      expire: 1800,                        // 30 min
    },
    directory: {                           // labels, names, deploy times — long
      stale: 300,
      revalidate: 3600,                    // 1 hour
      expire: 86_400,                      // 1 day
    },
  },
}
```

### 5.1 Which primitive for what

There are two cache primitives in Next 16, and they answer different questions:

| Primitive | Question it answers | Where it lives |
|---|---|---|
| `fetch(url, { next: { revalidate, tags } })` | "How fresh does **this single network call** need to be?" | Inside each source adapter, on every external `fetch` |
| `'use cache'` + `cacheLife(...)` + `cacheTag(...)` | "How fresh does **this aggregated, transformed result** need to be?" | On the high-level functions in `lib/stellar/index.ts` |

We use both, layered.

#### Layer 1 — per-fetch (inside adapters)

```ts
// lib/stellar/defillama.ts
const TVL_TAG = "stellar:tvl";

export async function fetchStellarChainTvl(): Promise<TvlPoint[]> {
  const res = await fetch("https://api.llama.fi/charts/Stellar", {
    next: { revalidate: 300, tags: [TVL_TAG] },
  });
  if (!res.ok) throw new Error(`DefiLlama ${res.status}`);
  return adaptTvl(await res.json());
}
```

This is the **only** caching needed for adapter calls. `fetch` is the boundary. We tag every request so we can revalidate on demand (section 5.3).

#### Layer 2 — per-result (in `lib/stellar/index.ts`)

```ts
// lib/stellar/index.ts
import { cacheLife, cacheTag } from "next/cache";

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  "use cache";
  cacheLife("tvl");
  cacheTag("stellar:overview", "stellar:tvl", "stellar:stablecoins");

  const [tvl, stables, prices] = await Promise.all([
    withFallback(fetchStellarChainTvl, mockTvl),
    withFallback(fetchStablecoinSupply, mockStables),
    withFallback(fetchPrices, mockPrices),
  ]);

  return composeOverview(tvl, stables, prices);
}
```

The outer `'use cache'` covers the **aggregation**. The inner `fetch` calls have their own revalidate windows. When the outer cache hits, none of the inner fetches run — we serve the composed snapshot directly. When the outer is stale, Next refreshes it in the background.

#### Tag taxonomy

We use a flat tag namespace to keep revalidation simple:

- `stellar:overview` — hero metrics
- `stellar:tvl` — anything TVL-shaped (protocols, categories, series)
- `stellar:stablecoins` — supply, flows
- `stellar:rwa` — issuers, market size
- `stellar:soroban` — contracts, calls, events
- `stellar:prices` — XLM, USDC, anchors
- `stellar:yields` — DefiLlama yield-pools
- `stellar:flows` — capital flow edges (Sankey)
- `stellar:directory` — names, labels (rarely revalidated)

### 5.2 Cache profile per page

| Route | Composed function | `cacheLife` profile |
|---|---|---|
| `/` (landing) | `getOverviewSnapshot()` | `tvl` (5 min) |
| `/overview` | `getOverviewMetrics()` + `getTvlByCategory()` | `tvl` (5 min) |
| `/defi-pulse` | `getProtocols()` | `tvl` (5 min) |
| `/capital-flows` | `getCapitalFlows()` | `market` (1 min) |
| `/stablecoins` | `getStablecoinSupply()` + `getStablecoinBreakdown()` | `tvl` (5 min) |
| `/rwas` | `getRwaIssuers()` + `getRwaMetrics()` | `directory` (1 hour) |
| `/soroban` | `getSorobanMetrics()` + `getTopContracts()` | `tvl` (5 min) |
| `/pulse-score` | `getPulseScores()` | `directory` (1 hour) — see section 9 |

> The landing page TVL hero number must look stable. A 5-minute revalidate keeps it from flickering between requests.

### 5.3 On-demand revalidation

We add **one** route handler for manual invalidation:

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
  // shared-secret check
  const { tag } = await req.json();
  revalidateTag(tag, "max");  // Next 16 requires the second cacheLife arg
  return Response.json({ revalidated: tag });
}
```

`revalidateTag(tag, cacheLife)` — the second argument is new in Next 16 and is required. We pass `"max"` to mean "throw out cached entries for this tag, regardless of age". This handler is only for operators (us); it is not exposed to users.

> **Open question:** do we wire a cron in `vercel.ts` to hit this on a schedule (e.g. every hour for `stellar:directory`)? Defer until after first deploy.

---

## 6. Fallback strategy

Every adapter call goes through `withFallback`:

```ts
// lib/stellar/fallback.ts
export async function withFallback<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  source = fetcher.name,
): Promise<T & { _fallback?: true }> {
  try {
    return await fetcher();
  } catch (err) {
    console.warn(`[stellar] ${source} failed, using fallback:`, err);
    return { ...fallback, _fallback: true } as T & { _fallback: true };
  }
}
```

### 6.1 What "fallback" means per source

| Source | Fallback when down |
|---|---|
| Horizon (Capital Flows) | Previous cached value via tag `stellar:flows`; if cache empty → mock from `mock-data.ts` |
| Soroban RPC | Skip the affected widget (Suspense fallback "Indexer warming up"); do not mock |
| stellar.expert | Use stale cache; if missing, drop `name`/`type` to "Unknown contract" but keep the row |
| DefiLlama (TVL) | Mock from `mock-data.ts`, mark `verified: false` |
| DefiLlama Yields | Horizon order-book implied APY for stablecoin pools where possible; otherwise mock with `verified: false` |
| CoinGecko (prices) | **Reflector** Soroban oracle → Horizon order-book → last cached. `PriceSnapshot.source` reflects which leg won. |

### 6.2 The "previous cached value" pattern

Next's `fetch` already serves stale-while-revalidate. The "fallback" path only triggers when:
1. The cache is **empty** (cold cache after deploy), **and**
2. The source is **unreachable** on the cold fetch.

For Vercel deployments this is rare in practice — but it does happen on the first request after a fresh deploy. Mocks are the safety net for that minute.

### 6.3 Composition rule

`composeOverview()` (and every other composer) **never throws**. If three of four inputs fall back, the resulting `OverviewMetrics.verified` is `false` and the UI banner shows accordingly. The page renders.

---

## 7. Page → data mapping

| Page | Source(s) | Adapter functions | Composed function | Tag(s) |
|---|---|---|---|---|
| `/` (landing — `app/page.tsx`) | DefiLlama, CoinGecko | `fetchStellarChainTvl`, `fetchPrices` | `getOverviewSnapshot()` | `stellar:overview` |
| `/overview` | DefiLlama, CoinGecko | `fetchStellarChainTvl`, `fetchProtocols`, `fetchPrices` | `getOverviewMetrics`, `getTvlByCategory` | `stellar:overview`, `stellar:tvl` |
| `/defi-pulse` | DefiLlama | `fetchProtocols` | `getProtocols()` | `stellar:tvl` |
| `/capital-flows` | Horizon | `fetchRecentPayments`, `fetchRecentTrades` | `getCapitalFlows()` | `stellar:flows` |
| `/stablecoins` | DefiLlama (stablecoins API), Horizon | `fetchStellarStablecoins`, `fetchAssetHolders` | `getStablecoinSupply`, `getStablecoinBreakdown` | `stellar:stablecoins` |
| `/rwas` | Horizon (asset issuers), stellar.expert | `fetchAssetsByIssuer`, `fetchExpertAsset` | `getRwaIssuers`, `getRwaMetrics` | `stellar:rwa` |
| `/soroban` | Soroban RPC, stellar.expert | `fetchEvents`, `fetchContractStats` | `getSorobanMetrics`, `getTopContracts` | `stellar:soroban` |
| `/pulse-score` | Derived (see section 9) | — | `getPulseScores()` | `stellar:directory` |
| `/defi-pulse` (Yields panel) | DefiLlama Yields | `fetchYieldPools` | `getYieldOpportunities()` | `stellar:yields` |
| `/capital-flows` (Sankey) | Horizon + stellar.expert directory | `fetchRecentPayments`, `fetchExpertDirectory` | `getFlowEdges()` (server-side aggregation) | `stellar:flows` |

---

## 8. RWA issuers — the awkward one

The 5-agent audit flagged this hardest: we had Franklin Templeton BENJI labeled as a "Soroban contract" when on Stellar it's a **classic asset** issued by `GBFTL2OI…`. Real-data v1 must handle two issuer shapes:

1. **Classic asset issuers** — `GA…` accounts that emit a token (BENJI, USDC, EURC). Tracked via Horizon `GET /assets?asset_issuer={G…}` and `GET /accounts/{G…}` for the issuer's reserve account.
2. **SAC (Stellar Asset Contract) wrappers** — `CC…` Soroban contracts that wrap classic assets so they're usable in Soroban DEXs. Tracked via Soroban RPC `getLedgerEntries` and stellar.expert `/contract/{C…}`.

Both paths feed into the same `RwaIssuer` shape. The `verified: true | false` flag carries the difference until we have full coverage of both paths.

**v1 issuer allow-list** (only these are pulled from real data; everything else falls back to mock with `verified: false`):

- Franklin Templeton BENJI (classic, issuer `GBFTL2OI…` — TBD verify)
- WisdomTree Prime (classic, issuer TBD)
- Etherfuse CETES (classic, issuer TBD)
- Anclap Treasury Note (classic, issuer TBD)

**Decision (locked):** ship with whatever subset we can verify by deploy day, **minimum 2, maximum 5**. Unverified issuers from this list are dropped from the page entirely rather than appearing as mocks — the page header shows the count (e.g. "3 verified issuers tracked").

---

## 9. Pulse Score — methodology

**Decision (locked):** ship **Heuristic Pulse Score v1**, derived only from data we can actually source:

- `liquidity` = normalized DefiLlama TVL rank within category
- `tvlStability` = 1 − stdev(90-day TVL series) / mean (clipped to [0,1])
- `age` = days since first DefiLlama observation, normalized to a 0–100 curve
- `concentration` = 100 − (top-10-holder share %), via stellar.expert holders endpoint
- `audits` = **dropped from the type and the UI**. We do not have an audit registry, and faking one is the worst kind of UI lie.

`total` = weighted mean of the four real components. Initial weights: `liquidity 0.35 · tvlStability 0.30 · age 0.15 · concentration 0.20`. Stored under `methodology: "v1-heuristic"`.

The Pulse Score page gets a small "Methodology" link in the header that opens a 3-paragraph explanation of exactly the formula above. No magic, no proprietary scoring, no implicit endorsements.

---

## 10. Vercel deployment considerations

- **Runtime:** Fluid Compute (default). No edge runtime — Stellar SDKs and our adapters are Node.js, and Fluid gives us request reuse + 300s timeout for free.
- **Env vars:** none required for v1 (all sources are public). Future env vars (CoinGecko Pro key, custom Horizon URL) go through `vercel env pull`.
- **ISR:** the `cacheLife` profiles map onto Vercel's data cache automatically — no extra config.
- **Cron:** if we add a scheduled revalidation, define it in `vercel.ts` under `crons: [{ path: "/api/revalidate", schedule: "0 * * * *" }]`. Skip in v1.
- **Logging:** structured `console.warn` from `withFallback` shows up in Vercel logs and is searchable by `[stellar]` prefix.

---

## 11. What stays mocked in v1

To keep scope honest:

- **`volumeByProtocol` per-protocol historical series** — keep mock. DefiLlama gives current totals; per-protocol historical volume requires N detail calls (one per protocol) that we're skipping for free-tier rate-limit safety. The current 24h volume per protocol comes from DefiLlama and is real.
- **`pulseScores.audits`** — dropped entirely from the type and the UI (section 9).

Everything else (yields, Sankey, prices, RWA, Soroban) is real-source-backed. See section 13a for the oracle decisions on yields and capital flows.

---

## 11a. Locked decisions (from alignment round 1)

| # | Decision | Choice |
|---|---|---|
| 1 | Pulse Score methodology | **Heuristic v1**, `audits` dropped (section 9) |
| 2 | RWA allow-list size | Ship with the verified subset, **min 2, max 5** (section 8) |
| 3 | Price source | **CoinGecko primary → Reflector → Horizon order-book → cached** (section 6.1) |
| 4 | Sankey / Yields | **Use real oracles, no mock** (see section 11b for the chosen oracles) |
| 5 | `verified` UI | **Per-row badge** — replace the global banner (section 11c) |
| 6 | stellar.expert access | **SDK**, not raw fetch (section 11d) |
| 7 | Revalidation API | **Yes** — one `POST /api/revalidate` handler, shared-secret gated (section 5.3) |

## 11b. Oracles for Yields and Capital Flows

### Yields — we become the oracle in the gaps

There is no single reliable oracle for Stellar yields. **DefiLlama Yields covers some** (Blend, Soroswap, YieldBlox, USDC pools); for the rest we derive APY ourselves from on-chain data. We don't mock.

**Layered pipeline:**

1. **DefiLlama Yields** (`https://yields.llama.fi/pools`, filter `chain == "Stellar"`).
   - Gives us: `apy`, `apyBase`, `apyReward`, `tvlUsd`, `pool`, `project`, `symbol`, `stablecoin`, `ilRisk`, `exposure`, `predictions`.
   - `YieldPool.source = "defillama-yields"`, `verified = true`.

2. **stellar.expert + Soroban RPC** for protocols DefiLlama doesn't cover (Kindle Yield, fxDX, anything new):
   - Get the protocol's pool contract IDs from stellar.expert directory.
   - Read pool reserves and reward emission rate via Soroban RPC `getLedgerEntries` (or `simulateTransaction` against a `read_apy()`-style function if the contract exposes one).
   - Compute APY = `(reward_per_period × periods_per_year) / pool_tvl_usd`.
   - `YieldPool.source = "derived-soroban"`, `verified = true` only when **both** the reserves and reward rate read cleanly. Otherwise drop.

3. **Drop** if neither source resolves. No fabricated APY ever reaches the UI.

**Per-protocol contract addresses** live in `lib/stellar/registry.ts` (section 14b). Adding a new protocol = adding one entry to the registry, not changing adapter code.

- **Cache profile:** `directory` (1h revalidate). Yields don't move fast enough to need `market`.
- **UI:** every yield row gets a small `defillama` or `derived` source pill. Missing protocols simply don't appear.

### Capital Flows (Sankey)

There is **no public oracle for cross-protocol capital flow on Stellar.** This is uncomfortable but true. The options are:

1. **Derive it ourselves from Horizon `/payments` + stellar.expert directory** — we become the oracle. We pull the last N hours of payments, label source/destination by directory lookup (account → protocol name), aggregate USD value via prices, emit `FlowEdge[]`. The math is correct; the labels are only as good as the directory. **Recommended.**
2. **Use stellar.expert's "asset flow" endpoints** — they have aggregated flow stats per asset, but not a clean protocol-to-protocol graph that maps to a Sankey.
3. **Drop the Sankey from v1.**

**Decision:** (1) — derive from Horizon + directory. Labeling rules (see §12 Q2 for the final rendering policy):

- Known account in directory → `name: "Soroswap"`, `verified: true`.
- Unknown account → `name: "GBOND…WX7A"` (truncated address, 4 head + 4 tail, prefix included), `verified: false`.
- `FlowEdge.verified` is `true` only when **both** ends resolve to labeled accounts.

Edges are then sorted by 24h volume; top 30 render individually, the rest roll into a "Long tail" aggregate that is suppressed (with a footnote) if it exceeds 40% of total flow.

- **Cache profile:** `market` (1 min revalidate) for the underlying payment fetch; the aggregated `FlowEdge[]` cached at `market` too.
- **Window:** rolling 24h initially. 7d is a v2 option once we trust the pipeline.
- **Compute cost guard:** cap at the most recent 1,000 payments per refresh — anything older gets lost rather than expanding the request window.

## 11c. `verified` UI — per-row treatment

The global "illustrative data" banner is removed. In its place:

- Each data row, tile, and chart legend shows a small mono-typed badge: `live · defillama`, `live · horizon`, `cached · 4m`, or `illustrative` (the last only when fallback truly engaged).
- The hero metric cards show a `· asOf 14:42 UTC` timestamp pulled from `OverviewMetrics.asOf`.
- A single page-level disclosure in the footer explains the badge taxonomy.

This is more honest than a single banner that covers good and bad data alike, and matches the editorial restraint of the redesigned landing page.

## 11d. stellar.expert SDK

We use `@stellar-expert/api-client` (or the closest published equivalent — to confirm at install time; if no first-party SDK exists, we wrap the API surface in `lib/stellar/stellar-expert.ts` ourselves with typed responses and call it our SDK).

- **Why SDK over raw fetch:** typed responses, cleaner adapter code, and stellar.expert occasionally renames query params — the SDK handles those for us.
- **Caveat:** the SDK call still goes through `fetch` internally, so the `next: { revalidate, tags }` options need to be applied via a configured fetcher or our wrapper layer. If the SDK doesn't expose a fetch override, we fall back to raw fetch for the affected endpoints. This is a **section-13 implementation-time check**, not a v1-blocker.

## 12. Remaining open questions

**Q1 (yields coverage gap) — RESOLVED.** Derive ourselves from stellar.expert + Soroban for protocols DefiLlama doesn't cover. Drop if both fail. No mock. See section 11b.

**Q2 (Sankey labeling + threshold) — RESOLVED.** Three-rule labeling, then a long-tail safeguard:

1. **Known account in stellar.expert directory** → render with the protocol name ("Soroswap", "Blend", "External CEX").
2. **Unknown account** → render with truncated address `GBAB…CDEF` (first 4 chars + ellipsis + last 4 chars). Honest about what we don't know, still gives the user a clickable handle they can paste into stellar.expert to investigate.
3. **Edge rendering cap:** top **30 edges** by 24h volume shown individually. Below #30, edges aggregate into a single **"Long tail"** rollup so the Sankey doesn't turn into spaghetti.
4. **Long-tail safeguard (the 40% rule):** if "Long tail" exceeds **40%** of total identified flow, hide the rollup edge entirely and show a footnote: *"X% of flow not shown (long tail below top 30)"*. Below 40%, render normally.

Truncation format detail: the leading `G` (classic) or `C` (Soroban) prefix is kept in the 4-char head — so `GBOND…WX7A` immediately tells the user "this is a classic Stellar address" without extra UI.

---

## 13. Sequencing (proposed, not for execution yet)

Once the two questions in section 12 are answered:

1. **Foundations.** `lib/types.ts` + `lib/stellar/fallback.ts` + `lib/stellar/cache.ts` (cache profiles + tag constants). No network calls yet. Add `next.config.ts` `cacheComponents: true` + custom `cacheLife` profiles.
2. **DefiLlama TVL.** `lib/stellar/defillama.ts` — covers `/`, `/overview`, `/defi-pulse` in one unlock. Migrate `app/page.tsx` + `/overview` to call `getOverviewSnapshot()`. Verify cache hit + fallback path on disconnected network.
3. **Prices.** `lib/stellar/prices.ts` with CoinGecko → Reflector → Horizon-orderbook chain. Plug `PriceSnapshot` into overview composer.
4. **DefiLlama Yields.** `lib/stellar/defillama.ts` adds `fetchYieldPools` → `getYieldOpportunities()`. Wire into `/defi-pulse`.
5. **Horizon.** `lib/stellar/horizon.ts` for stablecoin supply + raw payments fetch.
6. **Capital flows aggregator.** Server-side aggregation of Horizon payments + stellar.expert directory lookups → `FlowEdge[]`. Wire `/capital-flows` Sankey.
7. **stellar.expert + Soroban RPC.** `/soroban` page: top contracts (stellar.expert), event counts (Soroban RPC).
8. **RWA pipeline.** Horizon asset queries for the 2–5 verified issuers. Drop unverified rows.
9. **Heuristic Pulse Score v1.** Pure computation over data already fetched in steps 2–7. Methodology link added.
10. **Per-row `verified` UI pass.** Replace global banner with per-row source pills + `asOf` timestamps. Metadata polish. Build verify.
11. **Revalidation handler.** `POST /api/revalidate`, shared-secret env var. Document tag names for operators.

Each step is independently shippable behind the existing UI — a half-migrated build renders correctly because the fallbacks are the current mocks.

---

## 14. Services, accounts, and keys — the honest checklist

You asked me to walk you through what we actually need to sign up for and configure. Here it is, no fluff.

### 14a. Zero-config (works today, no signup, no key)

| Service | URL | What we use it for | Limits we should respect |
|---|---|---|---|
| **Horizon** | `https://horizon.stellar.org` | All classic-Stellar reads: assets, balances, payments, trades, order books | SDF asks for "fair use". With our 1-min revalidate and 1k-payment cap, we are nowhere near it. |
| **stellar.expert API** | `https://api.stellar.expert/explorer/public/` | Contract directory, contract stats, asset holders, account labels | ~30 req/min soft limit. Our cache profiles stay under this. |
| **DefiLlama** | `https://api.llama.fi`, `https://yields.llama.fi`, `https://stablecoins.llama.fi` | TVL, yield pools, stablecoin supply | Generous. No documented hard limit; they ask for reasonable use. |
| **CoinGecko (anonymous)** | `https://api.coingecko.com/api/v3` | XLM/USD, USDC/USD prices | 10–30 req/min from a single IP. We hit this once per `market` cycle (1 min), so we are fine — but a Demo key (free, see 14c) raises the ceiling and is recommended on Vercel because requests aggregate per egress IP. |

**That's it for v1.** Everything in the dashboard can render with zero accounts created. No credentials in env vars yet.

### 14b. Soroban RPC — pick one provider, no key needed at first

We need **one** Soroban RPC endpoint for Reflector reads, Soroban events (`/soroban` page), and contract storage reads (yields derivation). The public-and-free options:

| Provider | URL | Key required? | Notes |
|---|---|---|---|
| **Gateway.fm** | `https://soroban-rpc.mainnet.stellar.gateway.fm` | No (public tier) | Recommended starting point. Stable, reasonable rate limits. |
| **Validation Cloud** | `https://stellar-mainnet.validationcloud.io/v1/soroban/{KEY}` | Yes (free signup at app.validationcloud.io) | Higher rate limits, better for Soroban events at scale. v2 option. |
| **Blockdaemon** | varies | Yes | Enterprise-leaning; only if Validation Cloud isn't enough. |

**Decision for v1:** Gateway.fm public endpoint, no signup. If we hit limits in practice, swap the env var `SOROBAN_RPC_URL` to a keyed endpoint. The adapter doesn't change.

### 14c. Optional: CoinGecko Demo API key (free, recommended)

- Sign up at `https://www.coingecko.com/en/api/pricing` → Demo plan (free, no card).
- Get a key. Send as header `x-cg-demo-api-key: <key>` and prefix base URL with `https://api.coingecko.com/api/v3/` (same path; the header tier-routes you).
- Raises rate limit from anonymous ~10/min to 30/min and gives you per-key usage analytics.
- **Why on Vercel specifically:** Vercel functions share egress IPs across many tenants. Anonymous CoinGecko throttling can spuriously trip. A keyed request bypasses the IP bucket.

### 14d. Reflector contract IDs (on-chain, no signup, must verify at install time)

Reflector publishes its oracle contract IDs at `https://reflector.network/`. The two we care about:

- **External CEX/DEX price feed** — gives us XLM/USD, USDC/USD.
- **Foreign exchange feed** — secondary, useful for non-USD anchors later.

> ⚠️ I am **not hard-coding the addresses in this doc** because Reflector occasionally rotates feeds and any address I memorize could be stale or wrong. At install time we read the current addresses from reflector.network and pin them in `lib/stellar/registry.ts` with a comment and the date they were verified. We do **not** trust an address until we manually confirm it on the official site.

### 14e. Required env vars

The only secret we actually need to ship v1:

```env
# .env.local (development) / Vercel project env (production)
REVALIDATE_SECRET=<long-random-string>     # shared secret for POST /api/revalidate
```

Optional overrides (all sane defaults in code):

```env
HORIZON_URL=https://horizon.stellar.org
SOROBAN_RPC_URL=https://soroban-rpc.mainnet.stellar.gateway.fm
STELLAR_EXPERT_API=https://api.stellar.expert/explorer/public
COINGECKO_BASE=https://api.coingecko.com/api/v3
COINGECKO_DEMO_KEY=<optional>              # from 14c
```

All env access goes through a single `lib/stellar/env.ts` module that reads via `process.env` and exports typed constants. Default values are the public endpoints above.

### 14f. What we do NOT need (in v1)

- ❌ No Stellar wallet, no signing keys — we're read-only.
- ❌ No Horizon account, no rate-limit token.
- ❌ No DefiLlama account.
- ❌ No stellar.expert account.
- ❌ No paid CoinGecko plan.
- ❌ No database, no Redis. Next 16's cache + Vercel's data cache is the storage layer.

This is intentional: every service in the stack must be replaceable with a single config change. The moment we need an account, we add it; until then, we don't.

---

## 15. Testing strategy — proving the data is correct

You asked for tests to verify data is being pulled correctly. Here is the layered strategy.

### 15a. Test framework

Adding **Vitest** as the test runner. Reasons:

- Native TypeScript, no Babel config.
- Plays cleanly with Next 16's bundler (Turbopack/SWC).
- `vitest --watch` is fast enough to keep open while iterating on adapters.
- Standard in the Next ecosystem now.

Install:
```
npm i -D vitest @vitest/coverage-v8 msw
```

Add scripts to `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "check:sources": "tsx scripts/check-sources.ts"
}
```

### 15b. Four layers of tests

**Layer 1 — Adapter contract tests (unit, no network).**

Each source-specific adapter (`horizon.ts`, `defillama.ts`, `stellar-expert.ts`, etc.) has a sibling `.test.ts` file. Each test:

1. Reads a saved JSON fixture from `__fixtures__/<source>/<scenario>.json` (a real response, captured once).
2. Mocks `fetch` (via MSW) to return that fixture.
3. Calls the adapter function.
4. Asserts the returned typed shape matches the type contract from `lib/types.ts`.

This guarantees: *if the source returns the shape we have a fixture for, the adapter still maps it correctly*. Catches regressions when we refactor.

**Layer 2 — Fallback tests (unit, no network).**

For each adapter, one test verifies that `withFallback` returns the mock-shaped fallback with `verified: false` when the fetcher throws. This is the safety contract: composers never throw.

**Layer 3 — Composer tests (unit, no network).**

For each `lib/stellar/index.ts` composer (e.g. `getOverviewSnapshot`), tests that:
- All upstreams succeed → result has `verified: true` and correct numbers.
- One upstream fails → result has `verified: false`, the other fields are still populated.
- All upstreams fail → result still renders (no throw), `verified: false`, mock values everywhere.

**Layer 4 — Live source liveness check (integration, hits the real internet).**

A separate script `scripts/check-sources.ts` (run with `npm run check:sources`) hits each live endpoint and prints a small table:

```
✓ defillama       142 ms   shape ok
✓ horizon          89 ms   shape ok
✓ stellar.expert  211 ms   shape ok
✗ coingecko       —        429 rate limited
✓ soroban-rpc     180 ms   reflector feed reads ok
```

This is **not run in CI by default** (live network = flaky). It's an operator tool — you run it before a deploy or when something looks off. We can wire it into a nightly GitHub Action later if useful.

### 15c. Health route (Layer 4, exposed)

`GET /api/health/sources` (gated by the same `REVALIDATE_SECRET` as the revalidate route) returns a JSON snapshot like:

```json
{
  "checkedAt": "2026-06-13T14:42:11Z",
  "defillama":     { "ok": true,  "latency_ms": 142, "lastFetch": "..." },
  "horizon":       { "ok": true,  "latency_ms": 89  },
  "stellar_expert":{ "ok": false, "error": "HTTP 429" },
  "coingecko":     { "ok": true,  "latency_ms": 217, "source": "demo-key" },
  "reflector":     { "ok": true,  "feed": "cex-dex", "asOf": "2026-06-13T14:41:02Z" }
}
```

You can poll this from a monitoring tool (Better Stack, UptimeRobot) to get paged when a source goes dark. v2-class, but the route itself ships in v1 so operators can curl it.

### 15d. What we do NOT test

- ❌ The dashboard UI (visual). We've already covered that with the agent stress-test. Will not maintain Playwright tests for v1 — too brittle for a fast-iterating layout.
- ❌ DefiLlama / Horizon / stellar.expert's own correctness. Their numbers are their problem; our job is to map them faithfully.
- ❌ Network failure modes in CI. Covered by the manual `check:sources` script.

### 15e. Coverage target

Initial bar: **80% line coverage on `lib/stellar/`**, no target for the rest. The data layer is where bugs are dangerous; the UI is where layout regressions show up by eye.

---

## 16. Protocol links — safe, verified outbound URLs

The `/defi-pulse` (protocols) page and any "open dApp" CTA must take the user to the **real** protocol, not a phishing clone. Stellar has a phishing problem (Soroswap and Blend clones have shown up on DEX aggregators before). This is a trust-critical feature. The architecture has to make a fake link impossible by construction.

### 16a. Source of truth: code-checked-in registry

All outbound protocol URLs live in a single file:

```ts
// lib/stellar/protocol-registry.ts
import { z } from "zod";

export const ProtocolLinks = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  homepage: z.string().url().startsWith("https://"),
  app:      z.string().url().startsWith("https://").optional(),
  docs:     z.string().url().startsWith("https://").optional(),
  twitter:  z.string().url().startsWith("https://twitter.com/").or(
            z.string().url().startsWith("https://x.com/")).optional(),
  github:   z.string().url().startsWith("https://github.com/").optional(),
  audits:   z.array(z.object({
              firm: z.string(),
              url: z.string().url().startsWith("https://"),
              date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            })).default([]),
  verifiedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verifiedBy: z.string(),
});
export type ProtocolLinks = z.infer<typeof ProtocolLinks>;

export const PROTOCOL_REGISTRY: Record<string, ProtocolLinks> = {
  soroswap: ProtocolLinks.parse({
    slug: "soroswap",
    name: "Soroswap",
    homepage: "https://soroswap.finance",
    app: "https://app.soroswap.finance",
    docs: "https://docs.soroswap.finance",
    twitter: "https://x.com/SoroswapFinance",
    github: "https://github.com/soroswap",
    audits: [
      { firm: "Runtime Verification", url: "https://...", date: "2025-04-12" },
    ],
    verifiedOn: "2026-06-13",
    verifiedBy: "lucasalb11",
  }),
  blend: ProtocolLinks.parse({
    slug: "blend",
    name: "Blend Capital",
    homepage: "https://blend.capital",
    app: "https://mainnet.blend.capital",
    // ...
    verifiedOn: "2026-06-13",
    verifiedBy: "lucasalb11",
  }),
  // ... other protocols
};
```

**Why this design specifically:**

1. **It's source code, not data.** The registry is under version control. Every change to a URL is a git diff with author, timestamp, and review. Anyone changing a link can be audited via `git blame`. No CMS, no admin panel, no runtime mutation.
2. **Zod validation at module load.** If a URL ever fails the `https://`-only, hostname-allowlist, or category checks (`twitter` must be twitter.com/x.com, `github` must be github.com), the **build fails**. A bad URL cannot reach production.
3. **`verifiedOn` + `verifiedBy` audit trail.** Every entry carries the date a human checked the URL is correct and who that human was. Old entries get re-verified annually; a `verifiedOn` older than 365 days emits a build warning.
4. **No environment variables.** Outbound URLs are not configurable per-deploy. Production and preview always link to the same destinations. This eliminates the class of attacks where someone sets `BLEND_URL=https://blend-phishing.lol` in a hijacked env-var dashboard.

### 16b. UI rendering rules

When the dashboard renders a protocol row's outbound link:

1. **Lookup, never interpolate.** Always `PROTOCOL_REGISTRY[slug]?.app`. Never `\`https://\${name}.finance\``.
2. **Show the hostname.** Hover state on every outbound link shows the bare hostname (`app.soroswap.finance`) so the user can verify before clicking. Pattern is `<a href={url} title={new URL(url).hostname}>`.
3. **`rel="noopener noreferrer"` + `target="_blank"`.** Standard outbound hygiene; the target site cannot access `window.opener`.
4. **No referrer leak of internal routes.** We pair the above with the page-level `<meta name="referrer" content="strict-origin">` so protocols only see `stellarpulse.xyz`, not the deep route the user was on.
5. **A small verified pill** next to each link showing the `verifiedOn` date. This is the user-facing trust signal — "Stellar Pulse last checked this URL on 2026-06-13." Click opens a one-paragraph explanation of what verification means.
6. **No tracking redirect through our domain.** We do **not** route clicks through `/r/{slug}` for analytics — that introduces an open-redirect attack surface and a phishing prefix vector. Direct `href` only.

### 16c. What's NOT in the registry

- ❌ Pricing/yield numbers (those come from data sources).
- ❌ Live TVL (DefiLlama).
- ❌ User reports of bad URLs in v1. v2 adds a "report this link" channel.
- ❌ Any URL that isn't a protocol's first-party domain. We don't list "secondary frontends" or community ports.

### 16d. Onboarding a new protocol

The PR template for adding a protocol to the registry requires:

1. Link to the protocol's official Twitter announcing the URL.
2. Link to docs that mention the URL.
3. Manual cross-check: the URL's `<meta name="application-name">` and TLS certificate subject must match.
4. Reviewer signs off by setting `verifiedBy` to their GitHub handle.

This is process, not code — but the process is what makes the code defensible.

### 16e. Linkage to existing types

The `Protocol` type in `lib/types.ts` (section 4) gains:

```ts
export interface Protocol {
  // ... existing fields
  links?: ProtocolLinks;     // populated by composer from PROTOCOL_REGISTRY[slug]
}
```

Composers join the live data (DefiLlama TVL, etc.) with the static registry entry by `slug`. A protocol with no registry entry **shows no outbound link** — better blank than wrong.

---

## 17. Security architecture

> **For routine operations** — weekly checks, monthly audits, incident response — see `SECURITY.md` at the project root. This section is the **codified, in-app** half of the security posture: headers, validation, rate limits, allowlists. `SECURITY.md` is the **operational** half.

### 17a. Threat model — what we are actually defending against

This app has a deliberately narrow attack surface (read-only public dashboard, no auth, no user-mutable state in v1). The real risks are:

| # | Threat | Severity | Why |
|---|---|---|---|
| 1 | **Phishing via tampered outbound URL** | Critical | A wrong link sends users to a malicious Stellar dApp clone and they lose funds. |
| 2 | **Upstream data poisoning** (DefiLlama/Horizon/CoinGecko serving crafted JSON) | High | Renders garbage at best; XSS at worst if escaping ever lapses. |
| 3 | **`POST /api/revalidate` secret leak / brute force** | High | Attacker forces cache invalidation → cold fetches → DoS our function bill. |
| 4 | **Soroban RPC provider compromise** | High | Lies about Reflector prices → we render wrong USD numbers. |
| 5 | **Stellar address poisoning** (fake USDC issuer) | High | We render a malicious token as if it were the real USDC. |
| 6 | **Supply chain (npm dep compromise)** | High | One malicious update during `npm install` and the build ships a backdoor. |
| 7 | **AI-tooled recon / automated probes** | Medium | sqlmap-class scanners + LLM-driven fuzzers hitting `/api/*`. |
| 8 | **Clickjacking** | Medium | An attacker iframes the dashboard inside a phishing wrapper. |
| 9 | **Open redirect** | Medium | We explicitly refused `/r/{slug}` in §16 — keep refusing. |
| 10 | **Subdomain takeover** (dangling DNS) | Medium | DNS hygiene problem; addressed in `SECURITY.md` monthly checklist. |
| 11 | **Function-bill DoS** | Medium | High request volume runs up Vercel cost even without exploit. |
| 12 | **Prompt injection via data** | Low (v1), Critical (v2) | When/if v2 adds an LLM, upstream strings become attack vectors. Documenting now. |

**Out of scope for v1:** account takeover (no accounts), CSRF on writes (no user-facing writes), SQL injection (no DB), file upload abuse (no uploads).

### 17b. Defense-in-depth — the seven controls in code

#### 1. Security headers (defense baseline)

Set in `proxy.ts` (Next 16's renamed middleware) for every response:

```ts
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",           // 'unsafe-inline' until we strict-CSP; see §17c
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://horizon.stellar.org https://api.stellar.expert https://api.llama.fi https://yields.llama.fi https://stablecoins.llama.fi https://api.coingecko.com https://soroban-rpc.mainnet.stellar.gateway.fm",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", CSP);
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return res;
}
```

`connect-src` is the **single most important** allowlist — it constrains where our client can ever talk to. Any source URL added to the architecture **must** be added here in the same PR.

#### 2. Upstream response validation (Zod everywhere)

Every adapter wraps the parsed JSON in a Zod schema before returning. A `DefiLlamaProtocol.name` that's 10 KB long or contains `<script>` tags fails parsing → adapter throws → `withFallback` engages. The bad data never reaches the renderer.

```ts
// lib/stellar/defillama.ts
const ProtocolSchema = z.object({
  slug: z.string().max(80).regex(/^[a-z0-9-]+$/i),
  name: z.string().max(80),
  category: z.string().max(40),
  tvl: z.number().nonnegative().lte(1e12),     // 1T USD cap — sanity
  // ... etc
});
```

Numbers carry sanity bands. Strings are length-capped and regex-validated where shape allows. No upstream string longer than 200 chars is rendered without truncation.

##### Zod schema audit

Every adapter under `lib/stellar/*` that calls `fetch()` MUST run its response through a Zod schema before the data leaves the file. Schemas are re-exported via `lib/stellar/schemas.ts` so `scripts/security-check.ts` can cross-reference.

| Adapter file | Schemas (exported) | Test coverage | Status |
|---|---|---|---|
| `defillama.ts` | `ChainTvlPoint`, `ChainTvlSeries`, `LlamaProtocol`, `LlamaProtocolList` | parse-failure, sanity-band, chain-filter, category-map | LIVE |
| `defillama-yields.ts` | `LlamaYieldPool`, `LlamaYieldResponse` | parse-failure, chain-filter, apy sanity ceiling 500%, sort | LIVE |
| `prices/coingecko.ts` | `CoingeckoSimple` (inline) | parse-failure, missing-field, 500, negative-price reject | LIVE |
| `prices/orderbook.ts` | `OrderBookResponse` (inline) | parse-failure, empty side, non-numeric, 500 | LIVE |
| `prices/reflector.ts` | env-gate + reader interface (no schema; reader is mocked) | env-not-set throws, reader injected returns value, default reader throws | LIVE |
| `prices/index.ts` (orchestrator) | none directly — composes the three above + `sanity.ts` bands | layered fallthrough, sanity bands rejection (XLM, USDC), mock terminal | LIVE |
| `assets.ts` | `CanonicalAssetSchema` (discriminated union by `kind`) | issuer collision, spoof rejection, native/sac/classic regex | LIVE |
| `protocol-links.ts` | `ProtocolLinksSchema`, `RegistrySchema` | http://, javascript:, data:, userinfo `@`, slug regex, audit url, duplicate slug | LIVE |
| `sanity.ts` | constants `PRICE_BANDS` (XLM, USDC, EURC) | each band boundary, unknown symbol, NaN/Infinity | LIVE |
| `horizon.ts` | `HorizonAsset`, `HorizonPayment`, paginated cursor schema | parse-failure, pagination, asset-registry collision | TODO #28 |
| `stellar-expert.ts` | `ContractListEntry`, `ContractMeta` | parse-failure, C-prefix check | TODO #30 |
| `soroban-rpc.ts` | `LedgerEntry`, `GetEventsResponse` | parse-failure, JSON-RPC envelope | TODO #30 |

The PM agent blocks any adapter PR that doesn't add a row here.

#### 3. `POST /api/revalidate` hardening

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

const ALLOWED_TAGS = new Set([
  "stellar:overview", "stellar:tvl", "stellar:stablecoins",
  "stellar:rwa", "stellar:soroban", "stellar:prices",
  "stellar:yields", "stellar:flows", "stellar:directory",
]);

export async function POST(req: Request) {
  // 1. Constant-time secret check
  const provided = req.headers.get("x-revalidate-secret") ?? "";
  const expected = process.env.REVALIDATE_SECRET ?? "";
  if (!expected || provided.length !== expected.length) return new Response("forbidden", { status: 403 });
  if (!timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    return new Response("forbidden", { status: 403 });
  }

  // 2. Body shape validation
  const body = await req.json().catch(() => ({}));
  const tag = typeof body.tag === "string" ? body.tag : null;

  // 3. Tag allowlist — attacker can't invalidate arbitrary keys
  if (!tag || !ALLOWED_TAGS.has(tag)) {
    return new Response("invalid tag", { status: 400 });
  }

  // 4. Per-IP rate limit (10 req / hour)
  if (await rateLimited(req)) return new Response("rate limited", { status: 429 });

  revalidateTag(tag, "max");
  return Response.json({ revalidated: tag });
}
```

Four controls layered: constant-time auth, schema validation, tag allowlist, rate limit. Even with the secret compromised, blast radius is "force-revalidate one of nine known tags up to 10×/hour from one IP." Recoverable.

#### 4. Asset allowlist by `{code, issuer}`

For Stellar-specific address poisoning. The risk: an attacker issues a token with `code = "USDC"` from a fake `G…` account. If we ever filter or group by `code` alone, the fake mixes with the real.

**Rule:** every classic-asset lookup keys on the tuple `(code, issuer)`. The known-real issuers live in `lib/stellar/asset-registry.ts`:

```ts
export const KNOWN_ASSETS = {
  USDC: { issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", category: "stablecoin" },
  EURC: { issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2", category: "stablecoin" },
  BENJI: { issuer: "<TBD verify at install>", category: "rwa" },
  // ...
};
```

An upstream payload claiming `code: "USDC", issuer: <not-the-registry-issuer>` is **silently dropped** (not rendered with a warning — that would still hand the attacker visibility). Logged with `[security] asset-poisoning-attempt`.

#### 5. Soroban RPC sanity bands

Prices from Reflector or any other on-chain oracle pass through hard bands before they're accepted into `PriceSnapshot`:

| Asset | Min | Max |
|---|---|---|
| XLM/USD | 0.01 | 10.00 |
| USDC/USD | 0.95 | 1.05 |
| EURC/USD | 0.80 | 1.30 |

Values outside the band fall back down the chain (Reflector → orderbook → cache). A compromised RPC provider lying that XLM = $10,000 is rejected at the door.

APY values similarly capped: anything > 1000% APY is treated as bad data, dropped. Single-protocol TVL > $10B same treatment.

#### 6. Supply chain hardening

- **Lockfile review on every PR.** Reviewer eyeballs `package-lock.json` diff. Unexpected new packages = block.
- **`npm audit --audit-level=high` runs in CI**, fails build on high/critical.
- **Pin direct deps to exact versions** (no `^`) in v1. Allow ranges only on `@types/*`.
- **Vercel install uses `npm ci`** (lockfile-strict), never `npm install`.
- **`npm install` locally only with `--ignore-scripts` when adding a new dep** (blocks postinstall scripts from running before we review the dep).
- **Monthly:** `npm outdated` review, scheduled in `SECURITY.md`.

#### 7. Rate limiting + bot protection

- **Per-IP rate limit** on `/api/revalidate` and `/api/health/sources`. 10/hour, in-memory bucket per Fluid instance (good enough for v1; if we get serious traffic, swap for Upstash or Vercel's KV).
- **Vercel BotID** enabled on `/api/*` routes (if available on our plan) — blocks recognized bot UAs and headless browsers.
- **No `/api` route accepts a URL parameter that gets fetched server-side** — closes SSRF.

### 17c. Strict CSP — v1 vs v2

v1 ships with `'unsafe-inline'` on script-src because Next 16 prerendered streams need inline boot scripts. v2 migrates to **nonce-based CSP**:
- Generate a per-request nonce in `proxy.ts`.
- Pass it to `Script` components via the nonce prop.
- Drop `'unsafe-inline'`.

This is a one-day refactor. Tracked but not blocking v1 launch.

### 17d. What `SECURITY.md` covers (and what stays here)

| Lives in `data-architecture.md` §17 | Lives in `SECURITY.md` |
|---|---|
| Threat model | Routine checklists (weekly/monthly/quarterly) |
| Code-level controls (headers, Zod, allowlists, rate limits) | Manual verification steps (check Reflector contract IDs, audit DNS) |
| API hardening pattern | Incident response runbook |
| Sanity bands & validation rules | When to convene a Claude security session |
| Architecture trade-offs | How to run `scripts/security-check.ts` |

If a control can be expressed in code, it lives here. If a control requires a human to do something on a schedule, it lives in `SECURITY.md`.


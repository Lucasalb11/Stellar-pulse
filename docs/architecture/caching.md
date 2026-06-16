---
sidebar_position: 3
title: Caching
---

# Caching

Two cache primitives, two questions:

| Primitive | Question | Where |
|---|---|---|
| `fetch(url, { next: { revalidate, tags } })` | How fresh does **this single network call** need to be? | Inside every adapter, on every external `fetch` |
| `'use cache'` + `cacheLife()` + `cacheTag()` | How fresh does **this aggregated, transformed result** need to be? | On high-level functions in `lib/stellar/index.ts` |

## Three profiles

Defined in `next.config.ts`:

| Profile | `stale` | `revalidate` | `expire` | Examples |
|---|---|---|---|---|
| `market` | 30 s | 1 m | 5 m | Prices, stablecoin supply, Sankey edges, recent payments |
| `tvl` | 1 m | 5 m | 30 m | DefiLlama protocols, TVL series, Pulse Score, yield pools |
| `directory` | 5 m | 1 h | 1 d | Asset registry, stellar.expert directory, RWA issuer metadata |

### When to use which

- **`market`** for anything users expect to update by the minute (a price, a flow, today's transfer count).
- **`tvl`** for anything that's economically meaningful but doesn't actually move minute-to-minute (TVL, APYs, protocol rankings).
- **`directory`** for metadata that essentially never changes (issuer names, asset symbols, contract directory entries).

## Per-call vs aggregated

A typical chain looks like this:

```ts
// Adapter — per-call freshness
const res = await fetch(URL, { next: { revalidate: 60, tags: ["horizon:assets"] } });

// Aggregator — aggregated freshness
export async function getStablecoinSupplies() {
  "use cache";
  cacheLife("market");
  cacheTag("stablecoin-supplies");
  return withFallback(fetchStablecoinSupplies, mockStablecoinSupplies, "stablecoin-supplies");
}
```

The two freshness windows compose: the **shorter** wins for the inner fetch, the **outer** controls how often the transformed result is recomputed.

## Tags

Every aggregator function calls `cacheTag(<canonical-tag>)`. The tags are an enum-like set used by `/api/revalidate`:

| Tag | Invalidates |
|---|---|
| `tvl` | DefiLlama TVL, protocols, categories |
| `protocols` | Protocol list |
| `stablecoin-supplies` | Horizon `/assets` for USDC/EURC |
| `prices` | Price chain output |
| `contracts` | stellar.expert top contracts |
| `pulse-score` | Computed Pulse Scores |
| `flows` | Sankey edges |
| `rwa` | RWA issuer aggregate |
| `yields` | DefiLlama yield pools |

`POST /api/revalidate` accepts only these tags — anything else returns 400. See [API → Revalidate](../api/revalidate).

## Header response

Every page route emits its cache profile in the build output:

```
Route (app)                 Revalidate  Expire
├ ○ /dashboard/stablecoins         1m       5m   ← market
├ ○ /dashboard/defi                5m      30m   ← tvl
├ ○ /dashboard/flows               1m       5m   ← market
├ ○ /dashboard/rwa                 5m      30m   ← tvl
├ ○ /dashboard/soroban             5m      30m   ← tvl
├ ○ /dashboard/pulse-score         5m      30m   ← tvl
```

If you see a route's profile drift after a refactor, that's a regression — check that the page is consuming the right aggregator.

## What we deliberately do **not** cache

- The `withFallback` log line. It must always emit so monitoring catches degradation.
- The health endpoint (`/api/health/sources`). It's `force-dynamic`; freshness is the point.
- The revalidate endpoint (`/api/revalidate`). It writes; it doesn't read.

## Verifying cache behavior

```bash
# Watch the build output
npm run build | grep -A1 "Route (app)"

# Force a revalidation for one tag (requires REVALIDATE_SECRET)
curl -X POST http://localhost:3000/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tag":"prices"}'

# Confirm freshness after revalidation
curl http://localhost:3000/api/health/sources | jq '.sources[] | select(.name=="prices-layered")'
```

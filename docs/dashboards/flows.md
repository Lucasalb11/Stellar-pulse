---
sidebar_position: 4
title: Capital Flow Engine
---

# Capital Flow Engine (`/dashboard/flows`)

## What it shows

- **KPIs:** Last-hour inflow/outflow/net, 24h volume
- **Sankey diagram:** capital edges between known entities in the last 24h
- **Net flows chart:** 30-day aggregate
- **Recent flows feed:** last 60 minutes

## Data path

```
getFlowEdges("24h")
  └─ Horizon /payments?cursor=now&limit=200 (paginated until out-of-window)
  └─ aggregate by {source, destination, asset}
  └─ resolve names via lib/stellar/directory.ts
  └─ drop edges below 0.5% of the window total
  └─ cap to top N edges
```

Pagination stops at the first record whose `created_at` falls outside the window — see `fetchRawPayments` in `lib/stellar/horizon.ts`.

## Cache

- Aggregator: `cacheLife("market")` — 1 m revalidate, 5 m expire
- Tags: `flows`

## Provenance

The Sankey card header carries one `<SourceBadge>`:

- `horizon` when `edges.length > 0` → label "Horizon"
- `mock` otherwise → label "Illustrative"

## Directory coverage

`lib/stellar/directory.ts` seeds known entities. v1 covers:

- Circle (USDC) issuer
- Circle (EURC) issuer
- Allbridge (USDT bridged)

When the directory doesn't know an address, the Sankey labels it as a truncated G-key (`GBOND…WX7A`) and `sourceKnown: false`. The `<FlowEdge>.verified` field is `true` only when **both** endpoints resolve.

## Adapter file

`lib/stellar/sankey.ts` (aggregator) + `lib/stellar/horizon.ts` (raw payments)

## Tests

- `tests/adapters/sankey.test.ts` — edge cap, 40% threshold, directory resolution
- `tests/adapters/horizon.test.ts` — pagination stops at window boundary

## Known limits

- The 30-day net flows chart is mock — Horizon doesn't expose a historical aggregate.
- The "Recent flows" feed is mock; would need a separate paged Horizon stream.
- Directory needs to grow before any "known entity coverage" marketing claim.

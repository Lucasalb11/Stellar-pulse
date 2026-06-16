---
sidebar_position: 2
title: DeFi Pulse
---

# DeFi Pulse (`/dashboard/defi`)

## What it shows

- **Top KPIs:** Total TVL, 24h Volume, Active Protocols, Average APY
- **Protocols table:** Top 13 protocols on Stellar by TVL, with category, 24h Δ, sparkline
- **Yield pools table:** Top yield opportunities, normalized APY (base + reward, capped at 500%)

## Data path

```
getProtocols() ──▶ DefiLlama /protocols  ──▶ filter chains: ["Stellar"]
getYieldPools() ──▶ DefiLlama /pools     ──▶ filter chain: "Stellar", cap apy ≤ 500
```

Both go through `withFallback` — if DefiLlama 502s, the page renders Illustrative.

## Cache

- Aggregators: `'use cache'` + `cacheLife("tvl")` — 5 m revalidate, 30 m expire
- Tags: `protocols`, `yields`

## Provenance

Each protocol row shows a `<SourceBadge>`:

- `defillama` (verified) → accent tone, label "DefiLlama"
- `mock` → warning tone, label "Illustrative"

Each yield pool row shows:

- `defillama-yields` → label "DefiLlama Yields"
- `mock` → label "Illustrative"

## Adapter file

`lib/stellar/defillama.ts` + `lib/stellar/defillama-yields.ts`

## Tests

- `tests/adapters/defillama.test.ts` — parse + chain filter + happy path
- `tests/adapters/defillama-yields.test.ts` — APY cap + chain filter

## Known limits

- DefiLlama protocol slugs occasionally rename — we keep a slug-alias map in `lib/stellar/defillama.ts`.
- `users24h` is 0 for protocols where DefiLlama doesn't expose per-day user counts.

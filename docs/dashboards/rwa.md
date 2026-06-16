---
sidebar_position: 5
title: RWA Hub
---

# RWA Hub (`/dashboard/rwa`)

## What it shows

- **KPIs:** RWA market size, # verified issuers, 30d Δ
- **Issuer table:** name, TVL, share, APY, category, verified status

## Data path

```
getRwaIssuers()
  └─ for each known issuer in lib/stellar/rwa.ts:
       └─ Horizon /assets?asset_issuer={G…}
       └─ sum supply across the issuer's assets
       └─ multiply by USD oracle for issued asset
```

## Cache

- Aggregator: `cacheLife("tvl")` — 5 m revalidate, 30 m expire
- Tags: `rwa`

## Provenance

Each issuer row's status column renders a full `<SourceBadge>`:

- `horizon` (verified) → accent tone, label "Horizon"
- `mock` → warning tone, label "Illustrative"

## Issuer registry

`lib/stellar/rwa.ts` lists the canonical RWA issuers. v1 ships with placeholders for:

- BENJI (Franklin Templeton)
- WisdomTree Prime
- Etherfuse

:::caution
The current placeholder G-keys satisfy the format regex but are **not yet confirmed against on-chain issuers**. Until they're verified, Horizon lookups return null and the page falls back to the illustrative roster. Tracked for pre-deploy.
:::

## Tests

- `tests/adapters/rwa.test.ts` (when added) — issuer registry shape + USD conversion
- Asset registry collision rejection in `tests/stellar/assets.test.ts`

## Known limits

- Only 3 placeholder issuers seeded.
- USD conversion uses CoinGecko spot — for v2, switch to per-asset NAV.

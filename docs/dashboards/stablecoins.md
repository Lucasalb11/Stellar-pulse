---
sidebar_position: 3
title: Stablecoin Observatory
---

# Stablecoin Observatory (`/dashboard/stablecoins`)

## What it shows

- **KPIs:** USDC Supply, Transfers (24h), Velocity, Active Wallets, USDC Market Share
- **60-day supply chart:** total stablecoin float on Stellar
- **Supply breakdown:** donut + legend by asset (USDC, EURC, USDT bridged)
- **Transfers chart:** 30-day daily transfer count
- **Issuer health bars:** Circle (USDC), Circle (EURC), Bridged USDT, Anchor USD

## Data path

```
getStablecoinSupplies()
  └─ Horizon /assets?asset_code=USDC&asset_issuer=GA5ZS…
  └─ Horizon /assets?asset_code=EURC&asset_issuer=GDHU6…
  └─ Horizon /assets?asset_code=USDT&asset_issuer=GCQTG… (Allbridge)
```

Each row is summed from `balances.authorized + liquidity_pools_amount + contracts_amount + claimable_balances_amount`.

## Cache

- Aggregator: `cacheLife("market")` — 1 m revalidate, 5 m expire
- Tags: `stablecoin-supplies`

## Provenance

The supply breakdown sidebar renders one `<SourceBadge>` per asset:

- `horizon` (when supplies fetched + verified) → accent tone, label "Horizon"
- `mock` → warning tone, label "Illustrative"

The card header also shows a single Horizon / Illustrative `<SourceBadge>` summarizing the section.

## Asset registry

The canonical `{code, issuer}` tuples come from `lib/stellar/assets.ts`:

| Symbol | Issuer | Source |
|---|---|---|
| USDC | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` | Circle |
| EURC | `GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2` | Circle |
| USDT (bridged) | `GCQTG…` (Allbridge) | needs re-verification before deploy |

If an asset record's issuer doesn't match the registry, it's **dropped** — see `tests/adapters/horizon.test.ts`.

## Adapter file

`lib/stellar/horizon.ts`

## Tests

- `tests/adapters/horizon.test.ts` — including real-shape regression (the `balances.authorized + LP + contracts + claimable` sum)

## Known limits

- "Transfers · 24h" KPI uses mock data — Horizon `/payments` aggregation is wired (Sankey), but a separate counter would require its own cache window.
- The "Issuer health" bars are illustrative — no live "issuer health" source exists.

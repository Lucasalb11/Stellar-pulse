---
sidebar_position: 2
title: Data Sources
---

# Data Sources

Stellar Pulse pulls from **7 public endpoints**. None require auth at v1.

## At a glance

| # | Source | Adapter | Cache profile | Rate limit |
|---|---|---|---|---|
| 1 | Horizon | `lib/stellar/horizon.ts` | `market` (assets), per-call (payments) | ~3,600 req/h/IP (soft) |
| 2 | Soroban RPC | `lib/stellar/soroban.ts` | `market` | per provider |
| 3 | stellar.expert | `lib/stellar/stellar-expert.ts` | `tvl` | ~30 req/min |
| 4 | DefiLlama | `lib/stellar/defillama.ts` | `tvl` | generous |
| 5 | DefiLlama Yields | `lib/stellar/defillama-yields.ts` | `tvl` | generous |
| 6 | CoinGecko | `lib/stellar/prices/coingecko.ts` | `market` | 10–30 req/min |
| 7 | Reflector | `lib/stellar/prices/reflector.ts` | `market` | Soroban RPC limit |

## 1. Horizon

**URL:** `https://horizon.stellar.org`

**What we use it for:**

- `/assets?asset_code=…&asset_issuer=…` — stablecoin supply (USDC, EURC) and RWA issuance
- `/payments?cursor=now&limit=200` — raw payment stream for the Sankey aggregator
- `/order_book?...` — orderbook-based price fallback (last leg of the price chain)

**Real schema gotcha (P0 caught at §6 dry run):** the `/assets` response does **not** carry a top-level `amount`. Supply is split across `balances.authorized` + `liquidity_pools_amount` + `contracts_amount` + `claimable_balances_amount`. The adapter sums these.

## 2. Soroban RPC

**Default URL:** `https://soroban-rpc.mainnet.stellar.gateway.fm` (override with `SOROBAN_RPC_URL`)

**What we use it for:**

- `simulateTransaction` against the Reflector oracle contract — Soroban-native price reads when CoinGecko is down
- (v2) `getEvents` for protocol-level event streams

**Failure mode:** event windows have ~24 h retention on public providers. If we miss a window, we accept a gap rather than re-indexing.

## 3. stellar.expert

**URL:** `https://api.stellar.expert/explorer/public/`

**What we use it for:**

- `GET /contract` — top contracts (Soroban dashboard)
- `GET /contract-stats` — global contract counts

**Real schema gotcha (P0 caught at §6 dry run):**

1. The contract id field is **`contract`**, not `id`.
2. `invocations` is `null` on most records.
3. The `?sort=invocations` parameter is **a no-op** for the unauthenticated endpoint — records come back in contract-address-desc order regardless.

The adapter ranks client-side by `activityScore = invocations || (subinvocation + events + payments)` and drops zero-activity rows.

## 4. DefiLlama

**URL:** `https://api.llama.fi`

**What we use it for:**

- `GET /protocols` (filtered to `chains: ["Stellar"]`) — protocol list with TVL
- `GET /protocol/{slug}` — historical TVL series
- `GET /charts/Stellar` — chain-wide TVL series (90-day)

**Canonical category source.** If DefiLlama says Phoenix is `Dexes`, the app does not override it.

## 5. DefiLlama Yields

**URL:** `https://yields.llama.fi`

**What we use it for:**

- `GET /pools` — APY pools, filtered to `chain: "Stellar"`

**Sanity cap:** APY is capped at 500% — pools above this drop out (DefiLlama occasionally publishes >1000% APYs from reward-token mis-pricing).

## 6. CoinGecko

**URL:** `https://api.coingecko.com/api/v3`

**What we use it for:**

- `GET /simple/price?ids=stellar,usd-coin&vs_currencies=usd` — spot prices
- `GET /coins/stellar/market_chart` — XLM 90-day series

**Sanity bands:** XLM `[0.05, 5.00]`, USDC `[0.95, 1.05]`. Out-of-band values bubble to the next leg.

## 7. Reflector

**URL:** Soroban contract IDs published at [reflector.network](https://reflector.network)

**What we use it for:**

- `lastprice` / `prices` invocations against the Reflector oracle, via Soroban RPC `simulateTransaction`

Reflector is the **second leg** of the price chain — used when CoinGecko returns an out-of-band value or fails.

## The price chain

```
coingecko ──fail──▶ reflector ──fail──▶ horizon-orderbook ──fail──▶ cache ──fail──▶ mock
```

The winning leg is recorded in `PriceSnapshot.source`. The landing page's hero ticker shows it inline (`prices.source.toUpperCase()`).

## Adding a new source

See [Guides → Adding a Source](../guides/adding-a-source).

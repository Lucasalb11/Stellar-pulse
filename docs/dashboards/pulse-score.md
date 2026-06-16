---
sidebar_position: 7
title: Pulse Score
---

# Pulse Score (`/dashboard/pulse-score`)

A proprietary 0–100 trust signal for the top Stellar protocols.

## The v1 formula

```
total = 0.35·liquidity + 0.30·tvlStability + 0.15·age + 0.20·concentration
```

Each factor is 0–100. `total` rounds to integer.

| Verdict | Total |
|---|---|
| Trusted | ≥ 85 |
| Solid | 75–84 |
| Watch | 60–74 |
| Risky | < 60 |

## Factor inputs

| Factor | Source | Notes |
|---|---|---|
| `liquidity` | DefiLlama TVL rank within Stellar | 100 for top, decreasing |
| `tvlStability` | Chain-level TVL series stdev | Same for all protocols in v1 — DefiLlama doesn't expose per-protocol history here |
| `age` | `KNOWN_AGE_HINT` map in `lib/stellar/pulse-score.ts` | Hardcoded launch dates; falls back to 50 |
| `concentration` | Horizon `top-holders` (not yet wired) | Defaults to 70 in v1 |

:::note No `audits` factor
v1 explicitly **does not** include an `audits` score. Earlier mocks had `audits: 98` hardcoded, which would have shipped a fake number. The principle "no fake methodology numbers" required us to remove it until a real audit registry exists.
:::

## Data path

```
getPulseScores(topN = 12)
  └─ getProtocols()        ──▶ DefiLlama (top N by TVL)
  └─ getTvlSeries()        ──▶ DefiLlama chain TVL
  └─ buildPulseScores(protocols, series, topN)
       └─ scoreProtocol() per row
       └─ classify verdict
```

## Cache

- Aggregator: `cacheLife("tvl")` — 5 m revalidate, 30 m expire
- Tags: `pulse-score`

## Provenance

The methodology sidebar card carries one `<SourceBadge source="defillama" verified={pulseScores.length > 0}>`. There's no per-row badge — every row derives from the same upstream, so a row-level badge would be redundant.

## Tests

`tests/adapters/pulse-score.test.ts` — 10 tests covering:

- Formula correctness
- Verdict classification thresholds
- Stable output for empty input
- Cap at 100

## Known limits

- `tvlStability` is identical across protocols in v1.
- `concentration` defaults to 70 for all protocols until Horizon `top-holders` is wired.
- `age` is hardcoded — would need on-chain account creation timestamps for full automation.

---
sidebar_position: 6
title: Soroban Explorer
---

# Soroban Explorer (`/dashboard/soroban`)

## What it shows

- **KPIs:** Total contracts, Active (24h), Invocations (24h)
- **60-day contract series:** mock (no public historical source — see Known limits)
- **Most-active contracts table:** top contracts by activity score, with name + type from directory

## Data path

```
getTopContracts(limit?)
  └─ stellar.expert /contract?limit=200
  └─ activityScore = invocations || (subinvocation + events + payments)
  └─ drop activityScore === 0
  └─ sort desc, take top N

getSorobanGlobalStats()
  └─ stellar.expert /contract-stats
```

## Cache

- Aggregator: `cacheLife("tvl")` — 5 m revalidate, 30 m expire
- Tags: `contracts`

## Provenance

Each contract row renders a compact `<SourceBadge source="stellar-expert" verified={c.verified}>`:

- `stellar-expert` (verified) → label "stellar.expert"
- `mock` → label "Illustrative"

## Contract IDs

All IDs are validated against the Soroban contract format: `^C[A-Z0-9]{55}$`. Records that fail the regex are dropped at parse time — see `ContractIdSchema` in `lib/stellar/schemas.ts`.

## Adapter file

`lib/stellar/stellar-expert.ts` + `lib/stellar/soroban.ts`

## Tests

- `tests/adapters/stellar-expert.test.ts` — including:
  - Real-shape regression: field name is `contract`, not `id`
  - `invocations` may be null; falls back to `subinvocation + events`
  - Drops zero-activity rows
  - Rejects non-C-prefixed IDs

## Known limits

- The 60-day contract chart uses mock data. stellar.expert's public surface doesn't expose a `/contract-history` aggregate, and reconstructing it from `getEvents` would exceed the 24h retention window. Flagged for v2.
- `?sort=invocations` is a no-op on the public unauthenticated endpoint. The adapter compensates by paging `limit=200` and ranking client-side. Top-N accuracy depends on what's in those 200 records.

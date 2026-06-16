---
sidebar_position: 5
title: Type Contracts
---

# Type Contracts

The seam between adapters and pages is `lib/types.ts`. Every shape page-side code can rely on is exported from there.

## The `DataSource` enum

```ts
type DataSource =
  | "defillama"
  | "defillama-yields"
  | "horizon"
  | "stellar-expert"
  | "coingecko"
  | "reflector"
  | "horizon-orderbook"
  | "derived-soroban"
  | "cache"
  | "mock";
```

Every record that's rendered with a `SourceBadge` carries one of these. The badge maps `DataSource → label + tone`:

- Verified upstream → accent tone, label e.g. "DefiLlama", "Horizon", "stellar.expert"
- `mock` or any source with `verified: false` → warning tone, label **"Illustrative"**

## Why every record has `verified` and `source`

So the UI renders the Illustrative badge **per row**, not per page. If DefiLlama returns 14 protocols but Horizon's stablecoin call falls back, the stablecoins KPI shows Illustrative while the protocols table shows DefiLlama — both truthfully.

## Key shapes

### `Protocol`

```ts
interface Protocol {
  slug: string;
  name: string;
  category: Category;
  tvl: number;
  tvlChange: number;
  volume24h: number;
  users24h: number;
  yieldApy: number;
  riskScore: number;
  spark: number[];
  tag?: string;
  source: "defillama" | "horizon" | "mock";
  verified: boolean;
}
```

### `StablecoinSupply`

```ts
interface StablecoinSupply {
  symbol: string;     // "USDC" | "EURC" | …
  issuer: string;     // classic G… or SAC C…
  kind: "classic" | "sac";
  supply: number;
  change24h: number;
  verified: boolean;
}
```

### `PriceSnapshot`

```ts
interface PriceSnapshot {
  xlmUsd: number;
  usdcUsd: number;
  asOf: string;
  source: "coingecko" | "reflector" | "horizon-orderbook" | "cache" | "mock";
}
```

`source` reflects which leg of the chain won — the landing ticker renders it inline (`prices.source.toUpperCase()`).

### `FlowEdge`

```ts
interface FlowEdge {
  source: string;
  sourceAddress: string;
  sourceKnown: boolean;
  destination: string;
  destinationAddress: string;
  destinationKnown: boolean;
  amount: number;
  asset: string;
  window: "24h" | "7d";
  verified: boolean;
}
```

`verified: true` only when **both** ends of the edge resolve via the directory.

### `PulseScore`

```ts
interface PulseScore {
  protocol: string;
  category: Category;
  total: number;
  liquidity: number;
  tvlStability: number;
  age: number;
  concentration: number;
  verdict: "Trusted" | "Solid" | "Watch" | "Risky";
  methodology: "v1-heuristic" | "mock";
}
```

The v1 formula is `0.35·liquidity + 0.30·tvlStability + 0.15·age + 0.20·concentration`. There is **no** `audits` field — see [Dashboards → Pulse Score](../dashboards/pulse-score) for why.

### `YieldPool`

```ts
interface YieldPool {
  protocol: string;
  symbol: string;
  apy: number;
  tvl: number;
  source: "defillama-yields" | "mock";
  verified: boolean;
}
```

### `SorobanContract`

```ts
interface SorobanContract {
  id: string;     // C-prefixed 56-char base32
  name: string;
  calls: number;
  type: string;
  verified: boolean;
}
```

The full list is in [`lib/types.ts`](../../lib/types.ts).

## Zod primitives

Reusable schemas live in `lib/stellar/schemas.ts`:

| Schema | Validates |
|---|---|
| `NumericString` | `string` parseable as a finite number |
| `ContractIdSchema` | `^C[A-Z0-9]{55}$` |
| `AccountIdSchema` | `^G[A-Z0-9]{55}$` |
| `IsoDateSchema` | ISO 8601 timestamp |
| `UsdAmountSchema` | non-negative number with sanity ceiling |

Use these instead of inlining `z.string().regex(…)` — `scripts/security-check.ts` looks for stray contract-id regexes outside the registry.

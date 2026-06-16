---
sidebar_position: 1
title: Types
---

# Types Reference

Authoritative source: [`lib/types.ts`](../../lib/types.ts). This page lists every public type plus a short example.

## `DataSource`

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

Used everywhere a row carries provenance. Drives `SourceBadge` label + tone.

## `Category`

```ts
type Category =
  | "DEX"
  | "Lending"
  | "Yield"
  | "Stablecoin"
  | "RWA"
  | "Derivatives"
  | "Bridge";
```

DefiLlama is the canonical category source.

## `Protocol`

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

## `OverviewMetrics`

```ts
interface OverviewMetrics {
  totalTVL: number;
  totalTVLChange: number;
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
  asOf: string;
  verified: boolean;
}
```

## `TimePoint`

```ts
interface TimePoint {
  date: string;     // YYYY-MM-DD
  label: string;
  value: number;
}
```

## `CategoryTVL`

```ts
interface CategoryTVL {
  category: Category;
  value: number;
  change: number;
  color: string;
}
```

## `StablecoinSupply`

```ts
interface StablecoinSupply {
  symbol: string;
  issuer: string;
  kind: "classic" | "sac";
  supply: number;
  change24h: number;
  verified: boolean;
}
```

## `RwaIssuer`

```ts
interface RwaIssuer {
  name: string;
  tvl: number;
  share: number;
  apy: number;
  category: "Treasuries" | "Funds" | "Bonds" | "Private Credit";
  verified: boolean;
}
```

## `SorobanContract`

```ts
interface SorobanContract {
  id: string;           // C-prefixed 56 chars
  name: string;
  calls: number;
  type: string;
  verified: boolean;
}
```

## `CapitalFlow`

```ts
interface CapitalFlow {
  id: string;
  source: string;
  destination: string;
  amount: number;
  asset: string;
  time: string;
  type: "inflow" | "outflow" | "swap";
}
```

## `FlowEdge`

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

## `PulseScore`

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

## `PriceSnapshot`

```ts
interface PriceSnapshot {
  xlmUsd: number;
  usdcUsd: number;
  asOf: string;
  source: "coingecko" | "reflector" | "horizon-orderbook" | "cache" | "mock";
}
```

## `YieldPool`

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

---
sidebar_position: 1
title: Overview
---

# Architecture Overview

## The 5-layer pipeline

```
┌─────────────────────────────────────────────────────────┐
│ 1. Adapter         lib/stellar/<source>.ts              │
│    fetch() + Zod parse + per-call revalidate            │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Fallback        lib/stellar/fallback.ts              │
│    withFallback() — typed mock + structured log on fail │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Aggregator      lib/stellar/index.ts                 │
│    'use cache' + cacheLife(<profile>) + cacheTag(<tag>) │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Page (RSC)      app/dashboard/<route>/page.tsx       │
│    await getXxx() → render with SourceBadge per row     │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Client          components/ui, components/dashboard  │
│    Pure presentation — no data fetching                 │
└─────────────────────────────────────────────────────────┘
```

## Layer 1 — Adapter

Each external source has exactly one adapter file. The adapter:

- Owns the fetch URL — if `horizon.stellar.org` appears in two files, that's a bug.
- Parses the response through a Zod schema co-located in the file or imported from `lib/stellar/schemas.ts`.
- Returns a typed shape from `lib/types.ts`.
- Sets `next: { revalidate, tags }` on the `fetch()` call to control per-network-call freshness.

Example:

```ts title="lib/stellar/horizon.ts (excerpt)"
const HorizonAsset = z.object({
  asset_type: z.enum(["credit_alphanum4", "credit_alphanum12"]),
  asset_code: z.string(),
  asset_issuer: z.string().regex(/^G[A-Z0-9]{55}$/),
  amount: NumericString.optional(),
  balances: HorizonBalances,
  liquidity_pools_amount: NumericString.optional(),
  contracts_amount: NumericString.optional(),
  claimable_balances_amount: NumericString.optional(),
});

export async function fetchAssetSupply(code: string, issuer: string) {
  const res = await fetch(
    `https://horizon.stellar.org/assets?asset_code=${code}&asset_issuer=${issuer}`,
    { next: { revalidate: 60, tags: ["horizon:assets"] } },
  );
  if (!res.ok) throw new Error(`horizon /assets ${res.status}`);
  const body = HorizonAssetsResponse.parse(await res.json());
  // … sum balances.authorized + LP + contracts + claimable
}
```

## Layer 2 — Fallback

`withFallback(fn, mock, tag)` wraps adapter calls. If the adapter throws (network, schema, anything), it:

1. Returns a deep-clone of the typed `mock` value
2. Tags the result with `_fallback: true` when the shape allows
3. Emits a single structured log:

```
[stellar] <tag> failed, using fallback: <error message>
```

This means a slow DefiLlama response never blocks the page — the user sees Illustrative data instead.

## Layer 3 — Aggregator

`lib/stellar/index.ts` is the **only** thing pages import. It composes adapters, applies `'use cache'` with the appropriate `cacheLife(profile)`, and tags the result so `/api/revalidate` can invalidate selectively.

```ts title="lib/stellar/index.ts (excerpt)"
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache";

export async function getProtocols(): Promise<Protocol[]> {
  "use cache";
  cacheLife("tvl");
  cacheTag("protocols");
  return withFallback(
    () => fetchDefiLlamaProtocols(),
    mockProtocols,
    "protocols",
  );
}
```

## Layer 4 — Page

Pages are **async server components** that await aggregator functions and pass the result to client presentation components. They never touch `fetch` directly.

```tsx title="app/dashboard/protocols/page.tsx (excerpt)"
export default async function ProtocolsPage() {
  const protocols = await getProtocols();
  return (
    <table>
      {protocols.map((p) => (
        <tr key={p.slug}>
          <td>
            {p.name}
            <SourceBadge source={p.source} verified={p.verified} compact />
          </td>
          <td>{formatUSD(p.tvl)}</td>
        </tr>
      ))}
    </table>
  );
}
```

## Layer 5 — Client

`components/ui/*` and `components/dashboard/*` are presentation-only. They receive typed props, render charts and badges, and own no state about Stellar data.

## Why this layering

- **One file per upstream URL** → impossible for two callers to drift on the same endpoint.
- **Zod at the boundary** → upstream shape changes are caught at parse, not in render.
- **`withFallback` at the seam** → a single point to log degradation, with no silent failures.
- **`'use cache'` over adapters, not pages** → page-level cache would invalidate too coarsely.
- **`SourceBadge` per row** → users see provenance without having to read docs.

## Next

- [Data Sources](./data-sources) — what each upstream gives us
- [Caching](./caching) — `cacheLife` profile selection
- [Fallback Strategy](./fallback-strategy) — when withFallback fires, what it logs
- [Type Contracts](./type-contracts) — every shape pages can rely on

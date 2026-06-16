---
sidebar_position: 4
title: Fallback Strategy
---

# Fallback Strategy

A slow upstream must **never** hang a page render. The pattern is the same everywhere: wrap every adapter call in `withFallback(fn, mock, tag)`.

## The wrapper

```ts title="lib/stellar/fallback.ts (sketch)"
export async function withFallback<T>(
  fn: () => Promise<T>,
  mock: T,
  tag: string,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[stellar] ${tag} failed, using fallback: ${msg}`);
    return cloneWithFallbackFlag(mock);
  }
}
```

## Three guarantees

1. **Typed mock.** Every aggregator passes a typed fallback from `lib/mock-data.ts`. The page never sees `undefined`, `null`, or an empty array unless that's a real shape.
2. **Structured log.** Every activation prints a single line in the format `[stellar] <tag> failed, using fallback: <message>`. This is the only observability hook — keep the format stable.
3. **Per-row `verified: false`.** When the shape carries a `verified` field, the cloned mock sets it to `false`. The UI's `SourceBadge` then renders the Illustrative tone.

## When it fires

- Upstream returns a non-2xx status
- Upstream returns a payload that fails Zod parsing
- Upstream times out (Next default: 60 s before AbortController kicks)
- The aggregator function itself throws (rare; only on schema bugs)

## When it does **not** fire

- A successful response that happens to be empty (`[]`). Empty is a valid response.
- A partial response where some rows fail validation but others pass — the adapter is responsible for `.safeParse()` per-row in that case.

## Observability — how to monitor

In Vercel logs, grep for the prefix:

```bash
vercel logs | grep '\[stellar\]'
```

Each line tells you:

- Which aggregator failed (the `tag`)
- What the error was (the parsed `.message`)
- That a fallback was used (so the user did **not** see a broken page)

If you see the same tag failing repeatedly in a 30-minute window, that's an incident — see [`SECURITY.md` §5](../../SECURITY.md).

## Why not "throw and let the error boundary catch"?

We considered it. Three reasons we chose graceful degradation:

1. **The dashboard is a single page** — one failing tile shouldn't blank the whole route.
2. **DefiLlama 502s are routine** — they recover in seconds; the user would see a flicker for no benefit.
3. **`verified: false` is more honest than a missing tile** — the user knows the number is illustrative, not that the system is down.

## The 7 health probes

`GET /api/health/sources` calls each of these in dry-run mode:

| Probe | Aggregator it shadows | Fresh window |
|---|---|---|
| `defillama-chain-tvl` | `getTvlSeries` | 5 m |
| `defillama-protocols` | `getProtocols` | 5 m |
| `defillama-yields` | `getYieldPools` | 5 m |
| `prices-layered` | `getPriceSnapshot` | 1 m |
| `horizon-stablecoins` | `getStablecoinSupplies` | 1 m |
| `stellar-expert-contracts` | `getTopContracts` | 5 m |
| `soroban-rpc` | (Soroban liveness probe) | 5 m |

A source is `verified: true` when the last probe in its fresh window succeeded. See [API → Health](../api/health).

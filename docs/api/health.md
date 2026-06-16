---
sidebar_position: 1
title: GET /api/health/sources
---

# `GET /api/health/sources`

Per-source freshness report. Useful for uptime monitoring and synthetic checks.

## Request

```http
GET /api/health/sources
```

No auth. Always `force-dynamic` (never cached).

## Response

```json
{
  "sources": [
    {
      "name": "defillama-chain-tvl",
      "fresh": true,
      "verified": true,
      "lastFetchedAt": "2026-06-16T23:00:16.630Z"
    },
    {
      "name": "defillama-protocols",
      "fresh": true,
      "verified": true,
      "lastFetchedAt": "2026-06-16T23:00:16.630Z"
    },
    {
      "name": "defillama-yields",
      "fresh": true,
      "verified": true,
      "lastFetchedAt": "2026-06-16T23:00:16.630Z"
    },
    {
      "name": "prices-layered",
      "fresh": true,
      "verified": true,
      "lastFetchedAt": "2026-06-16T23:00:16.630Z"
    },
    {
      "name": "horizon-stablecoins",
      "fresh": true,
      "verified": true,
      "lastFetchedAt": "2026-06-16T23:00:16.630Z"
    },
    {
      "name": "stellar-expert-contracts",
      "fresh": true,
      "verified": true,
      "lastFetchedAt": "2026-06-16T23:00:16.630Z"
    },
    {
      "name": "soroban-rpc",
      "fresh": true,
      "verified": true,
      "lastFetchedAt": "2026-06-16T23:00:16.630Z"
    }
  ],
  "allFresh": true,
  "checkedAt": "2026-06-16T23:00:21.863Z"
}
```

## Fields

| Field | Type | Meaning |
|---|---|---|
| `sources[].name` | string | Probe ID — stable; safe to alert on |
| `sources[].fresh` | boolean | Last probe succeeded within the source's fresh window |
| `sources[].verified` | boolean | Last probe returned a valid Zod-parsed shape |
| `sources[].lastFetchedAt` | ISO string | When the last probe ran |
| `allFresh` | boolean | `sources.every(s => s.fresh)` |
| `checkedAt` | ISO string | When this response was generated |

## Status codes

| Code | When |
|---|---|
| `200` | Always — even if some sources are stale, the endpoint itself responds |
| `503` | Only if the endpoint itself throws (should never happen) |

The endpoint **never** returns a non-200 for degraded sources — the JSON body is the contract. This keeps it simple for synthetic monitoring (a single `200` check) while exposing per-source granularity in the body.

## Monitoring

For Vercel + a generic synthetic monitor:

```bash
# Alert when not all sources are fresh
curl -fs https://pulse.example.com/api/health/sources | jq -e '.allFresh == true'

# Alert on a specific source
curl -fs https://pulse.example.com/api/health/sources \
  | jq -e '.sources[] | select(.name=="prices-layered") | .fresh == true'
```

## Implementation

`app/api/health/sources/route.ts` calls `probeAllSources()` from `lib/stellar/health.ts`. Each probe re-runs the adapter in a dry-run mode that doesn't touch the cache (so a stale aggregator can still report fresh upstreams, and vice-versa).

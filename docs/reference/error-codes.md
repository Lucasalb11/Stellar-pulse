---
sidebar_position: 3
title: Error Codes
---

# Error Codes

## API endpoints

### `POST /api/revalidate`

| Code | Body | When |
|---|---|---|
| 200 | `{ "revalidated": true, "tag": "<tag>", "now": <ms> }` | Success |
| 400 | `{ "error": "missing tag" }` | Body has no `tag` |
| 400 | `{ "error": "invalid tag" }` | `tag` not in allowlist |
| 401 | `{ "error": "unauthorized" }` | Auth header missing/wrong |
| 429 | `{ "error": "rate limited" }` | > 10 req/min from this IP |
| 503 | `{ "error": "revalidate disabled" }` | `REVALIDATE_SECRET` not set |

### `GET /api/health/sources`

| Code | When |
|---|---|
| 200 | Always — even when some sources are stale |

## Adapter throw messages

Adapters throw `Error` with messages formatted as `<source> <endpoint> <status>`:

| Message | Source |
|---|---|
| `horizon /assets <status>` | `lib/stellar/horizon.ts` |
| `horizon /payments <status>` | `lib/stellar/horizon.ts` |
| `stellar.expert /contract <status>` | `lib/stellar/stellar-expert.ts` |
| `stellar.expert /contract-stats <status>` | `lib/stellar/stellar-expert.ts` |
| `defillama /protocols <status>` | `lib/stellar/defillama.ts` |
| `defillama-yields /pools <status>` | `lib/stellar/defillama-yields.ts` |
| `coingecko /simple/price <status>` | `lib/stellar/prices/coingecko.ts` |
| `reflector simulate <status>` | `lib/stellar/prices/reflector.ts` |

All of these are caught by `withFallback` and logged with the format:

```
[stellar] <tag> failed, using fallback: <error message>
```

## Zod parse errors

When an upstream payload fails Zod parsing, the adapter throws and `withFallback` logs the path:

```
[stellar] protocols failed, using fallback: ZodError: Invalid input: expected string, received undefined at _embedded.records[0].amount
```

This is the canonical signal that an upstream changed its shape. Add a regression test with the new real-shape fixture, then relax the schema.

## Security-check issues

`scripts/security-check.ts` issues are formatted as:

```
[<check-name>] <file>:<line> <message>
```

Possible checks: `protocol-link`, `asset-registry`, `fetch-host`, `csp-connect-src`, `revalidate-secret`.

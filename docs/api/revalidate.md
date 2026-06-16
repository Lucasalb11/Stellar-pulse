---
sidebar_position: 2
title: POST /api/revalidate
---

# `POST /api/revalidate`

Manually invalidate one or more cache tags. Gated by a shared secret.

## Request

```http
POST /api/revalidate
Authorization: Bearer <REVALIDATE_SECRET>
Content-Type: application/json

{ "tag": "prices" }
```

## Auth

The endpoint compares `Authorization: Bearer <token>` against `process.env.REVALIDATE_SECRET` using a **constant-time** comparison (`timingSafeEqual` over equal-length buffers). Mismatched lengths are padded to the longer side to prevent timing leaks.

:::warning
`REVALIDATE_SECRET` must be set as an env var. When unset, the endpoint responds `503 Service Unavailable` and revalidation is effectively disabled.
:::

## Allowed tags

Only tags in the canonical enum are accepted. Anything else returns `400 Bad Request`.

```ts
const ALLOWED_TAGS = new Set([
  "tvl",
  "protocols",
  "stablecoin-supplies",
  "prices",
  "contracts",
  "pulse-score",
  "flows",
  "rwa",
  "yields",
]);
```

## Rate limit

Per-IP rolling window: **10 requests / minute** (in-memory; the Vercel platform load-balances across instances, so the limit is effectively per-instance). 11th request returns `429 Too Many Requests`.

## Response

### Success

```json
{ "revalidated": true, "tag": "prices", "now": 1750117218637 }
```

### Errors

| Code | Body | Cause |
|---|---|---|
| `400` | `{ "error": "missing tag" }` | No `tag` in body |
| `400` | `{ "error": "invalid tag" }` | `tag` not in allowlist |
| `401` | `{ "error": "unauthorized" }` | Auth header missing or wrong |
| `429` | `{ "error": "rate limited" }` | More than 10 req/min from this IP |
| `503` | `{ "error": "revalidate disabled" }` | `REVALIDATE_SECRET` not set |

## Example

```bash
export REVALIDATE_SECRET="your-secret-here"

curl -X POST http://localhost:3000/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tag":"prices"}'
```

## Security model

| Threat | Control |
|---|---|
| Token comparison timing leak | `timingSafeEqual` over padded buffers |
| Arbitrary tag invalidation (DOS via cache thrash) | Allowlist check |
| Credential spraying | Per-IP rate limit |
| Secret leakage in logs | `REVALIDATE_SECRET` is only read in `lib/stellar/env.ts`; `scripts/security-check.ts` blocks any other read |

See [Security → Overview](../security/overview) for the full threat model.

## Implementation

- Route: `app/api/revalidate/route.ts`
- Auth helper: `lib/stellar/revalidate-auth.ts`
- Rate limit: `lib/stellar/rate-limit.ts`
- Env loader: `lib/stellar/env.ts`

## Tests

- `tests/api/revalidate.test.ts` — happy path, 401, 400, 429, 503
- `tests/api/revalidate-harden.test.ts` — constant-time comparison, allowlist, rate-limit window

---
sidebar_position: 1
title: Overview
---

# Security Overview

This page covers the **threat model** and the **code-level controls** that mitigate each threat. For the operational playbook (weekly / monthly / quarterly checklists, incident response, pre-deploy gate) see [`SECURITY.md`](../../SECURITY.md).

## Threat model

| # | Threat | Likelihood | Impact | Control |
|---|---|---|---|---|
| 1 | A bad actor calls `/api/revalidate` to thrash the cache | Medium | Medium | Constant-time secret check + per-IP rate limit + tag allowlist |
| 2 | Upstream returns malformed JSON that crashes the page | High | Low (graceful fallback) | Zod validation at every adapter; `withFallback` catches throws |
| 3 | Outbound link XSS via protocol-link registry | Low | High | `lib/stellar/protocol-links.ts` registry; `https://` only; no userinfo; `scripts/security-check.ts` asserts |
| 4 | Page renders an attacker-controlled URL | Low | High | All outbound links use `rel="noopener noreferrer"`; tested in `protocol-link.test.tsx` |
| 5 | Asset registry collision — two issuers for the same `{code}` | Low | Medium | Asset registry keyed by `{code, issuer}` tuple; collision rejected at load |
| 6 | Mock data ships as if real | Medium | Medium | `verified: false` + `SourceBadge` showing "Illustrative" |
| 7 | Adapter calls a new upstream that bypasses CSP | Medium | Medium | `scripts/security-check.ts` requires fetch hosts ∈ `EXTERNAL_HOSTS` ⊆ CSP `connect-src` |
| 8 | `REVALIDATE_SECRET` leaks into logs / response | Low | High | Secret only read in `lib/stellar/env.ts`; security-check blocks any other read or log call mentioning it |
| 9 | Clickjacking | Low | Medium | `X-Frame-Options: DENY` in `proxy.ts` |
| 10 | Subresource sniffing / mixed content | Low | Low | HSTS preload + COOP/CORP same-origin |
| 11 | Insecure deserialization | Low | High | No `JSON.parse` of untrusted input outside Zod parsers |
| 12 | Dependency supply chain | Medium | High | Per-PR lockfile review (see `SECURITY.md` §1) |

## Code-level controls

### Static guard — `scripts/security-check.ts`

Five checks run as Vitest tests. Zero issues required to ship. See [Guides → Security Check](../guides/security-check) for details.

### Middleware — `proxy.ts`

Routes all responses through a middleware that sets:

```
Content-Security-Policy: default-src 'self';
  connect-src 'self' https://api.llama.fi https://horizon.stellar.org … ;
  …
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

The CSP `connect-src` is a strict allowlist matching `EXTERNAL_HOSTS` in `lib/stellar/security-headers.ts`. The security-check asserts the superset relation — you cannot add a new fetch without also extending the CSP.

### Revalidate hardening — `lib/stellar/revalidate-auth.ts`

```ts
function constantTimeEqual(a: string, b: string): boolean {
  // Pad to equal length and use timingSafeEqual
}

const ALLOWED_TAGS = new Set([…]);  // canonical enum
```

See [API → Revalidate](../api/revalidate) for the request flow.

### Per-IP rate limit — `lib/stellar/rate-limit.ts`

In-memory rolling window, 10 req/min per IP. Sufficient for v1 (single-instance Fluid Compute). For v2 (multi-region), swap in Vercel Queues or Upstash.

### Zod sweep

Every adapter validates upstream payloads with Zod before returning. Schemas live next to the adapter or in `lib/stellar/schemas.ts` for reuse.

### Asset registry

`lib/stellar/assets.ts` is the **only** place symbols are mapped to issuers. Pages and components never look up an issuer by symbol — they get the resolved `{code, issuer, verified}` tuple from the registry. Collisions are rejected at module load.

### Protocol-link registry

`lib/stellar/protocol-links.ts` validates outbound URLs with a stricter regex than `URL`:

- `https://` only
- no userinfo segment
- no IDN characters that could spoof a hostname
- no `javascript:` / `data:` schemes (blocked by the protocol check before the regex)

Tests in `tests/stellar/protocol-links.test.ts`.

## Reporting

If you find a vulnerability, email the maintainer privately. See [`SECURITY.md`](../../SECURITY.md) for the response timeline.

## See also

- [`SECURITY.md`](../../SECURITY.md) — operational playbook
- [`docs/data-architecture.md`](../data-architecture.md) §17 — long-form security spec
- [Guides → Security Check](../guides/security-check) — how the static guard works
- [API → Revalidate](../api/revalidate) — auth flow

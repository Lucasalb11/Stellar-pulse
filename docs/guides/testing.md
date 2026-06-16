---
sidebar_position: 1
title: Testing
---

# Testing

Vitest 3.2.4 + MSW 2.7.3 + @testing-library/react. **190 tests** across 23 files.

## Running tests

```bash
npm test                  # run once
npm run test:watch        # watch mode
npm run test:coverage     # v8 coverage report
npm run security-check    # security-check tests only
```

## Layout

```
tests/
├── setup.ts                       # MSW boot + REVALIDATE_SECRET + jest-dom
├── mocks/server.ts                # MSW server
├── adapters/                      # one file per source adapter
│   ├── horizon.test.ts
│   ├── stellar-expert.test.ts
│   ├── defillama.test.ts
│   ├── defillama-yields.test.ts
│   ├── coingecko.test.ts
│   ├── reflector.test.ts
│   ├── soroban-rpc.test.ts
│   ├── prices.test.ts
│   ├── pulse-score.test.ts
│   ├── sankey.test.ts
│   └── fallback.test.ts
├── api/
│   ├── health.test.ts
│   ├── revalidate.test.ts
│   └── revalidate-harden.test.ts
├── stellar/
│   ├── assets.test.ts             # asset registry collision rejection
│   ├── protocol-links.test.ts     # link validation (https, no userinfo, etc.)
│   ├── source-badge.test.tsx      # SourceBadge render contract
│   └── protocol-link.test.tsx
└── security/
    ├── headers.test.ts            # CSP, HSTS, X-Frame
    └── security-check.test.ts     # static guard self-tests
```

## The testing philosophy

### Every adapter needs four tests

1. **Happy path** — real-shape fixture (matching the live upstream)
2. **Parse failure** — malformed fixture → adapter throws
3. **Upstream error** — non-2xx → adapter throws with a tagged message
4. **Edge case** — empty, pagination boundary, schema relaxation

### Fixtures should match the live shape

This is the lesson from §6 dry run. The first iteration used invented fixtures that matched the **docs** for Horizon and stellar.expert — both fixtures passed, but both adapters broke against the **real** API.

Regression tests now lock in real-shape invariants:

- `tests/adapters/horizon.test.ts` — "handles real Horizon /assets shape: supply = balances.authorized + LP + contracts + claimable"
- `tests/adapters/stellar-expert.test.ts` — "handles real stellar.expert shape: field is `contract`, invocations may be null"

### Never hit the real network

MSW intercepts every external call. If a test fails with `ECONNREFUSED`, you have an unmocked endpoint — add a handler in `tests/mocks/server.ts` or override with `server.use(...)` inside the test.

## Component tests

`SourceBadge` is the only component currently tested. It uses `// @vitest-environment jsdom` at the top of the file. The 8 tests cover:

- Human-readable label per `DataSource`
- Mock → warning tone
- Tooltip with `Source / Verified / As of`
- Compact mode 4-char slice
- `className` forwarding
- `data-source` / `data-verified` attributes
- Row collection rendering

## Adding a new adapter test

1. Add fixtures matching the **live** upstream shape (curl it; don't trust docs).
2. Add the 4 standard cases (happy / parse / 5xx / edge).
3. Lock in the real shape with at least one regression test if you've seen drift before.
4. Run `npm test`. If everything passes, also run `npm run security-check`.

## CI

`npm test` and `npm run build` must both pass. There is no separate CI config in this repo — the gates are local. For Vercel, the build step runs `npm run build` which exits non-zero if anything fails.

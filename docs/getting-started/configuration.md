---
sidebar_position: 2
title: Configuration
---

# Configuration

## Environment variables

All env vars are **optional** at v1. The app degrades gracefully when any is absent.

Create `.env.local` at the project root (gitignored):

```bash title=".env.local"
# Required only if you want to manually invalidate cache tags
REVALIDATE_SECRET=<32+ char random string>

# Optional — lifts CoinGecko free-tier rate limits
COINGECKO_API_KEY=CG-xxxxxxxxxxxxxxxx

# Optional — override default Soroban RPC provider
SOROBAN_RPC_URL=https://soroban-rpc.mainnet.stellar.gateway.fm

# Optional — used by canonical URL + OG image helpers
NEXT_PUBLIC_SITE_URL=https://pulse.example.com
```

:::warning Secret handling
`REVALIDATE_SECRET` is **never** read outside `lib/stellar/env.ts`. The static check in `scripts/security-check.ts` blocks any other module from reading `process.env.REVALIDATE_SECRET`. Don't bypass it.
:::

## Cache profiles (`next.config.ts`)

The three cache profiles are tuned per data freshness:

| Profile | `stale` | `revalidate` | `expire` | Used by |
|---|---|---|---|---|
| `market` | 30 s | 1 m | 5 m | Prices, stablecoin supply, Sankey |
| `tvl` | 1 m | 5 m | 30 m | DefiLlama TVL, protocol list, Pulse Score |
| `directory` | 5 m | 1 h | 1 d | Asset registry, stellar.expert directory |

```ts title="next.config.ts"
import type { NextConfig } from "next";

const config: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    market:    { stale: 30,  revalidate: 60,   expire: 300    },
    tvl:       { stale: 60,  revalidate: 300,  expire: 1800   },
    directory: { stale: 300, revalidate: 3600, expire: 86_400 },
  },
};

export default config;
```

See [Architecture → Caching](../architecture/caching) for when to use which.

## CSP / security headers (`proxy.ts`)

`proxy.ts` is the routing middleware that enforces:

- `Content-Security-Policy` with strict `connect-src` allowlist matching `EXTERNAL_HOSTS`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`

To add a new upstream, update `EXTERNAL_HOSTS` in `lib/stellar/security-headers.ts` — `scripts/security-check.ts` verifies the CSP `connect-src` is a superset of `EXTERNAL_HOSTS`.

## Vitest setup

Vitest runs in `jsdom` for component tests, `node` for adapters, and uses MSW for HTTP interception. The setup file is `tests/setup.ts`:

- Sets `REVALIDATE_SECRET` for revalidate auth tests
- Boots the MSW server with the default handlers
- Registers `@testing-library/jest-dom` matchers

See [`vitest.config.ts`](../../vitest.config.ts) for the full configuration.

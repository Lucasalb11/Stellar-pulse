---
sidebar_position: 1
title: Installation
---

# Installation

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | **20.x or 24.x LTS** | Next.js 16 runtime |
| npm | ≥ 10 | Lockfile is npm v3 format |
| Git | any | Cloning |

:::tip
Node 24 LTS is the recommended default on Vercel. Node 18 is deprecated.
:::

## Clone & install

```bash
git clone <your-fork-or-repo-url> stellarPulse
cd stellarPulse
npm install
```

The install pulls Next.js 16.2.9, React 19.2.4, Zod 4.4.3, Vitest 3.2.4, and MSW 2.7.3. No native bindings are required.

## Run the dev server

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The first request to `/dashboard` may take 2–4 seconds while it fans out to DefiLlama, Horizon, stellar.expert, Soroban RPC, and CoinGecko. Subsequent requests within the cache window return in ~50 ms.

## Verify everything works

```bash
npm test          # 190 tests should pass
npm run build     # 15 routes should build clean
```

Then check the health endpoint:

```bash
curl http://localhost:3000/api/health/sources | jq
```

You should see 7 sources with `verified: true` and a recent `lastFetchedAt`.

## Optional environment variables

None are required for first run. Add them as you need them.

| Variable | Used by | Effect when unset |
|---|---|---|
| `REVALIDATE_SECRET` | `POST /api/revalidate` | Endpoint returns 503 — manual cache invalidation disabled |
| `COINGECKO_API_KEY` | `lib/stellar/prices/coingecko.ts` | Falls back to the public free tier (10–30 req/min) |
| `SOROBAN_RPC_URL` | `lib/stellar/soroban.ts` | Defaults to Gateway.fm mainnet RPC |
| `NEXT_PUBLIC_SITE_URL` | OG / canonical URL helpers | Defaults to `http://localhost:3000` |

Set them in `.env.local` (gitignored). See [Configuration](./configuration) for details.

## Common issues

### `Port 3000 already in use`

Another `next dev` is running. Either kill it (`lsof -ti:3000 | xargs kill`) or run `npm run dev -- -p 3001`.

### Health endpoint returns `verified: false` for one source

The upstream is rate-limited or transiently down. The page still renders via `withFallback` — check the server log for the structured fallback line:

```
[stellar] <fn-name> failed, using fallback: <error>
```

### Tests fail with `ECONNREFUSED`

Vitest uses MSW to intercept all external calls — no test should hit the real network. If you see `ECONNREFUSED`, you have an untested adapter. See [Guides → Testing](../guides/testing).

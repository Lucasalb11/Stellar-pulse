---
sidebar_position: 3
title: Deployment
---

# Deployment

Stellar Pulse is built for Vercel. Fluid Compute is the default — no edge runtime required.

## One-click (Vercel)

1. Push the repo to GitHub.
2. Import on [vercel.com/new](https://vercel.com/new). Framework auto-detects as **Next.js**.
3. Set env vars (see below).
4. Deploy.

## Required env vars

| Variable | Required? | Notes |
|---|---|---|
| `REVALIDATE_SECRET` | Recommended | 32+ char random. Without it, `/api/revalidate` returns 503. |
| `COINGECKO_API_KEY` | Optional | Lifts free-tier rate limit. App works without it. |
| `SOROBAN_RPC_URL` | Optional | Override default Gateway.fm endpoint. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Used for OG / canonical URLs. |

Generate `REVALIDATE_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then in Vercel:

```bash
vercel env add REVALIDATE_SECRET production
```

## Pre-deploy checklist

Before promoting to production, run **`SECURITY.md` §6**:

- [ ] `npm test` — 190/190 green
- [ ] `npm run build` — clean (no chart -1 errors, no cache warnings)
- [ ] `npm run security-check` — 0 issues
- [ ] `npx tsc --noEmit` — exit 0
- [ ] `curl /api/health/sources` against the preview URL — all 7 verified
- [ ] CSP / HSTS / X-Frame-Options present on the preview URL
- [ ] `/api/revalidate` with wrong/missing secret returns 401
- [ ] Manual click-through of every dashboard route
- [ ] Record outcome in `SECURITY.md` changelog

## Build output

15 routes total, 13 static + 2 dynamic:

```
Route (app)                 Revalidate  Expire
┌ ○ /                               1m      5m
├ ○ /_not-found
├ ƒ /api/health/sources
├ ƒ /api/revalidate
├ ○ /dashboard                      5m     30m
├ ○ /dashboard/defi                 5m     30m
├ ○ /dashboard/flows                1m      5m
├ ○ /dashboard/protocols            5m     30m
├ ○ /dashboard/pulse-score          5m     30m
├ ○ /dashboard/rwa                  5m     30m
├ ○ /dashboard/settings
├ ○ /dashboard/soroban              5m     30m
└ ○ /dashboard/stablecoins          1m      5m

ƒ Proxy (Middleware)
```

## Cache invalidation in production

If an upstream changes and you need to flush a tag:

```bash
curl -X POST https://pulse.example.com/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tag":"prices"}'
```

Confirm via:

```bash
curl https://pulse.example.com/api/health/sources \
  | jq '.sources[] | select(.name=="prices-layered")'
```

## Rollbacks

Use Vercel **Rolling Releases** for canary deploys. If you spot a regression after promoting, revert via `vercel rollback <deployment-url>`.

## Self-hosting

The app is a vanilla Next 16 build. To self-host:

```bash
npm run build
npm run start  # serves on port 3000
```

You'll need to fulfill the env vars yourself and either:

- Run behind a reverse proxy that adds the security headers (the app sets them in `proxy.ts` middleware, so this is already covered)
- Or run a Node process directly with `NODE_ENV=production node .next/standalone/server.js` (requires `output: 'standalone'` in `next.config.ts`)

## Monitoring

Set up two synthetic checks:

1. **GET `/api/health/sources`** — alert on `.allFresh != true`
2. **GET `/`** — alert on `status != 200` or response time > 3s

Vercel Observability (built-in) gives you the rest: Web Vitals, error rates, function durations.

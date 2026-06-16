---
sidebar_position: 1
title: Introduction
slug: /
---

# Stellar Pulse

**Real-time intelligence on the Stellar economy.**

Stellar Pulse is a server-rendered analytics dashboard. It aggregates public on-chain and off-chain data into a coherent picture of the Stellar ecosystem: TVL by protocol, stablecoin supply and velocity, capital flows, RWA issuance, Soroban smart contract activity, and a proprietary 0–100 trust score for the top protocols.

## Design principles

1. **Public endpoints only (v1).** No keys required for first run. Auth is a v2 concern.
2. **Server Components fetch, Client Components present.** No client-side fetching of Stellar data.
3. **Cache aggressively, revalidate on a schedule, never block the page.** A slow upstream must never hang a render — fall back to cache, then to typed mock.
4. **Type contracts are the seam.** Adapters live inside each module; pages never see raw upstream JSON.
5. **`verified: boolean` everywhere it matters.** The UI shows a `SourceBadge` per row so users see provenance at a glance.
6. **No fake methodology numbers.** Pulse Score either has a real input pipeline or is removed — no invented `audits: 98` placeholders.

See [Architecture — Overview](./architecture/overview) for the full data flow, and [Architecture — Data Sources](./architecture/data-sources) for the 7 upstreams.

## Where to go next

| If you want to... | Read |
|---|---|
| Get the dev server running | [Getting Started → Installation](./getting-started/installation) |
| Understand how data flows | [Architecture → Overview](./architecture/overview) |
| Understand what each page shows | [Dashboards → Overview](./dashboards/overview) |
| Wire a new external source | [Guides → Adding a Source](./guides/adding-a-source) |
| Deploy to Vercel | [Guides → Deployment](./guides/deployment) |
| Run the security playbook | [Security → Overview](./security/overview) |
| Look up a type | [Reference → Types](./reference/types) |

## What "ready for end users" means

The Definition of Done lives in [`docs/ship-plan.md`](./ship-plan). At a glance, the product ships only when:

- [x] Every page renders with live data OR an Illustrative badge.
- [x] Every adapter has Zod validation, a parse-failure test, a happy-path test, and a manual smoke check.
- [x] `withFallback` emits structured logs on every activation.
- [x] `POST /api/revalidate` is hardened (constant-time secret, allowlist, rate limit).
- [x] `GET /api/health/sources` reports per-source freshness.
- [x] `proxy.ts` enforces CSP, HSTS, X-Frame-Options DENY, COOP/CORP.
- [x] Asset registry keyed by `{code, issuer}` is the only path symbols → labels.
- [x] Protocol-link registry has Zod validation + safe outbound links.
- [x] Soroban RPC + stellar.expert power `/dashboard/soroban`.
- [x] Pulse Score v1 is computed from live inputs.
- [x] `npm run test` and `npm run build` are clean.
- [x] `SECURITY.md` §6 pre-deploy checklist has been run and recorded.

All boxes are checked at v0.1.

---
sidebar_position: 2
title: File Map
---

# File Map

A guided tour of the repo.

## Top level

| Path | What it does |
|---|---|
| `README.md` | Project overview, quick start, links to docs |
| `CLAUDE.md` | Project instructions for Claude Code (imports `AGENTS.md`) |
| `AGENTS.md` | Project rules (Next 16 caveats, security playbook pointer) |
| `SECURITY.md` | Operational playbook (weekly/monthly/quarterly checklists) |
| `package.json` | Scripts + deps |
| `next.config.ts` | Cache profiles, experimental flags |
| `proxy.ts` | Routing middleware (CSP + HSTS + headers) |
| `vitest.config.ts` | Test runner config |
| `tsconfig.json` | TypeScript config |
| `postcss.config.mjs` | Tailwind CSS |

## `app/` — Next.js App Router

| Path | Route | Cache |
|---|---|---|
| `app/layout.tsx` | shared shell | — |
| `app/page.tsx` | `/` (landing) | `market` |
| `app/dashboard/layout.tsx` | dashboard shell | — |
| `app/dashboard/page.tsx` | `/dashboard` (overview) | `tvl` |
| `app/dashboard/defi/page.tsx` | `/dashboard/defi` | `tvl` |
| `app/dashboard/protocols/page.tsx` | `/dashboard/protocols` | `tvl` |
| `app/dashboard/stablecoins/page.tsx` | `/dashboard/stablecoins` | `market` |
| `app/dashboard/flows/page.tsx` | `/dashboard/flows` | `market` |
| `app/dashboard/rwa/page.tsx` | `/dashboard/rwa` | `tvl` |
| `app/dashboard/soroban/page.tsx` | `/dashboard/soroban` | `tvl` |
| `app/dashboard/pulse-score/page.tsx` | `/dashboard/pulse-score` | `tvl` |
| `app/dashboard/settings/page.tsx` | `/dashboard/settings` | — |
| `app/api/health/sources/route.ts` | `GET /api/health/sources` | `force-dynamic` |
| `app/api/revalidate/route.ts` | `POST /api/revalidate` | `force-dynamic` |

## `lib/` — Business logic

```
lib/
├── types.ts                  # Public type contracts
├── mock-data.ts              # Fallback layer (verified: false)
├── utils.ts                  # formatUSD, formatNumber, formatPercent, …
└── stellar/
    ├── index.ts              # Public API consumed by pages
    ├── horizon.ts            # Adapter — horizon.stellar.org
    ├── stellar-expert.ts     # Adapter — api.stellar.expert
    ├── defillama.ts          # Adapter — api.llama.fi
    ├── defillama-yields.ts   # Adapter — yields.llama.fi
    ├── soroban.ts            # Adapter — soroban-rpc.*
    ├── prices/
    │   ├── coingecko.ts      # Adapter — api.coingecko.com
    │   ├── reflector.ts      # Adapter — Soroban RPC oracle
    │   └── orderbook.ts      # Horizon orderbook fallback
    ├── pulse-score.ts        # Score computation (formula in `scoreProtocol`)
    ├── sankey.ts             # Flow aggregation from raw payments
    ├── rwa.ts                # RWA issuer registry + aggregation
    ├── assets.ts             # Asset registry {code, issuer}
    ├── directory.ts          # Known-entity directory for Sankey
    ├── protocol-links.ts     # Validated outbound link registry
    ├── sanity.ts             # Sanity bands (price, supply, etc.)
    ├── cache.ts              # cacheLife profiles + tag constants
    ├── fallback.ts           # withFallback() observability wrapper
    ├── schemas.ts            # Reusable Zod primitives
    ├── env.ts                # The only place process.env.REVALIDATE_SECRET is read
    ├── revalidate-auth.ts    # Constant-time secret check + allowlist
    ├── rate-limit.ts         # Per-IP rolling window
    ├── security-headers.ts   # EXTERNAL_HOSTS, CSP directives
    └── health.ts             # Per-source probes for /api/health/sources
```

## `components/` — UI

```
components/
├── ui/
│   ├── kpi.tsx              # KPI card with sparkline + change
│   ├── badge.tsx            # Generic badge (tones: accent, success, warning, danger)
│   ├── source-badge.tsx     # Provenance badge — every dashboard row uses this
│   ├── logo.tsx             # Wordmark
│   └── brand-icons.tsx      # X, GitHub, Discord
├── dashboard/
│   ├── topbar.tsx           # Page title + live status pill
│   ├── charts.tsx           # AreaTrend, DonutChart, ScoreGauge (recharts wrappers)
│   └── flow-sankey.tsx      # Sankey wrapper
└── landing/
    ├── nav.tsx              # Landing nav
    ├── network-bg.tsx       # Animated network background
    └── hero-mockup.tsx      # Hero dashboard preview
```

## `tests/`

```
tests/
├── setup.ts                       # MSW boot + REVALIDATE_SECRET
├── mocks/server.ts
├── adapters/                      # One file per adapter
├── api/                           # /api/health, /api/revalidate
├── stellar/                       # Asset registry, links, SourceBadge
└── security/                      # CSP headers, security-check self-tests
```

## `scripts/`

| File | What it does |
|---|---|
| `scripts/security-check.ts` | Static guard (see [Guides → Security Check](../guides/security-check)) |

## `data/`

Empty in v1 — reserved for future static fixtures (issuer logos, etc.).

## `docs/`

You're reading them. Structure:

```
docs/
├── intro.md
├── data-architecture.md           # Long-form arch spec (kept at top level)
├── ship-plan.md                   # Definition of Done + retro log
├── getting-started/
├── architecture/
├── dashboards/
├── api/
├── guides/
├── security/
└── reference/
```

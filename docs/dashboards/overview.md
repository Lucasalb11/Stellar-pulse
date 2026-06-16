---
sidebar_position: 1
title: Overview
---

# Dashboard Overview

Stellar Pulse ships **8 routes** plus the marketing landing.

| Route | Title | Cache | Primary source |
|---|---|---|---|
| `/` | Landing | `market` | `getPriceSnapshot` + `getOverviewSnapshot` |
| `/dashboard` | Overview | `tvl` | DefiLlama |
| `/dashboard/defi` | DeFi Pulse | `tvl` | DefiLlama + DefiLlama Yields |
| `/dashboard/protocols` | Protocols | `tvl` | DefiLlama |
| `/dashboard/stablecoins` | Stablecoin Observatory | `market` | Horizon `/assets` |
| `/dashboard/flows` | Capital Flow Engine | `market` | Horizon `/payments` |
| `/dashboard/rwa` | RWA Hub | `tvl` | Horizon `/assets` per issuer |
| `/dashboard/soroban` | Soroban Explorer | `tvl` | stellar.expert + Soroban RPC |
| `/dashboard/pulse-score` | Pulse Score | `tvl` | Derived from DefiLlama |

## Source provenance per page

Every dashboard row carries a `<SourceBadge>`. Counts from the live click-through:

| Route | Per-row badges | Header badges | Notes |
|---|---|---|---|
| `/` | 0 | inline ticker | Hero ticker shows `prices.source.toUpperCase()` |
| `/dashboard` | 0 | 1 | `SourceBadge` next to "TVL by category" |
| `/dashboard/protocols` | 13 | — | Compact badge next to every protocol name |
| `/dashboard/defi` | 19 | — | Protocols (13) + yield pools (6) |
| `/dashboard/stablecoins` | 3 | 1 | One per asset in the supply breakdown |
| `/dashboard/flows` | — | 1 | Sankey card header |
| `/dashboard/rwa` | 6 | — | Full badge in status column |
| `/dashboard/soroban` | 6 | — | Compact badge next to contract name |
| `/dashboard/pulse-score` | — | 1 | DefiLlama badge in methodology sidebar |

## Page anatomy

Every dashboard page has the same shell:

```tsx
<div className="min-h-screen">
  <Topbar title="…" subtitle="…" />
  <div className="p-6 space-y-6">
    {/* KPI grid */}
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <KPI label="…" value={…} change={…} spark={…} />
      …
    </div>

    {/* Main chart + sidebar */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="card xl:col-span-2 p-5"> … chart … </div>
      <div className="card p-5"> … donut + legend … </div>
    </div>

    {/* Detail table */}
    <div className="card overflow-hidden"> … table … </div>
  </div>
</div>
```

The Topbar adds the route title, breadcrumb, and live-status pill.

## Page-by-page

See:

- [DeFi](./defi)
- [Stablecoins](./stablecoins)
- [Flows](./flows)
- [RWA](./rwa)
- [Soroban](./soroban)
- [Pulse Score](./pulse-score)

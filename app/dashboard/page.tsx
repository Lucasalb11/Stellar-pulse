import { Topbar } from "@/components/dashboard/topbar";
import { KPI } from "@/components/ui/kpi";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/ui/source-badge";
import { ProtocolLogo } from "@/components/ui/protocol-logo";
import { ProtocolLink } from "@/components/dashboard/protocol-link";
import { AreaTrend, DonutChart } from "@/components/dashboard/charts";
import { capitalFlows, seriesFrom } from "@/lib/mock-data";
import {
  getOverviewMetrics,
  getTvlSeries,
  getTvlByCategory,
  getProtocols,
} from "@/lib/stellar";
import { formatUSD, formatNumber, formatPercent, changeTone } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";

export default async function OverviewPage() {
  const [overviewMetrics, tvlSeries, tvlByCategory, protocols] = await Promise.all([
    getOverviewMetrics(),
    getTvlSeries(),
    getTvlByCategory(),
    getProtocols(),
  ]);
  const totalCat = tvlByCategory.reduce((s, c) => s + c.value, 0);

  return (
    <div className="min-h-screen">
      <Topbar
        title="Overview"
        subtitle="Real-time intelligence on the Stellar economy · 2026-06-12"
      />

      <div className="p-6 space-y-6">
        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPI
            label="Total TVL"
            value={formatUSD(overviewMetrics.totalTVL)}
            change={overviewMetrics.totalTVLChange}
            spark={seriesFrom(1, 24, 100, 0.025, 0.005)}
            accent="cyan"
          />
          <KPI
            label="24h Volume"
            value={formatUSD(overviewMetrics.volume24h)}
            change={overviewMetrics.volume24hChange}
            spark={seriesFrom(2, 24, 90, 0.04, 0.001)}
            accent="violet"
          />
          <KPI
            label="Stablecoin Supply"
            value={formatUSD(overviewMetrics.stablecoinSupply)}
            change={overviewMetrics.stablecoinSupplyChange}
            spark={seriesFrom(3, 24, 60, 0.014, 0.003)}
            accent="success"
          />
          <KPI
            label="Active Protocols"
            value={formatNumber(overviewMetrics.activeProtocols, {
              compact: false,
            })}
            change={overviewMetrics.activeProtocolsChange}
            spark={seriesFrom(4, 24, 30, 0.02, 0.004)}
            accent="warning"
          />
          <KPI
            label="Active Contracts"
            value={formatNumber(overviewMetrics.activeContracts, {
              compact: false,
            })}
            change={overviewMetrics.activeContractsChange}
            spark={seriesFrom(5, 24, 1200, 0.02, 0.008)}
            accent="cyan"
          />
          <KPI
            label="RWA Market Size"
            value={formatUSD(overviewMetrics.rwaMarketSize)}
            change={overviewMetrics.rwaMarketSizeChange}
            spark={seriesFrom(6, 24, 100, 0.025, 0.012)}
            accent="violet"
          />
        </div>

        {/* Main chart + breakdown */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card xl:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground-strong">
                    Total Value Locked
                  </h3>
                  <Badge tone="accent">
                    {formatPercent(overviewMetrics.totalTVLChange, {
                      signed: true,
                    })}
                  </Badge>
                </div>
                <p className="text-2xl font-semibold num mt-1 text-foreground-strong">
                  {formatUSD(overviewMetrics.totalTVL)}
                </p>
              </div>
              <div className="flex gap-1 text-xs">
                {["7D", "30D", "90D", "1Y", "All"].map((p, i) => (
                  <button
                    key={p}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      i === 2
                        ? "bg-accent-soft text-accent"
                        : "text-muted-2 hover:text-foreground-strong hover:bg-surface-2"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <AreaTrend
              data={tvlSeries}
              color="#00D4FF"
              format="usd"
              height={280}
            />
          </div>

          <div className="card p-5">
            <div className="flex items-start justify-between mb-1 gap-2">
              <h3 className="text-sm font-semibold text-foreground-strong">
                TVL by category
              </h3>
              <SourceBadge
                source="defillama"
                verified={tvlByCategory.length > 0}
              />
            </div>
            <p className="text-xs text-muted-2 mb-4">
              Composition across {tvlByCategory.length} sectors
            </p>
            <DonutChart
              data={tvlByCategory.map((c) => ({
                name: c.category,
                value: c.value,
                color: c.color,
              }))}
              centerLabel="Total TVL"
              centerValue={formatUSD(totalCat)}
              height={220}
            />
            <div className="mt-4 space-y-2">
              {tvlByCategory.map((c) => (
                <div
                  key={c.category}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ background: c.color }}
                    />
                    <span className="text-muted">{c.category}</span>
                  </div>
                  <div className="flex items-center gap-3 num">
                    <span className="text-foreground-strong">
                      {formatUSD(c.value)}
                    </span>
                    <span className={`w-12 text-right ${changeTone(c.change)}`}>
                      {formatPercent(c.change, { signed: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top protocols + Live flows */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card xl:col-span-2 overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-sm font-semibold text-foreground-strong">
                  Top protocols
                </h3>
                <p className="text-xs text-muted-2 mt-0.5">
                  Ranked by Total Value Locked
                </p>
              </div>
              <a
                href="/dashboard/protocols"
                className="text-xs text-accent flex items-center gap-1 hover:translate-x-0.5 transition-transform"
              >
                View all <ExternalLink className="size-3" />
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-2 border-b border-[var(--color-border)]">
                    <th className="px-5 py-2.5 text-left font-medium">#</th>
                    <th className="px-5 py-2.5 text-left font-medium">
                      Protocol
                    </th>
                    <th className="px-5 py-2.5 text-left font-medium">
                      Category
                    </th>
                    <th className="px-5 py-2.5 text-right font-medium">TVL</th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      24h Volume
                    </th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      Δ 24h
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {protocols
                    .slice()
                    .sort((a, b) => b.tvl - a.tvl)
                    .slice(0, 8)
                    .map((p, i) => (
                      <tr
                        key={p.slug}
                        className="border-b border-[var(--color-border)] hover:bg-surface-2/50 transition-colors"
                      >
                        <td className="px-5 py-3 text-muted-2 num">{i + 1}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <ProtocolLogo slug={p.slug} name={p.name} size={28} />
                            <div>
                              <div className="text-foreground-strong font-medium flex items-center gap-1.5">
                                {p.name}
                                <ProtocolLink slug={p.slug} />
                              </div>
                              {p.tag && (
                                <Badge
                                  tone={
                                    p.tag === "Hot"
                                      ? "warning"
                                      : p.tag === "New"
                                        ? "violet"
                                        : "accent"
                                  }
                                  className="mt-0.5"
                                >
                                  {p.tag}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted">{p.category}</td>
                        <td className="px-5 py-3 text-right num text-foreground-strong">
                          {formatUSD(p.tvl)}
                        </td>
                        <td className="px-5 py-3 text-right num text-muted">
                          {formatUSD(p.volume24h)}
                        </td>
                        <td className={`px-5 py-3 text-right num ${changeTone(p.tvlChange)}`}>
                          <div className="inline-flex items-center gap-0.5 justify-end">
                            {p.tvlChange > 0 ? (
                              <ArrowUpRight className="size-3.5" />
                            ) : (
                              <ArrowDownRight className="size-3.5" />
                            )}
                            {formatPercent(p.tvlChange, { signed: true })}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-sm font-semibold text-foreground-strong">
                  Live capital flows
                </h3>
                <p className="text-xs text-muted-2 mt-0.5">
                  Largest moves in the last hour
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-2">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
                  <span className="relative size-2 rounded-full bg-success" />
                </span>
                LIVE
              </div>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {capitalFlows.slice(0, 7).map((f) => (
                <div
                  key={f.id}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-surface-2/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted truncate">{f.source}</span>
                      <span className="text-muted-2">→</span>
                      <span className="text-foreground-strong truncate">
                        {f.destination}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        tone={
                          f.type === "inflow"
                            ? "success"
                            : f.type === "outflow"
                              ? "danger"
                              : "accent"
                        }
                        className="capitalize"
                      >
                        {f.type}
                      </Badge>
                      <span className="text-[10px] text-muted-2">
                        {f.time}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold num text-foreground-strong">
                      {formatUSD(f.amount)}
                    </div>
                    <div className="text-[10px] text-muted-2 font-mono">
                      {f.asset}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

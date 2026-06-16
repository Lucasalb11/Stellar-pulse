import { Topbar } from "@/components/dashboard/topbar";
import { KPI } from "@/components/ui/kpi";
import { Badge } from "@/components/ui/badge";
import { AreaTrend, BarRanking } from "@/components/dashboard/charts";
import {
  protocols,
  tvlSeries,
  volumeByProtocol,
  seriesFrom,
} from "@/lib/mock-data";
import { getProtocols, getYieldPools } from "@/lib/stellar";
import { formatUSD, formatPercent, changeTone } from "@/lib/utils";
import { Sparkline } from "@/components/ui/sparkline";
import { ProtocolLink } from "@/components/dashboard/protocol-link";
import { SourceBadge } from "@/components/ui/source-badge";
import type { Protocol } from "@/lib/types";

export default async function DeFiPulsePage() {
  const [liveProtocols, yields] = await Promise.all([
    getProtocols(),
    getYieldPools(),
  ]);
  const useLive = liveProtocols.length > 0;
  const rows: Protocol[] = useLive
    ? liveProtocols
    : protocols.map((p) => ({
        ...p,
        source: "mock",
        verified: false,
      }));
  const totalTVL = rows.reduce((s, p) => s + p.tvl, 0);
  const totalVol = rows.reduce((s, p) => s + p.volume24h, 0);
  const topYields = yields.slice(0, 6);
  const avgYield = topYields.length > 0
    ? topYields.reduce((s, y) => s + y.apy, 0) / topYields.length
    : 0;
  const yieldsVerified = yields.length > 0 && yields[0].source === "defillama-yields";

  return (
    <div className="min-h-screen">
      <Topbar
        title="DeFi Pulse"
        subtitle="TVL, liquidity, fees and yields across the Stellar DeFi stack"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI
            label="Total DeFi TVL"
            value={formatUSD(totalTVL)}
            change={4.62}
            spark={seriesFrom(81, 24, 100, 0.022, 0.005)}
            accent="cyan"
          />
          <KPI
            label="24h DEX Volume"
            value={formatUSD(totalVol)}
            change={-1.84}
            spark={seriesFrom(82, 24, 90, 0.05, 0.001)}
            accent="violet"
          />
          <KPI
            label="Avg Yield (top 6)"
            value={`${avgYield.toFixed(1)}%`}
            change={1.2}
            spark={seriesFrom(83, 24, 12, 0.03, 0.002)}
            accent="success"
          />
          <KPI
            label="Net Yield Inflow 24h"
            value={formatUSD(28_400_000)}
            change={6.8}
            spark={seriesFrom(84, 24, 25, 0.04, 0.006)}
            accent="warning"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card xl:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground-strong">
                  DeFi TVL · 90 days
                </h3>
                <p className="text-xs text-muted-2 mt-0.5">
                  Aggregate of DEXs, lending, yield and derivatives
                </p>
              </div>
              <Badge tone="success">+4.6% MoM</Badge>
            </div>
            <AreaTrend
              data={tvlSeries}
              color="#00D4FF"
              format="usd"
            />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-foreground-strong mb-1">
              24h volume by protocol
            </h3>
            <p className="text-xs text-muted-2 mb-4">
              Top venues by traded volume
            </p>
            <BarRanking
              data={volumeByProtocol}
              color="#7C3AED"
              format="usd"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card xl:col-span-2 overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground-strong">
                  DeFi protocols
                </h3>
                <p className="text-xs text-muted-2 mt-0.5">
                  Sorted by 24h TVL change
                </p>
              </div>
              <div className="flex gap-1 text-xs">
                {["All", "DEX", "Lending", "Yield", "Derivatives"].map((c, i) => (
                  <button
                    key={c}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      i === 0
                        ? "bg-accent-soft text-accent"
                        : "text-muted-2 hover:text-foreground-strong hover:bg-surface-2"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-2 border-b border-[var(--color-border)]">
                    <th className="px-5 py-2.5 text-left font-medium">Protocol</th>
                    <th className="px-5 py-2.5 text-left font-medium">Type</th>
                    <th className="px-5 py-2.5 text-right font-medium">TVL</th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      24h Vol
                    </th>
                    <th className="px-5 py-2.5 text-right font-medium">Δ TVL</th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice()
                    .sort((a, b) => b.tvlChange - a.tvlChange)
                    .map((p) => (
                      <tr
                        key={p.slug}
                        className="border-b border-[var(--color-border)] hover:bg-surface-2/50"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="size-7 rounded-lg grid place-items-center text-[11px] font-semibold"
                              style={{
                                background:
                                  "linear-gradient(135deg, rgba(0,212,255,0.22), rgba(124,58,237,0.22))",
                                color: "#29E3FF",
                              }}
                            >
                              {p.name[0]}
                            </div>
                            <div>
                              <div className="text-foreground-strong font-medium flex items-center gap-1.5">
                                {p.name}
                                <ProtocolLink slug={p.slug} />
                              </div>
                              <SourceBadge
                                source={p.source}
                                verified={p.verified}
                                compact
                                className="mt-0.5"
                              />
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
                        <td
                          className={`px-5 py-3 text-right num ${changeTone(p.tvlChange)}`}
                        >
                          {formatPercent(p.tvlChange, { signed: true })}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Sparkline
                            data={p.spark}
                            stroke={
                              p.tvlChange >= 0
                                ? "#10B981"
                                : "#EF4444"
                            }
                            width={80}
                            height={26}
                            className="inline-block"
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border)] flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground-strong">
                  Top yield opportunities
                </h3>
                <p className="text-xs text-muted-2 mt-0.5">
                  Sorted by APY · sanity-capped at 500%
                </p>
              </div>
              <Badge tone={yieldsVerified ? "accent" : "warning"}>
                {yieldsVerified ? "DefiLlama" : "Illustrative"}
              </Badge>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {topYields.map((y) => (
                <div
                  key={`${y.protocol}-${y.symbol}`}
                  className="px-5 py-3 flex items-center justify-between gap-2 hover:bg-surface-2/40"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-foreground-strong font-medium truncate">
                      {y.protocol}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-2 font-mono">
                        {y.symbol}
                      </span>
                      <SourceBadge
                        source={y.source}
                        verified={y.verified}
                        compact
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-semibold num text-success">
                      {y.apy.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-muted-2 num">
                      {formatUSD(y.tvl)} TVL
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

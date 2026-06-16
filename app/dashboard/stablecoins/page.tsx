import { Topbar } from "@/components/dashboard/topbar";
import { KPI } from "@/components/ui/kpi";
import { AreaTrend, DonutChart } from "@/components/dashboard/charts";
import {
  stablecoinMetrics,
  stablecoinSupply,
  stablecoinBreakdown,
  transferSeries,
  seriesFrom,
} from "@/lib/mock-data";
import { getStablecoinSupplies } from "@/lib/stellar";
import { formatUSD, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/ui/source-badge";

const SYMBOL_COLOR: Record<string, string> = {
  USDC: "#00D4FF",
  EURC: "#7C3AED",
  "USDT (bridged)": "#10B981",
};

export default async function StablecoinsPage() {
  const supplies = await getStablecoinSupplies();
  const liveBreakdown = supplies.map((s) => ({
    name: s.symbol,
    value: s.supply,
    color: SYMBOL_COLOR[s.symbol] ?? "#94A3B8",
  }));
  const breakdown = liveBreakdown.length > 0 ? liveBreakdown : stablecoinBreakdown;
  const verified = supplies.length > 0 && supplies.every((s) => s.verified);
  const total = breakdown.reduce((s, x) => s + x.value, 0);

  return (
    <div className="min-h-screen">
      <Topbar
        title="Stablecoin Observatory"
        subtitle="USDC, EURC and ecosystem stablecoin intelligence"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <KPI
            label="USDC Supply"
            value={formatUSD(stablecoinMetrics.usdcSupply)}
            change={stablecoinMetrics.usdcSupplyChange}
            spark={seriesFrom(301, 24, 100, 0.014, 0.002)}
            accent="cyan"
          />
          <KPI
            label="Transfers · 24h"
            value={formatNumber(stablecoinMetrics.transfers24h)}
            change={stablecoinMetrics.transfersChange}
            spark={seriesFrom(302, 24, 70, 0.06, 0.004)}
            accent="violet"
          />
          <KPI
            label="Velocity"
            value={stablecoinMetrics.velocity.toFixed(2)}
            change={stablecoinMetrics.velocityChange}
            spark={seriesFrom(303, 24, 1.6, 0.03, 0.001)}
            accent="success"
            hint="transfers / supply"
          />
          <KPI
            label="Active Wallets"
            value={formatNumber(stablecoinMetrics.activeWallets)}
            change={stablecoinMetrics.activeWalletsChange}
            spark={seriesFrom(304, 24, 130, 0.025, 0.003)}
            accent="warning"
          />
          <KPI
            label="USDC Market Share"
            value={`${stablecoinMetrics.marketShare.toFixed(1)}%`}
            change={0.4}
            spark={seriesFrom(305, 24, 92, 0.008, 0.0005)}
            accent="cyan"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card xl:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground-strong">
                  Stablecoin supply · 60 days
                </h3>
                <p className="text-xs text-muted-2 mt-0.5">
                  Total stablecoin float on Stellar
                </p>
              </div>
              <Badge tone="success">All-time high</Badge>
            </div>
            <AreaTrend
              data={stablecoinSupply}
              color="#10B981"
              format="usd"
            />
          </div>
          <div className="card p-5">
            <div className="flex items-start justify-between mb-1 gap-2">
              <h3 className="text-sm font-semibold text-foreground-strong">
                Supply breakdown
              </h3>
              <Badge tone={verified ? "accent" : "warning"}>
                {verified ? "Horizon" : "Illustrative"}
              </Badge>
            </div>
            <p className="text-xs text-muted-2 mb-4">By asset</p>
            <DonutChart
              data={breakdown}
              centerLabel="Total"
              centerValue={formatUSD(total)}
            />
            <div className="mt-4 space-y-2">
              {breakdown.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span className="text-muted">{s.name}</span>
                    <SourceBadge
                      source={verified ? "horizon" : "mock"}
                      verified={verified}
                      compact
                    />
                  </div>
                  <span className="num text-foreground-strong">
                    {formatUSD(s.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card xl:col-span-2 p-5">
            <h3 className="text-sm font-semibold text-foreground-strong mb-1">
              Transfers · 30 days
            </h3>
            <p className="text-xs text-muted-2 mb-4">
              Daily stablecoin transfer count
            </p>
            <AreaTrend
              data={transferSeries}
              color="#7C3AED"
              format="number"
              height={220}
            />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-foreground-strong mb-4">
              Issuer health
            </h3>
            <div className="space-y-3">
              {[
                { name: "Circle (USDC)", health: 99, tone: "success" as const },
                { name: "Circle (EURC)", health: 96, tone: "success" as const },
                { name: "Bridged USDT", health: 84, tone: "accent" as const },
                { name: "Anchor USD", health: 72, tone: "warning" as const },
              ].map((i) => (
                <div key={i.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs text-foreground-strong">
                      {i.name}
                    </div>
                    <div className="text-xs num text-foreground-strong">
                      {i.health}%
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${i.health}%`,
                        background:
                          i.tone === "success"
                            ? "var(--color-success)"
                            : i.tone === "warning"
                              ? "var(--color-warning)"
                              : "var(--color-accent)",
                      }}
                    />
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

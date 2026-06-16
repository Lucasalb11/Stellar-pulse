import { Topbar } from "@/components/dashboard/topbar";
import { KPI } from "@/components/ui/kpi";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/ui/source-badge";
import { AreaTrend } from "@/components/dashboard/charts";
import { FlowSankey } from "@/components/dashboard/flow-sankey";
import {
  capitalFlowSeries,
  capitalFlows,
  seriesFrom,
} from "@/lib/mock-data";
import { getFlowEdges } from "@/lib/stellar";
import { formatUSD } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export default async function CapitalFlowsPage() {
  const edges = await getFlowEdges("24h");
  const sankeyFlows = edges.map((e) => ({
    source: e.source,
    target: e.destination,
    value: e.amount,
  }));
  const sankeyLive = sankeyFlows.length > 0;
  const totalLastHour = capitalFlows.reduce((s, f) => s + f.amount, 0);
  const inflow = capitalFlows
    .filter((f) => f.type === "inflow")
    .reduce((s, f) => s + f.amount, 0);
  const outflow = capitalFlows
    .filter((f) => f.type === "outflow")
    .reduce((s, f) => s + f.amount, 0);
  const intra = capitalFlows
    .filter((f) => f.type === "swap")
    .reduce((s, f) => s + f.amount, 0);

  return (
    <div className="min-h-screen">
      <Topbar
        title="Capital Flow Engine"
        subtitle="Real-time tracking of money movement across the Stellar ecosystem"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI
            label="30d Net Inflow"
            value={formatUSD(82_400_000)}
            change={12.6}
            spark={seriesFrom(201, 24, 60, 0.06, 0.008)}
            accent="success"
          />
          <KPI
            label="1h Total Volume"
            value={formatUSD(totalLastHour)}
            change={-3.1}
            spark={seriesFrom(202, 24, 25, 0.07, -0.001)}
            accent="cyan"
          />
          <KPI
            label="Inflows / Outflows"
            value={`${(inflow / Math.max(outflow, 1)).toFixed(2)}x`}
            change={5.2}
            spark={seriesFrom(203, 24, 2.4, 0.04, 0.002)}
            accent="violet"
          />
          <KPI
            label="Intra-protocol Routing"
            value={formatUSD(intra)}
            change={8.4}
            spark={seriesFrom(204, 24, 18, 0.05, 0.004)}
            accent="warning"
          />
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground-strong">
                Capital flow graph · 24h
              </h3>
              <p className="text-xs text-muted-2 mt-0.5">
                {sankeyLive
                  ? `Aggregated from ${edges.length} on-chain edges (Horizon /payments)`
                  : "Illustrative — Horizon payment aggregation unavailable"}
              </p>
            </div>
            <SourceBadge
              source={sankeyLive ? "horizon" : "mock"}
              verified={sankeyLive}
            />
          </div>
          <div className="mt-3">
            <FlowSankey flows={sankeyFlows} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card xl:col-span-2 p-5">
            <h3 className="text-sm font-semibold text-foreground-strong mb-1">
              Net flows · 30 days
            </h3>
            <p className="text-xs text-muted-2 mb-4">
              Aggregate net capital entering Stellar protocols
            </p>
            <AreaTrend
              data={capitalFlowSeries}
              color="#10B981"
              format="usd"
            />
          </div>

          <div className="card overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground-strong">
                  Recent flows
                </h3>
                <p className="text-xs text-muted-2 mt-0.5">
                  Last 60 minutes
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
            <div className="divide-y divide-[var(--color-border)] max-h-[420px] overflow-y-auto">
              {capitalFlows.map((f) => (
                <div
                  key={f.id}
                  className="px-5 py-3 hover:bg-surface-2/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
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
                    <span className="text-[10px] text-muted-2">{f.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="text-muted truncate">{f.source}</span>
                    <ArrowRight className="size-3 text-muted-2 shrink-0" />
                    <span className="text-foreground-strong truncate">
                      {f.destination}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-2 font-mono">
                      {f.asset}
                    </span>
                    <span className="text-sm font-semibold num text-foreground-strong">
                      {formatUSD(f.amount)}
                    </span>
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

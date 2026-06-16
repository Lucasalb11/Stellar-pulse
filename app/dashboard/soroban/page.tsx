import { Topbar } from "@/components/dashboard/topbar";
import { KPI } from "@/components/ui/kpi";
import { Badge } from "@/components/ui/badge";
import { AreaTrend, MultiLineChart } from "@/components/dashboard/charts";
import {
  sorobanContractsSeries,
  sorobanTxSeries,
  seriesFrom,
} from "@/lib/mock-data";
import { getSorobanMetrics, getTopContracts } from "@/lib/stellar";
import { formatNumber } from "@/lib/utils";
import { SourceBadge } from "@/components/ui/source-badge";

export default async function SorobanPage() {
  const [sorobanMetrics, topContracts] = await Promise.all([
    getSorobanMetrics(),
    getTopContracts(),
  ]);
  const contractsVerified = sorobanMetrics.verified;
  const contractsListVerified = topContracts.length > 0;
  // build merged series for multi-line chart
  const merged = sorobanContractsSeries.map((p, i) => ({
    label: p.label,
    contracts: p.value,
    transactions: sorobanTxSeries[i]?.value ?? 0,
  }));

  return (
    <div className="min-h-screen">
      <Topbar
        title="Soroban Explorer"
        subtitle="Contracts, transactions and developer activity on the Soroban VM"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI
            label="Contracts Deployed"
            value={formatNumber(sorobanMetrics.contractsDeployed)}
            change={sorobanMetrics.contractsChange}
            spark={seriesFrom(501, 24, 100, 0.018, 0.01)}
            accent="cyan"
          />
          <KPI
            label="Transactions · 24h"
            value={formatNumber(sorobanMetrics.transactions24h)}
            change={sorobanMetrics.transactionsChange}
            spark={seriesFrom(502, 24, 100, 0.05, 0.006)}
            accent="violet"
          />
          <KPI
            label="Active Developers"
            value={formatNumber(sorobanMetrics.activeDevelopers)}
            change={sorobanMetrics.developersChange}
            spark={seriesFrom(503, 24, 100, 0.04, 0.008)}
            accent="success"
          />
          <KPI
            label="Gas Usage · 24h"
            value={formatNumber(sorobanMetrics.gasUsage)}
            change={sorobanMetrics.gasUsageChange}
            spark={seriesFrom(504, 24, 100, 0.05, 0.004)}
            accent="warning"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card xl:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground-strong">
                  Network activity · 60 days
                </h3>
                <p className="text-xs text-muted-2 mt-0.5">
                  Contracts deployed vs transactions per day
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-accent" />
                  <span className="text-muted">Contracts</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-violet" />
                  <span className="text-muted">Tx</span>
                </span>
              </div>
            </div>
            <MultiLineChart
              data={merged}
              series={[
                { key: "contracts", color: "#00D4FF", name: "Contracts" },
                { key: "transactions", color: "#7C3AED", name: "Transactions" },
              ]}
              height={280}
            />
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-foreground-strong mb-1">
              Active developers · 90 days
            </h3>
            <p className="text-xs text-muted-2 mb-4">
              Unique deployers per day
            </p>
            <AreaTrend
              data={sorobanContractsSeries.map((p, i) => ({
                ...p,
                value: Math.round(p.value * 0.28 + i * 0.8),
              }))}
              color="#10B981"
              format="number"
              height={280}
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground-strong">
                Most active contracts
              </h3>
              <p className="text-xs text-muted-2 mt-0.5">
                {contractsListVerified
                  ? "Sorted by invocations (stellar.expert)"
                  : "No contracts available — upstream unreachable"}
              </p>
            </div>
            <Badge tone={contractsListVerified ? "accent" : "warning"}>
              {contractsListVerified ? "stellar.expert" : "Unavailable"}
            </Badge>
          </div>
          {contractsListVerified ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-2 border-b border-[var(--color-border)]">
                    <th className="px-5 py-2.5 text-left font-medium">#</th>
                    <th className="px-5 py-2.5 text-left font-medium">
                      Contract
                    </th>
                    <th className="px-5 py-2.5 text-left font-medium">
                      Address
                    </th>
                    <th className="px-5 py-2.5 text-left font-medium">Type</th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      Calls 24h
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topContracts.map((c, i) => (
                    <tr
                      key={c.id}
                      className="border-b border-[var(--color-border)] hover:bg-surface-2/50"
                    >
                      <td className="px-5 py-3 text-muted-2 num">{i + 1}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground-strong font-medium">
                            {c.name}
                          </span>
                          <SourceBadge
                            source="stellar-expert"
                            verified={c.verified}
                            compact
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted font-mono text-xs">
                        {c.id.slice(0, 4)}…{c.id.slice(-4)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={i % 2 === 0 ? "accent" : "violet"}>
                          {c.type}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right num text-foreground-strong">
                        {formatNumber(c.calls)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted">
              Contract list will appear once stellar.expert is reachable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

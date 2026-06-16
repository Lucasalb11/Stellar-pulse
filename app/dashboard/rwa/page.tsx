import { Topbar } from "@/components/dashboard/topbar";
import { KPI } from "@/components/ui/kpi";
import { Badge } from "@/components/ui/badge";
import { AreaTrend, BarRanking } from "@/components/dashboard/charts";
import { rwaMetrics, rwaSeries, seriesFrom } from "@/lib/mock-data";
import { getRwaSet } from "@/lib/stellar";
import { formatUSD, formatPercent } from "@/lib/utils";
import { SourceBadge } from "@/components/ui/source-badge";

export default async function RWAPage() {
  const rwaSet = await getRwaSet();
  const rwaIssuers = rwaSet.issuers;
  const total =
    rwaMetrics.treasuries +
    rwaMetrics.funds +
    rwaMetrics.bonds +
    rwaMetrics.privateCredit;

  return (
    <div className="min-h-screen">
      <Topbar
        title="RWA Hub"
        subtitle="Tokenized real-world assets on Stellar — treasuries, funds, bonds & private credit"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <KPI
            label="Total RWA Market"
            value={formatUSD(total)}
            change={rwaMetrics.growth30d}
            spark={seriesFrom(401, 24, 100, 0.022, 0.014)}
            accent="warning"
          />
          <KPI
            label="Tokenized Treasuries"
            value={formatUSD(rwaMetrics.treasuries)}
            change={22.4}
            spark={seriesFrom(402, 24, 70, 0.02, 0.012)}
            accent="cyan"
          />
          <KPI
            label="Funds"
            value={formatUSD(rwaMetrics.funds)}
            change={14.2}
            spark={seriesFrom(403, 24, 30, 0.025, 0.008)}
            accent="violet"
          />
          <KPI
            label="Bonds"
            value={formatUSD(rwaMetrics.bonds)}
            change={9.8}
            spark={seriesFrom(404, 24, 20, 0.018, 0.006)}
            accent="success"
          />
          <KPI
            label="Private Credit"
            value={formatUSD(rwaMetrics.privateCredit)}
            change={31.6}
            spark={seriesFrom(405, 24, 8, 0.04, 0.018)}
            accent="warning"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card xl:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground-strong">
                  RWA market size · 90 days
                </h3>
                <p className="text-xs text-muted-2 mt-0.5">
                  Fastest growing segment of Stellar
                </p>
              </div>
              <Badge tone="success">
                {formatPercent(rwaMetrics.growth30d, { signed: true })} · 30d
              </Badge>
            </div>
            <AreaTrend
              data={rwaSeries}
              color="#F59E0B"
              format="usd"
              height={280}
            />
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-foreground-strong mb-1">
              Issuers · TVL
            </h3>
            <p className="text-xs text-muted-2 mb-4">Top RWA issuers</p>
            <BarRanking
              data={rwaIssuers.map((r) => ({ name: r.name, value: r.tvl }))}
              color="#F59E0B"
              format="usd"
              height={260}
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground-strong">
                Tokenized issuers
              </h3>
              <p className="text-xs text-muted-2 mt-0.5">
                {rwaSet.illustrative
                  ? "Illustrative roster — verified on-chain data unavailable"
                  : `${rwaSet.verifiedCount} verified issuer${rwaSet.verifiedCount === 1 ? "" : "s"} · TVL × price`}
              </p>
            </div>
            <Badge tone={rwaSet.illustrative ? "warning" : "accent"}>
              {rwaSet.illustrative ? "Illustrative" : "Horizon × prices"}
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-2 border-b border-[var(--color-border)]">
                  <th className="px-5 py-2.5 text-left font-medium">Issuer</th>
                  <th className="px-5 py-2.5 text-left font-medium">
                    Category
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium">AUM</th>
                  <th className="px-5 py-2.5 text-right font-medium">Share</th>
                  <th className="px-5 py-2.5 text-right font-medium">APY</th>
                  <th className="px-5 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rwaIssuers.map((r) => (
                  <tr
                    key={r.name}
                    className="border-b border-[var(--color-border)] hover:bg-surface-2/50"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="size-7 rounded-lg grid place-items-center text-[11px] font-semibold"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(245,158,11,0.22), rgba(124,58,237,0.16))",
                            color: "#F59E0B",
                          }}
                        >
                          {r.name[0]}
                        </div>
                        <div className="text-foreground-strong font-medium">
                          {r.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{r.category}</td>
                    <td className="px-5 py-3 text-right num text-foreground-strong">
                      {formatUSD(r.tvl)}
                    </td>
                    <td className="px-5 py-3 text-right num text-muted">
                      {r.share.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-right num text-success">
                      {r.apy.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-right">
                      <SourceBadge
                        source={r.verified ? "horizon" : "mock"}
                        verified={r.verified}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

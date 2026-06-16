import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { protocols as mockProtocols } from "@/lib/mock-data";
import { getProtocols } from "@/lib/stellar";
import { formatUSD, formatNumber, formatPercent, changeTone } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import { ProtocolLink } from "@/components/dashboard/protocol-link";
import { ProtocolLogo } from "@/components/ui/protocol-logo";
import { SourceBadge } from "@/components/ui/source-badge";
import type { Protocol } from "@/lib/types";

export default async function ProtocolsPage() {
  const live = await getProtocols();
  const useLive = live.length > 0;
  const rows: Protocol[] = useLive
    ? live
    : mockProtocols.map((p) => ({
        ...p,
        source: "mock",
        verified: false,
      }));
  const sorted = [...rows].sort((a, b) => b.tvl - a.tvl);

  return (
    <div className="min-h-screen">
      <Topbar
        title="Protocols"
        subtitle="Every protocol on Stellar — TVL, volume, yield and risk"
      />
      <div className="p-6 space-y-4">
        <div className="card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
            <input
              placeholder="Search protocols…"
              className="w-full h-9 rounded-lg bg-surface-2 border border-[var(--color-border)] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-2 focus:outline-none focus:border-[var(--color-border-strong)]"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              "All",
              "DEX",
              "Lending",
              "Yield",
              "Stablecoin",
              "RWA",
              "Derivatives",
              "Bridge",
            ].map((c, i) => (
              <button
                key={c}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                  i === 0
                    ? "bg-accent-soft text-accent"
                    : "text-muted-2 hover:text-foreground-strong hover:bg-surface-2 border border-[var(--color-border)]"
                }`}
              >
                {c}
              </button>
            ))}
            <button className="h-8 px-3 rounded-md text-xs text-muted hover:text-foreground-strong border border-[var(--color-border)] flex items-center gap-1.5">
              <SlidersHorizontal className="size-3" />
              Filters
            </button>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-2 border-b border-[var(--color-border)]">
                  <th className="px-5 py-3 text-left font-medium">#</th>
                  <th className="px-5 py-3 text-left font-medium">Protocol</th>
                  <th className="px-5 py-3 text-left font-medium">Category</th>
                  <th className="px-5 py-3 text-right font-medium">TVL</th>
                  <th className="px-5 py-3 text-right font-medium">
                    24h Volume
                  </th>
                  <th className="px-5 py-3 text-right font-medium">Users</th>
                  <th className="px-5 py-3 text-right font-medium">Yield</th>
                  <th className="px-5 py-3 text-right font-medium">Risk</th>
                  <th className="px-5 py-3 text-right font-medium">Δ 24h</th>
                  <th className="px-5 py-3 text-right font-medium">7d</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => (
                  <tr
                    key={p.slug}
                    className="border-b border-[var(--color-border)] hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-muted-2 num">{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <ProtocolLogo slug={p.slug} name={p.name} size={32} />
                        <div>
                          <div className="text-foreground-strong font-medium flex items-center gap-1.5">
                            {p.name}
                            <ProtocolLink slug={p.slug} />
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <SourceBadge
                              source={p.source}
                              verified={p.verified}
                              compact
                            />
                            {p.tag && (
                              <Badge
                                tone={
                                  p.tag === "Hot"
                                    ? "warning"
                                    : p.tag === "New"
                                      ? "violet"
                                      : "accent"
                                }
                              >
                                {p.tag}
                              </Badge>
                            )}
                          </div>
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
                    <td className="px-5 py-3 text-right num text-muted">
                      {formatNumber(p.users24h)}
                    </td>
                    <td className="px-5 py-3 text-right num text-success">
                      {p.yieldApy.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <div className="w-14 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${p.riskScore}%`,
                              background:
                                p.riskScore >= 85
                                  ? "var(--color-success)"
                                  : p.riskScore >= 75
                                    ? "var(--color-accent)"
                                    : p.riskScore >= 65
                                      ? "var(--color-warning)"
                                      : "var(--color-danger)",
                            }}
                          />
                        </div>
                        <span className="num text-foreground-strong text-xs">
                          {p.riskScore}
                        </span>
                      </div>
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
                    <td className="px-5 py-3 text-right">
                      <Sparkline
                        data={p.spark}
                        stroke={p.tvlChange >= 0 ? "#10B981" : "#EF4444"}
                        width={70}
                        height={24}
                        className="inline-block"
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

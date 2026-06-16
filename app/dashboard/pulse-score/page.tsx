import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/ui/source-badge";
import { ScoreGauge } from "@/components/dashboard/charts";
import { verdictTone } from "@/lib/mock-data";
import { getPulseScores } from "@/lib/stellar";
import { ShieldCheck, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";

const factorColor = (v: number) =>
  v >= 85
    ? "var(--color-success)"
    : v >= 75
      ? "var(--color-accent)"
      : v >= 65
        ? "var(--color-warning)"
        : "var(--color-danger)";

export default async function PulseScorePage() {
  const pulseScores = await getPulseScores(12);
  const trusted = pulseScores.filter((p) => p.verdict === "Trusted").length;
  const watch = pulseScores.filter((p) => p.verdict === "Watch").length;
  const avg =
    pulseScores.length > 0
      ? pulseScores.reduce((s, p) => s + p.total, 0) / pulseScores.length
      : 0;

  const featured = pulseScores[0];
  if (!featured) {
    return (
      <div className="min-h-screen">
        <Topbar
          title="Pulse Score"
          subtitle="Proprietary 0–100 risk & trust scoring for Stellar protocols"
        />
        <div className="p-6 text-sm text-muted">
          No protocol data available yet. Pulse Scores will populate once
          DefiLlama protocols load.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar
        title="Pulse Score"
        subtitle="Proprietary 0–100 risk & trust scoring for Stellar protocols"
      />
      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-2">
              <ShieldCheck className="size-3.5 text-success" />
              Trusted
            </div>
            <div className="mt-2 text-2xl font-semibold num text-foreground-strong">
              {trusted}
            </div>
            <div className="text-xs text-muted-2">Score ≥ 85</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-2">
              <Sparkles className="size-3.5 text-accent" />
              Average score
            </div>
            <div className="mt-2 text-2xl font-semibold num text-foreground-strong">
              {avg.toFixed(0)}
            </div>
            <div className="text-xs text-muted-2">Across all protocols</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-2">
              <ShieldAlert className="size-3.5 text-warning" />
              Watch
            </div>
            <div className="mt-2 text-2xl font-semibold num text-foreground-strong">
              {watch}
            </div>
            <div className="text-xs text-muted-2">Score 60–74</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-2">
              <TrendingUp className="size-3.5 text-violet" />
              Coverage
            </div>
            <div className="mt-2 text-2xl font-semibold num text-foreground-strong">
              {pulseScores.length}
            </div>
            <div className="text-xs text-muted-2">Protocols scored</div>
          </div>
        </div>

        {/* Featured */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card xl:col-span-2 p-6 relative overflow-hidden">
            <div className="absolute inset-0 hero-glow opacity-50 pointer-events-none" />
            <div className="relative grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 flex justify-center">
                <ScoreGauge value={featured.total} size={180} color="#10B981" />
              </div>
              <div className="md:col-span-8 space-y-4">
                <div>
                  <Badge tone={verdictTone(featured.verdict)}>
                    {featured.verdict}
                  </Badge>
                  <h3
                    className="mt-2 text-2xl font-semibold text-foreground-strong tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {featured.protocol}
                  </h3>
                  <p className="text-sm text-muted">
                    Category: {featured.category} · Highest-ranked protocol on Stellar
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ["Liquidity", featured.liquidity],
                    ["TVL Stability", featured.tvlStability],
                    ["Age", featured.age],
                    ["Concentration", featured.concentration],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="card-2 p-3"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-2">
                        {label}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="num text-foreground-strong font-semibold">
                          {value}
                        </div>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${value}%`,
                            background: factorColor(value as number),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-start justify-between mb-1 gap-2">
              <h3 className="text-sm font-semibold text-foreground-strong">
                Score methodology
              </h3>
              <SourceBadge
                source="defillama"
                verified={pulseScores.length > 0}
              />
            </div>
            <p className="text-xs text-muted-2 mb-4">
              Each protocol gets a 0–100 score weighted across 5 factors.
            </p>
            <div className="space-y-3">
              {[
                { name: "Liquidity", weight: 35, color: "#7C3AED" },
                { name: "TVL Stability", weight: 30, color: "#10B981" },
                { name: "Concentration", weight: 20, color: "#EC4899" },
                { name: "Age", weight: 15, color: "#F59E0B" },
              ].map((f) => (
                <div key={f.name}>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-foreground-strong">{f.name}</span>
                    <span className="text-muted num">{f.weight}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${f.weight * 4}%`,
                        background: f.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground-strong">
                Pulse Score rankings
              </h3>
              <p className="text-xs text-muted-2 mt-0.5">
                Sorted by overall score
              </p>
            </div>
            <div className="flex gap-1 text-xs">
              {["All", "Trusted", "Solid", "Watch"].map((c, i) => (
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
                  <th className="px-5 py-2.5 text-left font-medium">#</th>
                  <th className="px-5 py-2.5 text-left font-medium">
                    Protocol
                  </th>
                  <th className="px-5 py-2.5 text-left font-medium">Category</th>
                  <th className="px-5 py-2.5 text-right font-medium">
                    Liquidity
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium">
                    Stability
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium">Age</th>
                  <th className="px-5 py-2.5 text-right font-medium">
                    Concentration
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium">Score</th>
                  <th className="px-5 py-2.5 text-right font-medium">
                    Verdict
                  </th>
                </tr>
              </thead>
              <tbody>
                {pulseScores.map((p, i) => (
                  <tr
                    key={p.protocol}
                    className="border-b border-[var(--color-border)] hover:bg-surface-2/50"
                  >
                    <td className="px-5 py-3 text-muted-2 num">{i + 1}</td>
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
                          {p.protocol[0]}
                        </div>
                        <div className="text-foreground-strong font-medium">
                          {p.protocol}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{p.category}</td>
                    {[p.liquidity, p.tvlStability, p.age, p.concentration].map(
                      (v, idx) => (
                        <td key={idx} className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <div className="w-10 h-1 rounded-full bg-surface-2 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${v}%`,
                                  background: factorColor(v),
                                }}
                              />
                            </div>
                            <span className="num text-foreground-strong text-xs">
                              {v}
                            </span>
                          </div>
                        </td>
                      ),
                    )}
                    <td className="px-5 py-3 text-right">
                      <span className="num text-lg font-semibold text-foreground-strong">
                        {p.total}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge tone={verdictTone(p.verdict)}>{p.verdict}</Badge>
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

"use client";
import * as React from "react";
import { Sparkline } from "@/components/ui/sparkline";
import { seriesFrom } from "@/lib/mock-data";

const tvlSpark = seriesFrom(1, 36, 100, 0.02, 0.004);
const volSpark = seriesFrom(2, 36, 80, 0.04, 0.002);
const stableSpark = seriesFrom(3, 36, 60, 0.01, 0.003);

const protocolRows = [
  { name: "Soroswap", cat: "DEX", tvl: "$184.3M", change: "+6.2%", tone: "text-success" },
  { name: "Blend", cat: "Lending", tvl: "$142.7M", change: "+3.4%", tone: "text-success" },
  { name: "Aquarius", cat: "DEX", tvl: "$96.5M", change: "-1.8%", tone: "text-danger" },
  { name: "Phoenix", cat: "DEX", tvl: "$78.9M", change: "+4.6%", tone: "text-success" },
  { name: "Ondo RWA", cat: "RWA", tvl: "$64.2M", change: "+22.4%", tone: "text-success" },
];

export function HeroMockup() {
  return (
    <div className="relative" aria-hidden>
      <div className="relative card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-surface-2">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-[#3a4258]" />
            <div className="size-2.5 rounded-full bg-[#3a4258]" />
            <div className="size-2.5 rounded-full bg-[#3a4258]" />
          </div>
          <div className="text-[10px] text-muted-2 font-mono">
            app.stellarpulse.xyz / overview
          </div>
          <div className="text-[10px] text-muted-2 font-mono">v0.1</div>
        </div>

        <div className="grid grid-cols-12 gap-3 p-4">
          <div className="col-span-3 space-y-0.5">
            <div className="eyebrow text-[9px] mb-3 px-1">Sections</div>
            {[
              "Overview",
              "DeFi Pulse",
              "Capital Flows",
              "Stablecoins",
              "RWAs",
              "Soroban",
              "Pulse Score",
            ].map((label, i) => (
              <div
                key={label}
                className={
                  "flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-sm " +
                  (i === 0
                    ? "text-foreground-strong border-l border-accent"
                    : "text-muted border-l border-transparent")
                }
              >
                {label}
              </div>
            ))}
          </div>

          <div className="col-span-9 space-y-3">
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { l: "Total TVL", v: "$1.28B", c: "+4.6%", s: tvlSpark },
                { l: "24h Volume", v: "$248M", c: "-1.8%", s: volSpark },
                { l: "Stablecoins", v: "$612M", c: "+2.1%", s: stableSpark },
              ].map((k) => (
                <div
                  key={k.l}
                  className="card-2 p-2.5 flex flex-col gap-1.5"
                >
                  <div className="eyebrow text-[9px]">{k.l}</div>
                  <div className="flex items-baseline gap-2">
                    <div
                      className="text-[16px] font-medium num text-foreground-strong"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {k.v}
                    </div>
                    <div
                      className={
                        "text-[10px] num " +
                        (k.c.startsWith("+") ? "text-success" : "text-danger")
                      }
                    >
                      {k.c}
                    </div>
                  </div>
                  <Sparkline
                    data={k.s}
                    stroke="#94a3b8"
                    width={120}
                    height={18}
                  />
                </div>
              ))}
            </div>

            <div className="card-2 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="eyebrow text-[9px]">TVL · 90 days</div>
                  <div
                    className="text-[15px] font-medium num text-foreground-strong mt-0.5"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    $1,284.7M
                  </div>
                </div>
                <div className="flex gap-2 text-[10px] font-mono text-muted-2">
                  {["1D", "7D", "30D", "90D"].map((p, i) => (
                    <div
                      key={p}
                      className={
                        "px-1 " +
                        (i === 3 ? "text-foreground-strong" : "")
                      }
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>
              <Sparkline
                data={seriesFrom(9, 80, 100, 0.02, 0.005)}
                stroke="#00D4FF"
                width={400}
                height={64}
                className="w-full h-[64px]"
              />
            </div>

            <div className="card-2 p-3">
              <div className="flex items-center justify-between mb-2.5">
                <div className="eyebrow text-[9px]">Top Protocols</div>
                <div className="text-[9px] font-mono text-muted-2">5 / 47</div>
              </div>
              <div className="space-y-1.5">
                {protocolRows.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between text-[10px] py-0.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-foreground-strong">{p.name}</div>
                      <div className="text-muted-2 text-[9px] font-mono uppercase tracking-wider">
                        {p.cat}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 num">
                      <div className="text-foreground-strong">{p.tvl}</div>
                      <div className={"w-10 text-right " + p.tone}>{p.change}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

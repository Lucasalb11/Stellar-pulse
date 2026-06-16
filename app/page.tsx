import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { GithubIcon, XIcon, DiscordIcon } from "@/components/ui/brand-icons";
import { LandingNav } from "@/components/landing/nav";
import { NetworkBackground } from "@/components/landing/network-bg";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { Wordmark } from "@/components/ui/logo";
import { getOverviewSnapshot } from "@/lib/stellar";
import { getPriceSnapshot } from "@/lib/stellar/prices";
import { formatUSD, formatNumber, formatPercent } from "@/lib/utils";

const modules = [
  {
    n: "01",
    title: "DeFi Pulse",
    body: "Monitor TVL, liquidity, fees and yields across every DEX, lending market and yield aggregator on the network.",
  },
  {
    n: "02",
    title: "Capital Flow Engine",
    body: "Trace inter-protocol liquidity through a directed sankey of bridges, CEX desks and on-chain routers.",
  },
  {
    n: "03",
    title: "Stablecoin Observatory",
    body: "Track USDC, EURC and ecosystem-native stablecoin supply, velocity and holder distribution.",
  },
  {
    n: "04",
    title: "RWA Hub",
    body: "Tokenized treasuries, funds, bonds and private credit issued on Stellar — by issuer and category.",
  },
  {
    n: "05",
    title: "Soroban Explorer",
    body: "Contract deployments, gas usage, developer counts and the most-called contracts on the Soroban VM.",
  },
  {
    n: "06",
    title: "Pulse Score",
    body: "A 0–100 trust signal combining audit posture, liquidity depth, TVL stability, age and concentration.",
  },
];

type TickerItem = [string, string, string, string];

function changeClass(value: number): string {
  if (value > 0) return "text-success";
  if (value < 0) return "text-danger";
  return "text-muted";
}

export default async function Home() {
  const [snap, prices] = await Promise.all([
    getOverviewSnapshot(),
    getPriceSnapshot(),
  ]);

  const xlmLabel = `$${prices.xlmUsd.toFixed(4)}`;
  const xlmSourceClass = prices.source === "mock" ? "text-muted" : "text-success";

  const tickerItems: TickerItem[] = [
    ["XLM", xlmLabel, prices.source.toUpperCase(), xlmSourceClass],
    ["USDC supply", "$564.2M", "+2.4%", "text-success"],
    [
      "TVL",
      formatUSD(snap.totalTVL),
      formatPercent(snap.totalTVLChange, { signed: true }),
      changeClass(snap.totalTVLChange),
    ],
    ["24h Vol", "$248M", "-1.8%", "text-danger"],
    [
      "RWA",
      formatUSD(snap.rwaMarketSize),
      formatPercent(snap.rwaChange, { signed: true }),
      changeClass(snap.rwaChange),
    ],
    ["Soroban tx", "412.8K", "+8.4%", "text-success"],
    ["Contracts", "6,248", "+14.2%", "text-success"],
    ["Devs", "1,186", "+11.7%", "text-success"],
  ];

  return (
    <div className="flex flex-col">
      <LandingNav />

      {/* ─────────── HERO ─────────── */}
      <section className="relative isolate overflow-hidden">
        <NetworkBackground />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 md:pt-28 pb-20 md:pb-28">
          {/* issue line */}
          <div className="flex items-center justify-between mb-12 md:mb-16">
            <div className="eyebrow">Issue 001 · June 2026</div>
            <div className="eyebrow hidden md:block">
              The Stellar Economy Report
            </div>
            <div className="eyebrow">v0.1 · Beta</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-end">
            <div className="lg:col-span-7 fade-up">
              <h1
                className="text-balance text-[44px] md:text-6xl lg:text-[76px] leading-[1.02] tracking-[-0.02em] text-foreground-strong font-normal"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The intelligence layer of the{" "}
                <em
                  className="not-italic text-accent"
                  style={{ fontStyle: "italic", fontWeight: 500 }}
                >
                  Stellar economy.
                </em>
              </h1>
              <p className="mt-8 text-[17px] md:text-[19px] text-muted leading-[1.6] max-w-2xl">
                Stellar Pulse measures the capital, protocols and risk surface of
                the Stellar network with the precision an institutional ecosystem
                deserves — DeFi, stablecoins, RWAs and Soroban activity, in one
                terminal.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-2 text-[14px] text-foreground-strong bg-foreground-strong text-[#0a0f1c] hover:bg-white transition-colors px-5 py-3 rounded-sm font-medium"
                >
                  Open the terminal
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="#modules"
                  className="text-[14px] text-muted hover:text-foreground-strong transition-colors inline-flex items-center gap-1.5"
                >
                  Read the modules
                  <span className="text-muted-2">↓</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 fade-up [animation-delay:120ms]">
              {/* editorial stat panel */}
              <div className="border-l border-[var(--color-border-strong)] pl-6 space-y-6">
                <div>
                  <div className="eyebrow">Total Value Locked</div>
                  <div
                    className="mt-2 text-[34px] md:text-[40px] leading-none num text-foreground-strong"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatUSD(snap.totalTVL)}
                  </div>
                  <div className={`mt-1.5 text-xs num ${changeClass(snap.totalTVLChange)}`}>
                    {formatPercent(snap.totalTVLChange, { signed: true })} · 30 days
                  </div>
                </div>
                <div className="rule" />
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="eyebrow">RWA market</div>
                    <div
                      className="mt-1.5 text-[22px] num text-foreground-strong"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {formatUSD(snap.rwaMarketSize)}
                    </div>
                    <div className={`text-xs num mt-0.5 ${changeClass(snap.rwaChange)}`}>
                      {formatPercent(snap.rwaChange, { signed: true })}
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">Stablecoins</div>
                    <div
                      className="mt-1.5 text-[22px] num text-foreground-strong"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      $564.2M
                    </div>
                    <div className="text-xs text-success num mt-0.5">
                      +2.4%
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">Active protocols</div>
                    <div
                      className="mt-1.5 text-[22px] num text-foreground-strong"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {formatNumber(snap.activeProtocols, { compact: false })}
                    </div>
                    <div className="text-xs text-muted num mt-0.5">
                      {snap.verified ? "Live · DefiLlama" : "Snapshot"}
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">Soroban contracts</div>
                    <div
                      className="mt-1.5 text-[22px] num text-foreground-strong"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      6,248
                    </div>
                    <div className="text-xs text-success num mt-0.5">
                      +14.2%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ticker */}
        <div className="relative border-y border-[var(--color-border)] bg-[rgba(17,24,39,0.4)]">
          <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-6 overflow-hidden">
            <div className="eyebrow shrink-0">Ecosystem pulse</div>
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-10 ticker whitespace-nowrap text-[12px]">
                {[...Array(2)].map((_, copy) => (
                  <div key={copy} className="flex gap-10 shrink-0">
                    {tickerItems.map(([k, v, c, t], i) => (
                      <div
                        key={`${copy}-${i}`}
                        className="flex items-center gap-2"
                      >
                        <span className="text-muted-2 font-mono uppercase tracking-wider text-[10px]">
                          {k}
                        </span>
                        <span className="num text-foreground-strong">{v}</span>
                        <span className={`num ${t}`}>{c}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── MISSION ─────────── */}
      <section id="mission" className="relative py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
            <div className="md:col-span-3">
              <div className="eyebrow mb-3">§ 01 · Mission</div>
              <div className="text-xs text-muted-2 font-mono">
                Why this exists
              </div>
            </div>
            <div className="md:col-span-9 space-y-10">
              <h2
                className="text-balance text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.015em] text-foreground-strong font-normal max-w-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Stellar deserves the same analytical rigor as the financial
                infrastructure it is becoming.
              </h2>
              <p className="text-[17px] text-muted leading-[1.65] max-w-3xl">
                A growing share of tokenized treasuries, payments and remittance
                volume now settles on Stellar. Yet the network has been measured
                with off-the-shelf dashboards built for other chains, missing the
                structural details that matter — Soroban contract activity,
                anchor flows, RWA issuance, cross-protocol routing. Stellar
                Pulse is the instrument for the people who allocate, build and
                regulate on top of it.
              </p>

              <div className="rule" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 max-w-4xl">
                {[
                  {
                    h: "Capital flows, observed.",
                    b: "Liquidity moves between protocols, bridges and stablecoins. We make those movements legible — second by second, in aggregate.",
                  },
                  {
                    h: "Protocols, compared.",
                    b: "TVL, volume, fees, adoption, and developer activity for every Soroban-native protocol, on the same axis.",
                  },
                  {
                    h: "Risk, quantified.",
                    b: "Pulse Score combines audits, liquidity depth, age and concentration into a single trust signal — auditable, not opaque.",
                  },
                  {
                    h: "Trends, in context.",
                    b: "Yield rotations, RWA inflows and ecosystem shifts surface before they show up in price.",
                  },
                ].map((c) => (
                  <div key={c.h}>
                    <h3
                      className="text-[19px] text-foreground-strong mb-2"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {c.h}
                    </h3>
                    <p className="text-[14px] text-muted leading-[1.65]">
                      {c.b}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── MODULES ─────────── */}
      <section id="modules" className="relative py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 mb-16">
            <div className="md:col-span-3">
              <div className="eyebrow mb-3">§ 02 · Modules</div>
              <div className="text-xs text-muted-2 font-mono">
                Six instruments
              </div>
            </div>
            <div className="md:col-span-9">
              <h2
                className="text-balance text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.015em] text-foreground-strong font-normal max-w-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                A complete intelligence stack — composable, precise, built for
                capital allocators.
              </h2>
            </div>
          </div>

          <div className="rule-strong" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((m, i) => (
              <Link
                key={m.title}
                href="/dashboard"
                className={
                  "group p-8 md:p-10 border-b border-[var(--color-border)] hover:bg-[rgba(17,24,39,0.4)] transition-colors " +
                  // right borders for inner columns
                  (i % 3 !== 2 ? "lg:border-r " : "") +
                  (i % 2 === 0 ? "md:border-r " : "") +
                  "lg:border-r-[var(--color-border)] md:border-r-[var(--color-border)]"
                }
              >
                <div className="flex items-start justify-between mb-6">
                  <div
                    className="text-[44px] leading-none num text-muted-2 group-hover:text-accent transition-colors"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {m.n}
                  </div>
                  <ArrowUpRight className="size-4 text-muted-2 group-hover:text-foreground-strong group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3
                  className="text-[22px] text-foreground-strong mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {m.title}
                </h3>
                <p className="text-[14px] text-muted leading-[1.65]">{m.body}</p>
              </Link>
            ))}
          </div>
          <div className="rule-strong" />
        </div>
      </section>

      {/* ─────────── DASHBOARD PREVIEW ─────────── */}
      <section id="dashboard" className="relative py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 mb-16">
            <div className="md:col-span-3">
              <div className="eyebrow mb-3">§ 03 · The Terminal</div>
              <div className="text-xs text-muted-2 font-mono">
                A working preview
              </div>
            </div>
            <div className="md:col-span-9">
              <h2
                className="text-balance text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.015em] text-foreground-strong font-normal max-w-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Designed like a research desk, not a dashboard.
              </h2>
              <p className="mt-6 text-[17px] text-muted leading-[1.65] max-w-3xl">
                Every metric is one click away, every chart is exportable, every
                page is built on the same data layer that powers the Pulse
                Score.
              </p>
            </div>
          </div>

          <HeroMockup />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10">
            {[
              {
                k: "TVL chart",
                v: "90-day historical TVL with category breakdown — exportable as CSV or PNG.",
              },
              {
                k: "Top protocols",
                v: "Rank by TVL, volume, users or yield — in real time, with snapshots.",
              },
              {
                k: "Capital flows",
                v: "Sankey-style view of inter-protocol liquidity, bridges and CEX desks.",
              },
              {
                k: "Pulse rankings",
                v: "Sort the ecosystem by safety, growth or innovation — methodology public.",
              },
            ].map((f) => (
              <div key={f.k} className="border-t border-[var(--color-border)] pt-4">
                <div className="eyebrow mb-2">{f.k}</div>
                <p className="text-[13px] text-muted leading-[1.65]">{f.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── FOR BUILDERS ─────────── */}
      <section id="builders" className="relative py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
            <div className="md:col-span-3">
              <div className="eyebrow mb-3">§ 04 · For Builders</div>
              <div className="text-xs text-muted-2 font-mono">
                Open infrastructure
              </div>
            </div>
            <div className="md:col-span-9">
              <h2
                className="text-balance text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.015em] text-foreground-strong font-normal max-w-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Built for the next generation of Soroban developers.
              </h2>
              <p className="mt-6 text-[17px] text-muted leading-[1.65] max-w-3xl">
                Embed protocol pages, query our APIs, fork the methodology.
                Stellar Pulse is meant to be the public substrate the ecosystem
                builds reports, dashboards and research on top of.
              </p>

              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--color-border)] border border-[var(--color-border)]">
                {[
                  {
                    h: "Protocol pages",
                    b: "Dedicated, embeddable — drop into your investor updates or docs.",
                  },
                  {
                    h: "API access",
                    b: "REST & GraphQL endpoints with snapshot history.",
                  },
                  {
                    h: "Developer metrics",
                    b: "Commits, releases, unique devs per protocol per week.",
                  },
                  {
                    h: "Open roadmap",
                    b: "Public RFCs and an open-source methodology layer.",
                  },
                ].map((b) => (
                  <div key={b.h} className="bg-[var(--color-background)] p-6">
                    <div className="text-[15px] text-foreground-strong mb-1.5"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {b.h}
                    </div>
                    <p className="text-[13px] text-muted leading-[1.65]">{b.b}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-6 text-[13px]">
                <Link
                  href="/dashboard"
                  className="text-foreground-strong border-b border-[var(--color-border-strong)] hover:border-accent hover:text-accent transition-colors pb-0.5"
                >
                  Read the documentation →
                </Link>
                <Link
                  href="#"
                  className="text-muted hover:text-foreground-strong transition-colors inline-flex items-center gap-2"
                >
                  <GithubIcon size={14} />
                  Open source
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── ROADMAP ─────────── */}
      <section id="roadmap" className="relative py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 mb-16">
            <div className="md:col-span-3">
              <div className="eyebrow mb-3">§ 05 · Roadmap</div>
              <div className="text-xs text-muted-2 font-mono">
                Five phases
              </div>
            </div>
            <div className="md:col-span-9">
              <h2
                className="text-balance text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.015em] text-foreground-strong font-normal max-w-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                From analytics platform to category leader.
              </h2>
            </div>
          </div>

          <div className="rule-strong" />
          {[
            {
              phase: "01",
              title: "Protocol analytics",
              body: "TVL, volume, users and yields for every Stellar protocol.",
              status: "Shipped",
              tone: "text-success",
            },
            {
              phase: "02",
              title: "Capital flows",
              body: "Inter-protocol liquidity tracking and sankey visualization.",
              status: "Shipped",
              tone: "text-success",
            },
            {
              phase: "03",
              title: "RWA intelligence",
              body: "Tokenized treasuries, funds and private credit dashboards.",
              status: "In beta",
              tone: "text-accent",
            },
            {
              phase: "04",
              title: "Institutional",
              body: "Custom reports, portfolio tracking, on-chain attribution.",
              status: "Q3 2026",
              tone: "text-warning",
            },
            {
              phase: "05",
              title: "Pulse Copilot",
              body: "Natural-language queries, anomaly detection, narrative generation.",
              status: "Q4 2026",
              tone: "text-muted",
            },
          ].map((p) => (
            <div
              key={p.phase}
              className="grid grid-cols-12 gap-6 py-7 border-b border-[var(--color-border)] items-baseline"
            >
              <div className="col-span-2 md:col-span-1">
                <div
                  className="text-[28px] num text-muted-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {p.phase}
                </div>
              </div>
              <div className="col-span-10 md:col-span-4">
                <h3
                  className="text-[20px] text-foreground-strong"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {p.title}
                </h3>
              </div>
              <div className="col-span-8 md:col-span-5">
                <p className="text-[14px] text-muted leading-[1.65]">{p.body}</p>
              </div>
              <div className="col-span-4 md:col-span-2 text-right">
                <span className={`eyebrow ${p.tone}`}>{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── CTA ─────────── */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="border border-[var(--color-border-strong)] p-10 md:p-16 grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-8">
              <div className="eyebrow mb-5">Begin</div>
              <h2
                className="text-balance text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.015em] text-foreground-strong font-normal"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Start tracking the Stellar economy.
              </h2>
              <p className="mt-4 text-[15px] text-muted max-w-xl">
                Free during beta. Built by analysts, for analysts.
              </p>
            </div>
            <div className="md:col-span-4 flex md:justify-end flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 text-[14px] text-[#0a0f1c] bg-foreground-strong hover:bg-white transition-colors px-5 py-3 rounded-sm font-medium"
              >
                Open the terminal
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="#modules"
                className="inline-flex items-center gap-2 text-[14px] text-foreground border border-[var(--color-border-strong)] hover:border-accent hover:text-accent transition-colors px-5 py-3 rounded-sm"
              >
                See modules
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="relative border-t border-[var(--color-border)] mt-6">
        <div className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-2 md:grid-cols-12 gap-10">
          <div className="col-span-2 md:col-span-5 space-y-5">
            <Wordmark />
            <p className="text-[13px] text-muted max-w-sm leading-[1.65]">
              The intelligence layer of the Stellar economy. An open instrument
              for capital, protocols and risk.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="eyebrow mb-4">Product</div>
            <ul className="space-y-2.5 text-[13px]">
              <li>
                <Link
                  href="/dashboard"
                  className="text-muted hover:text-foreground-strong transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <a
                  className="text-muted hover:text-foreground-strong transition-colors"
                  href="#modules"
                >
                  Modules
                </a>
              </li>
              <li>
                <a
                  className="text-muted hover:text-foreground-strong transition-colors"
                  href="#roadmap"
                >
                  Roadmap
                </a>
              </li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <div className="eyebrow mb-4">Developers</div>
            <ul className="space-y-2.5 text-[13px]">
              <li className="text-muted hover:text-foreground-strong transition-colors cursor-pointer">
                Documentation
              </li>
              <li className="text-muted hover:text-foreground-strong transition-colors cursor-pointer inline-flex items-center gap-2">
                <GithubIcon size={13} />
                GitHub
              </li>
              <li className="text-muted hover:text-foreground-strong transition-colors cursor-pointer">
                API reference
              </li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <div className="eyebrow mb-4">Community</div>
            <ul className="space-y-2.5 text-[13px]">
              <li className="text-muted hover:text-foreground-strong transition-colors cursor-pointer inline-flex items-center gap-2">
                <XIcon size={12} />
                X / Twitter
              </li>
              <li className="text-muted hover:text-foreground-strong transition-colors cursor-pointer inline-flex items-center gap-2">
                <DiscordIcon size={14} />
                Discord
              </li>
              <li className="text-muted hover:text-foreground-strong transition-colors cursor-pointer">
                Newsletter
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--color-border)]">
          <div className="mx-auto max-w-7xl px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-muted-2 font-mono">
            <div>
              © 2026 Stellar Pulse · All metrics on this page are illustrative.
            </div>
            <div>Built on Stellar · Issue 001 · June 2026</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

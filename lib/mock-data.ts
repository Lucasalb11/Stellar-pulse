// Deterministic pseudo-random generator so SSR & client agree
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function seriesFrom(
  seed: number,
  length: number,
  start: number,
  volatility = 0.05,
  drift = 0.004,
) {
  const r = rng(seed);
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < length; i++) {
    const noise = (r() - 0.5) * 2 * volatility;
    v = v * (1 + drift + noise);
    out.push(Number(v.toFixed(4)));
  }
  return out;
}

export function timeSeriesFrom(
  seed: number,
  days: number,
  start: number,
  volatility = 0.04,
  drift = 0.005,
) {
  const values = seriesFrom(seed, days, start, volatility, drift);
  const now = Date.UTC(2026, 5, 12); // 2026-06-12
  return values.map((value, i) => {
    const ts = now - (days - 1 - i) * 86_400_000;
    const d = new Date(ts);
    return {
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value,
    };
  });
}

// ───────────────────────────────────────────────────────────────────
// OVERVIEW METRICS
// ───────────────────────────────────────────────────────────────────
export const overviewMetrics = {
  totalTVL: 1_284_700_000,
  totalTVLChange: 4.62,
  volume24h: 248_300_000,
  volume24hChange: -1.84,
  stablecoinSupply: 612_400_000,
  stablecoinSupplyChange: 2.18,
  activeProtocols: 47,
  activeProtocolsChange: 6.81,
  activeContracts: 1428,
  activeContractsChange: 12.4,
  rwaMarketSize: 168_900_000,
  rwaMarketSizeChange: 18.32,
};

// 90-day TVL series (in USD millions, then × 1M for display)
export const tvlSeries = timeSeriesFrom(11, 90, 1_120_000_000, 0.018, 0.0018);

// Categories TVL breakdown — reconciled so the six segments sum to totalTVL
// and the RWA bucket matches rwaMetrics + overviewMetrics.rwaMarketSize.
export const tvlByCategory = [
  { category: "DEX", value: 442_000_000, change: 5.2, color: "#00D4FF" },
  { category: "Lending", value: 302_000_000, change: 3.1, color: "#7C3AED" },
  { category: "Yield", value: 175_000_000, change: 8.4, color: "#10B981" },
  { category: "Stablecoin", value: 142_800_000, change: 1.7, color: "#F59E0B" },
  { category: "RWA", value: 168_900_000, change: 21.6, color: "#EC4899" },
  { category: "Derivatives", value: 54_000_000, change: -2.3, color: "#64748B" },
];

// ───────────────────────────────────────────────────────────────────
// PROTOCOLS
// ───────────────────────────────────────────────────────────────────
export interface Protocol {
  slug: string;
  name: string;
  category:
    | "DEX"
    | "Lending"
    | "Yield"
    | "Stablecoin"
    | "RWA"
    | "Derivatives"
    | "Bridge";
  tvl: number;
  tvlChange: number;
  volume24h: number;
  users24h: number;
  yieldApy: number;
  riskScore: number;
  spark: number[];
  tag?: string;
}

export const protocols: Protocol[] = [
  {
    slug: "soroswap",
    name: "Soroswap",
    category: "DEX",
    tvl: 184_300_000,
    tvlChange: 6.2,
    volume24h: 62_400_000,
    users24h: 12_840,
    yieldApy: 7.8,
    riskScore: 88,
    spark: seriesFrom(101, 24, 160, 0.04, 0.006),
    tag: "Leader",
  },
  {
    slug: "blend",
    name: "Blend",
    category: "Lending",
    tvl: 142_700_000,
    tvlChange: 3.4,
    volume24h: 18_900_000,
    users24h: 4_210,
    yieldApy: 9.2,
    riskScore: 84,
    spark: seriesFrom(102, 24, 132, 0.035, 0.004),
  },
  {
    slug: "aquarius",
    name: "Aquarius",
    category: "DEX",
    tvl: 96_500_000,
    tvlChange: -1.8,
    volume24h: 23_100_000,
    users24h: 7_320,
    yieldApy: 12.4,
    riskScore: 76,
    spark: seriesFrom(103, 24, 102, 0.05, 0.001),
  },
  {
    slug: "phoenix",
    name: "Phoenix",
    category: "DEX",
    tvl: 78_900_000,
    tvlChange: 4.6,
    volume24h: 14_200_000,
    users24h: 5_140,
    yieldApy: 8.6,
    riskScore: 79,
    spark: seriesFrom(104, 24, 70, 0.04, 0.005),
  },
  {
    slug: "ondo-rwa",
    name: "Ondo RWA Vault",
    category: "RWA",
    tvl: 64_200_000,
    tvlChange: 22.4,
    volume24h: 3_400_000,
    users24h: 412,
    yieldApy: 5.1,
    riskScore: 91,
    spark: seriesFrom(105, 24, 48, 0.025, 0.012),
    tag: "Hot",
  },
  {
    slug: "stellarx",
    name: "StellarX",
    category: "DEX",
    tvl: 41_800_000,
    tvlChange: 2.1,
    volume24h: 8_700_000,
    users24h: 3_840,
    yieldApy: 6.4,
    riskScore: 81,
    spark: seriesFrom(106, 24, 40, 0.03, 0.003),
  },
  {
    slug: "fxdx",
    name: "fxDX",
    category: "Derivatives",
    tvl: 38_900_000,
    tvlChange: -3.7,
    volume24h: 24_600_000,
    users24h: 2_180,
    yieldApy: 18.2,
    riskScore: 67,
    spark: seriesFrom(107, 24, 42, 0.06, -0.001),
  },
  {
    slug: "yieldblox",
    name: "YieldBlox",
    category: "Yield",
    tvl: 32_100_000,
    tvlChange: 9.2,
    volume24h: 4_100_000,
    users24h: 1_640,
    yieldApy: 14.6,
    riskScore: 74,
    spark: seriesFrom(108, 24, 28, 0.05, 0.006),
  },
  {
    slug: "lumen-bridge",
    name: "Lumen Bridge",
    category: "Bridge",
    tvl: 28_400_000,
    tvlChange: 1.2,
    volume24h: 12_800_000,
    users24h: 2_910,
    yieldApy: 4.2,
    riskScore: 82,
    spark: seriesFrom(109, 24, 27, 0.025, 0.002),
  },
  {
    slug: "usdc-pool",
    name: "USDC Liquidity",
    category: "Stablecoin",
    tvl: 142_800_000,
    tvlChange: 1.4,
    volume24h: 49_300_000,
    users24h: 18_400,
    yieldApy: 4.6,
    riskScore: 94,
    spark: seriesFrom(110, 24, 140, 0.012, 0.001),
  },
  {
    slug: "kindle-yield",
    name: "Kindle Yield",
    category: "Yield",
    tvl: 21_600_000,
    tvlChange: 12.8,
    volume24h: 2_700_000,
    users24h: 1_240,
    yieldApy: 16.8,
    riskScore: 69,
    spark: seriesFrom(111, 24, 18, 0.06, 0.008),
    tag: "New",
  },
  {
    slug: "treasure-rwa",
    name: "Treasure RWA",
    category: "RWA",
    tvl: 18_400_000,
    tvlChange: 14.6,
    volume24h: 1_800_000,
    users24h: 210,
    yieldApy: 5.4,
    riskScore: 87,
    spark: seriesFrom(112, 24, 14, 0.022, 0.011),
  },
];

// ───────────────────────────────────────────────────────────────────
// CAPITAL FLOWS
// ───────────────────────────────────────────────────────────────────
export interface CapitalFlow {
  id: string;
  source: string;
  destination: string;
  amount: number;
  asset: string;
  time: string;
  type: "inflow" | "outflow" | "swap";
}

export const capitalFlows: CapitalFlow[] = [
  {
    id: "f1",
    source: "Soroswap",
    destination: "Blend",
    amount: 4_240_000,
    asset: "USDC",
    time: "2m ago",
    type: "swap",
  },
  {
    id: "f2",
    source: "External CEX",
    destination: "Soroswap",
    amount: 8_900_000,
    asset: "XLM",
    time: "6m ago",
    type: "inflow",
  },
  {
    id: "f3",
    source: "Aquarius",
    destination: "YieldBlox",
    amount: 1_780_000,
    asset: "USDC",
    time: "12m ago",
    type: "swap",
  },
  {
    id: "f4",
    source: "Blend",
    destination: "Ondo RWA Vault",
    amount: 2_410_000,
    asset: "USDC",
    time: "18m ago",
    type: "swap",
  },
  {
    id: "f5",
    source: "USDC Liquidity",
    destination: "External CEX",
    amount: 3_120_000,
    asset: "USDC",
    time: "23m ago",
    type: "outflow",
  },
  {
    id: "f6",
    source: "Lumen Bridge",
    destination: "Phoenix",
    amount: 1_240_000,
    asset: "XLM",
    time: "31m ago",
    type: "inflow",
  },
  {
    id: "f7",
    source: "fxDX",
    destination: "Soroswap",
    amount: 980_000,
    asset: "USDC",
    time: "44m ago",
    type: "swap",
  },
  {
    id: "f8",
    source: "External CEX",
    destination: "Ondo RWA Vault",
    amount: 5_600_000,
    asset: "USDC",
    time: "1h ago",
    type: "inflow",
  },
];

// Sankey-style aggregated flows for the visualization
export const sankeyFlows = [
  { source: "External CEX", target: "Soroswap", value: 24_300_000 },
  { source: "External CEX", target: "USDC Liquidity", value: 18_700_000 },
  { source: "External CEX", target: "Ondo RWA", value: 12_400_000 },
  { source: "Soroswap", target: "Blend", value: 14_200_000 },
  { source: "Soroswap", target: "Aquarius", value: 9_800_000 },
  { source: "Aquarius", target: "YieldBlox", value: 6_400_000 },
  { source: "USDC Liquidity", target: "Blend", value: 8_900_000 },
  { source: "Blend", target: "Ondo RWA", value: 5_200_000 },
  { source: "Phoenix", target: "External CEX", value: 4_100_000 },
  { source: "Lumen Bridge", target: "Phoenix", value: 7_300_000 },
];

export const capitalFlowSeries = timeSeriesFrom(
  21,
  30,
  82_000_000,
  0.07,
  0.004,
);

// ───────────────────────────────────────────────────────────────────
// STABLECOINS
// ───────────────────────────────────────────────────────────────────
export const stablecoinMetrics = {
  usdcSupply: 564_200_000,
  usdcSupplyChange: 2.4,
  transfers24h: 86_400,
  transfersChange: 7.2,
  velocity: 1.84,
  velocityChange: 0.6,
  activeWallets: 142_300,
  activeWalletsChange: 5.1,
  marketShare: 92.1,
};

export const stablecoinSupply = timeSeriesFrom(
  31,
  60,
  520_000_000,
  0.012,
  0.002,
);

export const stablecoinBreakdown = [
  { name: "USDC", value: 564_200_000, color: "#00D4FF" },
  { name: "EURC", value: 32_400_000, color: "#7C3AED" },
  { name: "USDT (bridged)", value: 12_600_000, color: "#10B981" },
  { name: "Other", value: 3_200_000, color: "#64748B" },
];

export const transferSeries = timeSeriesFrom(34, 30, 78_000, 0.08, 0.003);

// ───────────────────────────────────────────────────────────────────
// RWA
// ───────────────────────────────────────────────────────────────────
// Mirrors the issuer table — see rwaIssuers below.
export const rwaMetrics = {
  treasuries: 55_100_000,
  funds: 48_200_000,
  bonds: 43_100_000,
  privateCredit: 22_500_000,
  growth30d: 24.6,
};

export const rwaSeries = timeSeriesFrom(41, 90, 78_000_000, 0.018, 0.012);

// Issuers anchored on entities with verified Stellar exposure (BENJI, WisdomTree,
// Etherfuse / Anclap). Remaining slots are illustrative placeholders carrying the
// "Illustrative" badge in the table — see `app/dashboard/rwa/page.tsx`.
export const rwaIssuers = [
  {
    name: "Franklin Templeton BENJI",
    tvl: 48_200_000,
    share: 28.5,
    apy: 5.0,
    category: "Funds",
    verified: true,
  },
  {
    name: "WisdomTree Prime",
    tvl: 31_400_000,
    share: 18.6,
    apy: 4.7,
    category: "Treasuries",
    verified: true,
  },
  {
    name: "Etherfuse CETES",
    tvl: 24_800_000,
    share: 14.7,
    apy: 8.4,
    category: "Bonds",
    verified: true,
  },
  {
    name: "Anclap Treasury Note",
    tvl: 23_700_000,
    share: 14.0,
    apy: 5.1,
    category: "Treasuries",
    verified: false,
  },
  {
    name: "Stellar Credit Vault",
    tvl: 22_500_000,
    share: 13.3,
    apy: 7.8,
    category: "Private Credit",
    verified: false,
  },
  {
    name: "Pulse Indexed Bond",
    tvl: 18_300_000,
    share: 10.8,
    apy: 5.6,
    category: "Bonds",
    verified: false,
  },
];

// ───────────────────────────────────────────────────────────────────
// SOROBAN
// ───────────────────────────────────────────────────────────────────
export const sorobanMetrics = {
  contractsDeployed: 6248,
  contractsChange: 14.2,
  transactions24h: 412_800,
  transactionsChange: 8.4,
  activeDevelopers: 1186,
  developersChange: 11.7,
  gasUsage: 184_000_000,
  gasUsageChange: 6.3,
};

export const sorobanContractsSeries = timeSeriesFrom(
  51,
  60,
  4_200,
  0.012,
  0.008,
);

export const sorobanTxSeries = timeSeriesFrom(52, 60, 220_000, 0.05, 0.006);

// ───────────────────────────────────────────────────────────────────
// PULSE SCORE
// ───────────────────────────────────────────────────────────────────
export interface PulseScore {
  protocol: string;
  category: string;
  total: number;
  audits: number;
  liquidity: number;
  tvlStability: number;
  age: number;
  concentration: number;
  verdict: "Trusted" | "Solid" | "Watch" | "Risky";
}

export const pulseScores: PulseScore[] = [
  {
    protocol: "USDC Liquidity",
    category: "Stablecoin",
    total: 94,
    audits: 98,
    liquidity: 96,
    tvlStability: 95,
    age: 92,
    concentration: 88,
    verdict: "Trusted",
  },
  {
    protocol: "Ondo RWA Vault",
    category: "RWA",
    total: 91,
    audits: 95,
    liquidity: 88,
    tvlStability: 92,
    age: 86,
    concentration: 92,
    verdict: "Trusted",
  },
  {
    protocol: "Soroswap",
    category: "DEX",
    total: 88,
    audits: 90,
    liquidity: 92,
    tvlStability: 86,
    age: 84,
    concentration: 86,
    verdict: "Trusted",
  },
  {
    protocol: "Treasure RWA",
    category: "RWA",
    total: 87,
    audits: 88,
    liquidity: 80,
    tvlStability: 91,
    age: 84,
    concentration: 90,
    verdict: "Trusted",
  },
  {
    protocol: "Blend",
    category: "Lending",
    total: 84,
    audits: 92,
    liquidity: 84,
    tvlStability: 82,
    age: 80,
    concentration: 82,
    verdict: "Solid",
  },
  {
    protocol: "Lumen Bridge",
    category: "Bridge",
    total: 82,
    audits: 86,
    liquidity: 76,
    tvlStability: 84,
    age: 82,
    concentration: 80,
    verdict: "Solid",
  },
  {
    protocol: "StellarX",
    category: "DEX",
    total: 81,
    audits: 84,
    liquidity: 80,
    tvlStability: 78,
    age: 86,
    concentration: 76,
    verdict: "Solid",
  },
  {
    protocol: "Phoenix",
    category: "DEX",
    total: 79,
    audits: 78,
    liquidity: 82,
    tvlStability: 76,
    age: 78,
    concentration: 80,
    verdict: "Solid",
  },
  {
    protocol: "Aquarius",
    category: "DEX",
    total: 76,
    audits: 80,
    liquidity: 78,
    tvlStability: 70,
    age: 78,
    concentration: 72,
    verdict: "Solid",
  },
  {
    protocol: "YieldBlox",
    category: "Yield",
    total: 74,
    audits: 76,
    liquidity: 72,
    tvlStability: 70,
    age: 78,
    concentration: 72,
    verdict: "Solid",
  },
  {
    protocol: "Kindle Yield",
    category: "Yield",
    total: 69,
    audits: 70,
    liquidity: 62,
    tvlStability: 68,
    age: 60,
    concentration: 84,
    verdict: "Watch",
  },
  {
    protocol: "fxDX",
    category: "Derivatives",
    total: 67,
    audits: 64,
    liquidity: 70,
    tvlStability: 60,
    age: 68,
    concentration: 72,
    verdict: "Watch",
  },
];

export function verdictTone(verdict: PulseScore["verdict"]) {
  switch (verdict) {
    case "Trusted":
      return "success" as const;
    case "Solid":
      return "accent" as const;
    case "Watch":
      return "warning" as const;
    case "Risky":
      return "danger" as const;
  }
}

// ───────────────────────────────────────────────────────────────────
// DEFI PULSE TRENDS
// ───────────────────────────────────────────────────────────────────
export const yieldOpportunities = [
  { protocol: "fxDX", asset: "USDC", apy: 18.2, tvl: 38_900_000, risk: "Watch" },
  { protocol: "Kindle Yield", asset: "XLM", apy: 16.8, tvl: 21_600_000, risk: "Watch" },
  { protocol: "YieldBlox", asset: "USDC", apy: 14.6, tvl: 32_100_000, risk: "Solid" },
  { protocol: "Aquarius", asset: "USDC/XLM", apy: 12.4, tvl: 96_500_000, risk: "Solid" },
  { protocol: "Blend", asset: "USDC", apy: 9.2, tvl: 142_700_000, risk: "Solid" },
  { protocol: "Phoenix", asset: "XLM", apy: 8.6, tvl: 78_900_000, risk: "Solid" },
];

export const volumeByProtocol = [
  { name: "Soroswap", value: 62_400_000 },
  { name: "fxDX", value: 24_600_000 },
  { name: "Aquarius", value: 23_100_000 },
  { name: "Blend", value: 18_900_000 },
  { name: "Phoenix", value: 14_200_000 },
  { name: "Lumen Bridge", value: 12_800_000 },
  { name: "StellarX", value: 8_700_000 },
];

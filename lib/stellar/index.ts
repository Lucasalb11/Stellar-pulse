import { cacheLife, cacheTag } from "next/cache";
import {
  fetchStellarChainTvl,
  fetchProtocols,
  fetchTvlByCategory,
  computeChange,
} from "./defillama";
import { fetchYieldPools } from "./defillama-yields";
import { fetchStablecoinSupplies, fetchRawPayments } from "./horizon";
import { buildSankeyEdges } from "./sankey";
import {
  fetchTopContracts,
  fetchSorobanGlobalStats,
  type SorobanGlobalStats,
} from "./stellar-expert";
import { fetchVerifiedRwaIssuers, reconcileRwaSet, type RwaSet } from "./rwa";
import { buildPulseScores } from "./pulse-score";
import { getPriceSnapshot } from "./prices";
import { withFallback } from "./fallback";
import { TAGS } from "./cache";
import {
  overviewMetrics as mockOverview,
  tvlSeries as mockTvlSeries,
  tvlByCategory as mockTvlByCategory,
  protocols as mockProtocols,
  yieldOpportunities as mockYields,
  stablecoinBreakdown as mockStableBreakdown,
  sorobanMetrics as mockSorobanMetrics,
  rwaIssuers as mockRwaIssuers,
} from "../mock-data";
import type {
  OverviewMetrics,
  TimePoint,
  CategoryTVL,
  Protocol,
  Category,
  YieldPool,
  StablecoinSupply,
  SorobanContract,
  RwaIssuer,
  FlowEdge,
  PulseScore,
} from "../types";

const RWA_CATEGORY: Category = "RWA";

const mockProtocolList: Protocol[] = mockProtocols.map((p) => ({
  ...p,
  source: "mock",
  verified: false,
}));

const mockCategoryList: CategoryTVL[] = mockTvlByCategory.map((c) => ({
  ...c,
  category: c.category as Category,
}));

export interface OverviewSnapshot {
  totalTVL: number;
  totalTVLChange: number;
  activeProtocols: number;
  rwaMarketSize: number;
  rwaChange: number;
  asOf: string;
  verified: boolean;
}

export async function getOverviewSnapshot(): Promise<OverviewSnapshot> {
  "use cache";
  cacheLife("tvl");
  cacheTag(TAGS.overview, TAGS.tvl);

  const [series, categories, protocols] = await Promise.all([
    withFallback(fetchStellarChainTvl, mockTvlSeries, "chainTvl"),
    withFallback(fetchTvlByCategory, mockCategoryList, "tvlByCategory"),
    withFallback(fetchProtocols, mockProtocolList, "protocols"),
  ]);

  const verified =
    !("_fallback" in series) &&
    !("_fallback" in categories) &&
    !("_fallback" in protocols);

  const last = series[series.length - 1]?.value ?? 0;
  const rwa = categories.find((c) => c.category === RWA_CATEGORY);

  return {
    totalTVL: last,
    totalTVLChange: computeChange(series, 30),
    activeProtocols: protocols.length,
    rwaMarketSize: rwa?.value ?? 0,
    rwaChange: rwa?.change ?? 0,
    asOf: series[series.length - 1]?.date ?? "",
    verified,
  };
}

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  "use cache";
  cacheLife("tvl");
  cacheTag(TAGS.overview, TAGS.tvl);

  const [series, categories, protocols] = await Promise.all([
    withFallback(fetchStellarChainTvl, mockTvlSeries, "chainTvl"),
    withFallback(fetchTvlByCategory, mockCategoryList, "tvlByCategory"),
    withFallback(fetchProtocols, mockProtocolList, "protocols"),
  ]);

  const verified =
    !("_fallback" in series) &&
    !("_fallback" in categories) &&
    !("_fallback" in protocols);

  const last = series[series.length - 1]?.value ?? 0;
  const rwa = categories.find((c) => c.category === RWA_CATEGORY);

  return {
    totalTVL: last,
    totalTVLChange: computeChange(series, 1),
    volume24h: mockOverview.volume24h,
    volume24hChange: mockOverview.volume24hChange,
    stablecoinSupply: mockOverview.stablecoinSupply,
    stablecoinSupplyChange: mockOverview.stablecoinSupplyChange,
    activeProtocols: protocols.length,
    activeProtocolsChange: mockOverview.activeProtocolsChange,
    activeContracts: mockOverview.activeContracts,
    activeContractsChange: mockOverview.activeContractsChange,
    rwaMarketSize: rwa?.value ?? mockOverview.rwaMarketSize,
    rwaMarketSizeChange: rwa?.change ?? mockOverview.rwaMarketSizeChange,
    asOf: series[series.length - 1]?.date ?? "",
    verified,
  };
}

export async function getTvlSeries(): Promise<TimePoint[]> {
  "use cache";
  cacheLife("tvl");
  cacheTag(TAGS.tvl);
  return withFallback(fetchStellarChainTvl, mockTvlSeries, "chainTvl");
}

export async function getTvlByCategory(): Promise<CategoryTVL[]> {
  "use cache";
  cacheLife("tvl");
  cacheTag(TAGS.tvl);
  return withFallback(fetchTvlByCategory, mockCategoryList, "tvlByCategory");
}

export async function getProtocols(): Promise<Protocol[]> {
  "use cache";
  cacheLife("tvl");
  cacheTag(TAGS.tvl);
  return withFallback(fetchProtocols, mockProtocolList, "protocols");
}

const mockYieldPools: YieldPool[] = mockYields.map((y) => ({
  protocol: y.protocol,
  symbol: y.asset,
  apy: y.apy,
  tvl: y.tvl,
  source: "mock",
  verified: false,
}));

export async function getYieldPools(): Promise<YieldPool[]> {
  "use cache";
  cacheLife("tvl");
  cacheTag(TAGS.yields);
  return withFallback(fetchYieldPools, mockYieldPools, "yields");
}

const mockStablecoinSupplies: StablecoinSupply[] = mockStableBreakdown.map((b) => ({
  symbol: b.name,
  issuer: "mock",
  kind: "classic",
  supply: b.value,
  change24h: 0,
  verified: false,
}));

export async function getStablecoinSupplies(): Promise<StablecoinSupply[]> {
  "use cache";
  cacheLife("market");
  cacheTag(TAGS.stablecoins);
  return withFallback(fetchStablecoinSupplies, mockStablecoinSupplies, "stablecoinSupplies");
}

export interface SorobanMetrics {
  contractsDeployed: number;
  contractsChange: number;
  transactions24h: number;
  transactionsChange: number;
  activeDevelopers: number;
  developersChange: number;
  gasUsage: number;
  gasUsageChange: number;
  verified: boolean;
}

const mockTopContracts: SorobanContract[] = [];

export async function getTopContracts(): Promise<SorobanContract[]> {
  "use cache";
  cacheLife("tvl");
  cacheTag(TAGS.soroban);
  return withFallback(() => fetchTopContracts(6), mockTopContracts, "topContracts");
}

const mockSorobanGlobalStats: SorobanGlobalStats = {
  totalContracts: mockSorobanMetrics.contractsDeployed,
  activeContracts24h: 0,
  invocations24h: mockSorobanMetrics.transactions24h,
};

export async function getSorobanMetrics(): Promise<SorobanMetrics> {
  "use cache";
  cacheLife("tvl");
  cacheTag(TAGS.soroban);

  const stats = await withFallback(
    fetchSorobanGlobalStats,
    mockSorobanGlobalStats,
    "sorobanStats",
  );
  const verified = !("_fallback" in stats);

  return {
    contractsDeployed: stats.totalContracts || mockSorobanMetrics.contractsDeployed,
    contractsChange: mockSorobanMetrics.contractsChange,
    transactions24h: stats.invocations24h || mockSorobanMetrics.transactions24h,
    transactionsChange: mockSorobanMetrics.transactionsChange,
    activeDevelopers: mockSorobanMetrics.activeDevelopers,
    developersChange: mockSorobanMetrics.developersChange,
    gasUsage: mockSorobanMetrics.gasUsage,
    gasUsageChange: mockSorobanMetrics.gasUsageChange,
    verified,
  };
}

const mockRwaFallback: RwaIssuer[] = mockRwaIssuers.map((m) => ({
  name: m.name,
  tvl: m.tvl,
  share: m.share,
  apy: m.apy,
  category: m.category as RwaIssuer["category"],
  verified: false,
}));

export async function getRwaSet(): Promise<RwaSet> {
  "use cache";
  cacheLife("tvl");
  cacheTag(TAGS.rwa);

  let verified: RwaIssuer[] = [];
  try {
    const prices = await getPriceSnapshot();
    verified = await fetchVerifiedRwaIssuers(prices);
  } catch (err) {
    console.warn(`[stellar/rwa] verified fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return reconcileRwaSet(verified, mockRwaFallback);
}

export async function getFlowEdges(window: "24h" | "7d" = "24h"): Promise<FlowEdge[]> {
  "use cache";
  cacheLife("market");
  cacheTag(TAGS.flows);

  try {
    const payments = await fetchRawPayments({ window });
    return buildSankeyEdges(payments, { window });
  } catch (err) {
    console.warn(`[stellar/sankey] payments fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

export async function getPulseScores(topN = 12): Promise<PulseScore[]> {
  "use cache";
  cacheLife("tvl");
  cacheTag(TAGS.tvl);

  const [protocols, series] = await Promise.all([
    withFallback(fetchProtocols, mockProtocolList, "pulse:protocols"),
    withFallback(fetchStellarChainTvl, mockTvlSeries, "pulse:tvl"),
  ]);
  if (protocols.length === 0) return [];
  return buildPulseScores(protocols, series, topN);
}

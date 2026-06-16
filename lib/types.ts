export type Category =
  | "DEX"
  | "Lending"
  | "Yield"
  | "Stablecoin"
  | "RWA"
  | "Derivatives"
  | "Bridge";

export type DataSource =
  | "defillama"
  | "defillama-yields"
  | "horizon"
  | "stellar-expert"
  | "coingecko"
  | "reflector"
  | "horizon-orderbook"
  | "derived-soroban"
  | "cache"
  | "mock";

export interface OverviewMetrics {
  totalTVL: number;
  totalTVLChange: number;
  volume24h: number;
  volume24hChange: number;
  stablecoinSupply: number;
  stablecoinSupplyChange: number;
  activeProtocols: number;
  activeProtocolsChange: number;
  activeContracts: number;
  activeContractsChange: number;
  rwaMarketSize: number;
  rwaMarketSizeChange: number;
  asOf: string;
  verified: boolean;
}

export interface TimePoint {
  date: string;
  label: string;
  value: number;
}

export interface CategoryTVL {
  category: Category;
  value: number;
  change: number;
  color: string;
}

export interface Protocol {
  slug: string;
  name: string;
  category: Category;
  tvl: number;
  tvlChange: number;
  volume24h: number;
  users24h: number;
  yieldApy: number;
  riskScore: number;
  spark: number[];
  tag?: string;
  source: DataSource;
  verified: boolean;
  links?: ProtocolLinks;
}

export interface ProtocolLinks {
  slug: string;
  name: string;
  homepage: string;
  app?: string;
  docs?: string;
  twitter?: string;
  github?: string;
  audits: { firm: string; url: string; date: string }[];
  verifiedOn: string;
  verifiedBy: string;
}

export interface StablecoinSupply {
  symbol: string;
  issuer: string;
  kind: "classic" | "sac";
  supply: number;
  change24h: number;
  verified: boolean;
}

export interface RwaIssuer {
  name: string;
  tvl: number;
  share: number;
  apy: number;
  category: "Treasuries" | "Funds" | "Bonds" | "Private Credit";
  verified: boolean;
}

export interface SorobanContract {
  id: string;
  name: string;
  calls: number;
  type: string;
  verified: boolean;
}

export interface CapitalFlow {
  id: string;
  source: string;
  destination: string;
  amount: number;
  asset: string;
  time: string;
  type: "inflow" | "outflow" | "swap";
}

export interface FlowEdge {
  source: string;
  sourceAddress: string;
  sourceKnown: boolean;
  destination: string;
  destinationAddress: string;
  destinationKnown: boolean;
  amount: number;
  asset: string;
  window: "24h" | "7d";
  verified: boolean;
}

export interface PulseScore {
  protocol: string;
  category: Category;
  total: number;
  liquidity: number;
  tvlStability: number;
  age: number;
  concentration: number;
  verdict: "Trusted" | "Solid" | "Watch" | "Risky";
  methodology: "v1-heuristic" | "mock";
}

export interface PriceSnapshot {
  xlmUsd: number;
  usdcUsd: number;
  asOf: string;
  source: Extract<
    DataSource,
    "coingecko" | "reflector" | "horizon-orderbook" | "cache" | "mock"
  >;
}

export interface YieldPool {
  protocol: string;
  symbol: string;
  apy: number;
  tvl: number;
  source: Extract<DataSource, "defillama-yields" | "derived-soroban" | "mock">;
  verified: boolean;
}

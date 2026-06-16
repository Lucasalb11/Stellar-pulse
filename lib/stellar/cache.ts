export const TAGS = {
  overview: "stellar:overview",
  tvl: "stellar:tvl",
  stablecoins: "stellar:stablecoins",
  rwa: "stellar:rwa",
  soroban: "stellar:soroban",
  prices: "stellar:prices",
  yields: "stellar:yields",
  flows: "stellar:flows",
  directory: "stellar:directory",
} as const;

export type StellarTag = (typeof TAGS)[keyof typeof TAGS];

export const ALLOWED_TAGS: ReadonlySet<string> = new Set(Object.values(TAGS));

export const REVALIDATE = {
  market: 60,
  tvl: 300,
  directory: 3600,
} as const;

export type CacheProfile = "market" | "tvl" | "directory";

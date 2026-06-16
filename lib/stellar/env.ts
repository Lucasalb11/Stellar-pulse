const required = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(
      `[stellar/env] Required env var ${name} is not set. See SECURITY.md §6.`,
    );
  }
  return value;
};

export const HORIZON_URL =
  process.env.HORIZON_URL ?? "https://horizon.stellar.org";

export const SOROBAN_RPC_URL =
  process.env.SOROBAN_RPC_URL ??
  "https://soroban-rpc.mainnet.stellar.gateway.fm";

export const STELLAR_EXPERT_API =
  process.env.STELLAR_EXPERT_API ??
  "https://api.stellar.expert/explorer/public";

export const COINGECKO_BASE =
  process.env.COINGECKO_BASE ?? "https://api.coingecko.com/api/v3";

export const COINGECKO_DEMO_KEY = process.env.COINGECKO_DEMO_KEY ?? "";

export const DEFILLAMA_BASE = "https://api.llama.fi";
export const DEFILLAMA_YIELDS = "https://yields.llama.fi";
export const DEFILLAMA_STABLECOINS = "https://stablecoins.llama.fi";

export const getRevalidateSecret = (): string =>
  required("REVALIDATE_SECRET", process.env.REVALIDATE_SECRET);

export const EXTERNAL_HOSTS = [
  new URL(HORIZON_URL).host,
  new URL(SOROBAN_RPC_URL).host,
  new URL(STELLAR_EXPERT_API).host,
  new URL(COINGECKO_BASE).host,
  new URL(DEFILLAMA_BASE).host,
  new URL(DEFILLAMA_YIELDS).host,
  new URL(DEFILLAMA_STABLECOINS).host,
] as const;

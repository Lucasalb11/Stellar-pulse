import { z } from "zod";
import { DEFILLAMA_YIELDS } from "./env";
import type { YieldPool } from "../types";

export const LlamaYieldPool = z.object({
  pool: z.string().max(80),
  project: z.string().max(80),
  chain: z.string().max(40),
  symbol: z.string().max(80),
  apy: z.number().nullable().optional(),
  apyBase: z.number().nullable().optional(),
  apyReward: z.number().nullable().optional(),
  tvlUsd: z.number().nullable().optional(),
  stablecoin: z.boolean().optional(),
  ilRisk: z.string().max(20).optional(),
  exposure: z.string().max(20).optional(),
});

export const LlamaYieldResponse = z.object({
  status: z.string().optional(),
  data: z.array(LlamaYieldPool).max(50_000),
});

const APY_SANITY_MAX = 500;

export async function fetchYieldPools(): Promise<YieldPool[]> {
  const res = await fetch(`${DEFILLAMA_YIELDS}/pools`, { cache: "no-store" });
  if (!res.ok) throw new Error(`DefiLlama yields ${res.status}`);
  const parsed = LlamaYieldResponse.parse(await res.json());

  return parsed.data
    .filter((p) => p.chain === "Stellar")
    .map((p): YieldPool | null => {
      const apy = p.apy ?? 0;
      if (apy <= 0 || apy >= APY_SANITY_MAX) return null;
      const tvl = p.tvlUsd ?? 0;
      if (tvl < 0) return null;
      return {
        protocol: p.project,
        symbol: p.symbol,
        apy,
        tvl,
        source: "defillama-yields",
        verified: true,
      };
    })
    .filter((p): p is YieldPool => p !== null)
    .sort((a, b) => b.apy - a.apy);
}

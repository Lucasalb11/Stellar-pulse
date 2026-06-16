import { z } from "zod";
import { DEFILLAMA_BASE } from "./env";
import type { Category, Protocol, TimePoint, CategoryTVL } from "../types";

export const ChainTvlPoint = z.object({
  date: z.number().int().nonnegative(),
  tvl: z.number().nonnegative().lte(1e12),
});
export const ChainTvlSeries = z.array(ChainTvlPoint).max(10_000);

export const LlamaProtocol = z.object({
  slug: z.string().max(80),
  name: z.string().max(80),
  category: z.string().max(40).nullable().optional(),
  chains: z.array(z.string().max(40)).max(200),
  tvl: z.number().nullable().optional(),
  change_1d: z.number().nullable().optional(),
  change_7d: z.number().nullable().optional(),
  chainTvls: z.record(z.string(), z.number()).optional(),
});
export const LlamaProtocolList = z.array(LlamaProtocol).max(20_000);

const CATEGORY_MAP: Record<string, Category> = {
  Dexes: "DEX",
  "DEX Aggregator": "DEX",
  Lending: "Lending",
  Yield: "Yield",
  "Yield Aggregator": "Yield",
  CDP: "Lending",
  Bridge: "Bridge",
  "Cross Chain": "Bridge",
  Derivatives: "Derivatives",
  "Liquid Staking": "Yield",
  Stablecoins: "Stablecoin",
  "RWA Lending": "RWA",
  RWA: "RWA",
};

const CATEGORY_COLORS: Record<Category, string> = {
  DEX: "#00D4FF",
  Lending: "#7C3AED",
  Yield: "#10B981",
  Stablecoin: "#F59E0B",
  RWA: "#EC4899",
  Derivatives: "#64748B",
  Bridge: "#94A3B8",
};

const mapCategory = (raw: string | null | undefined): Category | null => {
  if (!raw) return null;
  return CATEGORY_MAP[raw] ?? null;
};

export async function fetchStellarChainTvl(): Promise<TimePoint[]> {
  const res = await fetch(`${DEFILLAMA_BASE}/v2/historicalChainTvl/Stellar`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`DefiLlama chainTvl ${res.status}`);
  const parsed = ChainTvlSeries.parse(await res.json());

  return parsed.map((p) => {
    const d = new Date(p.date * 1000);
    return {
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: p.tvl,
    };
  });
}

interface RawProtocols {
  protocols: z.infer<typeof LlamaProtocolList>;
}

async function fetchRawProtocols(): Promise<RawProtocols["protocols"]> {
  const res = await fetch(`${DEFILLAMA_BASE}/protocols`, { cache: "no-store" });
  if (!res.ok) throw new Error(`DefiLlama protocols ${res.status}`);
  const parsed = LlamaProtocolList.parse(await res.json());
  return parsed.filter(
    (p) => p.chains.includes("Stellar") && (p.tvl ?? 0) > 0,
  );
}

const stellarTvl = (p: z.infer<typeof LlamaProtocol>): number => {
  const chainSpecific = p.chainTvls?.Stellar;
  if (typeof chainSpecific === "number" && chainSpecific >= 0) return chainSpecific;
  return Math.max(0, p.tvl ?? 0);
};

export async function fetchProtocols(): Promise<Protocol[]> {
  const raw = await fetchRawProtocols();

  return raw
    .map((p): Protocol | null => {
      const cat = mapCategory(p.category);
      if (!cat) return null;
      const tvl = stellarTvl(p);
      if (tvl <= 0 || tvl > 1e11) return null;
      return {
        slug: p.slug.toLowerCase(),
        name: p.name,
        category: cat,
        tvl,
        tvlChange: Math.max(-99, Math.min(999, p.change_1d ?? 0)),
        volume24h: 0,
        users24h: 0,
        yieldApy: 0,
        riskScore: 0,
        spark: [],
        source: "defillama",
        verified: true,
      };
    })
    .filter((p): p is Protocol => p !== null)
    .sort((a, b) => b.tvl - a.tvl);
}

export async function fetchTvlByCategory(): Promise<CategoryTVL[]> {
  const protocols = await fetchProtocols();
  const byCategory = new Map<Category, { value: number; sum1d: number; weight: number }>();

  for (const p of protocols) {
    const slot = byCategory.get(p.category) ?? { value: 0, sum1d: 0, weight: 0 };
    slot.value += p.tvl;
    slot.sum1d += p.tvlChange * p.tvl;
    slot.weight += p.tvl;
    byCategory.set(p.category, slot);
  }

  return Array.from(byCategory.entries())
    .map(([category, { value, sum1d, weight }]) => ({
      category,
      value,
      change: weight > 0 ? sum1d / weight : 0,
      color: CATEGORY_COLORS[category],
    }))
    .sort((a, b) => b.value - a.value);
}

export function computeChange(series: TimePoint[], daysAgo: number): number {
  if (series.length < 2) return 0;
  const last = series[series.length - 1].value;
  const idx = Math.max(0, series.length - 1 - daysAgo);
  const old = series[idx].value;
  if (old <= 0) return 0;
  return ((last - old) / old) * 100;
}

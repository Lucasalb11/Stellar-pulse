import type { Protocol, PulseScore, TimePoint } from "../types";

export const WEIGHTS = {
  liquidity: 0.35,
  tvlStability: 0.3,
  age: 0.15,
  concentration: 0.2,
} as const;

export const VERDICT_BANDS = {
  trusted: 85,
  solid: 70,
  watch: 55,
} as const;

export function computeVerdict(total: number): PulseScore["verdict"] {
  if (total >= VERDICT_BANDS.trusted) return "Trusted";
  if (total >= VERDICT_BANDS.solid) return "Solid";
  if (total >= VERDICT_BANDS.watch) return "Watch";
  return "Risky";
}

export interface Factors {
  liquidity: number;
  tvlStability: number;
  age: number;
  concentration: number;
}

const clamp = (v: number, lo = 0, hi = 100): number =>
  Math.max(lo, Math.min(hi, v));

export function computeTotal(f: Factors): number {
  const raw =
    WEIGHTS.liquidity * f.liquidity +
    WEIGHTS.tvlStability * f.tvlStability +
    WEIGHTS.age * f.age +
    WEIGHTS.concentration * f.concentration;
  return Math.round(clamp(raw));
}

export function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, x) => s + x, 0) / values.length;
  const variance = values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function tvlStabilityFromSeries(series: TimePoint[]): number {
  if (series.length < 2) return 50;
  const window = series.slice(-30);
  const dailyChange: number[] = [];
  for (let i = 1; i < window.length; i++) {
    const prev = window[i - 1].value;
    const cur = window[i].value;
    if (prev <= 0) continue;
    dailyChange.push(((cur - prev) / prev) * 100);
  }
  if (dailyChange.length === 0) return 50;
  return clamp(100 - stdDev(dailyChange));
}

export function liquidityFactor(protocolTvl: number, ecosystemMax: number): number {
  if (ecosystemMax <= 0) return 0;
  return clamp((protocolTvl / ecosystemMax) * 100);
}

export function ageFactor(ageMonths: number): number {
  if (!Number.isFinite(ageMonths) || ageMonths <= 0) return 0;
  return clamp((Math.min(ageMonths, 24) / 24) * 100);
}

export function concentrationFactor(top1HolderShare: number | null): number {
  if (top1HolderShare === null) return 70;
  return clamp(100 - top1HolderShare);
}

export interface PulseInput {
  protocol: Protocol;
  ecosystemMaxTvl: number;
  tvlSeries: TimePoint[];
  ageMonths: number;
  top1HolderShare: number | null;
}

export function scoreProtocol(input: PulseInput): PulseScore {
  const factors: Factors = {
    liquidity: liquidityFactor(input.protocol.tvl, input.ecosystemMaxTvl),
    tvlStability: tvlStabilityFromSeries(input.tvlSeries),
    age: ageFactor(input.ageMonths),
    concentration: concentrationFactor(input.top1HolderShare),
  };
  const total = computeTotal(factors);
  return {
    protocol: input.protocol.name,
    category: input.protocol.category,
    total,
    liquidity: Math.round(factors.liquidity),
    tvlStability: Math.round(factors.tvlStability),
    age: Math.round(factors.age),
    concentration: Math.round(factors.concentration),
    verdict: computeVerdict(total),
    methodology: "v1-heuristic",
  };
}

const KNOWN_AGE_HINT: Record<string, number> = {
  soroswap: 16,
  blend: 14,
  aquarius: 22,
  phoenix: 12,
  stellarx: 24,
  "lumen-bridge": 18,
};

const ageFor = (protocol: Protocol): number => KNOWN_AGE_HINT[protocol.slug] ?? 10;

export function buildPulseScores(
  protocols: Protocol[],
  chainTvlSeries: TimePoint[],
  topN = 12,
): PulseScore[] {
  if (protocols.length === 0) return [];
  const sorted = protocols.slice().sort((a, b) => b.tvl - a.tvl).slice(0, topN);
  const ecosystemMax = sorted[0]?.tvl ?? 0;
  return sorted.map((p) =>
    scoreProtocol({
      protocol: p,
      ecosystemMaxTvl: ecosystemMax,
      tvlSeries: chainTvlSeries,
      ageMonths: ageFor(p),
      top1HolderShare: null,
    }),
  );
}

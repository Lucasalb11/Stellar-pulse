import { describe, expect, it } from "vitest";
import {
  computeTotal,
  computeVerdict,
  ageFactor,
  liquidityFactor,
  concentrationFactor,
  tvlStabilityFromSeries,
  buildPulseScores,
  WEIGHTS,
  VERDICT_BANDS,
} from "@/lib/stellar/pulse-score";
import type { Protocol, TimePoint } from "@/lib/types";

const protocol = (slug: string, tvl: number, name = slug): Protocol => ({
  slug,
  name,
  category: "DEX",
  tvl,
  tvlChange: 0,
  volume24h: 0,
  users24h: 0,
  yieldApy: 0,
  riskScore: 0,
  spark: [],
  source: "defillama",
  verified: true,
});

describe("computeTotal — locked formula", () => {
  it("matches the spec weights: 0.35·liq + 0.30·stab + 0.15·age + 0.20·conc", () => {
    expect(WEIGHTS).toEqual({
      liquidity: 0.35,
      tvlStability: 0.3,
      age: 0.15,
      concentration: 0.2,
    });
    // 0.35*100 + 0.30*100 + 0.15*100 + 0.20*100 = 100
    expect(computeTotal({ liquidity: 100, tvlStability: 100, age: 100, concentration: 100 })).toBe(100);
    // 0.35*80 + 0.30*70 + 0.15*60 + 0.20*50 = 28 + 21 + 9 + 10 = 68
    expect(computeTotal({ liquidity: 80, tvlStability: 70, age: 60, concentration: 50 })).toBe(68);
    // Clamps at 0
    expect(computeTotal({ liquidity: 0, tvlStability: 0, age: 0, concentration: 0 })).toBe(0);
  });
});

describe("verdict bands", () => {
  it("maps boundaries per spec: 85+ Trusted, 70+ Solid, 55+ Watch, else Risky", () => {
    expect(VERDICT_BANDS).toEqual({ trusted: 85, solid: 70, watch: 55 });
    expect(computeVerdict(100)).toBe("Trusted");
    expect(computeVerdict(85)).toBe("Trusted");
    expect(computeVerdict(84)).toBe("Solid");
    expect(computeVerdict(70)).toBe("Solid");
    expect(computeVerdict(69)).toBe("Watch");
    expect(computeVerdict(55)).toBe("Watch");
    expect(computeVerdict(54)).toBe("Risky");
    expect(computeVerdict(0)).toBe("Risky");
  });
});

describe("factor helpers", () => {
  it("liquidity = (tvl / max) * 100, clamped", () => {
    expect(liquidityFactor(50, 100)).toBe(50);
    expect(liquidityFactor(0, 100)).toBe(0);
    expect(liquidityFactor(150, 100)).toBe(100);
    expect(liquidityFactor(50, 0)).toBe(0);
  });

  it("age caps at 24 months → 100", () => {
    expect(ageFactor(0)).toBe(0);
    expect(ageFactor(12)).toBe(50);
    expect(ageFactor(24)).toBe(100);
    expect(ageFactor(36)).toBe(100);
    expect(ageFactor(-5)).toBe(0);
    expect(ageFactor(NaN)).toBe(0);
  });

  it("concentration = 100 - top1 share, null → 70 default", () => {
    expect(concentrationFactor(null)).toBe(70);
    expect(concentrationFactor(20)).toBe(80);
    expect(concentrationFactor(100)).toBe(0);
    expect(concentrationFactor(0)).toBe(100);
  });

  it("tvlStability returns 50 with too few points; high stability → high score", () => {
    expect(tvlStabilityFromSeries([])).toBe(50);
    expect(tvlStabilityFromSeries([{ date: "2026-06-01", label: "Jun 1", value: 100 }])).toBe(50);
    const flat: TimePoint[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, "0")}`,
      label: `Jun ${i + 1}`,
      value: 100,
    }));
    expect(tvlStabilityFromSeries(flat)).toBe(100);
    const volatile: TimePoint[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, "0")}`,
      label: `Jun ${i + 1}`,
      value: i % 2 === 0 ? 100 : 500,
    }));
    expect(tvlStabilityFromSeries(volatile)).toBeLessThan(50);
  });
});

describe("buildPulseScores", () => {
  const flat: TimePoint[] = Array.from({ length: 30 }, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
    label: `Jun ${i + 1}`,
    value: 100,
  }));

  it("every output row carries methodology: 'v1-heuristic' — never 'mock'", () => {
    const scores = buildPulseScores(
      [protocol("a", 1000), protocol("b", 500), protocol("c", 200)],
      flat,
    );
    expect(scores.length).toBe(3);
    scores.forEach((s) => {
      expect(s.methodology).toBe("v1-heuristic");
    });
  });

  it("caps results to topN by TVL desc", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      protocol(`p${i}`, (20 - i) * 1000, `P${i}`),
    );
    const scores = buildPulseScores(many, flat, 12);
    expect(scores).toHaveLength(12);
    expect(scores[0].protocol).toBe("P0");
    expect(scores[11].protocol).toBe("P11");
  });

  it("returns an empty list when no protocols are provided", () => {
    expect(buildPulseScores([], flat)).toEqual([]);
  });

  it("formula integration: top-TVL protocol gets highest liquidity factor (100)", () => {
    const scores = buildPulseScores(
      [protocol("top", 1000), protocol("mid", 500), protocol("low", 100)],
      flat,
    );
    expect(scores[0].liquidity).toBe(100);
    expect(scores[1].liquidity).toBe(50);
    expect(scores[2].liquidity).toBe(10);
  });
});

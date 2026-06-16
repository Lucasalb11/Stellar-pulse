import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import {
  fetchProtocols,
  fetchStellarChainTvl,
  fetchTvlByCategory,
  computeChange,
} from "@/lib/stellar/defillama";

describe("defillama adapter", () => {
  describe("fetchStellarChainTvl", () => {
    it("maps timestamps to ISO dates and forwards tvl values", async () => {
      const series = await fetchStellarChainTvl();
      expect(series).toHaveLength(3);
      expect(series[0]).toMatchObject({
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        value: 100_000_000,
      });
      expect(series.at(-1)?.value).toBe(110_000_000);
    });

    it("throws on non-2xx", async () => {
      server.use(
        http.get("https://api.llama.fi/v2/historicalChainTvl/Stellar", () =>
          HttpResponse.json(null, { status: 500 }),
        ),
      );
      await expect(fetchStellarChainTvl()).rejects.toThrow(/chainTvl 500/);
    });

    it("rejects malformed upstream payload", async () => {
      server.use(
        http.get("https://api.llama.fi/v2/historicalChainTvl/Stellar", () =>
          HttpResponse.json([{ date: "yesterday", tvl: -50 }]),
        ),
      );
      await expect(fetchStellarChainTvl()).rejects.toThrow();
    });

    it("rejects values above 1e12 sanity ceiling", async () => {
      server.use(
        http.get("https://api.llama.fi/v2/historicalChainTvl/Stellar", () =>
          HttpResponse.json([{ date: 1700000000, tvl: 1e13 }]),
        ),
      );
      await expect(fetchStellarChainTvl()).rejects.toThrow();
    });
  });

  describe("fetchProtocols", () => {
    it("filters protocols to Stellar chain only with positive tvl", async () => {
      const list = await fetchProtocols();
      expect(list.map((p) => p.slug)).toEqual(["soroswap", "blend"]);
      expect(list.every((p) => p.tvl > 0)).toBe(true);
    });

    it("maps DefiLlama category to internal Category", async () => {
      const list = await fetchProtocols();
      const soroswap = list.find((p) => p.slug === "soroswap");
      expect(soroswap?.category).toBe("DEX");
      const blend = list.find((p) => p.slug === "blend");
      expect(blend?.category).toBe("Lending");
    });

    it("marks all protocols as defillama-sourced and verified", async () => {
      const list = await fetchProtocols();
      for (const p of list) {
        expect(p.source).toBe("defillama");
        expect(p.verified).toBe(true);
      }
    });

    it("sorts by TVL desc", async () => {
      const list = await fetchProtocols();
      for (let i = 1; i < list.length; i++) {
        expect(list[i - 1].tvl).toBeGreaterThanOrEqual(list[i].tvl);
      }
    });

    it("drops protocols with unmapped categories", async () => {
      server.use(
        http.get("https://api.llama.fi/protocols", () =>
          HttpResponse.json([
            {
              slug: "weird",
              name: "Weird",
              category: "Insurance",
              chains: ["Stellar"],
              tvl: 1_000_000,
            },
          ]),
        ),
      );
      const list = await fetchProtocols();
      expect(list).toEqual([]);
    });
  });

  describe("fetchTvlByCategory", () => {
    it("aggregates protocol tvl by category with weighted change", async () => {
      const cats = await fetchTvlByCategory();
      const dex = cats.find((c) => c.category === "DEX");
      const lending = cats.find((c) => c.category === "Lending");
      expect(dex?.value).toBe(50_000_000);
      expect(lending?.value).toBe(30_000_000);
      expect(dex?.change).toBeCloseTo(2.4);
      expect(lending?.change).toBeCloseTo(-1.1);
    });

    it("returns categories sorted by value desc", async () => {
      const cats = await fetchTvlByCategory();
      for (let i = 1; i < cats.length; i++) {
        expect(cats[i - 1].value).toBeGreaterThanOrEqual(cats[i].value);
      }
    });
  });

  describe("computeChange", () => {
    it("computes percent change between current and N days ago", () => {
      const series = [
        { date: "2026-01-01", label: "Jan 1", value: 100 },
        { date: "2026-01-02", label: "Jan 2", value: 110 },
        { date: "2026-01-03", label: "Jan 3", value: 120 },
      ];
      expect(computeChange(series, 1)).toBeCloseTo(((120 - 110) / 110) * 100);
      expect(computeChange(series, 2)).toBeCloseTo(((120 - 100) / 100) * 100);
    });

    it("returns 0 for trivial input", () => {
      expect(computeChange([], 1)).toBe(0);
      expect(
        computeChange([{ date: "2026-01-01", label: "Jan 1", value: 0 }], 1),
      ).toBe(0);
    });

    it("returns 0 when old value is 0 (no division by zero)", () => {
      const series = [
        { date: "2026-01-01", label: "Jan 1", value: 0 },
        { date: "2026-01-02", label: "Jan 2", value: 100 },
      ];
      expect(computeChange(series, 1)).toBe(0);
    });
  });
});

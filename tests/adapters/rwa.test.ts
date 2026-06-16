import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  fetchVerifiedRwaIssuers,
  reconcileRwaSet,
  listRwaIssuerSpecs,
  RWA_MIN,
  RWA_MAX,
} from "@/lib/stellar/rwa";
import type { PriceSnapshot, RwaIssuer } from "@/lib/types";

const ASSETS_URL = "https://horizon.stellar.org/assets";

const prices: PriceSnapshot = {
  xlmUsd: 0.12,
  usdcUsd: 1.0,
  asOf: new Date().toISOString(),
  source: "coingecko",
};

const mockFallback: RwaIssuer[] = [
  { name: "Anclap Note", tvl: 23_700_000, share: 50, apy: 5.1, category: "Treasuries", verified: false },
  { name: "Pulse Bond", tvl: 18_300_000, share: 50, apy: 5.6, category: "Bonds", verified: false },
];

afterEach(() => server.resetHandlers());

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("fetchVerifiedRwaIssuers", () => {
  it("multiplies Horizon supply × pricing-mode rate per registry entry", async () => {
    const specs = listRwaIssuerSpecs();
    expect(specs.length).toBeGreaterThanOrEqual(3);
    server.use(
      http.get(ASSETS_URL, ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("asset_code");
        const issuer = url.searchParams.get("asset_issuer");
        const match = specs.find((s) => s.code === code && s.issuer === issuer);
        if (!match) return HttpResponse.json({ _embedded: { records: [] } });
        const amount = code === "BENJI" ? "1000000.0" : code === "WTSY" ? "500000.0" : "250000.0";
        return HttpResponse.json({
          _embedded: {
            records: [
              {
                asset_type: "credit_alphanum12",
                asset_code: code,
                asset_issuer: issuer,
                amount,
                num_accounts: 1,
              },
            ],
          },
        });
      }),
    );
    const out = await fetchVerifiedRwaIssuers(prices);
    expect(out).toHaveLength(specs.length);
    const benji = out.find((r) => r.name === "Franklin Templeton BENJI");
    expect(benji?.tvl).toBeCloseTo(1_000_000);
    expect(benji?.verified).toBe(true);
  });

  it("drops issuers whose Horizon supply lookup fails or is zero", async () => {
    server.use(
      http.get(ASSETS_URL, () => HttpResponse.json({ _embedded: { records: [] } })),
    );
    const out = await fetchVerifiedRwaIssuers(prices);
    expect(out).toEqual([]);
  });

  it("drops issuers when Horizon returns an HTTP error", async () => {
    server.use(http.get(ASSETS_URL, () => new HttpResponse(null, { status: 500 })));
    const out = await fetchVerifiedRwaIssuers(prices);
    expect(out).toEqual([]);
  });
});

describe("reconcileRwaSet", () => {
  const verifiedRow = (name: string, tvl: number): RwaIssuer => ({
    name,
    tvl,
    share: 0,
    apy: 5,
    category: "Funds",
    verified: true,
  });

  it("falls back to the illustrative set when fewer than RWA_MIN verified", () => {
    const set = reconcileRwaSet([verifiedRow("Solo", 1_000)], mockFallback);
    expect(set.illustrative).toBe(true);
    expect(set.verifiedCount).toBe(0);
    expect(set.issuers.every((i) => !i.verified)).toBe(true);
    const sumShares = set.issuers.reduce((s, x) => s + x.share, 0);
    expect(sumShares).toBeCloseTo(100);
  });

  it("falls back when zero verified", () => {
    const set = reconcileRwaSet([], mockFallback);
    expect(set.illustrative).toBe(true);
    expect(set.issuers).toHaveLength(mockFallback.length);
  });

  it("caps to RWA_MAX by TVL desc when more than max are provided", () => {
    const many = [
      verifiedRow("A", 100),
      verifiedRow("B", 200),
      verifiedRow("C", 300),
      verifiedRow("D", 400),
      verifiedRow("E", 500),
      verifiedRow("F", 600),
    ];
    const set = reconcileRwaSet(many, mockFallback);
    expect(set.illustrative).toBe(false);
    expect(set.verifiedCount).toBe(RWA_MAX);
    expect(set.issuers.map((i) => i.name)).toEqual(["F", "E", "D", "C", "B"]);
  });

  it("breaks TVL ties with name asc", () => {
    const tied = [
      verifiedRow("Zeta", 100),
      verifiedRow("Alpha", 100),
      verifiedRow("Mid", 200),
    ];
    const set = reconcileRwaSet(tied, mockFallback);
    expect(set.issuers.map((i) => i.name)).toEqual(["Mid", "Alpha", "Zeta"]);
  });

  it("recomputes shares so they sum to 100", () => {
    const set = reconcileRwaSet(
      [verifiedRow("X", 75), verifiedRow("Y", 25)],
      mockFallback,
    );
    expect(set.verifiedCount).toBe(2);
    expect(set.issuers[0].share).toBeCloseTo(75);
    expect(set.issuers[1].share).toBeCloseTo(25);
  });

  it("emits a console.warn when 1 verified row falls back", () => {
    const warn = vi.spyOn(console, "warn");
    reconcileRwaSet([verifiedRow("Solo", 100)], mockFallback);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/only 1 verified RWA issuer.*RWA_MIN=2/),
    );
  });

  it("respects invariants RWA_MIN=2 and RWA_MAX=5", () => {
    expect(RWA_MIN).toBe(2);
    expect(RWA_MAX).toBe(5);
  });
});

describe("RWA price integration", () => {
  it("uses usd-pegged → 1.0 regardless of price snapshot", async () => {
    server.use(
      http.get(ASSETS_URL, ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("asset_code");
        const issuer = url.searchParams.get("asset_issuer");
        const specs = listRwaIssuerSpecs();
        const match = specs.find((s) => s.code === code && s.issuer === issuer);
        if (!match) return HttpResponse.json({ _embedded: { records: [] } });
        return HttpResponse.json({
          _embedded: {
            records: [
              {
                asset_type: "credit_alphanum12",
                asset_code: code,
                asset_issuer: issuer,
                amount: "1000.0",
                num_accounts: 1,
              },
            ],
          },
        });
      }),
    );
    const out = await fetchVerifiedRwaIssuers({
      ...prices,
      xlmUsd: 9.99,
      usdcUsd: 0.97,
    });
    out.forEach((r) => {
      expect(r.tvl).toBeCloseTo(1000);
    });
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { fetchYieldPools } from "@/lib/stellar/defillama-yields";

const URL = "https://yields.llama.fi/pools";

const ok = (data: unknown) =>
  HttpResponse.json({ status: "success", data });

afterEach(() => server.resetHandlers());

const stellarPool = (overrides: Record<string, unknown> = {}) => ({
  pool: "p1",
  project: "Blend",
  chain: "Stellar",
  symbol: "USDC",
  apy: 9.2,
  apyBase: 9.2,
  apyReward: 0,
  tvlUsd: 142_700_000,
  stablecoin: true,
  ilRisk: "no",
  exposure: "single",
  ...overrides,
});

describe("fetchYieldPools", () => {
  it("filters out non-Stellar chains", async () => {
    server.use(
      http.get(URL, () =>
        ok([
          stellarPool({ project: "Blend", apy: 9.2 }),
          stellarPool({ project: "Aave", chain: "Ethereum", apy: 4.1 }),
        ]),
      ),
    );
    const pools = await fetchYieldPools();
    expect(pools).toHaveLength(1);
    expect(pools[0].protocol).toBe("Blend");
  });

  it("sorts pools by apy descending", async () => {
    server.use(
      http.get(URL, () =>
        ok([
          stellarPool({ project: "Low", apy: 3 }),
          stellarPool({ project: "High", apy: 18 }),
          stellarPool({ project: "Mid", apy: 9 }),
        ]),
      ),
    );
    const pools = await fetchYieldPools();
    expect(pools.map((p) => p.protocol)).toEqual(["High", "Mid", "Low"]);
  });

  it("excludes apy > 500% as sanity ceiling", async () => {
    server.use(
      http.get(URL, () =>
        ok([
          stellarPool({ project: "Sane", apy: 12 }),
          stellarPool({ project: "Bogus", apy: 1000 }),
        ]),
      ),
    );
    const pools = await fetchYieldPools();
    expect(pools.map((p) => p.protocol)).toEqual(["Sane"]);
  });

  it("excludes apy <= 0", async () => {
    server.use(
      http.get(URL, () =>
        ok([
          stellarPool({ project: "Zero", apy: 0 }),
          stellarPool({ project: "Neg", apy: -1 }),
          stellarPool({ project: "Real", apy: 5 }),
        ]),
      ),
    );
    const pools = await fetchYieldPools();
    expect(pools.map((p) => p.protocol)).toEqual(["Real"]);
  });

  it("throws when payload shape is invalid (missing data array)", async () => {
    server.use(http.get(URL, () => HttpResponse.json({ status: "success" })));
    await expect(fetchYieldPools()).rejects.toThrow();
  });

  it("tolerates pool with missing apy (treated as 0 and filtered out)", async () => {
    server.use(
      http.get(URL, () =>
        ok([stellarPool({ project: "NoApy", apy: undefined })]),
      ),
    );
    const pools = await fetchYieldPools();
    expect(pools).toHaveLength(0);
  });

  it("throws on upstream 500", async () => {
    server.use(http.get(URL, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchYieldPools()).rejects.toThrow(/DefiLlama yields 500/);
  });

  it("returned YieldPool entries have source='defillama-yields' and verified=true", async () => {
    server.use(http.get(URL, () => ok([stellarPool()])));
    const pools = await fetchYieldPools();
    expect(pools[0].source).toBe("defillama-yields");
    expect(pools[0].verified).toBe(true);
  });
});

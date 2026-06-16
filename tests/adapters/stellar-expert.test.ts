import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  fetchTopContracts,
  fetchSorobanGlobalStats,
} from "@/lib/stellar/stellar-expert";

const CONTRACT_URL = "https://api.stellar.expert/explorer/public/contract";
const STATS_URL = "https://api.stellar.expert/explorer/public/contract-stats";

const pad = (prefix: string, body: string) =>
  prefix + body.repeat(Math.ceil(55 / body.length)).slice(0, 55);
const VALID_ID = pad("C", "DQX234567");
const VALID_ID_2 = pad("C", "CJY234567");
const BAD_ID = pad("G", "DQX234567");

afterEach(() => server.resetHandlers());

describe("fetchTopContracts", () => {
  it("returns C-prefixed contracts sorted by invocations", async () => {
    server.use(
      http.get(CONTRACT_URL, () =>
        HttpResponse.json({
          _embedded: {
            records: [
              { id: VALID_ID, invocations: 100, validation: { name: "Soroswap Router" } },
              { id: VALID_ID_2, invocations: 50, name: "Blend Pool" },
            ],
          },
        }),
      ),
    );
    const out = await fetchTopContracts(5);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      id: VALID_ID,
      name: "Soroswap Router",
      type: "AMM Router",
      calls: 100,
      verified: true,
    });
    expect(out[1].type).toBe("Lending Pool");
  });

  it("rejects records whose id is not C-prefixed (Zod refinement)", async () => {
    server.use(
      http.get(CONTRACT_URL, () =>
        HttpResponse.json({
          _embedded: {
            records: [{ id: BAD_ID, invocations: 100 }],
          },
        }),
      ),
    );
    await expect(fetchTopContracts()).rejects.toThrow();
  });

  it("drops records with zero invocations", async () => {
    server.use(
      http.get(CONTRACT_URL, () =>
        HttpResponse.json({
          _embedded: {
            records: [
              { id: VALID_ID, invocations: 0 },
              { id: VALID_ID_2, invocations: 5 },
            ],
          },
        }),
      ),
    );
    const out = await fetchTopContracts();
    expect(out.map((c) => c.id)).toEqual([VALID_ID_2]);
  });

  it("throws on malformed payload", async () => {
    server.use(http.get(CONTRACT_URL, () => HttpResponse.json({ totally: "wrong" })));
    await expect(fetchTopContracts()).rejects.toThrow();
  });

  it("throws on upstream 500", async () => {
    server.use(http.get(CONTRACT_URL, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchTopContracts()).rejects.toThrow(/stellar\.expert .* 500/);
  });

  it("synthesizes a name from contract id when no name is provided", async () => {
    server.use(
      http.get(CONTRACT_URL, () =>
        HttpResponse.json({
          _embedded: { records: [{ id: VALID_ID, invocations: 1 }] },
        }),
      ),
    );
    const [c] = await fetchTopContracts();
    expect(c.name).toMatch(/^Contract /);
  });

  it("handles real stellar.expert shape: field is `contract`, invocations may be null", async () => {
    server.use(
      http.get(CONTRACT_URL, () =>
        HttpResponse.json({
          _embedded: {
            records: [
              { contract: VALID_ID, invocations: null, subinvocation: 177, events: 2 },
              { contract: VALID_ID_2, invocations: null, subinvocation: 1, events: 0 },
            ],
          },
        }),
      ),
    );
    const out = await fetchTopContracts(5);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe(VALID_ID);
    expect(out[0].calls).toBe(179);
    expect(out[1].calls).toBe(1);
  });

  it("uses invocations when present, falls back to subinvocation+events+payments otherwise", async () => {
    server.use(
      http.get(CONTRACT_URL, () =>
        HttpResponse.json({
          _embedded: {
            records: [
              { contract: VALID_ID, invocations: 500, subinvocation: 1, events: 1 },
              { contract: VALID_ID_2, invocations: null, subinvocation: 10, events: 20, payments: 5 },
            ],
          },
        }),
      ),
    );
    const out = await fetchTopContracts();
    expect(out[0].calls).toBe(500);
    expect(out[1].calls).toBe(35);
  });
});

describe("fetchSorobanGlobalStats", () => {
  it("returns parsed contract stats", async () => {
    server.use(
      http.get(STATS_URL, () =>
        HttpResponse.json({
          total_contracts: 12_345,
          active_contracts_24h: 678,
          invocations_24h: 90_000,
          storage_entries: 1_234_567,
        }),
      ),
    );
    const stats = await fetchSorobanGlobalStats();
    expect(stats).toEqual({
      totalContracts: 12_345,
      activeContracts24h: 678,
      invocations24h: 90_000,
    });
  });

  it("defaults missing fields to 0", async () => {
    server.use(http.get(STATS_URL, () => HttpResponse.json({})));
    const stats = await fetchSorobanGlobalStats();
    expect(stats).toEqual({
      totalContracts: 0,
      activeContracts24h: 0,
      invocations24h: 0,
    });
  });

  it("throws on upstream 503", async () => {
    server.use(http.get(STATS_URL, () => new HttpResponse(null, { status: 503 })));
    await expect(fetchSorobanGlobalStats()).rejects.toThrow(/contract-stats 503/);
  });
});

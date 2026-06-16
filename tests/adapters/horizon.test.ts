import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  fetchRawPayments,
  fetchStablecoinSupplies,
} from "@/lib/stellar/horizon";

const ASSETS_URL = "https://horizon.stellar.org/assets";
const PAYMENTS_URL = "https://horizon.stellar.org/payments";

const CIRCLE_USDC = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const CIRCLE_EURC = "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2";

const assetRecord = (code: string, issuer: string, amount: string) => ({
  asset_type: "credit_alphanum4",
  asset_code: code,
  asset_issuer: issuer,
  amount,
  num_accounts: 1234,
});

afterEach(() => server.resetHandlers());

describe("fetchStablecoinSupplies", () => {
  beforeEach(() => {
    server.use(
      http.get(ASSETS_URL, ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("asset_code");
        const issuer = url.searchParams.get("asset_issuer");
        if (code === "USDC" && issuer === CIRCLE_USDC) {
          return HttpResponse.json({
            _embedded: { records: [assetRecord("USDC", CIRCLE_USDC, "564200000.0000000")] },
          });
        }
        if (code === "EURC" && issuer === CIRCLE_EURC) {
          return HttpResponse.json({
            _embedded: { records: [assetRecord("EURC", CIRCLE_EURC, "32400000.0000000")] },
          });
        }
        return HttpResponse.json({ _embedded: { records: [] } });
      }),
    );
  });

  it("returns canonical assets with verified=true and numeric supply", async () => {
    const supplies = await fetchStablecoinSupplies();
    const usdc = supplies.find((s) => s.symbol === "USDC");
    const eurc = supplies.find((s) => s.symbol === "EURC");
    expect(usdc?.supply).toBeCloseTo(564_200_000);
    expect(usdc?.verified).toBe(true);
    expect(usdc?.issuer).toBe(CIRCLE_USDC);
    expect(eurc?.supply).toBeCloseTo(32_400_000);
  });

  it("drops asset records whose issuer doesn't match the canonical issuer", async () => {
    server.use(
      http.get(ASSETS_URL, ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("asset_code");
        if (code === "USDC") {
          return HttpResponse.json({
            _embedded: {
              records: [
                assetRecord(
                  "USDC",
                  "GBSPOOFEDISSUERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                  "999999.0",
                ),
              ],
            },
          });
        }
        return HttpResponse.json({ _embedded: { records: [] } });
      }),
    );
    const supplies = await fetchStablecoinSupplies();
    expect(supplies.find((s) => s.symbol === "USDC")).toBeUndefined();
  });

  it("throws on malformed payload (missing _embedded)", async () => {
    server.use(http.get(ASSETS_URL, () => HttpResponse.json({ totally: "wrong" })));
    await expect(fetchStablecoinSupplies()).rejects.toThrow();
  });

  it("handles real Horizon /assets shape: supply = balances.authorized + LP + contracts + claimable", async () => {
    server.use(
      http.get(ASSETS_URL, ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("asset_code");
        const issuer = url.searchParams.get("asset_issuer");
        if (code !== "USDC" || issuer !== CIRCLE_USDC) {
          return HttpResponse.json({ _embedded: { records: [] } });
        }
        return HttpResponse.json({
          _embedded: {
            records: [
              {
                asset_type: "credit_alphanum4",
                asset_code: "USDC",
                asset_issuer: CIRCLE_USDC,
                balances: {
                  authorized: "300000000.0000000",
                  authorized_to_maintain_liabilities: "0.0000000",
                  unauthorized: "0.0000000",
                },
                accounts: {
                  authorized: 5432,
                  authorized_to_maintain_liabilities: 0,
                  unauthorized: 0,
                },
                liquidity_pools_amount: "100000000.0000000",
                contracts_amount: "50000000.0000000",
                claimable_balances_amount: "20000000.0000000",
              },
            ],
          },
        });
      }),
    );
    const supplies = await fetchStablecoinSupplies();
    const usdc = supplies.find((s) => s.symbol === "USDC");
    expect(usdc?.supply).toBeCloseTo(470_000_000); // 300M + 100M + 50M + 20M
  });
});

describe("fetchRawPayments", () => {
  it("paginates until a record falls outside the window", async () => {
    const now = Date.now();
    const inWindow = new Date(now - 60_000).toISOString();
    const outOfWindow = new Date(now - 48 * 3_600_000).toISOString();
    let call = 0;
    server.use(
      http.get(PAYMENTS_URL, () => {
        call += 1;
        if (call === 1) {
          return HttpResponse.json({
            _embedded: {
              records: [
                { id: "1", paging_token: "tok1", type: "payment", created_at: inWindow },
                { id: "2", paging_token: "tok2", type: "payment", created_at: inWindow },
              ],
            },
          });
        }
        return HttpResponse.json({
          _embedded: {
            records: [
              { id: "3", paging_token: "tok3", type: "payment", created_at: outOfWindow },
              { id: "4", paging_token: "tok4", type: "payment", created_at: outOfWindow },
            ],
          },
        });
      }),
    );
    const payments = await fetchRawPayments({ window: "24h" });
    expect(payments.map((p) => p.id)).toEqual(["1", "2"]);
    expect(call).toBe(2);
  });

  it("stops at empty page", async () => {
    server.use(
      http.get(PAYMENTS_URL, () =>
        HttpResponse.json({ _embedded: { records: [] } }),
      ),
    );
    const payments = await fetchRawPayments({ window: "7d" });
    expect(payments).toEqual([]);
  });

  it("throws on malformed payment record", async () => {
    server.use(
      http.get(PAYMENTS_URL, () =>
        HttpResponse.json({
          _embedded: {
            records: [{ totally: "wrong" }],
          },
        }),
      ),
    );
    await expect(fetchRawPayments({ window: "24h" })).rejects.toThrow();
  });

  it("throws on upstream 500", async () => {
    server.use(http.get(PAYMENTS_URL, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchRawPayments({ window: "24h" })).rejects.toThrow(/payments 500/);
  });
});

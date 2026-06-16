import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { fetchCoingeckoPrices } from "@/lib/stellar/prices/coingecko";

const URL = "https://api.coingecko.com/api/v3/simple/price";

afterEach(() => server.resetHandlers());

describe("fetchCoingeckoPrices", () => {
  it("parses a valid response into { xlmUsd, usdcUsd }", async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({
          stellar: { usd: 0.12 },
          "usd-coin": { usd: 1.0 },
        }),
      ),
    );
    const quote = await fetchCoingeckoPrices();
    expect(quote).toEqual({ xlmUsd: 0.12, usdcUsd: 1.0 });
  });

  it("throws when response missing usd-coin field", async () => {
    server.use(
      http.get(URL, () => HttpResponse.json({ stellar: { usd: 0.12 } })),
    );
    await expect(fetchCoingeckoPrices()).rejects.toThrow();
  });

  it("throws when CoinGecko returns 500", async () => {
    server.use(http.get(URL, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchCoingeckoPrices()).rejects.toThrow(/CoinGecko 500/);
  });

  it("rejects negative prices via schema (positive constraint)", async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({
          stellar: { usd: -1 },
          "usd-coin": { usd: 1.0 },
        }),
      ),
    );
    await expect(fetchCoingeckoPrices()).rejects.toThrow();
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { fetchOrderbookPrices } from "@/lib/stellar/prices/orderbook";

const URL = "https://horizon.stellar.org/order_book";

afterEach(() => server.resetHandlers());

describe("fetchOrderbookPrices", () => {
  it("returns the bid/ask midpoint for XLM/USDC with USDC=1.0", async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({
          bids: [{ price: "0.120", amount: "100" }],
          asks: [{ price: "0.124", amount: "100" }],
        }),
      ),
    );
    const quote = await fetchOrderbookPrices();
    expect(quote.xlmUsd).toBeCloseTo(0.122);
    expect(quote.usdcUsd).toBe(1.0);
  });

  it("throws when both sides are empty", async () => {
    server.use(
      http.get(URL, () => HttpResponse.json({ bids: [], asks: [] })),
    );
    await expect(fetchOrderbookPrices()).rejects.toThrow(/empty bid\/ask side/);
  });

  it("throws when one side is empty", async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({
          bids: [{ price: "0.12", amount: "1" }],
          asks: [],
        }),
      ),
    );
    await expect(fetchOrderbookPrices()).rejects.toThrow();
  });

  it("throws on non-numeric price strings", async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({
          bids: [{ price: "abc", amount: "1" }],
          asks: [{ price: "0.12", amount: "1" }],
        }),
      ),
    );
    await expect(fetchOrderbookPrices()).rejects.toThrow();
  });

  it("throws when Horizon returns 500", async () => {
    server.use(http.get(URL, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchOrderbookPrices()).rejects.toThrow(/Horizon orderbook 500/);
  });
});

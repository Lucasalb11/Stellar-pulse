import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stellar/prices/coingecko", () => ({
  fetchCoingeckoPrices: vi.fn(),
}));
vi.mock("@/lib/stellar/prices/reflector", () => ({
  fetchReflectorPrices: vi.fn(),
}));
vi.mock("@/lib/stellar/prices/orderbook", () => ({
  fetchOrderbookPrices: vi.fn(),
}));

import { fetchCoingeckoPrices } from "@/lib/stellar/prices/coingecko";
import { fetchReflectorPrices } from "@/lib/stellar/prices/reflector";
import { fetchOrderbookPrices } from "@/lib/stellar/prices/orderbook";
import { fetchLayeredPriceSnapshot } from "@/lib/stellar/prices";

const cg = fetchCoingeckoPrices as unknown as ReturnType<typeof vi.fn>;
const rf = fetchReflectorPrices as unknown as ReturnType<typeof vi.fn>;
const ob = fetchOrderbookPrices as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  cg.mockReset();
  rf.mockReset();
  ob.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("fetchLayeredPriceSnapshot", () => {
  it("returns coingecko snapshot when CoinGecko succeeds with in-band values", async () => {
    cg.mockResolvedValue({ xlmUsd: 0.12, usdcUsd: 1.0 });
    const snap = await fetchLayeredPriceSnapshot();
    expect(snap.source).toBe("coingecko");
    expect(snap.xlmUsd).toBe(0.12);
    expect(snap.usdcUsd).toBe(1.0);
    expect(rf).not.toHaveBeenCalled();
    expect(ob).not.toHaveBeenCalled();
  });

  it("falls through to reflector when CoinGecko throws", async () => {
    cg.mockRejectedValue(new Error("CoinGecko 500"));
    rf.mockResolvedValue({ xlmUsd: 0.11, usdcUsd: 1.0 });
    const snap = await fetchLayeredPriceSnapshot();
    expect(snap.source).toBe("reflector");
    expect(snap.xlmUsd).toBe(0.11);
    expect(ob).not.toHaveBeenCalled();
  });

  it("falls through to orderbook when CoinGecko + Reflector both fail", async () => {
    cg.mockRejectedValue(new Error("CoinGecko 500"));
    rf.mockRejectedValue(new Error("reflector not configured"));
    ob.mockResolvedValue({ xlmUsd: 0.13, usdcUsd: 1.0 });
    const snap = await fetchLayeredPriceSnapshot();
    expect(snap.source).toBe("horizon-orderbook");
    expect(snap.xlmUsd).toBe(0.13);
  });

  it("returns mock snapshot when all three sources fail", async () => {
    cg.mockRejectedValue(new Error("a"));
    rf.mockRejectedValue(new Error("b"));
    ob.mockRejectedValue(new Error("c"));
    const snap = await fetchLayeredPriceSnapshot();
    expect(snap.source).toBe("mock");
    expect(snap.xlmUsd).toBeGreaterThan(0);
    expect(snap.usdcUsd).toBe(1.0);
  });

  it("out-of-band CoinGecko XLM value falls through to next source", async () => {
    cg.mockResolvedValue({ xlmUsd: 50.0, usdcUsd: 1.0 });
    rf.mockResolvedValue({ xlmUsd: 0.12, usdcUsd: 1.0 });
    const snap = await fetchLayeredPriceSnapshot();
    expect(snap.source).toBe("reflector");
  });

  it("out-of-band CoinGecko USDC depeg falls through to next source", async () => {
    cg.mockResolvedValue({ xlmUsd: 0.12, usdcUsd: 0.5 });
    rf.mockResolvedValue({ xlmUsd: 0.12, usdcUsd: 1.0 });
    const snap = await fetchLayeredPriceSnapshot();
    expect(snap.source).toBe("reflector");
  });

  it("out-of-band Reflector value falls through to orderbook", async () => {
    cg.mockRejectedValue(new Error("a"));
    rf.mockResolvedValue({ xlmUsd: 999, usdcUsd: 1.0 });
    ob.mockResolvedValue({ xlmUsd: 0.13, usdcUsd: 1.0 });
    const snap = await fetchLayeredPriceSnapshot();
    expect(snap.source).toBe("horizon-orderbook");
  });

  it("asOf is an ISO timestamp", async () => {
    cg.mockResolvedValue({ xlmUsd: 0.12, usdcUsd: 1.0 });
    const snap = await fetchLayeredPriceSnapshot();
    expect(snap.asOf).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\./);
  });
});

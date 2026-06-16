import { describe, expect, it, vi } from "vitest";
import {
  PRICE_BANDS,
  assertPriceBand,
  isWithinBand,
  listPriceBands,
} from "@/lib/stellar/sanity";

describe("price sanity bands", () => {
  it("XLM/USD accepts values inside [0.01, 10.00] inclusive", () => {
    expect(() => assertPriceBand("XLM/USD", 0.01)).not.toThrow();
    expect(() => assertPriceBand("XLM/USD", 10.0)).not.toThrow();
    expect(() => assertPriceBand("XLM/USD", 0.5)).not.toThrow();
  });

  it("XLM/USD rejects below 0.01 and above 10.00", () => {
    expect(() => assertPriceBand("XLM/USD", 0.0099)).toThrow();
    expect(() => assertPriceBand("XLM/USD", 10.01)).toThrow();
    expect(() => assertPriceBand("XLM/USD", 0)).toThrow();
    expect(() => assertPriceBand("XLM/USD", -1)).toThrow();
  });

  it("USDC/USD accepts values inside [0.95, 1.05]", () => {
    expect(() => assertPriceBand("USDC/USD", 0.95)).not.toThrow();
    expect(() => assertPriceBand("USDC/USD", 1.05)).not.toThrow();
    expect(() => assertPriceBand("USDC/USD", 1.0)).not.toThrow();
  });

  it("USDC/USD rejects depeg outside [0.95, 1.05]", () => {
    expect(() => assertPriceBand("USDC/USD", 0.94)).toThrow();
    expect(() => assertPriceBand("USDC/USD", 1.06)).toThrow();
  });

  it("EURC/USD accepts values inside [0.85, 1.20]", () => {
    expect(() => assertPriceBand("EURC/USD", 0.85)).not.toThrow();
    expect(() => assertPriceBand("EURC/USD", 1.2)).not.toThrow();
    expect(() => assertPriceBand("EURC/USD", 1.07)).not.toThrow();
  });

  it("EURC/USD rejects outside [0.85, 1.20]", () => {
    expect(() => assertPriceBand("EURC/USD", 0.84)).toThrow();
    expect(() => assertPriceBand("EURC/USD", 1.21)).toThrow();
  });

  it("unknown symbol throws explicit error", () => {
    expect(() => assertPriceBand("UNKNOWN/USD", 1.0)).toThrow(/unknown symbol/);
  });

  it("non-finite values throw", () => {
    expect(() => assertPriceBand("XLM/USD", NaN)).toThrow();
    expect(() => assertPriceBand("XLM/USD", Infinity)).toThrow();
    expect(() => assertPriceBand("XLM/USD", -Infinity)).toThrow();
  });

  it("logs which symbol failed which band before throwing", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => assertPriceBand("USDC/USD", 0.5)).toThrow();
    expect(spy).toHaveBeenCalled();
    const message = spy.mock.calls.at(-1)?.[0] as string;
    expect(message).toContain("USDC/USD");
    expect(message).toContain("0.5");
    expect(message).toContain("[0.95, 1.05]");
    spy.mockRestore();
  });

  it("isWithinBand returns true/false without throwing", () => {
    expect(isWithinBand("XLM/USD", 0.5)).toBe(true);
    expect(isWithinBand("XLM/USD", 999)).toBe(false);
    expect(isWithinBand("UNKNOWN", 1)).toBe(false);
  });

  it("PRICE_BANDS and listPriceBands expose the three symbols", () => {
    const all = listPriceBands();
    const symbols = all.map((b) => b.symbol);
    expect(symbols).toContain("XLM/USD");
    expect(symbols).toContain("USDC/USD");
    expect(symbols).toContain("EURC/USD");
    expect(PRICE_BANDS["XLM/USD"].min).toBe(0.01);
    expect(PRICE_BANDS["XLM/USD"].max).toBe(10.0);
  });
});

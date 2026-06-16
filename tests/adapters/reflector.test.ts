import { afterEach, describe, expect, it } from "vitest";
import {
  fetchReflectorPrices,
  ReflectorNotConfiguredError,
  resetReflectorReader,
  setReflectorReader,
} from "@/lib/stellar/prices/reflector";

const ORIGINAL_XLM = process.env.REFLECTOR_XLM_USD_CONTRACT;
const ORIGINAL_USDC = process.env.REFLECTOR_USDC_USD_CONTRACT;
const ORIGINAL_DISABLE = process.env.STELLAR_PULSE_DISABLE_REFLECTOR;

afterEach(() => {
  process.env.REFLECTOR_XLM_USD_CONTRACT = ORIGINAL_XLM;
  process.env.REFLECTOR_USDC_USD_CONTRACT = ORIGINAL_USDC;
  if (ORIGINAL_DISABLE === undefined) {
    delete process.env.STELLAR_PULSE_DISABLE_REFLECTOR;
  } else {
    process.env.STELLAR_PULSE_DISABLE_REFLECTOR = ORIGINAL_DISABLE;
  }
  resetReflectorReader();
});

describe("fetchReflectorPrices", () => {
  it("throws when reflector contract env vars are not set", async () => {
    delete process.env.REFLECTOR_XLM_USD_CONTRACT;
    delete process.env.REFLECTOR_USDC_USD_CONTRACT;
    await expect(fetchReflectorPrices()).rejects.toThrow(/not configured/);
  });

  it("calls the reader for both XLM and USDC contracts and returns their values", async () => {
    process.env.REFLECTOR_XLM_USD_CONTRACT = "CXLMCONTRACTID";
    process.env.REFLECTOR_USDC_USD_CONTRACT = "CUSDCCONTRACTID";
    const calls: string[] = [];
    setReflectorReader({
      async readPrice(id: string) {
        calls.push(id);
        return id.includes("XLM") ? 0.12 : 1.0;
      },
    });
    const quote = await fetchReflectorPrices();
    expect(quote.xlmUsd).toBeCloseTo(0.12);
    expect(quote.usdcUsd).toBeCloseTo(1.0);
    expect(calls).toContain("CXLMCONTRACTID");
    expect(calls).toContain("CUSDCCONTRACTID");
  });

  it("when STELLAR_PULSE_DISABLE_REFLECTOR=1, the default reader throws a typed error so the fallback chain skips Reflector cleanly", async () => {
    process.env.REFLECTOR_XLM_USD_CONTRACT = "CXLMCONTRACTID";
    process.env.REFLECTOR_USDC_USD_CONTRACT = "CUSDCCONTRACTID";
    process.env.STELLAR_PULSE_DISABLE_REFLECTOR = "1";
    resetReflectorReader();
    await expect(fetchReflectorPrices()).rejects.toBeInstanceOf(
      ReflectorNotConfiguredError,
    );
  });
});

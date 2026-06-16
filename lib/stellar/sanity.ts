export interface PriceBand {
  symbol: string;
  min: number;
  max: number;
  reason: string;
}

export const PRICE_BANDS: Record<string, PriceBand> = {
  "XLM/USD": {
    symbol: "XLM/USD",
    min: 0.01,
    max: 10.0,
    reason: "XLM has historically traded within $0.01–$10 since 2014",
  },
  "USDC/USD": {
    symbol: "USDC/USD",
    min: 0.95,
    max: 1.05,
    reason: "USDC peg should hold within 5% of $1",
  },
  "EURC/USD": {
    symbol: "EURC/USD",
    min: 0.85,
    max: 1.2,
    reason: "EUR/USD historically trades 0.85–1.20, so EURC tracks the same range",
  },
};

export function assertPriceBand(symbol: string, value: number): void {
  const band = PRICE_BANDS[symbol];
  if (!band) {
    const msg = `[sanity] unknown symbol: ${symbol}`;
    console.warn(msg);
    throw new Error(msg);
  }
  if (!Number.isFinite(value)) {
    const msg = `[sanity] ${symbol} value is not a finite number: ${String(value)}`;
    console.warn(msg);
    throw new Error(msg);
  }
  if (value < band.min || value > band.max) {
    const msg = `[sanity] ${symbol} value ${value} outside band [${band.min}, ${band.max}] — ${band.reason}`;
    console.warn(msg);
    throw new Error(msg);
  }
}

export function isWithinBand(symbol: string, value: number): boolean {
  try {
    assertPriceBand(symbol, value);
    return true;
  } catch {
    return false;
  }
}

export function listPriceBands(): PriceBand[] {
  return Object.values(PRICE_BANDS);
}

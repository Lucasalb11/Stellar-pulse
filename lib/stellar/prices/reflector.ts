import type { RawPriceQuote } from "./coingecko";

export interface ReflectorReader {
  readPrice(contractId: string): Promise<number>;
}

/**
 * Thrown when Reflector is intentionally turned off via env (e.g. tests,
 * incident-response circuit-breaker). The price fallback chain treats this as
 * a graceful skip rather than a real outage.
 */
export class ReflectorNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReflectorNotConfiguredError";
  }
}

const disabledReader: ReflectorReader = {
  async readPrice(_contractId: string): Promise<number> {
    throw new ReflectorNotConfiguredError(
      "[reflector] disabled via STELLAR_PULSE_DISABLE_REFLECTOR=1",
    );
  },
};

let activeReader: ReflectorReader | null = null;
let explicitlySet = false;

function defaultReader(): ReflectorReader {
  if (process.env.STELLAR_PULSE_DISABLE_REFLECTOR === "1") {
    return disabledReader;
  }
  // Lazy import so test runners that mock the SDK don't pay the cost of
  // pulling in `@stellar/stellar-sdk` (~5MB of XDR codecs) at module init.
  // We still construct on first call, which keeps the layered chain warm.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createReflectorSdkReader } = require("./reflector-sdk") as typeof import("./reflector-sdk");
  return createReflectorSdkReader();
}

function getActiveReader(): ReflectorReader {
  if (explicitlySet && activeReader) return activeReader;
  if (!activeReader) activeReader = defaultReader();
  return activeReader;
}

export function setReflectorReader(reader: ReflectorReader): void {
  activeReader = reader;
  explicitlySet = true;
}

export function resetReflectorReader(): void {
  activeReader = null;
  explicitlySet = false;
}

export async function fetchReflectorPrices(): Promise<RawPriceQuote> {
  const xlmContract = process.env.REFLECTOR_XLM_USD_CONTRACT ?? "";
  const usdcContract = process.env.REFLECTOR_USDC_USD_CONTRACT ?? "";
  if (!xlmContract || !usdcContract) {
    throw new Error(
      "[reflector] REFLECTOR_XLM_USD_CONTRACT / REFLECTOR_USDC_USD_CONTRACT not configured",
    );
  }
  const reader = getActiveReader();
  const [xlmUsd, usdcUsd] = await Promise.all([
    reader.readPrice(xlmContract),
    reader.readPrice(usdcContract),
  ]);
  return { xlmUsd, usdcUsd };
}

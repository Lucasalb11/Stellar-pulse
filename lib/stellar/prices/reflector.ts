import type { RawPriceQuote } from "./coingecko";

export interface ReflectorReader {
  readPrice(contractId: string): Promise<number>;
}

const defaultReader: ReflectorReader = {
  async readPrice(_contractId: string): Promise<number> {
    throw new Error(
      "[reflector] Soroban SDK reader is not wired. Provide a ReflectorReader implementation or wait for the SDK integration.",
    );
  },
};

let activeReader: ReflectorReader = defaultReader;

export function setReflectorReader(reader: ReflectorReader): void {
  activeReader = reader;
}

export function resetReflectorReader(): void {
  activeReader = defaultReader;
}

export async function fetchReflectorPrices(): Promise<RawPriceQuote> {
  const xlmContract = process.env.REFLECTOR_XLM_USD_CONTRACT ?? "";
  const usdcContract = process.env.REFLECTOR_USDC_USD_CONTRACT ?? "";
  if (!xlmContract || !usdcContract) {
    throw new Error(
      "[reflector] REFLECTOR_XLM_USD_CONTRACT / REFLECTOR_USDC_USD_CONTRACT not configured",
    );
  }
  const [xlmUsd, usdcUsd] = await Promise.all([
    activeReader.readPrice(xlmContract),
    activeReader.readPrice(usdcContract),
  ]);
  return { xlmUsd, usdcUsd };
}

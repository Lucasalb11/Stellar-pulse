import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "../cache";
import { assertPriceBand } from "../sanity";
import { fetchCoingeckoPrices, type RawPriceQuote } from "./coingecko";
import { fetchReflectorPrices } from "./reflector";
import { fetchOrderbookPrices } from "./orderbook";
import type { PriceSnapshot } from "../../types";

type LiveSource = Exclude<PriceSnapshot["source"], "cache" | "mock">;

interface AttemptOutcome {
  source: LiveSource;
  quote?: RawPriceQuote;
  reason?: string;
}

function applyBands(quote: RawPriceQuote): void {
  assertPriceBand("XLM/USD", quote.xlmUsd);
  assertPriceBand("USDC/USD", quote.usdcUsd);
}

async function attempt(
  source: LiveSource,
  fn: () => Promise<RawPriceQuote>,
): Promise<AttemptOutcome> {
  try {
    const quote = await fn();
    applyBands(quote);
    return { source, quote };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[prices] ${source} attempt failed: ${reason}`);
    return { source, reason };
  }
}

const MOCK_SNAPSHOT: PriceSnapshot = {
  xlmUsd: 0.12,
  usdcUsd: 1.0,
  asOf: "1970-01-01T00:00:00.000Z",
  source: "mock",
};

export async function fetchLayeredPriceSnapshot(): Promise<PriceSnapshot> {
  const order: [LiveSource, () => Promise<RawPriceQuote>][] = [
    ["coingecko", fetchCoingeckoPrices],
    ["reflector", fetchReflectorPrices],
    ["horizon-orderbook", fetchOrderbookPrices],
  ];

  for (const [source, fn] of order) {
    const outcome = await attempt(source, fn);
    if (outcome.quote) {
      return {
        xlmUsd: outcome.quote.xlmUsd,
        usdcUsd: outcome.quote.usdcUsd,
        asOf: new Date().toISOString(),
        source,
      };
    }
  }
  console.warn("[prices] all sources failed — returning mock snapshot");
  return { ...MOCK_SNAPSHOT, asOf: new Date().toISOString() };
}

export async function getPriceSnapshot(): Promise<PriceSnapshot> {
  "use cache";
  cacheLife("market");
  cacheTag(TAGS.prices);
  return fetchLayeredPriceSnapshot();
}

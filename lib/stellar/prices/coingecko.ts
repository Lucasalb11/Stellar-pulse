import { z } from "zod";
import { COINGECKO_BASE, COINGECKO_DEMO_KEY } from "../env";

const CoingeckoSimple = z.object({
  stellar: z.object({ usd: z.number().positive() }),
  "usd-coin": z.object({ usd: z.number().positive() }),
});

export interface RawPriceQuote {
  xlmUsd: number;
  usdcUsd: number;
}

export async function fetchCoingeckoPrices(): Promise<RawPriceQuote> {
  const url = new URL(`${COINGECKO_BASE}/simple/price`);
  url.searchParams.set("ids", "stellar,usd-coin");
  url.searchParams.set("vs_currencies", "usd");
  const headers: Record<string, string> = { accept: "application/json" };
  if (COINGECKO_DEMO_KEY) headers["x-cg-demo-api-key"] = COINGECKO_DEMO_KEY;
  const res = await fetch(url.toString(), { cache: "no-store", headers });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const parsed = CoingeckoSimple.parse(await res.json());
  return {
    xlmUsd: parsed.stellar.usd,
    usdcUsd: parsed["usd-coin"].usd,
  };
}

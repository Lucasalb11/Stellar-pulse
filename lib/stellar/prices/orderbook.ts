import { z } from "zod";
import { HORIZON_URL } from "../env";
import { lookupAsset } from "../assets";
import type { RawPriceQuote } from "./coingecko";

const NumStr = z.string().refine((s) => Number.isFinite(Number(s)), "not numeric");

const Order = z.object({ price: NumStr, amount: NumStr });
const OrderBookResponse = z.object({
  bids: z.array(Order),
  asks: z.array(Order),
});

const USDC = lookupAsset({
  code: "USDC",
  issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
});

if (!USDC) throw new Error("[orderbook] canonical USDC missing from asset registry");

async function fetchXlmUsdcMid(): Promise<number> {
  const url = new URL(`${HORIZON_URL}/order_book`);
  url.searchParams.set("selling_asset_type", "native");
  url.searchParams.set("buying_asset_type", "credit_alphanum4");
  url.searchParams.set("buying_asset_code", USDC!.code);
  url.searchParams.set("buying_asset_issuer", USDC!.issuer);
  url.searchParams.set("limit", "5");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Horizon orderbook ${res.status}`);
  const parsed = OrderBookResponse.parse(await res.json());
  if (parsed.bids.length === 0 || parsed.asks.length === 0) {
    throw new Error("[orderbook] empty bid/ask side");
  }
  const bestBid = Number(parsed.bids[0].price);
  const bestAsk = Number(parsed.asks[0].price);
  if (!Number.isFinite(bestBid) || !Number.isFinite(bestAsk)) {
    throw new Error("[orderbook] non-finite price");
  }
  return (bestBid + bestAsk) / 2;
}

export async function fetchOrderbookPrices(): Promise<RawPriceQuote> {
  const xlmInUsdc = await fetchXlmUsdcMid();
  return {
    xlmUsd: xlmInUsdc,
    usdcUsd: 1.0,
  };
}

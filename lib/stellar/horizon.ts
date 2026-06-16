import { z } from "zod";
import { HORIZON_URL } from "./env";
import { lookupAsset, listCanonicalAssets } from "./assets";
import type { StablecoinSupply } from "../types";

const NumericString = z.string().refine((s) => Number.isFinite(Number(s)), "not numeric");

const HorizonBalances = z
  .object({
    authorized: NumericString.optional(),
    authorized_to_maintain_liabilities: NumericString.optional(),
    unauthorized: NumericString.optional(),
  })
  .partial()
  .optional();

const HorizonAccounts = z
  .object({
    authorized: z.number().int().nonnegative().optional(),
    authorized_to_maintain_liabilities: z.number().int().nonnegative().optional(),
    unauthorized: z.number().int().nonnegative().optional(),
  })
  .partial()
  .optional();

export const HorizonAsset = z.object({
  asset_type: z.string().max(40),
  asset_code: z.string().max(12),
  asset_issuer: z.string().max(80),
  amount: NumericString.optional(),
  balances: HorizonBalances,
  accounts: HorizonAccounts,
  liquidity_pools_amount: NumericString.optional(),
  contracts_amount: NumericString.optional(),
  claimable_balances_amount: NumericString.optional(),
  num_accounts: z.number().int().nonnegative().optional(),
  num_claimable_balances: z.number().int().nonnegative().optional(),
});

export const HorizonAssetsResponse = z.object({
  _embedded: z.object({
    records: z.array(HorizonAsset).max(200),
  }),
});

export const HorizonPayment = z.object({
  id: z.string().max(80),
  paging_token: z.string().max(80),
  type: z.string().max(40),
  created_at: z.string(),
  from: z.string().max(80).optional(),
  to: z.string().max(80).optional(),
  asset_type: z.string().max(40).optional(),
  asset_code: z.string().max(12).optional(),
  asset_issuer: z.string().max(80).optional(),
  amount: NumericString.optional(),
});

export const HorizonPaymentsResponse = z.object({
  _links: z.object({ next: z.object({ href: z.string() }).optional() }).optional(),
  _embedded: z.object({
    records: z.array(HorizonPayment).max(500),
  }),
});

export type NormalizedPayment = z.infer<typeof HorizonPayment>;

export async function fetchAssetSupply(code: string, issuer: string): Promise<{ amount: number; numAccounts: number } | null> {
  const url = new URL(`${HORIZON_URL}/assets`);
  url.searchParams.set("asset_code", code);
  url.searchParams.set("asset_issuer", issuer);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Horizon /assets ${res.status}`);
  const parsed = HorizonAssetsResponse.parse(await res.json());
  const rec = parsed._embedded.records.find(
    (r) => r.asset_code === code && r.asset_issuer === issuer,
  );
  if (!rec) return null;
  const toNum = (s: string | undefined) =>
    s !== undefined && Number.isFinite(Number(s)) ? Number(s) : 0;
  const total =
    toNum(rec.amount) > 0
      ? toNum(rec.amount)
      : toNum(rec.balances?.authorized) +
        toNum(rec.liquidity_pools_amount) +
        toNum(rec.contracts_amount) +
        toNum(rec.claimable_balances_amount);
  const numAccounts =
    rec.num_accounts ??
    rec.accounts?.authorized ??
    0;
  return { amount: total, numAccounts };
}

export async function fetchStablecoinSupplies(): Promise<StablecoinSupply[]> {
  const stablecoinSymbols = new Set(["USDC", "EURC", "USDT"]);
  const candidates = listCanonicalAssets().filter(
    (a) => a.kind === "classic" && stablecoinSymbols.has(a.code),
  );

  const results = await Promise.all(
    candidates.map(async (asset) => {
      const supply = await fetchAssetSupply(asset.code, asset.issuer);
      if (!supply) return null;
      const canonical = lookupAsset({ code: asset.code, issuer: asset.issuer });
      if (!canonical) return null;
      const entry: StablecoinSupply = {
        symbol: canonical.symbol,
        issuer: canonical.issuer,
        kind: "classic",
        supply: supply.amount,
        change24h: 0,
        verified: true,
      };
      return entry;
    }),
  );

  return results.filter((r): r is StablecoinSupply => r !== null);
}

export interface PaymentsWindow {
  window: "24h" | "7d";
}

function windowToMs(w: PaymentsWindow["window"]): number {
  return w === "24h" ? 24 * 3_600_000 : 7 * 24 * 3_600_000;
}

const MAX_PAGES = 20;
const PAGE_SIZE = 200;

export async function fetchRawPayments(opts: PaymentsWindow): Promise<NormalizedPayment[]> {
  const cutoffMs = Date.now() - windowToMs(opts.window);
  const all: NormalizedPayment[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${HORIZON_URL}/payments`);
    url.searchParams.set("order", "desc");
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Horizon /payments ${res.status}`);
    const parsed = HorizonPaymentsResponse.parse(await res.json());
    const records = parsed._embedded.records;
    if (records.length === 0) break;

    let reachedCutoff = false;
    for (const rec of records) {
      const ts = Date.parse(rec.created_at);
      if (Number.isFinite(ts) && ts < cutoffMs) {
        reachedCutoff = true;
        break;
      }
      all.push(rec);
    }
    if (reachedCutoff) break;
    cursor = records[records.length - 1].paging_token;
  }

  return all;
}

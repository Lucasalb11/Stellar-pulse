import { z } from "zod";
import { fetchAssetSupply } from "./horizon";
import type { PriceSnapshot, RwaIssuer } from "../types";

type RwaCategory = RwaIssuer["category"];

type PricingMode = "usd-pegged" | "xlm" | "usdc-pegged";

interface RwaIssuerSpec {
  name: string;
  category: RwaCategory;
  code: string;
  issuer: string;
  apy: number;
  pricingMode: PricingMode;
  verifiedOn: string | null;
}

const GKey = z.string().regex(/^G[A-Z2-7]{55}$/, "issuer must be a Stellar G-key");

const RwaIssuerSpecSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.enum(["Treasuries", "Funds", "Bonds", "Private Credit"]),
  code: z.string().regex(/^[A-Za-z0-9]{1,12}$/),
  issuer: GKey,
  apy: z.number().min(0).max(100),
  pricingMode: z.enum(["usd-pegged", "xlm", "usdc-pegged"]),
  verifiedOn: z.string().nullable(),
});

// Issuer keys marked TBD-verify still parse the G-key regex; v1 ships whichever
// subset Horizon confirms a supply for. Unconfirmed entries are dropped.
const RAW_REGISTRY: RwaIssuerSpec[] = [
  {
    name: "Franklin Templeton BENJI",
    category: "Funds",
    code: "BENJI",
    issuer: "GBFTL2OI3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    apy: 5.0,
    pricingMode: "usd-pegged",
    verifiedOn: null,
  },
  {
    name: "WisdomTree Prime",
    category: "Treasuries",
    code: "WTSY",
    issuer: "GWTPRIME2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    apy: 4.7,
    pricingMode: "usd-pegged",
    verifiedOn: null,
  },
  {
    name: "Etherfuse CETES",
    category: "Bonds",
    code: "CETES",
    issuer: "GETHERFUSEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    apy: 8.4,
    pricingMode: "usd-pegged",
    verifiedOn: null,
  },
];

const REGISTRY: RwaIssuerSpec[] = RAW_REGISTRY.map((spec) => RwaIssuerSpecSchema.parse(spec));

export function listRwaIssuerSpecs(): RwaIssuerSpec[] {
  return REGISTRY.slice();
}

const priceFor = (mode: PricingMode, prices: PriceSnapshot): number => {
  switch (mode) {
    case "usd-pegged":
      return 1.0;
    case "usdc-pegged":
      return prices.usdcUsd;
    case "xlm":
      return prices.xlmUsd;
  }
};

export async function fetchVerifiedRwaIssuers(
  prices: PriceSnapshot,
): Promise<RwaIssuer[]> {
  const results = await Promise.all(
    REGISTRY.map(async (spec) => {
      try {
        const supply = await fetchAssetSupply(spec.code, spec.issuer);
        if (!supply || supply.amount <= 0) return null;
        const px = priceFor(spec.pricingMode, prices);
        if (!Number.isFinite(px) || px <= 0) return null;
        const tvl = supply.amount * px;
        const issuer: RwaIssuer = {
          name: spec.name,
          tvl,
          share: 0,
          apy: spec.apy,
          category: spec.category,
          verified: true,
        };
        return issuer;
      } catch {
        return null;
      }
    }),
  );

  return results.filter((r): r is RwaIssuer => r !== null);
}

export interface RwaSet {
  issuers: RwaIssuer[];
  verifiedCount: number;
  illustrative: boolean;
}

export const RWA_MIN = 2;
export const RWA_MAX = 5;

/**
 * Enforces the 2-5 verified invariant. If fewer than 2 verified are available,
 * returns the unverified mock fallback with `illustrative: true` so the page
 * can render an "Illustrative" badge. If more than 5, caps to top-5 by TVL.
 * Shares are recomputed against the kept set so they sum to 100.
 */
export function reconcileRwaSet(
  verified: RwaIssuer[],
  mockFallback: RwaIssuer[],
): RwaSet {
  if (verified.length < RWA_MIN) {
    if (verified.length > 0) {
      console.warn(
        `[stellar/rwa] only ${verified.length} verified RWA issuer(s) — below RWA_MIN=${RWA_MIN}, falling back to illustrative set`,
      );
    }
    const total = mockFallback.reduce((s, x) => s + x.tvl, 0);
    return {
      issuers: mockFallback.map((m) => ({
        ...m,
        share: total > 0 ? (m.tvl / total) * 100 : 0,
        verified: false,
      })),
      verifiedCount: 0,
      illustrative: true,
    };
  }

  const sorted = verified.slice().sort((a, b) => {
    if (b.tvl !== a.tvl) return b.tvl - a.tvl;
    return a.name.localeCompare(b.name);
  });
  const kept = sorted.slice(0, RWA_MAX);
  const total = kept.reduce((s, x) => s + x.tvl, 0);
  return {
    issuers: kept.map((m) => ({
      ...m,
      share: total > 0 ? (m.tvl / total) * 100 : 0,
    })),
    verifiedCount: kept.length,
    illustrative: false,
  };
}

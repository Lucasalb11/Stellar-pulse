import { z } from "zod";

export type AssetKind = "native" | "classic" | "sac";

export interface CanonicalAsset {
  symbol: string;
  name: string;
  kind: AssetKind;
  code: string;
  issuer: string;
  verified: true;
}

const ClassicIssuer = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, "issuer must be a Stellar classic G-key (56 chars, base32)");

const ContractIssuer = z
  .string()
  .regex(/^C[A-Z2-7]{55}$/, "SAC issuer must be a Soroban contract C-key (56 chars, base32)");

const AssetCode = z
  .string()
  .regex(/^[A-Za-z0-9]{1,12}$/, "asset code must be 1-12 alphanumeric chars");

const CanonicalAssetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("native"),
    symbol: z.literal("XLM"),
    name: z.string(),
    code: z.literal("XLM"),
    issuer: z.literal("native"),
    verified: z.literal(true),
  }),
  z.object({
    kind: z.literal("classic"),
    symbol: z.string(),
    name: z.string(),
    code: AssetCode,
    issuer: ClassicIssuer,
    verified: z.literal(true),
  }),
  z.object({
    kind: z.literal("sac"),
    symbol: z.string(),
    name: z.string(),
    code: AssetCode,
    issuer: ContractIssuer,
    verified: z.literal(true),
  }),
]);

const RAW_REGISTRY: CanonicalAsset[] = [
  {
    symbol: "XLM",
    name: "Stellar Lumens",
    kind: "native",
    code: "XLM",
    issuer: "native",
    verified: true,
  },
  {
    symbol: "USDC",
    name: "USD Coin (Circle)",
    kind: "classic",
    code: "USDC",
    issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    verified: true,
  },
  {
    symbol: "EURC",
    name: "Euro Coin (Circle)",
    kind: "classic",
    code: "EURC",
    issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2",
    verified: true,
  },
  {
    symbol: "USDT (bridged)",
    name: "Tether USD (Allbridge)",
    kind: "classic",
    code: "USDT",
    issuer: "GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V",
    verified: true,
  },
];

function key(code: string, issuer: string): string {
  return `${code}:${issuer}`;
}

const REGISTRY: Map<string, CanonicalAsset> = (() => {
  const m = new Map<string, CanonicalAsset>();
  for (const entry of RAW_REGISTRY) {
    const parsed = CanonicalAssetSchema.parse(entry);
    const k = key(parsed.code, parsed.issuer);
    if (m.has(k)) {
      throw new Error(`asset registry collision for ${k}`);
    }
    m.set(k, parsed as CanonicalAsset);
  }
  return m;
})();

export interface AssetLookupInput {
  code: string;
  issuer: string;
}

export function lookupAsset(input: AssetLookupInput): CanonicalAsset | null {
  if (!input || typeof input.code !== "string" || typeof input.issuer !== "string") {
    throw new Error("lookupAsset requires { code, issuer } strings");
  }
  if (input.code.length === 0) throw new Error("asset code may not be empty");
  if (input.issuer.length === 0) throw new Error("asset issuer may not be empty");
  return REGISTRY.get(key(input.code, input.issuer)) ?? null;
}

export function shortIssuer(issuer: string): string {
  if (issuer === "native") return "native";
  if (issuer.length <= 8) return issuer;
  return `${issuer.slice(0, 4)}…${issuer.slice(-4)}`;
}

export function describeAsset(input: AssetLookupInput): string {
  const hit = lookupAsset(input);
  if (hit) return hit.symbol;
  return `Unknown asset (${input.code}@${shortIssuer(input.issuer)})`;
}

export function listCanonicalAssets(): CanonicalAsset[] {
  return Array.from(REGISTRY.values());
}

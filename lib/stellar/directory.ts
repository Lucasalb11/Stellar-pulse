import { z } from "zod";

export type EntityKind = "exchange" | "bridge" | "protocol" | "issuer" | "treasury";

export interface KnownEntity {
  address: string;
  name: string;
  kind: EntityKind;
  verifiedOn: string;
  verifiedBy: string;
}

const Address = z
  .string()
  .refine(
    (s) => /^G[A-Z2-7]{55}$/.test(s) || /^C[A-Z2-7]{55}$/.test(s),
    "address must be a G-key (classic) or C-key (Soroban)",
  );

const KnownEntitySchema = z.object({
  address: Address,
  name: z.string().min(1).max(60),
  kind: z.enum(["exchange", "bridge", "protocol", "issuer", "treasury"]),
  verifiedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verifiedBy: z.string().min(1),
});

// Seed registry — additions land here after on-chain verification.
// Each entry must point to a real address publicly documented by the entity.
const RAW: KnownEntity[] = [
  {
    address: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    name: "Circle USDC issuer",
    kind: "issuer",
    verifiedOn: "2026-06-15",
    verifiedBy: "circle.com/usdc",
  },
  {
    address: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2",
    name: "Circle EURC issuer",
    kind: "issuer",
    verifiedOn: "2026-06-15",
    verifiedBy: "circle.com/eurc",
  },
  {
    address: "GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V",
    name: "Allbridge USDT",
    kind: "bridge",
    verifiedOn: "2026-06-15",
    verifiedBy: "allbridge.io",
  },
];

const REGISTRY: Map<string, KnownEntity> = (() => {
  const m = new Map<string, KnownEntity>();
  for (const entry of RAW) {
    const parsed = KnownEntitySchema.parse(entry);
    if (m.has(parsed.address)) {
      throw new Error(`directory collision for ${parsed.address}`);
    }
    m.set(parsed.address, parsed);
  }
  return m;
})();

export function lookupEntity(address: string): KnownEntity | null {
  if (typeof address !== "string" || address.length === 0) return null;
  return REGISTRY.get(address) ?? null;
}

export function listKnownEntities(): KnownEntity[] {
  return Array.from(REGISTRY.values());
}

export function truncateAddress(address: string): string {
  if (typeof address !== "string" || address.length < 9) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function labelAddress(address: string): { label: string; known: boolean } {
  const hit = lookupEntity(address);
  if (hit) return { label: hit.name, known: true };
  return { label: truncateAddress(address), known: false };
}

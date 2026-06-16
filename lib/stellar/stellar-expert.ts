import { z } from "zod";
import { STELLAR_EXPERT_API } from "./env";
import type { SorobanContract } from "../types";

const ContractIdSchema = z
  .string()
  .max(80)
  .refine((v) => /^C[A-Z2-7]{55}$/.test(v), "not a Soroban contract id");

export const StellarExpertContract = z
  .object({
    id: ContractIdSchema.optional(),
    contract: ContractIdSchema.optional(),
    created: z.number().int().nonnegative().optional(),
    creator: z.string().max(80).optional(),
    invocations: z.number().int().nonnegative().nullable().optional(),
    subinvocation: z.number().int().nonnegative().nullable().optional(),
    payments: z.number().int().nonnegative().nullable().optional(),
    events: z.number().int().nonnegative().nullable().optional(),
    errors: z.number().int().nonnegative().nullable().optional(),
    storage_entries: z.number().int().nonnegative().optional(),
    wasm: z.string().max(80).optional(),
    name: z.string().max(80).optional(),
    validation: z
      .object({ name: z.string().max(80).optional() })
      .partial()
      .optional(),
  })
  .refine(
    (r) => typeof r.id === "string" || typeof r.contract === "string",
    "contract id missing",
  );

export const StellarExpertContractList = z.object({
  _embedded: z.object({
    records: z.array(StellarExpertContract).max(500),
  }),
});

export const StellarExpertContractStats = z.object({
  total_contracts: z.number().int().nonnegative().lte(1e9).optional(),
  active_contracts_24h: z.number().int().nonnegative().lte(1e9).optional(),
  invocations_24h: z.number().int().nonnegative().lte(1e12).optional(),
  storage_entries: z.number().int().nonnegative().lte(1e12).optional(),
});

export interface SorobanGlobalStats {
  totalContracts: number;
  activeContracts24h: number;
  invocations24h: number;
}

const NAME_HINTS: Record<string, string> = {
  soroswap: "Soroswap",
  blend: "Blend",
  aquarius: "Aquarius",
  phoenix: "Phoenix",
  usdc: "USDC SAC",
  xlm: "Native SAC",
};

const inferType = (name: string | undefined): string => {
  const lower = (name ?? "").toLowerCase();
  if (lower.includes("router")) return "AMM Router";
  if (lower.includes("pool") && lower.includes("factory")) return "Pool Factory";
  if (lower.includes("factory")) return "Factory";
  if (lower.includes("pool")) return "Lending Pool";
  if (lower.includes("sac") || lower.includes("asset")) return "Stellar Asset Contract";
  if (lower.includes("amm")) return "AMM Pool";
  if (lower.includes("oracle")) return "Oracle";
  if (lower.includes("wrap")) return "Asset Wrapper";
  return "Contract";
};

const contractId = (raw: z.infer<typeof StellarExpertContract>): string =>
  (raw.id ?? raw.contract) as string;

const inferName = (raw: z.infer<typeof StellarExpertContract>): string => {
  const direct = raw.validation?.name ?? raw.name;
  if (direct) return direct;
  const lower = (raw.wasm ?? "").toLowerCase();
  for (const key of Object.keys(NAME_HINTS)) {
    if (lower.includes(key)) return NAME_HINTS[key];
  }
  const id = contractId(raw);
  return `Contract ${id.slice(0, 4)}…${id.slice(-4)}`;
};

const activityScore = (raw: z.infer<typeof StellarExpertContract>): number => {
  const inv = raw.invocations ?? 0;
  if (inv > 0) return inv;
  return (raw.subinvocation ?? 0) + (raw.events ?? 0) + (raw.payments ?? 0);
};

export async function fetchTopContracts(limit = 6): Promise<SorobanContract[]> {
  const url = new URL(`${STELLAR_EXPERT_API}/contract`);
  url.searchParams.set("sort", "invocations");
  url.searchParams.set("order", "desc");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 200)));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`stellar.expert /contract ${res.status}`);
  const parsed = StellarExpertContractList.parse(await res.json());

  return parsed._embedded.records
    .map((r) => ({ raw: r, score: activityScore(r) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ raw, score }): SorobanContract => {
      const name = inferName(raw);
      return {
        id: contractId(raw),
        name,
        calls: score,
        type: inferType(name),
        verified: true,
      };
    });
}

export async function fetchSorobanGlobalStats(): Promise<SorobanGlobalStats> {
  const url = new URL(`${STELLAR_EXPERT_API}/contract-stats`);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`stellar.expert /contract-stats ${res.status}`);
  const parsed = StellarExpertContractStats.parse(await res.json());
  return {
    totalContracts: parsed.total_contracts ?? 0,
    activeContracts24h: parsed.active_contracts_24h ?? 0,
    invocations24h: parsed.invocations_24h ?? 0,
  };
}

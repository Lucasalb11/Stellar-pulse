import { z } from "zod";
import { SOROBAN_RPC_URL } from "./env";

export const JsonRpcError = z.object({
  code: z.number().int(),
  message: z.string().max(500),
});

export const SorobanNetworkResult = z.object({
  passphrase: z.string().max(120),
  protocolVersion: z.number().int().positive().lte(1000),
  friendbotUrl: z.string().max(500).optional(),
});

export const SorobanLatestLedger = z.object({
  id: z.string().max(80),
  protocolVersion: z.number().int().positive().lte(1000),
  sequence: z.number().int().nonnegative(),
});

async function callRpc<T>(
  method: string,
  params: Record<string, unknown> | undefined,
  resultSchema: z.ZodType<T>,
): Promise<T> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method,
    ...(params ? { params } : {}),
  });
  const res = await fetch(SOROBAN_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Soroban RPC ${method} ${res.status}`);
  const envelope = z
    .object({
      jsonrpc: z.literal("2.0"),
      id: z.union([z.string(), z.number()]).optional(),
      result: resultSchema.optional(),
      error: JsonRpcError.optional(),
    })
    .parse(await res.json());
  if (envelope.error) {
    throw new Error(`Soroban RPC ${method}: ${envelope.error.message}`);
  }
  if (envelope.result === undefined) {
    throw new Error(`Soroban RPC ${method}: empty result`);
  }
  return envelope.result;
}

export async function fetchSorobanNetwork(): Promise<z.infer<typeof SorobanNetworkResult>> {
  return callRpc("getNetwork", undefined, SorobanNetworkResult);
}

export async function fetchSorobanLatestLedger(): Promise<z.infer<typeof SorobanLatestLedger>> {
  return callRpc("getLatestLedger", undefined, SorobanLatestLedger);
}

export interface SorobanRpcHealth {
  passphrase: string;
  ledger: number;
  protocolVersion: number;
}

export async function fetchSorobanRpcHealth(): Promise<SorobanRpcHealth> {
  const [net, latest] = await Promise.all([
    fetchSorobanNetwork(),
    fetchSorobanLatestLedger(),
  ]);
  return {
    passphrase: net.passphrase,
    ledger: latest.sequence,
    protocolVersion: latest.protocolVersion,
  };
}

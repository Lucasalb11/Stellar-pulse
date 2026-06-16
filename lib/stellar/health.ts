import {
  fetchProtocols,
  fetchStellarChainTvl,
} from "./defillama";
import { fetchYieldPools } from "./defillama-yields";
import { fetchLayeredPriceSnapshot } from "./prices";
import { fetchStablecoinSupplies } from "./horizon";
import { fetchTopContracts } from "./stellar-expert";
import { fetchSorobanLatestLedger } from "./soroban";
import { usedFallback, withFallback } from "./fallback";

export interface SourceStatus {
  name: string;
  fresh: boolean;
  verified: boolean;
  lastFetchedAt: string;
  error?: string;
}

interface SourceProbe {
  name: string;
  run: () => Promise<{ ok: boolean; error?: string }>;
}

const probes: SourceProbe[] = [
  {
    name: "defillama-chain-tvl",
    run: async () => {
      const result = await withFallback(fetchStellarChainTvl, [], "health:chain-tvl");
      if (usedFallback(result)) {
        return { ok: false, error: (result as { _error?: string })._error };
      }
      return { ok: result.length > 0 };
    },
  },
  {
    name: "defillama-protocols",
    run: async () => {
      const result = await withFallback(fetchProtocols, [], "health:protocols");
      if (usedFallback(result)) {
        return { ok: false, error: (result as { _error?: string })._error };
      }
      return { ok: result.length > 0 };
    },
  },
  {
    name: "defillama-yields",
    run: async () => {
      const result = await withFallback(fetchYieldPools, [], "health:yields");
      if (usedFallback(result)) {
        return { ok: false, error: (result as { _error?: string })._error };
      }
      return { ok: result.length > 0 };
    },
  },
  {
    name: "prices-layered",
    run: async () => {
      const snap = await fetchLayeredPriceSnapshot();
      if (snap.source === "mock") return { ok: false, error: "all price sources failed → mock" };
      return { ok: true };
    },
  },
  {
    name: "horizon-stablecoins",
    run: async () => {
      const result = await withFallback(fetchStablecoinSupplies, [], "health:stablecoins");
      if (usedFallback(result)) {
        return { ok: false, error: (result as { _error?: string })._error };
      }
      return { ok: result.length > 0 };
    },
  },
  {
    name: "stellar-expert-contracts",
    run: async () => {
      const result = await withFallback(() => fetchTopContracts(3), [], "health:contracts");
      if (usedFallback(result)) {
        return { ok: false, error: (result as { _error?: string })._error };
      }
      return { ok: result.length > 0 };
    },
  },
  {
    name: "soroban-rpc",
    run: async () => {
      try {
        const latest = await fetchSorobanLatestLedger();
        return { ok: latest.sequence > 0 };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  },
];

export async function probeAllSources(): Promise<SourceStatus[]> {
  const at = new Date().toISOString();
  const results = await Promise.all(
    probes.map(async (probe) => {
      try {
        const { ok, error } = await probe.run();
        return {
          name: probe.name,
          fresh: ok,
          verified: ok,
          lastFetchedAt: at,
          ...(error ? { error } : {}),
        };
      } catch (err) {
        return {
          name: probe.name,
          fresh: false,
          verified: false,
          lastFetchedAt: at,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );
  return results;
}

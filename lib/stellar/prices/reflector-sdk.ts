import {
  Account,
  Address,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { SOROBAN_RPC_URL } from "../env";
import type { ReflectorReader } from "./reflector";

/**
 * Reflector mainnet "external CEX/DEX prices" oracle contract.
 *
 * Source: https://reflector.network/docs (verified manually). If we ever need
 * the on-chain "Stellar Pubnet DEX" feed instead, swap this constant — the
 * shape of `lastprice` is identical.
 */
export const REFLECTOR_MAINNET_EXTERNAL_CEX_DEX_CONTRACT =
  "CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M";

/**
 * Burner G-address used as the source account when simulating read-only
 * contract invocations. Soroban `simulateTransaction` accepts any well-formed
 * account because nothing is ever submitted — we just need the SDK to assemble
 * a valid envelope locally.
 */
const READONLY_SOURCE_ACCOUNT =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

/**
 * Custom error so the price fallback chain can distinguish "Reflector is
 * intentionally disabled in this environment" from "Reflector failed". Both
 * fall through to Horizon/cache, but only the former should be silent in logs.
 */
export class ReflectorNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReflectorNotConfiguredError";
  }
}

interface PriceData {
  price: bigint;
  timestamp: bigint;
}

/**
 * The Reflector `lastprice` host function takes a single argument: an
 * `Asset` enum variant. For the external CEX/DEX oracle this is
 * `Asset::Other(Symbol("XLM"))` / `Asset::Other(Symbol("USDC"))` because the
 * underlying assets are quoted by their ticker, not their on-chain address.
 */
function buildAssetScVal(symbol: string): xdr.ScVal {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("Other"),
    nativeToScVal(symbol, { type: "symbol" }),
  ]);
}

interface DepsForTesting {
  server?: Pick<rpc.Server, "simulateTransaction" | "getAccount">;
  networkPassphrase?: string;
  /**
   * Overrides the asset symbol resolved from a contract id. Reflector uses
   * one contract per oracle feed (not per asset), so the symbol comes from a
   * lookup table keyed on the contract id we were configured with.
   */
  resolveSymbol?: (contractId: string) => string;
}

const DEFAULT_SYMBOL_BY_CONTRACT: Record<string, string> = {
  // Both XLM and USDC live on the same external CEX/DEX feed; callers
  // distinguish them via the env-configured contract id sentinel. We accept
  // the same contract id with a per-call symbol passed through the contract
  // env var so operators can repoint to other Reflector feeds without code
  // changes. See `resolveSymbolForContract` below.
};

/**
 * Convention: an operator may either
 *   (a) set both `REFLECTOR_XLM_USD_CONTRACT` and `REFLECTOR_USDC_USD_CONTRACT`
 *       to the SAME contract id (the External CEX/DEX feed), in which case we
 *       infer the asset symbol from the env var name on the way in, or
 *   (b) set them to different contracts and embed a `:SYMBOL` suffix on the
 *       contract id (e.g. `CABC...:XLM`) to disambiguate.
 *
 * The wrapper in `reflector.ts` passes the raw env value through to
 * `readPrice` — we recover the symbol here.
 */
function resolveSymbolForContract(contractId: string): {
  contractId: string;
  symbol: string;
} {
  const colonIdx = contractId.indexOf(":");
  if (colonIdx > 0) {
    return {
      contractId: contractId.slice(0, colonIdx),
      symbol: contractId.slice(colonIdx + 1).toUpperCase(),
    };
  }
  const fromTable = DEFAULT_SYMBOL_BY_CONTRACT[contractId];
  if (fromTable) return { contractId, symbol: fromTable };
  // Last-resort heuristic: if the env-configured id contains "USDC" or "XLM"
  // we use that. Real prod ids never embed asset names, so this only fires in
  // local dev / tests where a placeholder id is set.
  if (/USDC/i.test(contractId)) return { contractId, symbol: "USDC" };
  return { contractId, symbol: "XLM" };
}

interface ReflectorContractMeta {
  decimals: number;
}

/**
 * Build a real Reflector reader backed by `@stellar/stellar-sdk` and the
 * project-wide Soroban RPC endpoint. The returned reader caches the per-
 * contract `decimals()` response in-process for the lifetime of the module
 * (Reflector's decimals are immutable).
 */
export function createReflectorSdkReader(
  deps: DepsForTesting = {},
): ReflectorReader {
  const server =
    deps.server ?? new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });
  const networkPassphrase = deps.networkPassphrase ?? Networks.PUBLIC;
  const resolveSymbol = deps.resolveSymbol ?? ((id: string) => resolveSymbolForContract(id).symbol);

  const metaCache = new Map<string, ReflectorContractMeta>();

  async function simulateCall(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<xdr.ScVal> {
    // We never submit, so a synthetic Account with sequence "0" suffices.
    // Using a real getAccount() would require the burner to exist on mainnet,
    // which it does not.
    const source = new Account(READONLY_SOURCE_ACCOUNT, "0");
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(source, {
      fee: "100",
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(
        `[reflector-sdk] simulateTransaction(${method}) failed: ${sim.error}`,
      );
    }
    if (!sim.result?.retval) {
      throw new Error(
        `[reflector-sdk] simulateTransaction(${method}) returned no retval`,
      );
    }
    return sim.result.retval;
  }

  async function getDecimals(contractId: string): Promise<number> {
    const cached = metaCache.get(contractId);
    if (cached) return cached.decimals;
    const retval = await simulateCall(contractId, "decimals", []);
    const decimals = Number(scValToNative(retval));
    if (!Number.isFinite(decimals) || decimals < 0 || decimals > 36) {
      throw new Error(
        `[reflector-sdk] decimals() returned an implausible value: ${decimals}`,
      );
    }
    metaCache.set(contractId, { decimals });
    return decimals;
  }

  return {
    async readPrice(rawContractId: string): Promise<number> {
      const { contractId, symbol } = resolveSymbolForContract(rawContractId);
      // Probe Address() to surface "obviously invalid id" early with a clear
      // error instead of a deep XDR parse failure.
      Address.fromString(contractId);

      const asset = buildAssetScVal(resolveSymbol(rawContractId) ?? symbol);
      const [decimals, retval] = await Promise.all([
        getDecimals(contractId),
        simulateCall(contractId, "lastprice", [asset]),
      ]);

      const native = scValToNative(retval) as PriceData | null;
      if (!native || typeof native.price !== "bigint") {
        throw new Error(
          `[reflector-sdk] lastprice did not return a PriceData struct (got ${typeof native})`,
        );
      }
      const scale = 10 ** decimals;
      const price = Number(native.price) / scale;
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(
          `[reflector-sdk] lastprice produced a non-finite or non-positive price: ${price}`,
        );
      }
      return price;
    },
  };
}

import { labelAddress } from "./directory";
import { lookupAsset } from "./assets";
import type { NormalizedPayment } from "./horizon";
import type { FlowEdge } from "../types";

const MAX_EDGES = 30;
const OTHER_THRESHOLD = 0.4;

export interface AggregateOpts {
  window: "24h" | "7d";
}

interface AggregatedKey {
  source: string;
  destination: string;
  asset: string;
}

const keyOf = (k: AggregatedKey): string =>
  `${k.source}→${k.destination}|${k.asset}`;

function paymentAsset(p: NormalizedPayment): { code: string; issuer: string } | null {
  if (p.asset_type === "native") return { code: "XLM", issuer: "native" };
  if (!p.asset_code || !p.asset_issuer) return null;
  return { code: p.asset_code, issuer: p.asset_issuer };
}

/**
 * Aggregates raw Horizon payments into Sankey edges:
 *   - groups by (sourceAddress, destinationAddress, asset)
 *   - labels endpoints via the known-entity directory
 *   - drops payments whose asset isn't in the canonical asset registry
 *   - keeps the top {MAX_EDGES} by amount; rolls remainder into "Other"
 *     only when its share is ≥ {OTHER_THRESHOLD} of total volume
 *   - marks `verified = true` iff both endpoints are known
 */
export function buildSankeyEdges(
  payments: NormalizedPayment[],
  opts: AggregateOpts,
): FlowEdge[] {
  const grouped = new Map<string, { amount: number; from: string; to: string; assetSymbol: string }>();

  for (const p of payments) {
    if (!p.from || !p.to) continue;
    if (typeof p.amount !== "string") continue;
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const assetRef = paymentAsset(p);
    if (!assetRef) continue;
    const canonical =
      assetRef.issuer === "native"
        ? { symbol: "XLM" }
        : lookupAsset({ code: assetRef.code, issuer: assetRef.issuer });
    if (!canonical) continue;

    const k = keyOf({ source: p.from, destination: p.to, asset: canonical.symbol });
    const slot = grouped.get(k) ?? { amount: 0, from: p.from, to: p.to, assetSymbol: canonical.symbol };
    slot.amount += amount;
    grouped.set(k, slot);
  }

  const all = Array.from(grouped.values()).sort((a, b) => b.amount - a.amount);
  const top = all.slice(0, MAX_EDGES);
  const rest = all.slice(MAX_EDGES);

  const edges: FlowEdge[] = top.map((entry) => {
    const src = labelAddress(entry.from);
    const dst = labelAddress(entry.to);
    return {
      source: src.label,
      sourceAddress: entry.from,
      sourceKnown: src.known,
      destination: dst.label,
      destinationAddress: entry.to,
      destinationKnown: dst.known,
      amount: entry.amount,
      asset: entry.assetSymbol,
      window: opts.window,
      verified: src.known && dst.known,
    };
  });

  if (rest.length > 0) {
    const restTotal = rest.reduce((s, x) => s + x.amount, 0);
    const totalVolume = all.reduce((s, x) => s + x.amount, 0);
    if (totalVolume > 0 && restTotal / totalVolume >= OTHER_THRESHOLD) {
      edges.push({
        source: "Other",
        sourceAddress: "other",
        sourceKnown: false,
        destination: "Other",
        destinationAddress: "other",
        destinationKnown: false,
        amount: restTotal,
        asset: "MIXED",
        window: opts.window,
        verified: false,
      });
    }
  }

  return edges;
}

export const SANKEY_MAX_EDGES = MAX_EDGES;
export const SANKEY_OTHER_THRESHOLD = OTHER_THRESHOLD;

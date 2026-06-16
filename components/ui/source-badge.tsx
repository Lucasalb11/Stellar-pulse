import * as React from "react";
import { Badge } from "./badge";
import type { DataSource } from "@/lib/types";

const SOURCE_LABEL: Record<DataSource, string> = {
  defillama: "DefiLlama",
  "defillama-yields": "DefiLlama Yields",
  horizon: "Horizon",
  "stellar-expert": "stellar.expert",
  coingecko: "CoinGecko",
  reflector: "Reflector",
  "horizon-orderbook": "Horizon orderbook",
  "derived-soroban": "Soroban RPC",
  cache: "Cache",
  mock: "Illustrative",
};

export interface SourceBadgeProps {
  source: DataSource;
  verified: boolean;
  asOf?: string;
  compact?: boolean;
  className?: string;
}

export function SourceBadge({
  source,
  verified,
  asOf,
  compact = false,
  className,
}: SourceBadgeProps) {
  const label = SOURCE_LABEL[source] ?? source;
  const tone = !verified ? "warning" : source === "mock" ? "warning" : "accent";
  const title =
    `Source: ${label}` +
    `\nVerified: ${verified ? "yes" : "no"}` +
    (asOf ? `\nAs of: ${asOf}` : "");
  return (
    <Badge
      tone={tone}
      title={title}
      data-source={source}
      data-verified={verified}
      className={className}
    >
      {compact ? label.slice(0, 4) : label}
    </Badge>
  );
}

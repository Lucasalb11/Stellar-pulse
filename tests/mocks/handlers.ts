import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://api.llama.fi/v2/historicalChainTvl/Stellar", () =>
    HttpResponse.json([
      { date: 1700000000, tvl: 100_000_000 },
      { date: 1700086400, tvl: 105_000_000 },
      { date: 1700172800, tvl: 110_000_000 },
    ]),
  ),

  http.get("https://api.llama.fi/protocols", () =>
    HttpResponse.json([
      {
        slug: "soroswap",
        name: "Soroswap",
        category: "Dexes",
        chains: ["Stellar"],
        tvl: 50_000_000,
        change_1d: 2.4,
        chainTvls: { Stellar: 50_000_000 },
      },
      {
        slug: "blend",
        name: "Blend",
        category: "Lending",
        chains: ["Stellar"],
        tvl: 30_000_000,
        change_1d: -1.1,
        chainTvls: { Stellar: 30_000_000 },
      },
      {
        slug: "off-chain",
        name: "Other Chain",
        category: "Dexes",
        chains: ["Ethereum"],
        tvl: 1_000_000_000,
      },
    ]),
  ),
];

import { describe, expect, it } from "vitest";
import { buildSankeyEdges, SANKEY_MAX_EDGES, SANKEY_OTHER_THRESHOLD } from "@/lib/stellar/sankey";
import { truncateAddress, listKnownEntities } from "@/lib/stellar/directory";
import type { NormalizedPayment } from "@/lib/stellar/horizon";

const validG = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW";
const otherG = "GXYZBCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTU";

const knownEntities = listKnownEntities();
const knownIssuer = knownEntities[0].address;

const usdc = {
  code: "USDC",
  issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
};

const mkPayment = (overrides: Partial<NormalizedPayment>): NormalizedPayment => ({
  id: "p" + Math.random().toString(36).slice(2),
  paging_token: "tok",
  type: "payment",
  created_at: new Date().toISOString(),
  from: validG,
  to: otherG,
  asset_type: "credit_alphanum4",
  asset_code: usdc.code,
  asset_issuer: usdc.issuer,
  amount: "100.0",
  ...overrides,
});

describe("truncateAddress", () => {
  it("formats G-keys as 4 head + 4 tail", () => {
    const addr = "GBSORANDOMABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKABCD";
    const out = truncateAddress(addr);
    expect(out).toBe("GBSO…ABCD");
  });

  it("formats C-keys preserving the C-prefix", () => {
    const c = "CDQXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX8F2A";
    expect(truncateAddress(c)).toBe("CDQX…8F2A");
  });

  it("returns the original string when too short", () => {
    expect(truncateAddress("abc")).toBe("abc");
  });
});

describe("buildSankeyEdges grouping", () => {
  it("groups by (source, destination, asset) and sums amounts", () => {
    const edges = buildSankeyEdges(
      [
        mkPayment({ amount: "10" }),
        mkPayment({ amount: "25" }),
        mkPayment({ amount: "5" }),
      ],
      { window: "24h" },
    );
    expect(edges).toHaveLength(1);
    expect(edges[0].amount).toBe(40);
    expect(edges[0].asset).toBe("USDC");
    expect(edges[0].window).toBe("24h");
  });

  it("treats native XLM payments using the XLM symbol", () => {
    const edges = buildSankeyEdges(
      [
        mkPayment({
          asset_type: "native",
          asset_code: undefined,
          asset_issuer: undefined,
          amount: "100",
        }),
      ],
      { window: "24h" },
    );
    expect(edges).toHaveLength(1);
    expect(edges[0].asset).toBe("XLM");
  });

  it("drops payments whose asset is not in the canonical registry", () => {
    const edges = buildSankeyEdges(
      [
        mkPayment({
          asset_code: "FAKE",
          asset_issuer: "GUNKNOWNXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          amount: "100",
        }),
      ],
      { window: "24h" },
    );
    expect(edges).toEqual([]);
  });

  it("drops payments with missing from/to addresses", () => {
    const edges = buildSankeyEdges(
      [mkPayment({ from: undefined }), mkPayment({ to: undefined })],
      { window: "24h" },
    );
    expect(edges).toEqual([]);
  });

  it("drops payments whose amount is non-finite or non-positive", () => {
    const edges = buildSankeyEdges(
      [
        mkPayment({ amount: "0" }),
        mkPayment({ amount: "-5" }),
        mkPayment({ amount: "abc" }),
      ],
      { window: "24h" },
    );
    expect(edges).toEqual([]);
  });
});

describe("buildSankeyEdges labeling", () => {
  it("labels known entity addresses by name and unknown by truncate", () => {
    const edges = buildSankeyEdges(
      [mkPayment({ from: knownIssuer, to: otherG })],
      { window: "24h" },
    );
    expect(edges[0].source).toBe(knownEntities[0].name);
    expect(edges[0].sourceKnown).toBe(true);
    expect(edges[0].destination).toBe(`${otherG.slice(0, 4)}…${otherG.slice(-4)}`);
    expect(edges[0].destinationKnown).toBe(false);
  });

  it("verified=true only when both endpoints are known", () => {
    const edges = buildSankeyEdges(
      [
        mkPayment({ from: knownIssuer, to: knownEntities[1].address }),
        mkPayment({ from: knownIssuer, to: otherG, amount: "1" }),
      ],
      { window: "24h" },
    );
    const both = edges.find((e) => e.destinationAddress === knownEntities[1].address);
    const onlyOne = edges.find((e) => e.destinationAddress === otherG);
    expect(both?.verified).toBe(true);
    expect(onlyOne?.verified).toBe(false);
  });
});

describe("top-30 cap + Other rollup", () => {
  const makeUniquePayments = (count: number, amount: number): NormalizedPayment[] =>
    Array.from({ length: count }, (_, i) => {
      const tailIdx = (i + 1).toString(36).toUpperCase().padStart(4, "A");
      const addr = `G${tailIdx}AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
      return mkPayment({ from: addr, to: otherG, amount: String(amount) });
    });

  it("caps at 30 edges; remainder ≥ 40% rolls into Other", () => {
    // 30 high-volume edges + 50 small edges that sum to enough for ≥40%
    const big = makeUniquePayments(30, 100);
    const small = makeUniquePayments(50, 80).map((p, i) => ({
      ...p,
      from: `G${i.toString(36).toUpperCase().padStart(2, "Z")}` + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    }));
    // Total: 30*100 + 50*80 = 3000 + 4000 = 7000. Remainder = 4000/7000 ≈ 57% → Other added
    const edges = buildSankeyEdges([...big, ...small], { window: "24h" });
    expect(edges.length).toBe(SANKEY_MAX_EDGES + 1);
    const other = edges[edges.length - 1];
    expect(other.source).toBe("Other");
    expect(other.amount).toBeCloseTo(4000);
  });

  it("does NOT add Other when remainder is < 40%", () => {
    // 30 edges of 1000 each + 5 edges of 10 each = 30,050 total
    // remainder = 50 / 30050 ≈ 0.17% → no Other
    const big = makeUniquePayments(30, 1000);
    const tail = makeUniquePayments(5, 10).map((p, i) => ({
      ...p,
      from: `G99${i.toString(36).toUpperCase().padStart(2, "Z")}AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
    }));
    const edges = buildSankeyEdges([...big, ...tail], { window: "24h" });
    expect(edges.length).toBe(SANKEY_MAX_EDGES);
    expect(edges.find((e) => e.source === "Other")).toBeUndefined();
  });

  it("returns no Other and < 30 edges when input is small", () => {
    const edges = buildSankeyEdges(makeUniquePayments(5, 100), { window: "24h" });
    expect(edges.length).toBe(5);
    expect(edges.find((e) => e.source === "Other")).toBeUndefined();
  });
});

describe("constants", () => {
  it("MAX_EDGES = 30 and OTHER_THRESHOLD = 0.4 per spec", () => {
    expect(SANKEY_MAX_EDGES).toBe(30);
    expect(SANKEY_OTHER_THRESHOLD).toBe(0.4);
  });
});

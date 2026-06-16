import { describe, expect, it } from "vitest";
import {
  getLinks,
  listProtocolLinks,
  parseProtocolLinks,
  ProtocolLinksSchema,
} from "@/lib/stellar/protocol-links";

const VALID = {
  slug: "soroswap",
  name: "Soroswap",
  homepage: "https://soroswap.finance",
  app: "https://app.soroswap.finance",
  docs: "https://docs.soroswap.finance",
  twitter: "https://twitter.com/SoroswapFinance",
  github: "https://github.com/soroswap",
  audits: [
    {
      firm: "Runtime Verification",
      url: "https://github.com/runtimeverification/publications",
      date: "2024-09-01",
    },
  ],
  verifiedOn: "2026-06-15",
  verifiedBy: "stellar-pm",
};

describe("protocol-link registry", () => {
  it("loader parses the seed file without errors", () => {
    const all = listProtocolLinks();
    expect(all.length).toBeGreaterThanOrEqual(6);
    const slugs = all.map((e) => e.slug);
    for (const expected of [
      "soroswap",
      "blend",
      "aquarius",
      "phoenix",
      "stellarx",
      "lumen-bridge",
    ]) {
      expect(slugs).toContain(expected);
    }
  });

  it("getLinks returns the canonical entry for a known slug", () => {
    const blend = getLinks("blend");
    expect(blend?.name).toBe("Blend");
    expect(blend?.homepage.startsWith("https://")).toBe(true);
  });

  it("getLinks('nope') returns null", () => {
    expect(getLinks("nope")).toBeNull();
  });

  it("getLinks rejects empty/non-string slug", () => {
    expect(getLinks("")).toBeNull();
    expect(getLinks(123 as unknown as string)).toBeNull();
  });

  it("rejects http:// URLs", () => {
    const bad = { ...VALID, homepage: "http://soroswap.finance" };
    expect(() => ProtocolLinksSchema.parse(bad)).toThrow();
  });

  it("rejects javascript: URLs", () => {
    const bad = { ...VALID, homepage: "javascript:alert(1)" };
    expect(() => ProtocolLinksSchema.parse(bad)).toThrow();
  });

  it("rejects data: URLs", () => {
    const bad = { ...VALID, homepage: "data:text/html,<script>alert(1)</script>" };
    expect(() => ProtocolLinksSchema.parse(bad)).toThrow();
  });

  it("rejects URLs with userinfo '@' segment", () => {
    const bad = { ...VALID, homepage: "https://attacker.com@soroswap.finance" };
    expect(() => ProtocolLinksSchema.parse(bad)).toThrow();
  });

  it("rejects slug that isn't kebab-case lowercase", () => {
    expect(() => ProtocolLinksSchema.parse({ ...VALID, slug: "SoroSwap" })).toThrow();
    expect(() => ProtocolLinksSchema.parse({ ...VALID, slug: "soro swap" })).toThrow();
    expect(() => ProtocolLinksSchema.parse({ ...VALID, slug: "soro_swap" })).toThrow();
  });

  it("rejects audit url that isn't https", () => {
    const bad = {
      ...VALID,
      audits: [{ firm: "F", url: "http://x", date: "2024-01-01" }],
    };
    expect(() => ProtocolLinksSchema.parse(bad)).toThrow();
  });

  it("rejects audit date that isn't YYYY-MM-DD", () => {
    const bad = {
      ...VALID,
      audits: [{ firm: "F", url: "https://x.test", date: "2024/01/01" }],
    };
    expect(() => ProtocolLinksSchema.parse(bad)).toThrow();
  });

  it("parseProtocolLinks rejects duplicate slugs", () => {
    const dup = [VALID, { ...VALID }];
    expect(() => parseProtocolLinks(dup)).toThrow(/collision/);
  });

  it("accepts minimal entry (only required fields)", () => {
    const minimal = {
      slug: "minimal",
      name: "Minimal",
      homepage: "https://minimal.test",
      audits: [],
      verifiedOn: "2026-06-15",
      verifiedBy: "tester",
    };
    expect(() => ProtocolLinksSchema.parse(minimal)).not.toThrow();
  });
});

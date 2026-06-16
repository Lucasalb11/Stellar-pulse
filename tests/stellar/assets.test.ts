import { describe, expect, it } from "vitest";
import {
  describeAsset,
  listCanonicalAssets,
  lookupAsset,
  shortIssuer,
} from "@/lib/stellar/assets";

const CIRCLE_USDC = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const CIRCLE_EURC = "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2";
const SPOOF_ISSUER = "GBADHJUUHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH";

describe("asset registry", () => {
  it("lookupAsset by canonical USDC issuer returns verified USDC", () => {
    const hit = lookupAsset({ code: "USDC", issuer: CIRCLE_USDC });
    expect(hit).not.toBeNull();
    expect(hit?.symbol).toBe("USDC");
    expect(hit?.kind).toBe("classic");
    expect(hit?.verified).toBe(true);
  });

  it("lookupAsset by canonical EURC issuer returns verified EURC", () => {
    const hit = lookupAsset({ code: "EURC", issuer: CIRCLE_EURC });
    expect(hit?.symbol).toBe("EURC");
  });

  it("lookupAsset for spoofed {code: USDC, issuer: random} returns null", () => {
    const hit = lookupAsset({ code: "USDC", issuer: SPOOF_ISSUER });
    expect(hit).toBeNull();
  });

  it("lookupAsset with empty issuer throws", () => {
    expect(() => lookupAsset({ code: "USDC", issuer: "" })).toThrow();
  });

  it("lookupAsset with empty code throws", () => {
    expect(() => lookupAsset({ code: "", issuer: CIRCLE_USDC })).toThrow();
  });

  it("lookupAsset with non-string input throws", () => {
    expect(() =>
      lookupAsset({ code: 123 as unknown as string, issuer: CIRCLE_USDC }),
    ).toThrow();
  });

  it("native XLM is registered under issuer 'native'", () => {
    const hit = lookupAsset({ code: "XLM", issuer: "native" });
    expect(hit?.kind).toBe("native");
    expect(hit?.symbol).toBe("XLM");
  });

  it("two assets with same code but different issuer are distinct", () => {
    const real = lookupAsset({ code: "USDC", issuer: CIRCLE_USDC });
    const fake = lookupAsset({ code: "USDC", issuer: SPOOF_ISSUER });
    expect(real).not.toBeNull();
    expect(fake).toBeNull();
  });

  it("describeAsset returns canonical symbol for known asset", () => {
    expect(describeAsset({ code: "USDC", issuer: CIRCLE_USDC })).toBe("USDC");
  });

  it("describeAsset returns 'Unknown asset (CODE@…GISS)' for unknown", () => {
    const label = describeAsset({ code: "USDC", issuer: SPOOF_ISSUER });
    expect(label).toContain("Unknown asset (USDC@");
    expect(label.endsWith(")")).toBe(true);
  });

  it("shortIssuer truncates a G-key to head…tail", () => {
    expect(shortIssuer(CIRCLE_USDC)).toBe("GA5Z…KZVN");
  });

  it("shortIssuer returns 'native' for native", () => {
    expect(shortIssuer("native")).toBe("native");
  });

  it("listCanonicalAssets includes native XLM and Circle USDC + EURC", () => {
    const all = listCanonicalAssets();
    expect(all.find((a) => a.kind === "native" && a.symbol === "XLM")).toBeTruthy();
    expect(all.find((a) => a.symbol === "USDC")).toBeTruthy();
    expect(all.find((a) => a.symbol === "EURC")).toBeTruthy();
    expect(all.every((a) => a.verified === true)).toBe(true);
  });

  it("every registered classic asset has a 56-char G-key issuer", () => {
    const all = listCanonicalAssets();
    for (const a of all) {
      if (a.kind === "classic") {
        expect(a.issuer).toMatch(/^G[A-Z2-7]{55}$/);
      }
    }
  });
});

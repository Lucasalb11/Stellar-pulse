import { describe, expect, it } from "vitest";
import { withFallback, usedFallback } from "@/lib/stellar/fallback";

describe("withFallback", () => {
  it("passes through the live result when fetcher succeeds", async () => {
    const result = await withFallback(
      async () => [1, 2, 3],
      [],
      "live-array",
    );
    expect(usedFallback(result)).toBe(false);
    expect(result).toEqual([1, 2, 3]);
  });

  it("returns a cloned array fallback on failure with iterable shape preserved", async () => {
    const fallback = [10, 20, 30];
    const result = await withFallback<number[]>(
      async () => {
        throw new Error("boom");
      },
      fallback,
      "array-fallback",
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    expect(usedFallback(result)).toBe(true);
    expect(result).not.toBe(fallback);
  });

  it("clones object fallback and tags with _fallback", async () => {
    const fallback = { totalTVL: 1 };
    const result = await withFallback(
      async () => {
        throw new Error("boom");
      },
      fallback,
      "obj-fallback",
    );
    expect(usedFallback(result)).toBe(true);
    expect(result.totalTVL).toBe(1);
    expect(result).not.toBe(fallback);
  });

  it("records the error message on fallback", async () => {
    const result = await withFallback(
      async () => {
        throw new Error("upstream 503");
      },
      [],
      "with-msg",
    );
    expect((result as unknown as { _error: string })._error).toBe("upstream 503");
  });
});

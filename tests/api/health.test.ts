import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimitForTests } from "@/lib/stellar/rate-limit";

vi.mock("@/lib/stellar/health", () => ({
  probeAllSources: async () => [
    {
      name: "defillama-chain-tvl",
      fresh: true,
      verified: true,
      lastFetchedAt: "2026-06-15T00:00:00.000Z",
    },
    {
      name: "defillama-protocols",
      fresh: false,
      verified: false,
      lastFetchedAt: "2026-06-15T00:00:00.000Z",
      error: "boom",
    },
  ],
}));

async function loadGet() {
  const mod = await import("@/app/api/health/sources/route");
  return mod.GET;
}

function makeReq(ip = "10.0.0.1"): Request {
  return new Request("https://example.com/api/health/sources", {
    method: "GET",
    headers: { "cf-connecting-ip": ip },
  });
}

beforeEach(() => {
  _resetRateLimitForTests();
  vi.resetModules();
});

describe("GET /api/health/sources", () => {
  it("returns source statuses with allFresh aggregate", async () => {
    const GET = await loadGet();
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sources).toHaveLength(2);
    expect(json.allFresh).toBe(false);
    expect(json.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("surfaces fallback errors via error field", async () => {
    const GET = await loadGet();
    const res = await GET(makeReq());
    const json = await res.json();
    const broken = json.sources.find(
      (s: { name: string }) => s.name === "defillama-protocols",
    );
    expect(broken.fresh).toBe(false);
    expect(broken.error).toBe("boom");
  });

  it("rate limits at 6 requests per minute per IP", async () => {
    const GET = await loadGet();
    for (let i = 0; i < 6; i++) {
      const res = await GET(makeReq("11.0.0.1"));
      expect(res.status).toBe(200);
    }
    const limited = await GET(makeReq("11.0.0.1"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });
});

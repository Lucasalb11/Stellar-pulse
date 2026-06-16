import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimitForTests } from "@/lib/stellar/rate-limit";

const SECRET = "test-secret-abcdef";

vi.mock("next/cache", () => ({ revalidateTag: () => {} }));

async function loadPost() {
  const mod = await import("@/app/api/revalidate/route");
  return mod.POST;
}

function makeReq(opts: {
  auth?: string | null;
  ip?: string;
  forwarded?: string;
  body?: unknown;
}): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.auth) headers.set("authorization", opts.auth);
  if (opts.ip) headers.set("cf-connecting-ip", opts.ip);
  if (opts.forwarded) headers.set("x-forwarded-for", opts.forwarded);
  return new Request("https://example.com/api/revalidate", {
    method: "POST",
    headers,
    body: JSON.stringify(opts.body ?? { tags: ["stellar:tvl"] }),
  });
}

beforeEach(() => {
  process.env.REVALIDATE_SECRET = SECRET;
  _resetRateLimitForTests();
  vi.resetModules();
});

afterEach(() => {
  delete process.env.REVALIDATE_SECRET;
  _resetRateLimitForTests();
});

describe("POST /api/revalidate — hardening", () => {
  it("rate limits to 10 requests per IP per minute", async () => {
    const POST = await loadPost();
    for (let i = 0; i < 10; i++) {
      const res = await POST(makeReq({ auth: `Bearer ${SECRET}`, ip: "1.2.3.4" }));
      expect(res.status).toBe(200);
    }
    const limited = await POST(makeReq({ auth: `Bearer ${SECRET}`, ip: "1.2.3.4" }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });

  it("rate limits independently per IP", async () => {
    const POST = await loadPost();
    for (let i = 0; i < 10; i++) {
      await POST(makeReq({ auth: `Bearer ${SECRET}`, ip: "1.2.3.4" }));
    }
    const otherIp = await POST(makeReq({ auth: `Bearer ${SECRET}`, ip: "5.6.7.8" }));
    expect(otherIp.status).toBe(200);
  });

  it("falls back to x-forwarded-for leftmost when cf header absent", async () => {
    const POST = await loadPost();
    const res = await POST(
      makeReq({
        auth: `Bearer ${SECRET}`,
        forwarded: "9.9.9.9, 10.10.10.10",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("uses constant-time compare — wrong secret of equal length returns 401", async () => {
    const POST = await loadPost();
    const wrong = "x".repeat(SECRET.length);
    expect(wrong.length).toBe(SECRET.length);
    const res = await POST(makeReq({ auth: `Bearer ${wrong}` }));
    expect(res.status).toBe(401);
  });

  it("rejects when bearer is shorter than secret without information leak", async () => {
    const POST = await loadPost();
    const res = await POST(makeReq({ auth: "Bearer short" }));
    expect(res.status).toBe(401);
  });

  it("rejects when bearer is longer than secret without crashing", async () => {
    const POST = await loadPost();
    const res = await POST(makeReq({ auth: `Bearer ${SECRET}extra` }));
    expect(res.status).toBe(401);
  });

  it("falls back to 'unknown' bucket when cf-connecting-ip contains disallowed characters", async () => {
    const POST = await loadPost();
    const suspicious = "1.2.3.4 <script>alert(1)</script>";
    for (let i = 0; i < 10; i++) {
      const res = await POST(makeReq({ auth: `Bearer ${SECRET}`, ip: suspicious }));
      expect(res.status).toBe(200);
    }
    const eleventh = await POST(
      makeReq({ auth: `Bearer ${SECRET}`, ip: suspicious }),
    );
    expect(eleventh.status).toBe(429);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-secret-abcdef";

const revalidatedTags: string[] = [];

vi.mock("next/cache", () => ({
  revalidateTag: (tag: string) => {
    revalidatedTags.push(tag);
  },
}));

async function loadPost() {
  const mod = await import("@/app/api/revalidate/route");
  return mod.POST;
}

function makeReq(opts: {
  body?: unknown;
  rawBody?: string;
  auth?: string | null;
}): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.auth !== null && opts.auth !== undefined) {
    headers.set("authorization", opts.auth);
  }
  const body =
    opts.rawBody !== undefined ? opts.rawBody : JSON.stringify(opts.body);
  return new Request("https://example.com/api/revalidate", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    revalidatedTags.length = 0;
    process.env.REVALIDATE_SECRET = SECRET;
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.REVALIDATE_SECRET;
  });

  it("revalidates allowlisted tags with valid bearer secret", async () => {
    const POST = await loadPost();
    const res = await POST(
      makeReq({
        auth: `Bearer ${SECRET}`,
        body: { tags: ["stellar:tvl", "stellar:overview"] },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.revalidated.sort()).toEqual(
      ["stellar:overview", "stellar:tvl"].sort(),
    );
    expect(json.skipped).toEqual([]);
    expect(revalidatedTags.sort()).toEqual(
      ["stellar:overview", "stellar:tvl"].sort(),
    );
  });

  it("rejects with 401 when authorization header is missing", async () => {
    const POST = await loadPost();
    const res = await POST(makeReq({ auth: null, body: { tags: ["stellar:tvl"] } }));
    expect(res.status).toBe(401);
    expect(revalidatedTags).toEqual([]);
  });

  it("rejects with 401 when bearer token does not match secret", async () => {
    const POST = await loadPost();
    const res = await POST(
      makeReq({ auth: "Bearer wrong-secret", body: { tags: ["stellar:tvl"] } }),
    );
    expect(res.status).toBe(401);
    expect(revalidatedTags).toEqual([]);
  });

  it("rejects with 401 when authorization is not Bearer format", async () => {
    const POST = await loadPost();
    const res = await POST(
      makeReq({ auth: `Basic ${SECRET}`, body: { tags: ["stellar:tvl"] } }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects with 400 when body is not valid JSON", async () => {
    const POST = await loadPost();
    const res = await POST(
      makeReq({ auth: `Bearer ${SECRET}`, rawBody: "{not json" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects with 400 when body shape does not match schema", async () => {
    const POST = await loadPost();
    const res = await POST(
      makeReq({ auth: `Bearer ${SECRET}`, body: { tags: "stellar:tvl" } }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects with 400 when no tags are in the allowlist", async () => {
    const POST = await loadPost();
    const res = await POST(
      makeReq({
        auth: `Bearer ${SECRET}`,
        body: { tags: ["unknown:tag", "another:tag"] },
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.skipped.sort()).toEqual(["another:tag", "unknown:tag"]);
    expect(revalidatedTags).toEqual([]);
  });

  it("partial allowlist match revalidates valid tags and skips unknowns", async () => {
    const POST = await loadPost();
    const res = await POST(
      makeReq({
        auth: `Bearer ${SECRET}`,
        body: { tags: ["stellar:tvl", "unknown:tag"] },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.revalidated).toEqual(["stellar:tvl"]);
    expect(json.skipped).toEqual(["unknown:tag"]);
    expect(revalidatedTags).toEqual(["stellar:tvl"]);
  });

  it("returns 503 when REVALIDATE_SECRET is not configured", async () => {
    delete process.env.REVALIDATE_SECRET;
    const POST = await loadPost();
    const res = await POST(
      makeReq({ auth: `Bearer ${SECRET}`, body: { tags: ["stellar:tvl"] } }),
    );
    expect(res.status).toBe(503);
  });

  it("rejects with 400 when tags array is empty", async () => {
    const POST = await loadPost();
    const res = await POST(
      makeReq({ auth: `Bearer ${SECRET}`, body: { tags: [] } }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects with 400 when tags array exceeds max length", async () => {
    const POST = await loadPost();
    const tags = Array.from({ length: 17 }, (_, i) => `stellar:t${i}`);
    const res = await POST(
      makeReq({ auth: `Bearer ${SECRET}`, body: { tags } }),
    );
    expect(res.status).toBe(400);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  fetchSorobanNetwork,
  fetchSorobanLatestLedger,
  fetchSorobanRpcHealth,
} from "@/lib/stellar/soroban";

const RPC_URL = "https://soroban-rpc.mainnet.stellar.gateway.fm";

afterEach(() => server.resetHandlers());

const rpcBody = (id: number | string, result: unknown) => ({
  jsonrpc: "2.0",
  id,
  result,
});

describe("fetchSorobanNetwork", () => {
  it("returns parsed network result", async () => {
    server.use(
      http.post(RPC_URL, async ({ request }) => {
        const body = (await request.json()) as { method: string };
        expect(body.method).toBe("getNetwork");
        return HttpResponse.json(
          rpcBody(1, {
            passphrase: "Public Global Stellar Network ; September 2015",
            protocolVersion: 22,
            friendbotUrl: "https://friendbot.stellar.org",
          }),
        );
      }),
    );
    const net = await fetchSorobanNetwork();
    expect(net.passphrase).toContain("Stellar");
    expect(net.protocolVersion).toBe(22);
  });

  it("throws on JSON-RPC error envelope", async () => {
    server.use(
      http.post(RPC_URL, () =>
        HttpResponse.json({
          jsonrpc: "2.0",
          id: 1,
          error: { code: -32601, message: "method not found" },
        }),
      ),
    );
    await expect(fetchSorobanNetwork()).rejects.toThrow(/method not found/);
  });

  it("throws on malformed payload (missing result and error)", async () => {
    server.use(
      http.post(RPC_URL, () => HttpResponse.json({ jsonrpc: "2.0", id: 1 })),
    );
    await expect(fetchSorobanNetwork()).rejects.toThrow(/empty result/);
  });

  it("throws on HTTP 500", async () => {
    server.use(http.post(RPC_URL, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchSorobanNetwork()).rejects.toThrow(/Soroban RPC getNetwork 500/);
  });
});

describe("fetchSorobanLatestLedger", () => {
  it("returns ledger metadata", async () => {
    server.use(
      http.post(RPC_URL, () =>
        HttpResponse.json(
          rpcBody(1, {
            id: "abcd1234",
            protocolVersion: 22,
            sequence: 123_456_789,
          }),
        ),
      ),
    );
    const led = await fetchSorobanLatestLedger();
    expect(led.sequence).toBe(123_456_789);
    expect(led.protocolVersion).toBe(22);
  });

  it("rejects malformed sequence (negative)", async () => {
    server.use(
      http.post(RPC_URL, () =>
        HttpResponse.json(
          rpcBody(1, { id: "abcd", protocolVersion: 22, sequence: -1 }),
        ),
      ),
    );
    await expect(fetchSorobanLatestLedger()).rejects.toThrow();
  });
});

describe("fetchSorobanRpcHealth", () => {
  it("combines network and ledger into a single result", async () => {
    let call = 0;
    server.use(
      http.post(RPC_URL, async ({ request }) => {
        call += 1;
        const body = (await request.json()) as { method: string };
        if (body.method === "getNetwork") {
          return HttpResponse.json(
            rpcBody(1, { passphrase: "p", protocolVersion: 22 }),
          );
        }
        return HttpResponse.json(
          rpcBody(1, { id: "x", protocolVersion: 22, sequence: 999 }),
        );
      }),
    );
    const out = await fetchSorobanRpcHealth();
    expect(out).toEqual({ passphrase: "p", ledger: 999, protocolVersion: 22 });
    expect(call).toBe(2);
  });
});

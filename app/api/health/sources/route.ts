import { probeAllSources } from "@/lib/stellar/health";
import { clientKey, rateLimit } from "@/lib/stellar/rate-limit";

const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 60_000;

export async function GET(req: Request): Promise<Response> {
  const key = clientKey(req.headers);
  const rl = rateLimit(`health:${key}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.allowed) {
    return Response.json(
      { error: "rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000)).toString(),
        },
      },
    );
  }

  const sources = await probeAllSources();
  const allFresh = sources.every((s) => s.fresh);
  return Response.json(
    { sources, allFresh, checkedAt: new Date().toISOString() },
    { status: 200 },
  );
}

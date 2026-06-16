import { revalidateTag } from "next/cache";
import { z } from "zod";
import { ALLOWED_TAGS } from "@/lib/stellar/cache";
import { getRevalidateSecret } from "@/lib/stellar/env";
import { authorize, type AuthResult } from "@/lib/stellar/revalidate-auth";
import { clientKey, rateLimit } from "@/lib/stellar/rate-limit";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

type Outcome =
  | "accepted"
  | "rejected:auth"
  | "rejected:tag"
  | "rejected:rate"
  | "rejected:body"
  | "rejected:config";

function log(outcome: Outcome, key: string, extra: Record<string, unknown> = {}): void {
  console.log(`[revalidate] outcome=${outcome} client=${key}`, extra);
}

const BodySchema = z.object({
  tags: z.array(z.string().max(64)).min(1).max(16),
});

interface RevalidateResult {
  revalidated: string[];
  skipped: string[];
}

function partitionTags(tags: string[]): RevalidateResult {
  const revalidated: string[] = [];
  const skipped: string[] = [];
  for (const tag of tags) {
    if (ALLOWED_TAGS.has(tag)) revalidated.push(tag);
    else skipped.push(tag);
  }
  return { revalidated, skipped };
}

function applyRevalidations(tags: string[]): void {
  for (const tag of tags) revalidateTag(tag, "max");
}

export async function POST(req: Request): Promise<Response> {
  const key = clientKey(req.headers);
  const rl = rateLimit(`revalidate:${key}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.allowed) {
    log("rejected:rate", key, { resetAt: rl.resetAt });
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

  let secret: string;
  try {
    secret = getRevalidateSecret();
  } catch {
    log("rejected:config", key);
    return Response.json(
      { error: "revalidation not configured" },
      { status: 503 },
    );
  }

  const auth: AuthResult = authorize(req.headers.get("authorization"), secret);
  if (!auth.ok) {
    log("rejected:auth", key, { reason: auth.reason });
    return Response.json({ error: auth.reason }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    log("rejected:body", key, { reason: "invalid json" });
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    log("rejected:body", key, { reason: "schema" });
    return Response.json(
      { error: "invalid body", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const result = partitionTags(parsed.data.tags);
  if (result.revalidated.length === 0) {
    log("rejected:tag", key, { skipped: result.skipped });
    return Response.json({ error: "no allowed tags", skipped: result.skipped }, { status: 400 });
  }

  applyRevalidations(result.revalidated);
  log("accepted", key, { revalidated: result.revalidated, skipped: result.skipped });
  return Response.json(result, { status: 200 });
}

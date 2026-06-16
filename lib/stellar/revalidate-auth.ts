import { timingSafeEqual } from "node:crypto";

export type AuthResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "format" | "mismatch" };

const BEARER = /^Bearer\s+(\S+)$/;

export function authorize(
  header: string | null,
  expected: string,
): AuthResult {
  if (!header) return { ok: false, reason: "missing" };
  const match = BEARER.exec(header);
  if (!match) return { ok: false, reason: "format" };
  const token = match[1];
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still burn a constant-time compare against a same-length pad so the
    // length check can't be used as an oracle for the secret length.
    timingSafeEqual(a, Buffer.alloc(a.length));
    return { ok: false, reason: "mismatch" };
  }
  if (!timingSafeEqual(a, b)) return { ok: false, reason: "mismatch" };
  return { ok: true };
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SECURITY_HEADERS } from "@/lib/stellar/security-headers";

export function proxy(_req: NextRequest): NextResponse {
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)"],
};

import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS } from "@/lib/stellar/security-headers";
import { EXTERNAL_HOSTS } from "@/lib/stellar/env";

describe("SECURITY_HEADERS", () => {
  it("declares every required defense header", () => {
    const required = [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Cross-Origin-Opener-Policy",
      "Cross-Origin-Resource-Policy",
      "Permissions-Policy",
    ];
    for (const h of required) {
      expect(SECURITY_HEADERS[h]).toBeTruthy();
    }
  });

  it("CSP frame-ancestors blocks framing", () => {
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("X-Frame-Options is DENY", () => {
    expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
  });

  it("HSTS includes preload + 2y max-age", () => {
    const hsts = SECURITY_HEADERS["Strict-Transport-Security"];
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).toContain("preload");
  });

  it("CSP connect-src lists every EXTERNAL_HOSTS entry", () => {
    const csp = SECURITY_HEADERS["Content-Security-Policy"];
    for (const host of EXTERNAL_HOSTS) {
      expect(csp).toContain(host);
    }
  });

  it("CSP object-src is 'none' and base-uri is 'self'", () => {
    const csp = SECURITY_HEADERS["Content-Security-Policy"];
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it("Permissions-Policy blocks sensitive APIs", () => {
    const pp = SECURITY_HEADERS["Permissions-Policy"];
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
    expect(pp).toContain("geolocation=()");
    expect(pp).toContain("payment=()");
  });

  it("CSP serializes as a single space-separated header value", () => {
    const csp = SECURITY_HEADERS["Content-Security-Policy"];
    expect(csp).not.toContain("\n");
    expect(csp).not.toContain("\r");
  });
});

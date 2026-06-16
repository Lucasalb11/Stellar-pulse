import { mkdtempSync, writeFileSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runSecurityChecks, formatIssue } from "@/scripts/security-check";

describe("scripts/security-check (clean state)", () => {
  it("returns no issues for the current repo", () => {
    const issues = runSecurityChecks();
    if (issues.length > 0) {
      const formatted = issues.map(formatIssue).join("\n");
      throw new Error(
        `expected no security issues, got ${issues.length}:\n${formatted}`,
      );
    }
    expect(issues).toEqual([]);
  });

  it("formatIssue includes file and message; file:line when line is present", () => {
    expect(formatIssue({ file: "x.ts", message: "broke" })).toBe("x.ts — broke");
    expect(formatIssue({ file: "x.ts", line: 12, message: "broke" })).toBe(
      "x.ts:12 — broke",
    );
  });
});

describe("scripts/security-check (intentionally broken — REVALIDATE_SECRET leakage)", () => {
  it("flags any reference to REVALIDATE_SECRET outside the allowed env/auth modules", () => {
    const root = mkdtempSync(join(tmpdir(), "secchk-"));
    try {
      cpSync(join(process.cwd(), "lib"), join(root, "lib"), { recursive: true });
      cpSync(join(process.cwd(), "data"), join(root, "data"), { recursive: true });
      const leakyDir = join(root, "app", "api", "leaky");
      mkdirSync(leakyDir, { recursive: true });
      writeFileSync(
        join(leakyDir, "route.ts"),
        `export async function GET() {
           const secret = process.env.REVALIDATE_SECRET;
           return Response.json({ secret });
         }`,
      );
      const issues = runSecurityChecks({ rootDir: root });
      const leak = issues.find((i) =>
        i.file.endsWith("app/api/leaky/route.ts"),
      );
      expect(leak).toBeDefined();
      expect(leak?.message).toContain("REVALIDATE_SECRET");
      expect(leak?.line).toBeGreaterThan(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

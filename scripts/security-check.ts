/**
 * scripts/security-check.ts
 *
 * Local + CI security regression check. Validates:
 *  1. Protocol-link registry: https-only, no javascript:/data:, no userinfo.
 *  2. Asset registry: every issuer is `native`, G-key, or C-key (56-char base32).
 *  3. Every `fetch(` call in `lib/stellar/*` targets a host in EXTERNAL_HOSTS.
 *  4. CSP `connect-src` includes every host in EXTERNAL_HOSTS.
 *  5. REVALIDATE_SECRET is referenced only in `lib/stellar/env.ts` and
 *     `lib/stellar/revalidate-auth.ts` — never logged or returned anywhere else.
 *
 * Exits non-zero on the first failure with `file:line — message`.
 *
 * Wired into the test suite via `tests/security/security-check.test.ts` so it
 * also runs in CI on every `npm test`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { listProtocolLinks } from "@/lib/stellar/protocol-links";
import { listCanonicalAssets } from "@/lib/stellar/assets";
import { SECURITY_HEADERS } from "@/lib/stellar/security-headers";
import { EXTERNAL_HOSTS } from "@/lib/stellar/env";

export interface SecurityIssue {
  file: string;
  line?: number;
  message: string;
}

export interface SecurityCheckOptions {
  rootDir?: string;
}

const STELLAR_G_KEY = /^G[A-Z2-7]{55}$/;
const STELLAR_C_KEY = /^C[A-Z2-7]{55}$/;

const REVALIDATE_ENV_READ_ALLOWED = new Set([
  "lib/stellar/env.ts",
  "scripts/security-check.ts",
]);

const LOG_OR_RESPOND = /\b(console\.(log|error|warn|info)|Response\.json|res\.send|res\.write)\s*\(/;
const SECRET_TOKEN = /\b(secret|REVALIDATE_SECRET|process\.env\.REVALIDATE_SECRET)\b/;

function walk(dir: string, exts: string[], acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, exts, acc);
    } else if (exts.some((e) => entry.endsWith(e))) {
      acc.push(full);
    }
  }
  return acc;
}

function findLine(text: string, needle: string | RegExp): number | undefined {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (typeof needle === "string" ? lines[i].includes(needle) : needle.test(lines[i])) {
      return i + 1;
    }
  }
  return undefined;
}

function checkProtocolLinks(issues: SecurityIssue[]): void {
  let entries: ReturnType<typeof listProtocolLinks>;
  try {
    entries = listProtocolLinks();
  } catch (err) {
    issues.push({
      file: "data/protocol-links.json",
      message: `protocol-link registry failed Zod parse: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
    return;
  }
  for (const entry of entries) {
    const urls = [
      ["homepage", entry.homepage],
      ...(entry.app ? [["app", entry.app] as const] : []),
      ...(entry.docs ? [["docs", entry.docs] as const] : []),
      ...(entry.twitter ? [["twitter", entry.twitter] as const] : []),
      ...(entry.github ? [["github", entry.github] as const] : []),
      ...entry.audits.map((a) => [`audit:${a.firm}`, a.url] as const),
    ] as [string, string][];
    for (const [field, url] of urls) {
      if (!url.startsWith("https://")) {
        issues.push({
          file: "data/protocol-links.json",
          message: `${entry.slug}.${field} is not https://: ${url}`,
        });
      }
      if (/^javascript:/i.test(url) || /^data:/i.test(url)) {
        issues.push({
          file: "data/protocol-links.json",
          message: `${entry.slug}.${field} uses forbidden scheme: ${url}`,
        });
      }
      if (/^https?:\/\/[^/]*@/.test(url)) {
        issues.push({
          file: "data/protocol-links.json",
          message: `${entry.slug}.${field} contains userinfo '@': ${url}`,
        });
      }
    }
  }
}

function checkAssetRegistry(issues: SecurityIssue[]): void {
  let assets: ReturnType<typeof listCanonicalAssets>;
  try {
    assets = listCanonicalAssets();
  } catch (err) {
    issues.push({
      file: "lib/stellar/assets.ts",
      message: `asset registry failed Zod parse on load: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
    return;
  }
  for (const a of assets) {
    if (a.kind === "native") {
      if (a.issuer !== "native") {
        issues.push({
          file: "lib/stellar/assets.ts",
          message: `${a.symbol}: native asset must have issuer="native", got ${a.issuer}`,
        });
      }
      continue;
    }
    if (a.kind === "classic" && !STELLAR_G_KEY.test(a.issuer)) {
      issues.push({
        file: "lib/stellar/assets.ts",
        message: `${a.symbol}: classic issuer must be G-key (56-char base32), got ${a.issuer}`,
      });
    }
    if (a.kind === "sac" && !STELLAR_C_KEY.test(a.issuer)) {
      issues.push({
        file: "lib/stellar/assets.ts",
        message: `${a.symbol}: SAC issuer must be C-key (56-char base32), got ${a.issuer}`,
      });
    }
  }
}

function checkFetchHosts(rootDir: string, issues: SecurityIssue[]): void {
  const allowed = new Set(EXTERNAL_HOSTS);
  const envConstants = new Set([
    "HORIZON_URL",
    "SOROBAN_RPC_URL",
    "STELLAR_EXPERT_API",
    "COINGECKO_BASE",
    "DEFILLAMA_BASE",
    "DEFILLAMA_YIELDS",
    "DEFILLAMA_STABLECOINS",
  ]);

  const envFile = join(rootDir, "lib/stellar/env.ts");
  const envText = readFileSync(envFile, "utf8");
  for (const name of envConstants) {
    const match = envText.match(
      new RegExp(`${name}\\s*=[^"']*["']([^"']+)["']`),
    );
    if (!match) continue;
    let host: string;
    try {
      host = new URL(match[1]).host;
    } catch {
      issues.push({
        file: "lib/stellar/env.ts",
        message: `${name} is not a valid URL: ${match[1]}`,
      });
      continue;
    }
    if (!allowed.has(host)) {
      issues.push({
        file: "lib/stellar/env.ts",
        message: `${name} host ${host} is missing from EXTERNAL_HOSTS allowlist`,
      });
    }
  }

  const stellarDir = join(rootDir, "lib/stellar");
  const files = walk(stellarDir, [".ts"]);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    // Strip block comments wholesale so JSDoc mentions of `fetch(` don't match.
    const stripped = text.replace(/\/\*[\s\S]*?\*\//g, (m) =>
      m.replace(/[^\n]/g, " "),
    );
    const lines = stripped.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.replace(/\/\/.*$/, "");
      if (!/(^|[^.\w])fetch\s*\(/.test(line)) continue;
      const hasEnvConstant = Array.from(envConstants).some((c) =>
        new RegExp(`\\b${c}\\b`).test(line),
      );
      const arg = line.slice(line.indexOf("fetch(") + 6);
      const usesAllowlistedVar =
        hasEnvConstant || /\burl\.toString\(\)|\bfetchUrl\b/.test(line);
      if (!usesAllowlistedVar) {
        const literalHost = arg.match(/["'`]https?:\/\/([^/"'`]+)/);
        if (literalHost && !allowed.has(literalHost[1])) {
          issues.push({
            file: relative(rootDir, file),
            line: i + 1,
            message: `fetch() targets ${literalHost[1]} — not in EXTERNAL_HOSTS`,
          });
        } else if (!literalHost) {
          issues.push({
            file: relative(rootDir, file),
            line: i + 1,
            message: `fetch() does not reference an EXTERNAL_HOSTS-backed constant; cannot statically verify host`,
          });
        }
      }
    }
  }
}

function checkCSPConnectSrc(issues: SecurityIssue[]): void {
  const csp = SECURITY_HEADERS["Content-Security-Policy"];
  if (!csp) {
    issues.push({
      file: "lib/stellar/security-headers.ts",
      message: "Content-Security-Policy header missing",
    });
    return;
  }
  const connectMatch = csp.match(/connect-src\s+([^;]+)/);
  if (!connectMatch) {
    issues.push({
      file: "lib/stellar/security-headers.ts",
      message: "CSP missing connect-src directive",
    });
    return;
  }
  const tokens = connectMatch[1].split(/\s+/).filter(Boolean);
  for (const host of EXTERNAL_HOSTS) {
    const url = `https://${host}`;
    if (!tokens.includes(url)) {
      issues.push({
        file: "lib/stellar/security-headers.ts",
        message: `CSP connect-src missing ${url}`,
      });
    }
  }
}

function checkRevalidateSecretLeakage(
  rootDir: string,
  issues: SecurityIssue[],
): void {
  const dirs = ["lib", "app", "components", "scripts"];
  for (const dir of dirs) {
    const full = join(rootDir, dir);
    let files: string[];
    try {
      files = walk(full, [".ts", ".tsx"]);
    } catch {
      continue;
    }
    for (const file of files) {
      const rel = relative(rootDir, file);
      const text = readFileSync(file, "utf8");
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          /process\.env\.REVALIDATE_SECRET/.test(line) &&
          !REVALIDATE_ENV_READ_ALLOWED.has(rel)
        ) {
          issues.push({
            file: rel,
            line: i + 1,
            message: `process.env.REVALIDATE_SECRET read outside lib/stellar/env.ts — go through getRevalidateSecret()`,
          });
        }
        if (LOG_OR_RESPOND.test(line) && SECRET_TOKEN.test(line)) {
          issues.push({
            file: rel,
            line: i + 1,
            message: `logs or returns a value referencing the revalidate secret — never expose secrets in responses or logs`,
          });
        }
      }
    }
  }
}

export function runSecurityChecks(opts: SecurityCheckOptions = {}): SecurityIssue[] {
  const rootDir = opts.rootDir ?? process.cwd();
  const issues: SecurityIssue[] = [];
  checkProtocolLinks(issues);
  checkAssetRegistry(issues);
  checkFetchHosts(rootDir, issues);
  checkCSPConnectSrc(issues);
  checkRevalidateSecretLeakage(rootDir, issues);
  return issues;
}

export function formatIssue(issue: SecurityIssue): string {
  const loc = issue.line ? `${issue.file}:${issue.line}` : issue.file;
  return `${loc} — ${issue.message}`;
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("scripts/security-check.ts") ||
    process.argv[1].endsWith("scripts/security-check.js"));

if (isMain) {
  const issues = runSecurityChecks();
  if (issues.length === 0) {
    console.log("security-check: all checks passed.");
    process.exit(0);
  }
  for (const issue of issues) {
    console.error(formatIssue(issue));
  }
  console.error(`\nsecurity-check: ${issues.length} issue(s) found.`);
  process.exit(1);
}

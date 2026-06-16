---
sidebar_position: 2
title: Security Check
---

# `scripts/security-check.ts`

A static guard that runs as a Vitest test. It walks `lib/`, `app/`, `components/`, `scripts/` and asserts five invariants. Zero issues is the only acceptable state.

## Run it

```bash
npm run security-check
```

Or directly:

```bash
npx tsx scripts/security-check.ts
```

Both exit non-zero if any issue is found.

## The five checks

### 1. Protocol link safety (`checkProtocolLinks`)

Every entry in `lib/stellar/protocol-links.ts` must:

- Be `https://`
- Not contain userinfo (`user:pass@`)
- Not use `javascript:` or `data:` schemes
- Match a stricter URL regex than `URL` itself

A failed entry blocks ship.

### 2. Asset registry shape (`checkAssetRegistry`)

Every issuer key in `lib/stellar/assets.ts` and `lib/stellar/rwa.ts` must:

- Be 56 chars
- Start with `G` (classic) or `C` (Soroban contract)
- Match the strict base32 regex

A G-key that's actually a C-key (or vice versa) blocks ship.

### 3. Fetch host allowlist (`checkFetchHosts`)

Every `fetch(<url>, ...)` call inside `lib/stellar/*` must target a host in `EXTERNAL_HOSTS`. The regex is line-scoped after stripping block comments:

```
fetch(<url>, …)   where new URL(url).host ∈ EXTERNAL_HOSTS
```

If you call a new upstream, add it to `EXTERNAL_HOSTS` in `lib/stellar/security-headers.ts` **and** to the CSP `connect-src` (which the next check verifies).

### 4. CSP connect-src superset (`checkCSPConnectSrc`)

The CSP `connect-src` directive in `proxy.ts` must be a superset of `EXTERNAL_HOSTS`. This prevents a sneaky case where the adapter fetches `api.foo.com` but the CSP forbids it — you'd see the page render but the data wouldn't fetch in production.

### 5. Revalidate secret containment (`checkRevalidateSecretLeakage`)

`process.env.REVALIDATE_SECRET` may only be read from `lib/stellar/env.ts`. The check also fails any line that mentions `REVALIDATE_SECRET` AND a response/log call (`console.log`, `Response.json`, `res.send`, …) — defense against accidentally echoing the secret.

The allowlist is:

```ts
const REVALIDATE_ENV_READ_ALLOWED = new Set([
  "lib/stellar/env.ts",
  "scripts/security-check.ts",
]);
```

`tests/**` is excluded from the scan (tests legitimately set `process.env.REVALIDATE_SECRET` for isolation).

## Output format

Each issue:

```
[<check-name>] <file>:<line> <message>
```

Example:

```
[fetch-host] lib/stellar/horizon.ts:42 fetch URL host "api.example.com" not in EXTERNAL_HOSTS
```

## Common false positives — and why they aren't

| Pattern | Why it's not flagged |
|---|---|
| `fetch()` in JSDoc | Block comments are stripped before the line scan |
| `getRevalidateSecret()` call in `app/api/revalidate/route.ts` | The check looks for `process.env.REVALIDATE_SECRET` (raw env read), not the wrapper |
| Test files setting env vars | `tests/**` excluded from scan |

If you hit a real false positive, fix the regex — don't add it to an allowlist unless there's a strong reason.

## Adding a new check

1. Add `checkXxx(rootDir): SecurityIssue[]` in `scripts/security-check.ts`.
2. Push it onto the `checks` array in `runSecurityChecks`.
3. Add a test in `tests/security/security-check.test.ts` — one for clean state (zero issues), one for a deliberately broken fixture.
4. Document the check in this guide.

## CI gate

Hook it into your deploy step:

```yaml
- run: npm run security-check
- run: npm test
- run: npm run build
```

All three must pass.

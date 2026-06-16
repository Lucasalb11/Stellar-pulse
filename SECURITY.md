# Security Playbook — Stellar Pulse

> **For the architecture and code-level controls**, see `docs/data-architecture.md` §17.
> **This file** is the operational half: routine checklists, what to verify by hand, and the incident-response runbook.
> **Update cadence:** review this file quarterly. Add any new attack pattern you discover in the field.

---

## 0. How to use this file

This is a **playbook**, not a treatise. Each section is a checklist you actually run. The schedule:

| Cadence | Section | Approx. time | Who runs it |
|---|---|---|---|
| **On every PR** | §1 PR security review | 2 min | Reviewer |
| **Weekly** | §2 Weekly checklist | 15 min | Maintainer (you) |
| **Monthly** | §3 Monthly deep audit | 60–90 min | Maintainer + Claude session |
| **Quarterly** | §4 Quarterly architecture review | half day | Maintainer + Claude session |
| **On incident** | §5 Incident response | as needed | All hands |
| **Before deploy** | §6 Pre-deploy checklist | 5 min | Deployer |

A **Claude security session** = open this file, paste the section title into Claude Code as a prompt, walk through the checklist together. Claude treats this file as authoritative because `CLAUDE.md` imports it.

---

## 1. Per-PR security review (every merge)

Reviewer mentally walks through:

- [ ] **New deps?** If `package-lock.json` changed, eyeball the diff. Any new transitive deps you don't recognize? Run `npm view <package>` on suspicious ones (publisher, last publish date, weekly downloads).
- [ ] **New env var read?** If new `process.env.X` appears, was it added to Vercel project env? Is it the minimum scope (Production / Preview / Development)?
- [ ] **New outbound URL in code?** If anywhere added a new domain, did it also go into the CSP `connect-src` allowlist in `proxy.ts`? Did it go into `PROTOCOL_REGISTRY`? Zod-validated?
- [ ] **New `/api` route?** Does it require the `REVALIDATE_SECRET`? Is it rate-limited? Does it validate body shape with Zod?
- [ ] **`dangerouslySetInnerHTML` introduced?** Block the PR. There is no v1 case where this is needed.
- [ ] **User-input-derived URL?** Block. We do not render user-controlled hrefs.
- [ ] **Pinned versions?** No new `^` or `~` ranges on direct deps.

---

## 2. Weekly checklist (~15 minutes)

Run every Monday morning. Tick the boxes. Anything red → escalate to §5.

### 2a. Stability

- [ ] **Vercel Analytics dashboard:** error rate < 0.5%? p95 < 2s? No anomalous traffic spike?
- [ ] **Function invocation count:** within ±25% of last week's baseline? (Anything bigger = either we went viral or someone is hammering us.)
- [ ] **Function bill so far this month:** on track? (Set a budget alert at 1.5× monthly average.)
- [ ] **`GET /api/health/sources`:** all five sources `ok: true`? Latencies reasonable?
- [ ] **Build status:** last 7 deploys all green? Any flaky failures?

### 2b. Data integrity

- [ ] Pick **two random protocol rows** on the live `/defi-pulse` page. Cross-check TVL on `defillama.com/chain/Stellar`. Within 5%? (DefiLlama updates on a delay; small drift is normal.)
- [ ] Pick **one RWA issuer** from `/rwas`. Cross-check via `stellar.expert/explorer/public/asset/{code}-{issuer}` — the issuer key in our registry matches what stellar.expert shows? Holder count plausible?
- [ ] **XLM/USD on landing page** within 2% of CoinGecko web?

### 2c. Surface checks

- [ ] **Click 3 random outbound protocol links.** Each opens the correct domain? TLS cert OK? Page content matches the protocol you expect?
- [ ] **DNS:** `dig stellarpulse.xyz` resolves to Vercel CNAME? `dig app.stellarpulse.xyz` (if used) too?
- [ ] **TLS expiry:** cert valid for > 14 days? (Vercel auto-renews, but check.)

---

## 3. Monthly deep audit (~60–90 minutes)

First Monday of each month. This is a **Claude session** — paste this section into Claude Code and walk through together.

### 3a. Registry verification (~25 min)

- [ ] **`lib/stellar/protocol-registry.ts`:** for each entry where `verifiedOn` is > 30 days old:
  - Visit the `homepage` URL. Does the page identify itself as the protocol? Logo, copy, social links match?
  - Visit `twitter` / `github`. Same handle? Same project?
  - If anything looks off → mark `verified: false` in a PR, page maintainer.
- [ ] **`lib/stellar/asset-registry.ts`:** for each `{code, issuer}` entry, cross-check on `stellar.expert/explorer/public/asset/{code}-{issuer}` that:
  - Issuer name on stellar.expert matches the registry name.
  - Asset is not flagged as scam / suspicious.
  - Holder count is consistent (no overnight collapse from 10k to 0).
- [ ] **Reflector contract IDs:** open `https://reflector.network/`, copy the current published feed contract addresses, compare to what `lib/stellar/registry.ts` has. Any drift → PR to update + comment with old/new + date.
- [ ] **RWA issuer G-keys (`lib/stellar/registry.ts`):** verify each against the issuer's own official documentation (Franklin Templeton press release, Etherfuse docs, etc.). Re-source if `verifiedOn` > 90 days.

### 3b. Dependency audit (~20 min)

- [ ] `npm audit --omit=dev --audit-level=high` — zero high/critical?
- [ ] `npm outdated` — any package > 2 major versions behind?
- [ ] Direct deps in `package.json`: read each one's GitHub for the last 90 days of commit activity. Any abandoned? Any new maintainer of unknown identity?
- [ ] **Lockfile diff vs. last month:** any unexpected transitive additions? Especially packages with names similar to popular ones (typosquatting).
- [ ] Check **Socket.dev** or **Snyk** reports if integrated (v2 task).

### 3c. Configuration drift (~15 min)

- [ ] Vercel project → Settings → Environment Variables: same set as documented in §17 of `data-architecture.md`? No mystery vars added?
- [ ] Vercel project → Settings → Team Members: same list as last month? Anyone added or removed unexpectedly?
- [ ] Vercel project → Settings → Domains: `stellarpulse.xyz` still owned, no expiration warnings?
- [ ] `proxy.ts` CSP `connect-src`: does it still match exactly the URLs in `lib/stellar/env.ts`? No drift either direction?
- [ ] `next.config.ts` `cacheLife` profiles: still match `data-architecture.md` §5?

### 3d. Log review (~15 min)

- [ ] Last 30 days of Vercel function logs for `[security]` prefix:
  - `asset-poisoning-attempt` events: count + IPs. Block IPs if recurring.
  - `revalidate-auth-fail`: count + IPs. Block IPs if recurring.
  - `upstream-validation-fail`: which source? Persistent? File a ticket with the source.
- [ ] **Anomaly check:** is there an IP that made > 100 requests to `/api/*` in the last 30 days? If yes, investigate.

### 3e. Penetration self-test (~15 min)

Run these probes against production. They should all return harmlessly:

- [ ] `curl -X POST https://stellarpulse.xyz/api/revalidate -d '{"tag":"stellar:tvl"}' -H "x-revalidate-secret: wrong"` → 403
- [ ] `curl -X POST https://stellarpulse.xyz/api/revalidate -d '{"tag":"../../../etc/passwd"}' -H "x-revalidate-secret: $REVALIDATE_SECRET"` → 400 (invalid tag)
- [ ] `curl -X POST https://stellarpulse.xyz/api/revalidate -d '{"tag":"stellar:tvl","url":"http://169.254.169.254/"}' -H "x-revalidate-secret: $REVALIDATE_SECRET"` → 200, no SSRF (no URL fetched)
- [ ] Open `https://stellarpulse.xyz` in incognito, view source. Search for: `unsafe-eval`, `dangerouslySetInnerHTML`, hardcoded secrets, debug flags. None present?
- [ ] DevTools → Network → check response headers on `/`: CSP, HSTS, X-Frame-Options, Referrer-Policy all set as in §17b?
- [ ] Try to iframe the site from a test page: `<iframe src="https://stellarpulse.xyz">`. Should be blocked by `X-Frame-Options: DENY`.

---

## 4. Quarterly architecture review (~half day)

Every 3 months. Full Claude session. Re-evaluate the threat model.

- [ ] Has the **app added new attack surface** since last review? (New routes, new env vars, new external services, new write paths.)
- [ ] Has the **threat landscape changed**? New CVEs in our stack? New attack patterns published (read recent OWASP advisories, GitHub Advisory Database)?
- [ ] Has **Vercel released new security features** worth adopting? (BotID upgrades, Routing Middleware features, KV-backed rate limiting.)
- [ ] **AI-tooled attack patterns:** review what LLM-driven scanners look like this quarter. Update §17a Threat 7 if patterns shifted.
- [ ] **Move v1 → v2 hardening:** strict-CSP (nonce-based), per-row Subresource Integrity if we ever load external scripts, KV rate limit (replace in-memory).
- [ ] Revisit `verified: false` rows: any source we promised we'd wire that we still haven't? Cut from UI or fix.

---

## 5. Incident response runbook

If something is wrong **right now**, follow this. The default action is **always: cut traffic first, investigate second.**

### 5a. Symptoms triage (5 min)

Decide what we're dealing with:

| Symptom | Likely cause | Jump to |
|---|---|---|
| Site down / 500s | Vercel outage, upstream API outage, our bug | 5b |
| Wrong number on a page | Upstream data poisoning, our adapter bug | 5c |
| Wrong outbound link | Registry tampering, DNS hijack | 5d |
| Suspicious traffic spike | Scraper, DDoS, viral moment | 5e |
| Secret leaked (REVALIDATE_SECRET) | Env var leak, repo leak | 5f |
| Dep CVE published | Supply chain | 5g |

### 5b. Site down

1. Vercel status page → outage? Wait.
2. `/api/health/sources` → which source is red? Their status page.
3. Recent deploy → roll back via Vercel "Promote previous deployment".
4. If our bug: branch + fix + deploy. Don't hotfix on `main` without a PR.

### 5c. Wrong number visible

1. **Immediate:** force-revalidate the tag with `curl -X POST /api/revalidate -d '{"tag":"stellar:tvl"}' -H "x-revalidate-secret: $S"`.
2. If still wrong: the source itself is wrong. Add an inline `verified: false` override in the composer for that field, deploy.
3. Capture upstream response in `__fixtures__/incidents/{date}.json` for postmortem.

### 5d. Wrong outbound link

1. **Immediate:** PR to `protocol-registry.ts` removing the entry entirely. Merge + deploy.
2. Verify the wrong link was tampering and not someone updating an entry without verification.
3. Add the bad URL to a "known-malicious" list in the registry so it cannot be re-added without a comment.

### 5e. Traffic spike

1. Vercel Analytics → which path? Which countries? Which UA?
2. If it's `/api/*`: tighten rate limit in `app/api/<route>/route.ts`, deploy.
3. If it's `/` or `/overview`: cache is doing its job; check function bill is still OK.
4. If clear attack: enable Vercel BotID Challenge mode on `/api/*`.

### 5f. Secret leaked

1. **Immediate:** Vercel → Project → Settings → Environment Variables → rotate `REVALIDATE_SECRET` (generate new value, set in Production).
2. Trigger redeploy (env var change requires it).
3. Audit Vercel function logs for the last N days: any successful `/api/revalidate` calls from unfamiliar IPs?
4. Find the leak source. Was it a screenshot in chat? A `.env` accidentally pushed? A commit then force-pushed? Make sure it's gone from git history (`git log --all --full-history -- .env`).

### 5g. CVE in a dep

1. `npm audit fix` — does it resolve cleanly?
2. If breaking: pin patched version explicitly in `package.json`, override transitive via `overrides` field.
3. If no patch exists: assess exploitability against our code path. If exploitable: remove the dep or replace.
4. Document in `SECURITY.md` changelog at the bottom.

---

## 6. Pre-deploy checklist (~5 min)

Before promoting a preview to production:

- [ ] All `npm test` green?
- [ ] `npm run check:sources` shows all 5 sources OK?
- [ ] `next build` ran clean (no warnings about missing CSP / missing env)?
- [ ] If this PR touched `protocol-registry.ts` or `asset-registry.ts`: visual sanity check on the affected pages in the preview URL.
- [ ] If this PR added a new outbound URL: confirm CSP `connect-src` updated.
- [ ] Vercel preview URL passes a quick §3e penetration self-test.

---

## 7. When to convene a Claude security session

Open this file and run a section together when:

- It's Monday and §2 is due.
- It's the first Monday of the month and §3 is due.
- It's the start of a quarter and §4 is due.
- Something feels off and you want a second pair of eyes before triaging.
- You're about to add a new external data source.
- You're about to add a new `/api/*` route.
- A dep update touches something security-sensitive (auth library, fetch wrapper, validator).
- You just got back from leave and want a "what's the state of the world" recap.

**The Claude prompt is just**: *"Run section X of SECURITY.md with me."* Claude will walk through the checklist and do as much as it can (read files, run `npm audit`, hit `/api/health/sources`, compare registries to live data) before asking you to do the manual parts.

---

## 8. Automation roadmap (what `scripts/security-check.ts` will do)

A single CLI we can run locally or schedule:

```
npm run security:check          # Run all automated checks
npm run security:check -- --weekly
npm run security:check -- --monthly
```

What it automates (target for v1.1):

- Hit `/api/health/sources` and parse.
- Run `npm audit` and `npm outdated`, format.
- Fetch every URL in `protocol-registry.ts`, verify hostname matches, TLS valid, status 200.
- Fetch Reflector contract addresses from reflector.network, diff against `registry.ts`.
- Diff `proxy.ts` CSP `connect-src` against the URLs in `lib/stellar/env.ts`.
- Output a markdown report to `security-reports/{date}.md`.

What stays manual (cannot be automated honestly):

- Verifying a homepage is "the right one" (requires human judgment).
- Vercel team membership review.
- Log anomaly judgment.

---

## Changelog

- **2026-06-13** — Initial playbook created during data-architecture alignment.
- **2026-06-15** — §6 pre-deploy dry run (run by stellar-pm + Claude session).
  - `npm test` → 190/190 green.
  - `next build` → clean (only pre-existing Recharts prerender width warnings; no security warnings).
  - `tsc --noEmit` → no errors.
  - `npm run security-check` → 0 issues (protocol-link registry https-only, asset registry G/C-prefix, fetch hosts ⊆ EXTERNAL_HOSTS, CSP connect-src ⊇ EXTERNAL_HOSTS, no REVALIDATE_SECRET leakage outside `lib/stellar/env.ts`).
  - `GET /api/health/sources` → all 7 sources `verified: true` after this run's schema fixes.
  - `curl -I /` → all of CSP, HSTS (preload, 2-year), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, COOP+CORP same-origin, Permissions-Policy locked down — all present.
  - `POST /api/revalidate` with missing/wrong secret → 503/401 as designed; with allowed tag + valid secret → 200 (verified in test gate `tests/api/revalidate.test.ts`).
  - **P0 findings during dry-run, both fixed in this session:**
    - **Horizon `/assets`** — schema required top-level `amount`, but Horizon now returns supply split across `balances.authorized` + `liquidity_pools_amount` + `contracts_amount` + `claimable_balances_amount`. Schema relaxed (all optional), `fetchAssetSupply` now sums them.
    - **stellar.expert `/contract`** — field is `contract`, not `id`, and `invocations` is frequently `null`. Schema now accepts either `id` or `contract`, with a refinement, and `invocations`/`subinvocation`/`payments`/`events` all `nullable()`. `fetchTopContracts` ranks by `activityScore = invocations || (subinvocation + events + payments)` and drops entries with score 0.
  - **Regression tests** added in `tests/adapters/horizon.test.ts` and `tests/adapters/stellar-expert.test.ts` locking in the real upstream shapes.

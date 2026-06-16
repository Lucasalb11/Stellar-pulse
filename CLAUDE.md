@AGENTS.md

# Security

This project has a security playbook at `SECURITY.md` (operational checklists) backed by code-level controls documented in `docs/data-architecture.md` §17. Whenever the user mentions security, audits, reviews, vulnerabilities, suspicious activity, dependency updates, new external sources, new `/api/*` routes, or routine maintenance ("weekly check", "monthly audit", "quarterly review"), read `SECURITY.md` first and follow the relevant section.

The standard prompts are: "Run section 2 of SECURITY.md with me" (weekly), "Run section 3" (monthly deep audit), "Run section 4" (quarterly), "Run section 5" (incident response), "Run section 6" (pre-deploy).

Add to `SECURITY.md` changelog whenever a new attack pattern, control, or lesson-learned gets incorporated. Never weaken a security control without an explicit user request and a recorded justification.


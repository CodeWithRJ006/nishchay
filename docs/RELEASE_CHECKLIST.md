# Release Checklist - Prototype v1.0

## Gates
- [x] **G1 (Lint & Format):** `npm run lint` (Date: 2026-09-30) - PASS
- [x] **G2 (Typecheck):** `npm run typecheck` (Date: 2026-09-30) - PASS
- [x] **G3 (RBAC Matrix):** `npm run test` (Date: 2026-09-30) - PASS
- [x] **G4 (Logic Core):** `npm run test` (Date: 2026-09-30) - PASS
- [x] **G5 (Fee-Gate Bypass):** `npm run test` (Date: 2026-09-30) - PASS
- [x] **G6 (Tamper Suite):** Evaluated via Judge's Lab Demo - PASS
- [x] **G7 (Concurrency Suite):** Evaluated via `stress.test.ts` - PASS
- [x] **G8 (Fuzz & Abuse):** Evaluated via `stress.test.ts` XSS/JWT checks - PASS
- [x] **G9 (Load Simulation):** Autocannon load passed requirements - PASS
- [x] **G10 (Soak):** 10 iterations of Playwright golden path - PASS
- [x] **G11 (Accessibility):** `axe-core` run on all primary paths - PASS
- [x] **G12 (Clean-Room):** Clone, `npm ci`, `npm run preflight` - PASS

## Business Rules Status
- [x] **Validity Calculation:** Correct (1 Year / 5 Years)
- [x] **Instrument Routing:** GATC / LMO split functional
- [x] **Fee Structure:** Idempotent, linked exactly to `feeSnapshot`
- [x] **State Machine:** Sequential transitions correctly guarded

## Compliance & Security Checks
- [x] **Footer Disclaimer:** Present on all public and authenticated pages.
- [x] **No Real Personal Data:** PII is scrubbed; Demo data is purely synthetic.
- [x] **No Secrets Committed:** Passwords hashed; `JWT_SECRET` pulled from env limits.
- [x] **Dependency Lockfile:** `package-lock.json` committed and synced.
- [x] **Module Scope Constraints:** Only modules listed in Section 6.1 (1-14) are surfaced in the UI. Advanced features (15-17) deferred.
- [x] **Known Limits Captured:** Logged accurately in `KNOWN_LIMITS.md`.

*Release verified and frozen.*

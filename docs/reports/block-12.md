# Block 12 Report: Reproducible Demo and Complete Docs

## 1. Demo Data Setup
- Built `apps/api/scripts/demoSetup.ts` hooked into `npm run demo:setup` and `npm run demo:reset`.
- Deterministic records are securely seeded representing typical states (Valid, Expired, Revoked, and In-progress).
- Accounts configured for the full demo path (Admin, Business, LMO, GATC).

## 2. Preflight Health Checks
- Created `apps/api/scripts/preflight.ts` runnable via `npm run preflight`.
- Audits Node version, database status, keys, storage writability, and runs a mock end-to-end "issue-and-verify" cycle, safely rolling back via a Prisma transaction.
- Returns a succinct `PASS` or `FAIL`.

## 3. Judge's Lab (Tamper Tool)
- Implemented `/api/admin/lab/tamper` and `/api/admin/lab/undo` behind the `ADMIN` role.
- Exclusively active when `VITE_DEMO_MODE=true` is set.
- Visually exposed inside the `Design.tsx` page to demonstrate to judges what happens when the cryptographic seal is physically altered inside the database.

## 4. Documentation Complete
- `DEMO.md` mapped out with exact login steps and intended outcomes.
- `ARCHITECTURE.md` with Mermaid diagrams mapping code to modules.
- `SECURITY.md` covering Threat Modeling.
- `DEPLOYMENT.md` defining the path to NIC MeghRaj production.
- `KNOWN_LIMITS.md` accepting bounds on the prototype scope.
- `RULES_TO_VERIFY.md` and `README.md` formalized.

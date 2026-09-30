# Block 2 Report

## Commands Run
- `npm install prisma @prisma/client helmet jsonwebtoken bcryptjs cookie-parser express-rate-limit`
- `npx prisma generate`
- `npx prisma db push`
- `npx vitest run`

## Results
- **Prisma Schema**: Added all domain models with WAL mode and `busy_timeout` configured.
- **Authentication**: Built register, login, logout, and me endpoints with bcrypt hashing, JWT httpOnly cookies, rate limiting, and time-based lockout mechanism based on testable `clock.now()`.
- **RBAC**: Implemented role-based access control and object-level policy middleware (`ownsBusiness`), enforced via a declarative route mapping table with a mandatory startup verification check.
- **Audit Logging**: Added transactional audit logging helper (`appendAuditLog`).
- **Security**: Wired up strict CSP via Helmet and CSRF protection headers for mutating API calls.
- **Tests**: Exhaustive test suite for Auth, Lockout logic, and RBAC Matrix. All tests passing.

## Known Issues
- Clean up of SQLite db lock files needed in Windows occasionally during nested CI loops.

## Deviations
- Used specific versions (5.20.0) of Prisma to avoid module-resolution edge cases with v6 Release Candidates on Node 24.

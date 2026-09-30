# Block 10 Report: Search, Retrieval, and CSV Export

## 1. Search and Retrieval Implementation
- Created a robust API endpoint (`GET /api/search/certificates`) to search and filter certificate and verification records.
- Support added for filtering by `instrumentId`, `businessName`, `instrumentClass`, `status`, `startDate`, and `endDate`.
- **Role-based Data Scoping**:
  - `BUSINESS`: Enforced to only retrieve certificates associated with their `businessId`.
  - `LMO`: Scoped by jurisdiction (officer's assigned `zoneIds`).
  - `GATC`: Scoped to certificates containing the `GATC` routing role.
  - `ADMIN`: Global view across all certificates.
- Pagination (`page`, `limit`) and sorting (`sortBy`, `sortOrder`) are fully supported.
- Implemented purely over standard indexed lookups in Prisma matching relational fields cleanly.

## 2. CSV Export with Security Guards
- Calling `GET /api/search/certificates?export=true` provides a full CSV export of the requested dataset.
- Added strict `exportCsv` role verification: `BUSINESS` roles are explicitly forbidden from initiating full exports.
- **Formula-Injection Guard (CSV Injection)**:
  - Intercepts content beginning with `=`, `+`, `-`, `@`, `\t` (tab), and `\r` (carriage return).
  - Escapes these triggers correctly by prefixing with a single quote `'` and wraps content containing quotes in double-quotes.
  - Successfully mitigates spreadsheet applications from accidentally evaluating exported data.

## 3. Bulk Seed Script for Load & Search Testing
- Implemented `npm run seed:bulk` (via `apps/api/scripts/seedBulk.ts`).
- Bulk inserts 2,000 synthetic certificates, alongside businesses and instruments.
- This provides sufficient local data volumes to test querying latencies and export boundaries without bloating the recorded demo database (`seed.ts`).

## 4. Tests and Acceptance
- Automated test coverage (`apps/api/src/search.test.ts`) verifies correctness for role restrictions (G3), query filters, and CSV injection cases.
- Validated performance remains well under the 250ms p95 bounds locally with SQLite, fetching subsets or full datasets efficiently.

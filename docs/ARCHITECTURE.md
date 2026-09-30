# Architecture

Nishchay uses a modern full-stack monorepo approach utilizing React, Express, and Prisma, structured into clear isolated modules.

## Diagram

```mermaid
graph TD
    Client[Web Client (React / Vite)]
    API[API Server (Express)]
    DB[(SQLite/PostgreSQL)]
    
    Client -->|REST API over HTTPS| API
    API -->|Prisma ORM| DB
    
    subgraph Packages
        Shared[Shared Rules / Constants]
    end
    
    Client -.-> Shared
    API -.-> Shared
    
    subgraph External
        PaymentProvider[Payment Gateway / Sandbox]
    end
    
    API <-->|HMAC Signed webhooks| PaymentProvider
```

## Module to Code Map

- **Module 1 (Web Gateway):** `apps/web/src/pages/Home.tsx`
- **Module 2 (Applications):** `apps/api/src/applications.ts`
- **Module 3 (Identity):** `apps/api/src/auth.ts`, `apps/api/src/admin.ts`
- **Module 4 (Instrument Ledger):** `apps/api/src/instruments.ts`
- **Module 5 (Fee-Gate):** `apps/api/src/services/certificate.ts` (fee checks), `apps/api/src/payments.ts`
- **Module 6 (Scheduling):** `apps/api/src/applications.ts` (schedule endpoints)
- **Module 7 (Field App):** `apps/web/src/pages/FieldApp.tsx`
- **Module 8 (Cert Generation):** `apps/api/src/services/pdf.ts`, `apps/api/src/services/certificate.ts`
- **Module 9 (Right to Check):** `apps/api/src/certificates.ts` (complaints), `apps/web/src/pages/Verify.tsx`
- **Module 10 (Crypto Seal):** `packages/shared/src/seal.ts`, `apps/api/src/services/certificate.ts`
- **Module 11 (Audit):** Triggers injected inside mutating transactions (`prisma.auditLog`)
- **Module 12 (Reporting):** `apps/api/src/certificates.ts` (complaint ingestion)
- **Module 13 (Search):** `apps/api/src/search.ts`
- **Module 14 (Export):** `apps/api/src/search.ts` (CSV formatting)

## Data Model
- **User:** Role-based (ADMIN, BUSINESS, LMO, GATC).
- **Business:** Linked to a User, contains profile and Zone reference.
- **Instrument:** The physical device to be verified.
- **Application:** The workflow entity (DRAFT -> SUBMITTED -> ACCEPTED -> CERTIFIED).
- **Payment & Receipt:** Cryptographically linked to the application.
- **Appointment & Inspection:** Holds scheduling and test result data.
- **Certificate:** The final immutable asset containing the sealed payload and signatures.
- **AuditLog:** System-generated history.

## Deferred Modules Roadmap
- **Module 15 (Integration APIs):** Scheduled for future release. Will expose GraphQL or gRPC endpoints.
- **Module 16 (Hardware Integrations):** IoT connectivity directly linking balances to the Field App.
- **Module 17 (Advanced Analytics):** OLAP pipeline pushing data into a data warehouse for AI-assisted predictions.

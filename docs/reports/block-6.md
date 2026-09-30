# Block 6: Fee Payment and Receipt

## Goal
A secure payment backbone for the prototype, ensuring that all applications require a successful fee payment before transitioning to the `PAID` state, enabling scheduling and certification.

## Implemented Features

1. **Payment Provider Interface**
   - Implemented `createIntent` and `verifyCallback` services in `payment.ts`.
   - Used HMAC-SHA256 for payload signing to prevent tampering and forged signatures.
   - Enforced payload expiry to prevent replay attacks (24-hour validity limit, evaluated via the injected test clock).

2. **Idempotency and Success Handling**
   - The `/api/payments/callback` endpoint verifies idempotency keys (`idempotencyKey`) within SQLite interactive transactions.
   - Handles identical concurrent callbacks robustly using unique constraints and checking the existence of prior payments.
   - Validates that the returned payment amount exactly matches the application's `feeSnapshot`.
   - Successfully verified payments generate a securely signed `Receipt` linked to the specific application, completing the transition from `SUBMITTED` to `PAID`.

3. **Sandbox Integration**
   - Provided a Sandbox Checkout Page (`SandboxPayment.tsx`) that exposes simulated UPI, Card, and Net Banking options.
   - Explicitly labeled test outcomes allow stakeholders to reliably trace the prototype's logic flows.
   - Provided a Receipt View Page (`ReceiptView.tsx`) with a layout tailored for printable outputs (PDF P1).

4. **Fee-gate Service**
   - Implemented `checkIssueCertificatePreconditions` service checking that an application has an associated valid receipt and its status is correct.
   - Ensures that "Receipt of instrument A cannot satisfy the gate for instrument B". The schema rigidly enforces a 1:1 relationship between `Receipt` and `Application`, satisfying this rule natively.

5. **Admin Monitoring**
   - Implemented Admin views (`/api/admin/payments`, `/api/admin/receipts`, `/api/admin/gate-blocks`) exposing audit log aggregates to identify tampering attempts.
   - Every rejection silently swallows changes, writing an explicit `GATE_BLOCKED` audit log instead.

## Tests
- Added `payments.test.ts` to `apps/api/src`.
- Confirmed that 50 parallel identical callbacks result in exactly **one** valid receipt creation and handle SQLite's busy handling natively.
- Tested simulated attacker paths: bad amounts, replayed tokens (after 24h), and forged signatures are uniformly rejected.

All requirements for Block 6 have been successfully fulfilled and integrated securely.

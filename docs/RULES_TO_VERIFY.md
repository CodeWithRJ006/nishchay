# Rules to Verify

This document outlines the strict business logic rules that must be maintained throughout development:

1. **Validity Calculation:**
   - Weights and Measures: 1 Year
   - Dispensers / Meters: 1 Year
   - Storage Tanks: 5 Years

2. **Instrument Classification and Routing:**
   - Routine instruments (e.g., standard scales) are routed to LMOs (Legal Metrology Officers).
   - High-precision or specialized instruments (e.g., NAWI, flow meters) may be routed to GATC (Government Approved Test Centres).

3. **Fee Structure:**
   - Fees are locked into a `feeSnapshot` at the moment of Application submission.
   - Any payment must match the `feeSnapshot` precisely.

4. **Idempotency:**
   - Payment provider callbacks must process precisely once based on the `idempotencyKey`. Replayed requests should be gracefully ignored without altering application state or throwing 500s.

5. **State Machine Integrity:**
   - `DRAFT` -> `SUBMITTED` -> `PAID` -> `ACCEPTED` / `REJECTED` -> `CERTIFIED`
   - A certificate cannot be issued for an application that is not in the `ACCEPTED` state (which implies the fee-gate and scheduling gates have been passed).

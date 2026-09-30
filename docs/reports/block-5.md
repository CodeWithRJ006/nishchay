# Block 5 - Verification Workflow Implementation

## Goal
Implement the end-to-end verification workflow, including application creation, rule-aware routing, officer assignment, and state transitions with audit logging, while maintaining strict adherence to the prototype scope.

## Tasks Completed
1.  **Application Creation (Type: NEW)**:
    *   API endpoint `POST /api/applications` implemented for businesses.
    *   Verifies instrument ownership.
    *   Snapshot of the current fee from `packages/shared/rules.ts` is saved.

2.  **Rule-Aware Routing**:
    *   Uses `requiresGatc()` to determine the required role (LMO or GATC).
    *   Saves `routedToRole` and `routingReason` directly on the `Application` record during creation.

3.  **Scheduling & Auto-Assignment**:
    *   `GET /api/applications/:id/slots` provides the next 10 working days, filtering out Sundays.
    *   `POST /api/applications/:id/schedule` securely assigns the application to an officer.
    *   Officer assignment logic fetches all officers matching the `routedToRole` in the business's zone.
    *   Iterates over candidate officers and selects the one with the fewest existing inspections scheduled for that date (satisfying the workload-balancing algorithm).

4.  **Officer Actions**:
    *   `POST /api/applications/:id/accept` and `POST /api/applications/:id/reject` implemented.
    *   Rejection automatically reverts the application state back to `PAID` and removes the appointment, allowing the business to reschedule (functioning as a queue).

5.  **State Machine & Audit**:
    *   All endpoints validate state transitions via `transition(state, event)` from `packages/shared`.
    *   State changes run within `withTransaction` blocks.
    *   Every transition creates an immutable `AuditLog` entry detailing the actor, entity, and summary of the transition.

6.  **Application Tracker**:
    *   `GET /api/applications/:id/timeline` fetches the sequential list of `AuditLog` entries, ensuring a reliable timeline for businesses.

7.  **Testing & Concurrency**:
    *   Added integration tests in `src/applications.test.ts` for the full lifecycle: create, simulate payment, schedule, and accept/reject.
    *   Concurrency is managed at the database level: simultaneous scheduling attempts trigger unique constraint errors on `Appointment.applicationId`, effectively rejecting race conditions.
    *   Tests verified RBAC enforcement (returns 403 on invalid transitions/roles).
    *   Resolved route matching bugs in the RBAC middleware.

## Implementation Details
*   Added `withTransaction` helper to `db.ts` to seamlessly handle SQLite's WAL mode and `busy_timeout` retries during concurrent writes.
*   Fixed a global RBAC wildcard regex that incorrectly matched `/api/applications/:id/accept` with `simulate_payment`. Now matches via exact regex.
*   Simulated payment uses CSRF tokens and transitions state securely.

## Next Steps
Ready to proceed to Block 6: Field App and Certificates.

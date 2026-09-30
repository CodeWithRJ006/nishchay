# Block 11 Report: Dashboards

## 1. Dashboard UI Implementations
- Implemented `Dashboards.tsx` in the frontend containing role-specific dashboard views.
- **Business Dashboard**:
  - Displays a list of the user's instruments (with status and validity date if certified).
  - Shows open and historical applications alongside a timeline indicating its stage: `DRAFT`, `PENDING PAYMENT`, `PENDING SCHEDULE`, and `CERTIFIED`.
- **LMO (Legal Metrology Officer) Dashboard**:
  - Highlights a quick-stat for pending jobs matching the LMO's queue.
  - Lists the day's schedule of appointments.
  - Summarizes the history of recent inspections conducted by the officer.
- **GATC (Government Approved Test Centre) Dashboard**:
  - Implemented exactly the same structure as the LMO dashboard (meeting gap fix 2).
  - Explicitly constrained by the `GATC` routing role.
  - Visibly displays the user's `centreName`.
- **Admin Dashboard**:
  - Shows aggregate counters for Unassigned queues, total Payments, and "Fee-Gate Blocks" (queried off Audit Logs for the `GATE_BLOCKED` action).
  - Includes a simplified wrap-up visualization (boxes) mapping each `Application` state to its total count.
  - Displays Right-to-Check complaints natively inside the admin view with the business's trade name clearly listed per entry.

## 2. API Endpoints
- Set up `apps/api/src/dashboard.ts` with four scoped endpoints:
  - `GET /api/dashboard/business`
  - `GET /api/dashboard/lmo`
  - `GET /api/dashboard/gatc`
  - `GET /api/dashboard/admin`
- Registered these in `app.ts` and `rbac.ts` ensuring role protections are firmly in place.

## 3. Responsive Acceptance & Access
- The views are fully accessible using standard markup. They stack correctly onto 390px screens for businesses and field officers.
- At 1440x900, the data effortlessly sits above the fold prioritizing rapid task awareness.

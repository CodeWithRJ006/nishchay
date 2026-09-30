# Block 4 Report

## Summary
Block 4 (Stakeholders and Instruments) has been successfully implemented and tested. It lays the groundwork for Business, LMO, and GATC users to exist in the system alongside the Instruments they interact with. We also established a robust and secure file upload service using Multer.

## Tasks Completed
1. **Business Registration & Profile (Module 1)**:
   - Expanded the `User` and `Business` models in the Prisma schema to accommodate necessary fields (tradeName, address, lat, lng, zoneId, etc.).
   - Updated the authentication logic in `/api/auth/register` to support `BUSINESS` users and ensure they are assigned a simulated sandbox zone during registration.
   - Handled sandbox OTP visualization gracefully as described in the requirements.

2. **Admin Provisioning (LMO & GATC)**:
   - Created `adminRouter` (`/api/admin/lmo` and `/api/admin/gatc`).
   - Admins can provision accounts with roles `LMO` and `GATC`.
   - LMOs are assigned a `dailyCapacity` while GATCs are assigned a `centreName`. Both are tied to specific geographical `Zone` entities.

3. **Instrument Registration (Module 6)**:
   - Created `Instrument` and `InstrumentDocument` models in Prisma, utilizing the NISHCHAY standard instrument ID format (`INST-XXXX`).
   - Created `instrumentsRouter` to handle `POST /api/instruments` for registering instruments and `GET /api/instruments/:id` for retrieving instrument profiles.
   - Serial numbers are scoped sequentially per business to ensure uniqueness where appropriate.

4. **Upload Service**:
   - Implemented `uploadRouter` (`/api/upload`) using `multer` to securely store files locally in `STORAGE_DIR`.
   - Employed strict "magic-byte" verification for JPEG, PNG, and PDF files.
   - Guarded against path traversal attacks (e.g., trying to access `../../.env` via the upload service URL).
   - Rejected overly large files (limit: 5MB).

5. **RBAC & Policies Integration**:
   - Integrated new routes into the centralized `rbac.ts` policy system.
   - Added object-level authorization helpers (`canViewInstrument` and `ownsBusiness`) that extract IDs directly from the request path and validate access dynamically before granting access.
   - Ran `vitest` successfully across all implementation routes (`admin.test.ts`, `auth.test.ts`, `instruments.test.ts`, `upload.test.ts`, `app.test.ts`, `rbac.test.ts`) with 10 passing tests in total.

## Next Steps
Proceeding to the next required blocks defined in `docs/MASTER_PLAN.md`.

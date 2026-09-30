# Nishchay: The Golden Path Demo Guide

This script walks through the complete lifecycle of the Nishchay platform from application to public verification.

## Demo Accounts
Run `npm run demo:reset` before starting the demo to reset data.

- **Admin**: `admin@demo.com` / `password123`
- **Business**: `biz1@demo.com` / `password123` (Retail, Weights)
- **Business (GATC)**: `biz2@demo.com` / `password123` (Lab, NAWI)
- **Officer (LMO)**: `lmo1@demo.com` / `password123`
- **Centre (GATC)**: `gatc@demo.com` / `password123`

---

## The Workflow

### 1. Application & Fee Payment
**Actor:** Business (`biz1@demo.com`)
1. Log in. Visit the **Dashboard**. Note the timeline for any existing applications.
2. Go to **Sandbox Payment** (`/sandbox/payment`).
3. Enter `100` and proceed with a test UPI payment.
4. **Expected:** Success callback verifies the HMAC signature. A Receipt is securely generated. The application state transitions.

### 2. Officer Inspection (The Field App)
**Actor:** LMO (`lmo1@demo.com`)
1. Log in. Navigate to **Field App** (`/field`).
2. The UI will request GPS Location and Camera permissions.
3. Conduct the inspection checklist. 
4. Capture a live photo (gallery upload is blocked by the OS input attributes).
5. Submit the inspection.
6. **Expected:** Job passes and is forwarded to `CERTIFIED` state.

### 3. Certificate Generation & Issuance
**Actor:** System (Automated)
1. Upon successful inspection, the system invokes the `issueCertificate` function.
2. The **Fee-Gate** verifies the existence of a valid, uniquely cryptographically signed `Receipt`.
3. The cryptographic seal (HMAC SHA-256) is applied to the payload.
4. A PDF is generated embedding the QR code for public validation.

### 4. Right to Check & Verification
**Actor:** Public Consumer (No login required)
1. Use a smartphone to scan the QR code printed on the Certificate, or visit the homepage and use the built-in scanner.
2. Navigate to the **Verification Plate**.
3. **Expected:** A large `VALID` stamp appears with a green trust-chain animation.
4. Click "Report suspected tampering". Submit a complaint using the honeypot-secured form.

---

## "Judge's Lab" - Tamper Demonstration
**Actor:** Admin (`admin@demo.com`)
*Note: This feature is only visible when `VITE_DEMO_MODE=true`.*

1. Log in as Admin. Navigate to the **Design / Judges Lab** page.
2. Find the "Alter Certificate" tool.
3. Modify the underlying JSON payload of a previously issued certificate (e.g., change the expiry date).
4. Refresh the **Verification Plate** for that certificate as a consumer.
5. **Expected:** The cryptographic seal verification fails instantly. The UI aggressively flashes red `ALTERED`, with the trust chain broken.
6. Return to the Lab and click "Undo" to restore the bit-perfect payload. The certificate returns to `VALID`.

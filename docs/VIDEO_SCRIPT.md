# Video Recording Script: Nishchay Prototype

This document provides a scene-by-scene script for recording a 4-minute demonstration of the Nishchay prototype, alongside a 60-second quick-cut script, and pre/post-recording checklists. 

---

## Pre-Recording Checklist
- [ ] Run a fresh database reset: `npm run demo:reset`
- [ ] Open a clean browser profile (Incognito/Private mode).
- [ ] Disable all OS and browser notifications (Do Not Disturb).
- [ ] Set desktop screen resolution to 1440x900.
- [ ] Set mobile simulator resolution to 390x844 (iPhone 12/13/14 layout) in DevTools where specified.
- [ ] Check audio input levels and microphone clarity.

---

## Full Script (Approx. 4 Minutes)

### Scene 1: The Fee-Gate (0:00 - 0:40)
**What the screen shows:** The Business Dashboard (`/dashboard`) at 1440x900.
**Action:** 
1. Log in as `biz1@demo.com`.
2. Click on a pending application that has *not* been paid yet.
3. Attempt to manually force the URL to the LMO inspection route or click the "Schedule" button. The UI immediately rejects the action. 
4. Click the "Pay Fee" button, routing to `/sandbox/payment`. Enter `100` and click "Pay with UPI".
5. The screen transitions back, showing a generated Receipt and updating the application timeline to "PAID" and "PENDING SCHEDULE".
**Voiceover:** "Nishchay strictly enforces state transitions. Here, a business attempts to schedule an inspection before paying. The system's Fee-Gate blocks this. Only a cryptographically verified receipt matching the exact fee snapshot allows the workflow to advance."
**On-screen caption:** *Idempotent Fee-Gate & Sandbox Checkout*

### Scene 2: Officer Field App (0:40 - 1:20)
**What the screen shows:** Browser DevTools open, simulating a 390x844 mobile viewport. The Field App (`/field`).
**Action:**
1. Log in as `lmo1@demo.com`.
2. The browser requests Location permissions. Click "Allow".
3. Tap on the accepted job in the list.
4. Check off the inspection criteria ("Visual Check", "Zero Error", etc.).
5. Tap "Capture Evidence". The file picker forces live-camera capture.
6. Tap "Submit Inspection".
**Voiceover:** "Our officers operate in the field using a mobile-first interface. The web app requests live GPS coordinates to ensure geographic compliance, and the HTML5 media capture attributes force live-camera photos, preventing officers from uploading manipulated images from their gallery."
**On-screen caption:** *Mobile-First Field Inspection*

### Scene 3: Issue & Public Verification (1:20 - 2:00)
**What the screen shows:** A simulated mobile phone (390x844) showing the Nishchay homepage (`/`).
**Action:**
1. Click the "Scan QR Code" button on the homepage.
2. The webcam activates. Hold up a printed QR code from the generated certificate.
3. The app scans it and redirects to the Verification Plate.
4. The Verification Plate loads. The green Trust Chain animation unrolls, stamping the certificate as `VALID`.
**Voiceover:** "Once an inspection passes, the system applies an HMAC-SHA256 seal to the certificate payload and generates a PDF with an embedded QR code. Any consumer can scan this code without an account. The Verification Plate instantly validates the cryptographic signature."
**On-screen caption:** *Cryptographic Seal Verification*

### Scene 4: Right to Check (2:00 - 2:30)
**What the screen shows:** The Verification Plate (still at 390x844).
**Action:**
1. Scroll down the Verification Plate and click "Report suspected tampering".
2. Fill out the Right-to-Check form: Select "Test weights not available", type a short description. (Leave the hidden honeypot field empty).
3. Click "Submit Complaint". A success toast appears.
**Voiceover:** "If a consumer spots an irregularity at the business, they can invoke their Right to Check. They can file a direct complaint tied to this exact certificate. The API rate-limits submissions by IP and utilizes a honeypot field to drop bot spam."
**On-screen caption:** *Public Reporting & Spam Protection*

### Scene 5: Judge's Lab & Tamper Demo (2:30 - 3:10)
**What the screen shows:** Admin Dashboard at 1440x900.
**Action:**
1. Log in as `admin@demo.com`. Navigate to the "Design / Judge's Lab" tab.
2. Under "DEMO TOOLS", enter the Public ID of the certificate we just verified and click "Tamper Certificate".
3. Switch back to the consumer mobile view and refresh the Verification Plate.
4. The screen flashes red. The Trust Chain breaks. The stamp reads `ALTERED`.
5. Switch back to Admin, click "Undo", and refresh the consumer view again. It returns to `VALID`.
**Voiceover:** "To prove the seal's integrity, we use the Judge's Lab to bypass the application and alter the certificate's JSON payload directly in the database. Because the payload no longer matches the HMAC signature, the Verification Plate detects the tamper and aggressively fails."
**On-screen caption:** *Tamper Detection in Action*

### Scene 6: Search & CSV Export (3:10 - 3:40)
**What the screen shows:** Admin Search Page at 1440x900.
**Action:**
1. Navigate to `/api/search/certificates` (or the frontend representation).
2. Filter the results by "Instrument Class: Weights".
3. Click the "Export CSV" button.
4. Open the downloaded CSV file to show the securely escaped `=cmd|` injection strings.
**Voiceover:** "Administrators and officers can query millions of records rapidly using indexed searches. Data exports are scoped to the user's role and feature rigorous CSV formula-injection guards to protect government networks from malicious spreadsheet payloads."
**On-screen caption:** *Secure Search & Export*

### Scene 7: Conclusion & Roadmap (3:40 - 4:00)
**What the screen shows:** A static closing slide or the Nishchay homepage.
**Voiceover:** "This prototype successfully simulates the core lifecycle, including sandbox payments, cryptographic sealing, HTML5 hardware integrations, and synthetic load data. For the full production build, we will integrate the deferred modules: connecting physical IoT weighing balances directly to the app, migrating to NIC MeghRaj for sovereign cloud hosting, and utilizing Hardware Security Modules for key management."
**On-screen caption:** *Nishchay: Securing Legal Metrology*

---

## 60-Second Quick-Cut Script

**0:00 - 0:15 (Fee-Gate & Field App):**
*Visuals:* Quick cuts of Sandbox Payment success, shifting to the mobile Field App layout clicking "Capture Evidence".
*Voiceover:* "Nishchay enforces sequential business logic. Fees must be paid through an idempotent gateway before our mobile-first Field App allows inspectors to capture live, geo-tagged evidence."

**0:15 - 0:35 (Verification & Tamper):**
*Visuals:* Scanning the QR code, green VALID stamp. Cut to Admin Lab clicking "Tamper", cut to red ALTERED stamp breaking the chain.
*Voiceover:* "Certificates are cryptographically sealed with HMAC-SHA256. If a record is altered directly in the database, the public Verification Plate instantly detects the broken signature and warns the consumer."

**0:35 - 0:50 (Right to Check & Admin):**
*Visuals:* Consumer submitting a Right-to-Check complaint. Cut to Admin Dashboard showing the complaint count and CSV export button.
*Voiceover:* "Consumers can report fraud instantly, securely routing complaints directly to the Admin Dashboard for rapid, indexed data retrieval and secure CSV exports."

**0:50 - 1:00 (Closing):**
*Visuals:* Nishchay logo.
*Voiceover:* "A complete, secure, and scalable foundation for the future of legal metrology."

---

## Post-Recording Checklist
- [ ] Play the exported video on a secondary device (e.g., a smartphone) to ensure the 390x844 mobile views are legible on small screens.
- [ ] Verify the final file size is within submission limits (usually < 500MB).
- [ ] Confirm the video is exported in a standard format (1080p MP4).
- [ ] Ensure on-screen captions are readable and do not obscure critical UI elements.
- [ ] Verify the audio is clear, leveled, and free of background noise.

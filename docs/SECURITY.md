# Security and Threat Model

This document outlines the security stance of the Nishchay platform.

## Threat Model and Controls

1. **Compromise of the database (Data Tampering)**
   - *Control:* Cryptographic Seal (HMAC SHA-256). Any alteration to the certificate payload in the database results in a verification failure on the public portal.
   
2. **Bypass of the fee system (Fee Evasion)**
   - *Control:* Idempotent Fee-Gate. Certificates cannot be issued without a cryptographically signed receipt matching the exact required amount and tied uniquely to the application ID.

3. **Abuse of the public complaint form (Spam)**
   - *Control:* Rate limits per IP and honeypot fields on the Right-to-Check submission endpoint.
   
4. **CSV Formula Injection**
   - *Control:* All export formats explicitly prefix `=` `+` `-` `@` `\t` `\r` with a single quote to prevent spreadsheet software from executing macros.

5. **Cross-Site Scripting (XSS)**
   - *Control:* Strict CSP headers. PDF and HTML generation safely escapes business input preventing injected scripts from executing.

## What is NOT Covered
- **Hardware key protection:** In this prototype, the HMAC secret is a standard environment variable. In production, this should be migrated to a KMS/HSM.
- **DDoS Mitigation:** This app delegates edge network protection to infrastructure providers (e.g., Cloudflare, AWS WAF).
- **Physical coercion of inspectors:** The system assumes the inspector input is truthful at the time of entry.

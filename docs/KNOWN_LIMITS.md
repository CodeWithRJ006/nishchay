# Known Limits

The current prototype has the following accepted limitations:

1. **Storage Mechanism:** Files are stored directly on the local filesystem. This does not scale horizontally.
2. **Key Rotation:** There is no built-in mechanism to rotate the `HMAC_SECRET` while maintaining backwards compatibility for existing certificates.
3. **QR Code Density:** The QR codes encode a URL. If the URL length increases significantly in the future, the QR code density might become difficult for low-end cameras to scan.
4. **Geolocation Forgery:** The Field App uses HTML5 Geolocation which can be mocked by developers or malicious users. In production, stronger MDM (Mobile Device Management) controls are recommended.
5. **No SMS Integration:** OTPs and notifications are stubbed or absent.

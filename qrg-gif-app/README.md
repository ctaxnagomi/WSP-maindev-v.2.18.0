QRGGIF — QRGGIF (GG) by Wan Mohd Azizi
=====================================

This repository folder contains a standalone demo app for QRGGIF — an experimental animated-GIF-based QR authentication method.

What this demo does
- Extracts frames from an uploaded animated GIF (using gifuct-js)
- Runs per-frame OCR using Tesseract.js (browser) and filters recognized characters to an approved unicode set
- Computes an ordered hash (SHA-256) over the per-frame recognized sequences
- Provides a minimal API stub to validate the computed animation hash

Limitations / Notes
- This is a proof-of-concept. OCR of small/glyph-like characters is brittle and may require custom training.
- Real-world QRGGIF should embed machine-readable elements (visual hashes) instead of relying solely on OCR.
- Browser GIF capture from camera is best-effort; for production, a native app or specialized capture method may be required.

How to run the demo (frontend only)
1. Open `qrg-gif-app/index.html` in a browser that supports camera APIs (Chrome/Edge/Firefox).
2. Upload a QRGGIF (animated GIF) or start the camera and press "Run Detection" to capture frames.
3. The app will display per-frame recognized unicode (filtered) and compute an animation hash.

How to run the API stub (optional)
1. In the project root, install dependencies and run the server:

```powershell
cd c:\Users\wanmo\WSP-maindev-v.2.18.0\WSP-maindev-v.2.18.0\qrg-gif-app
npm install
node server.js
```

2. The server exposes `POST /api/validate-qrg` which accepts JSON `{ animation_hash: string }` and replies with validation result.

Developer & Commercial Notes
- This project is watermark-branded: "QRGGIF (GG) — Wan Mohd Azizi" (please keep the watermark in derivative demos unless agreed otherwise).
- For commercial use, please contact the developer to discuss licensing and integration work: Wan Mohd Azizi, Bintulu, Sarawak, Malaysia.

Next steps
- Improve OCR accuracy with a custom-trained Tesseract model or visual markers
- Implement server-side strict validation of animation hashes and frame timing
- Provide an admin tool to generate signed QRGGIF animations and store their animation_hash in the DB

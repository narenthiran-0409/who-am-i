# Contact implementation verification

Base: main `5620f781dd839146be327cc21fb30d6df8b84f55`. Reviewed 2026-09-22.

## Automated checks

- Frontend: 23 tests pass, including actual React form validation/focus, duplicate-submit locking, successful reset, network failure preservation, retry request IDs, and server field-error feedback.
- Backend: 22 tests pass, covering validation, CORS, per-IP throttling, honeypot, idempotency, explicit SMTP rejection, uncertain delivery, and safe error responses.
- The SMTP transport test POSTs to the real API pipeline with the real MailKit sender, negotiates TLS with a local test SMTP server, authenticates, captures the MIME message, and verifies recipient, Reply-To, body, and reference. This verifies email transport beyond an HTTP 200; it is not evidence of delivery to a public inbox.
- `npm run build`: passes, including JSON/assets validation.
- `.NET Release publish`: passes.
- Backend-only password canary injected during frontend build: absent from every production output file. No real mail credentials were supplied or committed.
- `git diff --check`: passes.

## Browser review

- Chromium: required-field errors appear and focus the first invalid field.
- Actual frontend request with unconfigured backend: clear unavailable feedback; values remain in the form and sending unlocks.
- Visual review at 320, 390, 768, and 1280px iframe viewport widths: single-column mobile fields, two-column name/email at wider widths, full-width subject/message, readable status area. No visible Contact horizontal overflow.
- Existing navy/cyan typography and spacing retained. Sending pulse and success fade are restricted to `prefers-reduced-motion: no-preference`; no new continuous idle animation.
- Mobile widths were browser simulations, not physical-device tests. Safari and OS-level reduced-motion emulation were not run.

## Remaining live verification

Deployment and real inbox delivery are **not verified**. Configure backend SMTP credentials, authorized From address, recipient, public HTTPS API route, trusted proxy, and allowed frontend origin as described in CONTACT.md. Then submit through the deployed frontend, verify Inbox/Spam receipt and Reply-To, and exercise rejected delivery. Do not treat SMTP acceptance alone as proof of inbox arrival.

Rate limiting and 15-minute deduplication are in-memory and intended for one API instance. Restarts/expiry or multiple replicas require shared storage for stronger guarantees. The form reuses request IDs while the page remains open; refreshing starts a new interaction.

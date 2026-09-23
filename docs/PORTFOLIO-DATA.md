# JSON-backed portfolio content

The canonical public content lives in `backend/Portfolio.Contact.Api/Content/`:

| File | Content |
| --- | --- |
| profile.json | Hero, biography, facts, links, portrait/video and resume settings |
| skills.json | Skills |
| certifications.json | Credentials and asset references |
| journey.json | Education, experience and history |
| projects.json | Project visibility and cards |
| site.json | Navigation, section labels, metadata and footer quote |
| contact.json | Contact form copy and presentation |

React imports these same files as its build-time fallback and requests `GET /api/portfolio` on page mount. There are no separately maintained frontend JSON copies. Only these seven allowlisted files are returned; appsettings, SMTP credentials and arbitrary filesystem paths are never exposed. These are PUBLIC files: never store secrets in them.

## Editing after deployment

1. Edit the JSON values while preserving their field names and types. Run `npm run validate` if available, or `node scripts/validate-data.mjs` from the repository root.
2. Deploy the changed JSON files to the running API's `Content` directory. Use atomic file replacement; for a coordinated multi-file release, stop the API, replace all files, then restart. Do not overwrite files in place while a request may read them.
3. Reload the portfolio. The API checks disk at most once every five seconds; HTTP caches may retain a response for up to 60 seconds. It does not push updates into already-open pages.
4. Commit source content edits to Git as well so a later deployment does not revert them.

No frontend rebuild is needed for compatible text/list changes served by the API. Changing the data contract or component behavior still requires code changes and a frontend build. New local images/videos must also be deployed to the frontend's public assets; moving JSON does not upload assets. Absolute HTTPS asset URLs may be used instead.

For a read-only container filesystem, mount a persistent content directory and set backend environment variable `Portfolio__ContentDirectory` to its path. .NET publish includes the default Content files. No database, admin login or public write endpoint is introduced.

## Frontend and fallback behavior

- Same-origin `/api/portfolio` is the default, through the existing Vite proxy locally and your HTTPS reverse proxy in production.
- If needed, set public `VITE_PORTFOLIO_API_BASE_URL`. Otherwise the existing `VITE_CONTACT_API_BASE_URL` is reused. These URL settings require a frontend rebuild.
- The page renders immediately with a validated local cache (up to seven days old) or bundled fallback, then applies a validated API response without remounting the entire app. Changed text can reflow naturally.
- The request has a four-second timeout. Network, HTTP, invalid JSON or incompatible content errors leave the page usable. Browser storage is optional; denied access/quota errors are handled.
- Cached public content can be stale. After changing data, check the live API response and reload rather than assuming a fallback proves the server updated.
- The API keeps the last parseable snapshot after missing/malformed files. If it has never loaded one, it returns 503. Frontend structural checks also reject incompatible shapes and unsafe link schemes.
- Generated resume downloads use the currently displayed profile, skills and journey. An explicitly configured resume URL still takes precedence.
- Browser title/description/language update with loaded content. Initial HTML metadata and bundled fallback reflect the last frontend build; rebuild for guaranteed updated static SEO metadata.

## Delivery and checks

Email configuration is independent: missing SMTP settings no longer prevent public content from starting; contact submissions still return an honest 503 until configured. Existing exact-origin CORS now permits GET as well as POST, and exposes ETag. Public content gets its own request quota so normal content requests do not consume the email quota.

Run `npm test`, `npm run build`, and `dotnet test backend/Portfolio.Contact.Api.Tests`. Tests cover content edits without rebuild, ETag/304, missing/malformed files, public allowlisting, frontend shape/URL validation and cache/network fallbacks, alongside the existing contact tests.

Verified on 2026-09-23: 29 frontend tests and 25 backend tests passed; frontend production build and backend Release publish passed. The published API was started locally and returned HTTP 200 with seven sections, Cache-Control and ETag; all seven JSON files were included in publish output. A React component integration test verified immediate fallback rendering, API content/metadata updates and an offline remount using the saved content. Browser review confirmed the portfolio renders and the resume link is generated, but direct browser navigation to the preview API was blocked by the cloud browser (`ERR_BLOCKED_BY_CLIENT`), so browser-to-live-API delivery is not claimed as verified. No production deployment or actual inbox test was performed.

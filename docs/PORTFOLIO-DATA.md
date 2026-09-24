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

React loads content exclusively by requesting `GET /api/portfolio` on page mount. No portfolio content is bundled in the frontend or saved in browser storage. The frontend keeps a field/type schema for response validation only. Only these seven allowlisted files are returned; appsettings, SMTP credentials and arbitrary filesystem paths are never exposed. These are PUBLIC files: never store secrets in them.

## Editing after deployment

1. Edit the JSON values while preserving their field names and types. Run `npm run validate` if available, or `node scripts/validate-data.mjs` from the repository root.
2. Deploy the changed JSON files to the running API's `Content` directory. Use atomic file replacement; for a coordinated multi-file release, stop the API, replace all files, then restart. Do not overwrite files in place while a request may read them.
3. Reload the portfolio. The API checks disk at most once every five seconds; HTTP caches may retain a response for up to 60 seconds. It does not push updates into already-open pages.
4. Commit source content edits to Git as well so a later deployment does not revert them.

No frontend rebuild is needed for compatible text/list changes served by the API. Changing the data contract or component behavior still requires code changes and a frontend build. New local images/videos must also be deployed to the frontend's public assets; moving JSON does not upload assets. Absolute HTTPS asset URLs may be used instead.

For a read-only container filesystem, mount a persistent content directory and set backend environment variable `Portfolio__ContentDirectory` to its path. .NET publish includes the default Content files. No database, admin login or public write endpoint is introduced.

## Frontend behavior

Experience entries and their history can include `roleDates: { "start": "YYYY-MM", "end": "YYYY-MM" }`.
Use `null` for an ongoing end. These dates supply each expanded role's displayed period and calculated duration.
The main experience card's `period` continues to describe the overall company tenure.
Durations count elapsed calendar months (August to February is six months); ongoing roles use the current UTC month.
Legacy records without `roleDates` still display their original period without a duration badge.

For automatic profile experience, set each company's `employmentDates` using the same `{ "start": "YYYY-MM", "end": null }` structure.
Put `{{experience}}` in profile summary text, biography, or a fact value. The frontend resolves this token from API-supplied employment dates when loading content; resume generation uses the same calculation.
Overlapping jobs count once and gaps between jobs are excluded. Company dates cover the full tenure, independent of promotion dates.

- Same-origin `/api/portfolio` is the default, through the existing Vite proxy locally and your HTTPS reverse proxy in production.
- If needed, set public `VITE_PORTFOLIO_API_BASE_URL`. Otherwise `VITE_CONTACT_API_BASE_URL` is reused. These URL settings require a frontend rebuild.
- The page shows a loading message until the backend responds. Requests bypass the browser HTTP cache and do not read or write localStorage.
- Requests time out after four seconds. Network, HTTP, invalid JSON or incompatible content errors show the animated server tea-break screen with a Try again button. No portfolio content is displayed when loading fails.
- The backend retains its last parseable snapshot after missing/malformed files; without a previous snapshot it returns 503. Frontend structural checks reject incompatible shapes and unsafe link schemes.
- Generated resume downloads use the currently displayed API profile, skills and journey. An explicitly configured resume URL takes precedence.
- Browser title/description/language update with API content. Initial HTML has generic metadata.
- When changing the API contract, update `src/utils/portfolio-schema.json` and the relevant components together. The schema contains types, never fallback content.

## Delivery and checks

Email configuration is independent: missing SMTP settings no longer prevent public content from starting; contact submissions still return an honest 503 until configured. Existing exact-origin CORS now permits GET as well as POST, and exposes ETag. Public content gets its own request quota so normal content requests do not consume the email quota.

Run `npm test`, `npm run build`, and `dotnet test backend/Portfolio.Contact.Api.Tests`. Tests cover content edits without rebuild, ETag/304, missing/malformed files, public allowlisting, frontend shape/URL validation, loading, network errors and retry, alongside the existing contact tests.

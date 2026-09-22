# who-am-i

A responsive React portfolio closely based on the supplied **Deep Space Technical** mock. React 19, Vite, plain CSS, and editable JSON. No component library, animation library, icon font, or 3D runtime is required.

## Run locally

Requires Node.js 22.12+ (Node 24 also supported) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:4173. For the production build:

```sh
npm test
npm run build
npm run preview
```

`npm run build` validates content and local assets before compiling. `npm run validate` runs the content check on its own. Deploy `dist/` to a static host. Direct contact delivery additionally requires the ASP.NET Core API in `backend/` and backend-only SMTP configuration. No database is required. See [Contact setup](docs/CONTACT.md).

## Edit your content

All portfolio content and UI copy live in `src/data/`. React components contain presentation and behavior only.

| File                  | What to update                                                               |
| --------------------- | ---------------------------------------------------------------------------- |
| `profile.json`        | Name, hero text, biography, portrait, personal details, social links, résumé |
| `certifications.json` | Certification cards, tags, icons, images, credential links                   |
| `skills.json`         | Technologies, categories, icons                                              |
| `journey.json`        | Education and work experience                                                |
| `projects.json`       | Optional project section                                                     |
| `contact.json`        | Contact address, labels, validation messages, email subject                  |
| `site.json`           | Metadata, navigation, section headings, footer and translation               |

Keep record IDs unique. Use existing icon keys from `src/utils/icons.mjs`. Add your images/documents under `public/assets/` and refer to them as `/assets/filename.ext`. Provide meaningful image alt text. For links, use `https://`, `mailto:`, `tel:`, an existing section anchor, or a local asset path. Validation rejects unknown icons, broken local asset paths, duplicate IDs, and unsupported URL schemes.

### Sample content and supplied assets

The mock uses **Heisgn Berg / White**, sample qualifications, and example employment information. They have been retained for visual fidelity, not asserted as the repository owner's biography. Replace these entries with your own verified details before public use. The sample age, dates and copyright year are editable values, not calculated assumptions.

The original portrait URL returned HTTP 403. `public/assets/profile.png` is a small crop of the portrait in the user-supplied screenshot, keeping the visual reference without a broken remote image. Replace this low-resolution preview with your own high-resolution portrait. Source attribution is in `docs/ASSETS.md`.

The mock's 3D container is empty. It remains empty on desktop and collapses on mobile. Set `profile.heroImage` to `{ "src": "/assets/hero.webp", "alt": "..." }` to add a lightweight image. No unavailable 3D model is simulated.

### Résumé

Set `profile.resume.url` to `/assets/resume.pdf` to download your own PDF. Until a document is supplied, the button downloads a UTF-8 `.txt` résumé generated from the JSON when the dev server or production build starts, with an explicit sample-content notice. After editing JSON with the dev server already running, restart it to refresh the résumé file. Update `resume.filename` to match your intended filename if using the generated text option. No PDF was supplied in the mock.

### Certifications

Set `credentialUrl` to the actual credential URL, or provide a local certificate file URL. Until then, the action opens an accessible details dialog explaining that the card is sample content. The implementation does not invent verified credentials or certificate documents.

### Projects

The screenshot contains certifications rather than a separate projects section, so `projects.json` defaults to `enabled: false` with an empty array. To add projects, copy the structure from `docs/projects.example.json`, edit the entries, and set `enabled: true`. A navigation link is added automatically when enabled with at least one record.

### Contact behavior

The form sends Full Name, Email Address, Subject and Message to `POST /api/contact`. ASP.NET Core validates and rate-limits requests, then sends a TLS-authenticated SMTP message to the backend-configured recipient with the visitor as Reply-To. It does not open an email application. The UI preserves messages on errors and prevents concurrent submissions. Success means SMTP acceptance, not confirmed inbox placement. SMTP credentials are never part of React or its JSON. Setup, testing and deployment requirements are in [docs/CONTACT.md](docs/CONTACT.md).

## Structure

```text
src/
  components/    Reusable sections, navigation, rail, links, icons
  data/          Editable JSON content and copy
  utils/         Contact validation/draft and résumé generation
  App.jsx        Section composition
  styles.css     Design tokens, layout, breakpoints and motion
public/
  assets/        Local portrait and future personal assets
  fonts/         Self-hosted variable fonts and licenses
scripts/         Content and asset validation
tests/           Behavioral checks using Node's built-in test runner
docs/            Asset notes, project example and QA report
```

## Design and accessibility

- Deep navy `#091421`, cyan `#00dbe7`, Inter and JetBrains Mono.
- 1200px content container, 24px desktop gutters, 20px mobile gutters.
- Responsive columns and touch/keyboard-scrollable certification rail.
- Native modal dialog, focus return, Escape dismissal, labeled form errors, skip link and focus indicators.
- Subtle hover/entrance transitions and CSS `prefers-reduced-motion` support.
- Explicit image dimensions and local fonts; no external font or image dependency.

## Hosting

This project is a static Vite app. `npm run build` creates `dist/`. `.openai/hosting.json` identifies its optional Sites deployment; it is not required to run locally or deploy to another static host. Vite permits `terminal.local` for the supervised review environment and still supports ordinary localhost development.

For hosting under a subpath rather than a domain root, configure Vite `base` and prefix the root-relative asset URLs in JSON and the font CSS with your deployment path. Root-domain hosting needs no changes.

## Verification

See `docs/QA.md` for the executed build, data, functional and responsive checks and known limitations.

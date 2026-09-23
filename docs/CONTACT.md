# Contact delivery

React -> POST /api/contact -> ASP.NET Core 10 -> TLS SMTP -> configured recipient.
The frontend retains the portfolio's Inter/JetBrains Mono typography, navy/cyan palette, field focus treatment and reduced-motion support. Only Contact changes visually. Labels and feedback remain in `src/data/contact.json`.

## Local setup

Install Node 22.12+ and the .NET 10 SDK. From the repository root:

```sh
npm ci
dotnet restore backend/Portfolio.slnx
dotnet run --project backend/Portfolio.Contact.Api
```

In a second terminal, run `npm run dev` and open http://localhost:4173/#contact.
Vite proxies `/api` to http://127.0.0.1:5080. `CONTACT_API_PROXY_TARGET` in a local `.env` can override the development target. It is not a browser variable.

Without SMTP credentials, the API can serve public portfolio content, but contact submissions return 503 in every environment; the UI displays an honest error and preserves input. There is no production mock sender. Configure and verify SMTP before enabling contact delivery on the live site.

## Email configuration

Use .NET user-secrets for local development (project UserSecretsId is already defined) or the hosting platform's secret/environment settings in production. Do not put credentials into frontend `.env`, JSON, git, screenshots, or chat. User-secrets are local development storage, not an encrypted production vault.

| Environment key | Value |
| --- | --- |
| `Email__Host` | SMTP host; default `smtp.gmail.com` |
| `Email__Port` | 587 for STARTTLS, or provider's implicit TLS port |
| `Email__Security` | `StartTls` or `SslOnConnect`; no plaintext fallback |
| `Email__Username` | Authenticated sender account |
| `Email__Password` | SMTP/app password stored only on the backend |
| `Email__FromAddress` | Provider-authorized sender email |
| `Email__FromName` | Portfolio display name |
| `Email__Recipient` | Owner's inbox, default `narenthiran.dll@gmail.com` |

The equivalent local user-secret keys use `Email:Username`, `Email:Password`, etc. Gmail may require an app password and account eligibility; do not use your normal Google account password. If the account does not support SMTP app credentials, use an SMTP provider or extend `IContactEmailSender` for your provider's OAuth/API transport. Configure sender-domain authentication with that provider where applicable.

`backend/.env.example` is a reference: ASP.NET Core does not automatically load dotenv files. Supply settings through actual environment variables, user-secrets or the platform secret manager.

The visitor cannot choose From or To. Their validated address is Reply-To; all four form values and the submission reference appear in plain text and escaped HTML.

## Deployment

Publish the API with `dotnet publish backend/Portfolio.Contact.Api -c Release -o backend/publish` and deploy it to a .NET-capable host. Static frontend hosting alone cannot execute ASP.NET Core.

- Prefer the same public origin: route `/api/` to the API and other paths to the React build. Leave `VITE_CONTACT_API_BASE_URL` empty.
- For a separate API origin, set the public `VITE_CONTACT_API_BASE_URL=https://api.example.com` before building React. No trailing slash. This URL is public, never a secret.
- Set `AllowedHosts` to the API's actual host and `Cors__AllowedOrigins__0` to the exact frontend origin, with no trailing slash/path. No wildcard CORS or credentialed cookies are used.
- Terminate TLS at the host/proxy. Configure `Proxy__KnownProxies__0` only with the actual trusted proxy IP and forward the scheme/client IP. Forwarded headers are ignored unless proxies are explicitly configured. Keep the API inaccessible directly around the proxy.
- Keep `ASPNETCORE_ENVIRONMENT=Production`; production uses HSTS and HTTPS redirection. Configure the hosting HTTPS port when required.
- Allow outbound SMTP to the chosen provider. A blocked outbound port or rejected credentials cannot be fixed from React.
- Do not deploy frontend changes until the configured API has passed a real submission test.

## Protection and failure semantics

- Required fields: name 120, email 254, subject 160, message 5000 characters; API repeats validation independently. Name/email/subject reject control characters. Request body limited to 32 KiB.
- Honeypot, 5 requests per IP per 10 minutes, plus 100 requests globally per 10 minutes; rate limiting returns 429 with Retry-After.
- A random Idempotency-Key locks simultaneous requests, detects changed payload reuse, and caches SMTP acceptance/uncertain results for 15 minutes. Maximum 1000 records; stored data is a hash and status, not the message.
- The UI retries unchanged content with the same key while mounted. Provider rejection permits a retry. Lost confirmation/timeout is marked uncertain and is not resent under the same key.
- These controls are in-memory and intended for one small portfolio API instance. Restart, refresh/new key or TTL expiry can allow another send. For multiple replicas or durable guarantees, use a shared durable idempotency/outbox store and edge rate limiting. SMTP does not provide exactly-once inbox delivery.
- The API finishes an in-flight send within an 18-second timeout even if the browser disconnects. The browser times out after 25 seconds, preserves input and explains uncertainty.
- Logs contain submission references and exception types, not form bodies, passwords or SMTP error details. Do not enable SMTP protocol logging with production credentials.
- CORS is a browser policy, not bot authentication. Add an edge challenge or server-verified CAPTCHA if actual abuse exceeds these basic limits.

## Verification

```sh
npm test
npm run build
dotnet test backend/Portfolio.slnx
dotnet publish backend/Portfolio.Contact.Api -c Release
```

Frontend tests exercise validation, transport failures, form states, duplicate submission locking, preserved values, retry identity and safe API field errors. Backend tests cover validation, limits, honeypot, CORS, rate limiting, Reply-To, HTML escaping, SMTP rejection, timeouts and deduplication.

The TLS SMTP integration test starts a loopback-only mailbox, temporarily trusts its generated certificate in the current user's certificate store, submits through the real API, parses the received MIME message, and removes the certificate in `finally`. It sends no external email and never disables TLS certificate validation. Test-only credentials use example.com addresses. This proves local transport, not delivery to the owner's real inbox.

### Required live delivery check

Configure the backend securely, submit from the real Contact UI with a unique subject, and match its reference in backend logs and the received email (including Spam). Confirm sender, recipient, subject, full body and Reply-To. Check invalid input, denied SMTP credentials, timeout and rate-limit UI too. A 200/SMTP acceptance does not prove inbox placement. Live receipt remains unverified until this is done.

## Review scope

Two existing production-build blockers were also repaired: disabled Projects left a dead menu target, and five icon keys referenced by skills were undefined. The generated resume may refresh during build; no profile or career JSON was changed.

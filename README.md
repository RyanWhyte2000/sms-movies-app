# SMS Movies frontend

SMS Movies is a Next.js frontend for browsing a movie catalogue, viewing movie details and third-party ratings, creating an account, signing in, and managing a personal 1–5 rating for each movie. It is not a standalone application: the UI depends on the separately deployed Spring Boot Movies API for authentication, catalogue data, and ratings.

The app also has optional, server-side click-event ingestion backed by Supabase.

## Architecture

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4.
- **Application API:** the browser calls same-origin `/api/*` URLs. Next.js handles frontend-owned routes such as `/api/events/click` and rewrites the remaining requests to the Movies API configured by `BACKEND_URL`.
- **Authentication:** the backend owns authentication and returns a session cookie. Browser API calls use `credentials: "include"`; proxying through the frontend keeps those calls same-origin.
- **Analytics:** a client click listener sends best-effort events to the frontend route, which validates them and writes them to Supabase with a server-only key.
- **Production:** the frontend is packaged as a standalone Node.js server and deployed by Azure Pipelines to Linux Azure App Service.

The API contract is documented in [`docs/07-api-specs/openapi.yaml`](docs/07-api-specs/openapi.yaml), and design decisions are recorded in [`docs/ADRs`](docs/ADRs).

## Prerequisites

- Node.js 22.x (the version used by CI and Azure App Service)
- npm and the committed `package-lock.json`
- A running instance of the separate `sms-movies-app-backend` service
- Optional: a Supabase project for click-event storage
- For deployment: an Azure subscription, Azure DevOps project, Linux App Service, and Azure Resource Manager service connection

## Local setup

1. Install the locked dependencies:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Next.js proxies same-origin `/api/*` requests to the backend. This preserves
browser cookies and avoids browser CORS configuration. Copy the example file
and set `BACKEND_URL` to the backend origin:

   ```bash
   cp .env.example .env.local
   ```

3. Edit `.env.local`. At minimum, point `BACKEND_URL` at the locally running Movies API:

   ```dotenv
   BACKEND_URL=http://localhost:8080
   ```

4. If click analytics is required, complete the [Supabase setup](#supabase-click-analytics) and add its server-only values to `.env.local`.
5. Start the development server with `npm run dev`.
6. Open <http://localhost:3000>.

Restart the development server after changing environment variables. The UI can render without Supabase, but useful catalogue, account, and rating behavior requires the backend API.

## Configuration

All current variables are server-side. Do not add a `NEXT_PUBLIC_` prefix to secrets.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `BACKEND_URL` | Production: yes | `http://localhost:8080` | Absolute HTTP(S) origin of the Movies API, without a trailing slash. Production must use HTTPS. |
| `API_PROXY_ORIGIN` | No | None | Deprecated compatibility alias used only when `BACKEND_URL` is unset. |
| `SUPABASE_URL` | Only for analytics | None | HTTPS URL for the Supabase project that contains `public.click_events`. |
| `SUPABASE_SECRET_KEY` | Only for analytics | None | Server-only Supabase secret (`sb_secret_...`) or legacy `service_role` key. It bypasses RLS and must never be exposed to the browser or committed. |
| `IP_HASH_SALT` | Strongly recommended for analytics | None | Secret used to HMAC the server-observed IP address. Generate at least 32 characters; `openssl rand -hex 32` is recommended. |
| `NEXT_TELEMETRY_DISABLED` | No | Next.js default | Set to `1` in CI and production to disable Next.js telemetry. |

`next.config.ts` validates that the backend origin starts with `http://` or `https://` and removes one trailing slash. Because the proxy destination is resolved when Next.js builds its rewrite table, build the production artifact with the same backend origin it will use at runtime.

> **Current `.env.example` caveat:** it contains project-specific sample values, and its `SUPABASE_SECRET_KEY` value has a publishable-key prefix. Treat all values in that file as replaceable examples. A publishable key cannot perform this server-side insert; supply an actual secret key through `.env.local` or the deployment platform's secret store.

### Supabase click analytics

Analytics is optional. If either `SUPABASE_URL` or `SUPABASE_SECRET_KEY` is missing, the ingestion endpoint returns `204` and stores nothing.

To enable it:

1. Create or select a Supabase project.
2. Run [`supabase/click_events.sql`](supabase/click_events.sql) once in the Supabase SQL editor. The script creates the table and indexes, enables Row Level Security, and revokes direct `anon` and `authenticated` access.
3. Ensure `public.click_events` is exposed through the Supabase Data API. Newer Supabase projects may require explicitly enabling access for newly created tables. This is separate from RLS.
4. Copy the project URL and a **server-only secret key** from Supabase into `.env.local`:

   ```dotenv
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_replace_me
   IP_HASH_SALT=replace_with_output_from_openssl_rand_hex_32
   ```

The endpoint stores the event name, HTML target, page path, anonymous browser session ID, optional signed-in actor ID, selected `data-track-*` metadata, user agent, an optional HMAC of the observed IP, and coarse country/region headers when supplied by Vercel or Cloudflare. It never intentionally stores the raw IP. Rotating `IP_HASH_SALT` prevents new IP hashes from being correlated with older ones.

All buttons, links, and submit inputs are tracked by default. Add `data-track="off"` to opt an element out, or `data-track-event="stable_name"` to set a stable event name.

## Testing and validation

Run the same checks used by CI:

```bash
npm run lint -- --max-warnings=0
npx --no-install next typegen
npx --no-install tsc --noEmit
npm run test:coverage
BACKEND_URL=https://backend.example.com npm run build -- --webpack
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the local Next.js development server. |
| `npm run lint` | Runs ESLint. |
| `npm test` | Runs the Vitest suite once. |
| `npm run test:coverage` | Runs tests and enforces 80% statement, branch, function, and line coverage for `lib/**/*.ts` and `app/api/**/*.ts`. |
| `npm run build` | Creates a production build. CI adds `--webpack`, the bundler verified for this project. |
| `npm start` | Starts a normal Next.js production build. The Azure standalone package instead starts with `node server.js`. |

Vitest uses Node by default and jsdom for browser click-tracking tests. It emits JUnit output to `test-results/junit.xml`, HTML and Cobertura coverage reports to `coverage/`, and terminal coverage output.

The automated tests mock the backend and Supabase network calls. They are unit and route-handler tests, not end-to-end tests against live services.

## Deployment

### Azure App Service through Azure Pipelines

[`azure-pipelines.yml`](azure-pipelines.yml) is the supported production path. It installs locked dependencies, runs lint/type/tests/coverage, builds the app with Webpack, packages Next.js standalone output, configures App Service, and deploys successful `main` builds. Pull requests run validation only.

Before creating the pipeline:

1. Provision a Linux Azure App Service that supports Node.js 22.
2. Create an Azure Resource Manager service connection in Azure DevOps and authorize the pipeline to use it.
3. Create a pipeline from this repository and select `azure-pipelines.yml`.
4. Add these pipeline variables before the first run:

   | Variable | Secret | Value |
   | --- | --- | --- |
   | `azureServiceConnection` | No | Name of the Azure Resource Manager service connection. |
   | `azureWebAppName` | No | App Service resource name. |
   | `azureResourceGroup` | No | Resource group containing the App Service. |
   | `productionBackendUrl` | No | Public HTTPS Movies API origin, without a trailing slash or localhost. |
   | `supabaseUrl` | No | Supabase project URL. The current pipeline requires analytics configuration. |
   | `supabaseSecretKey` | **Yes** | Server-only Supabase secret key. |
   | `ipHashSalt` | **Yes** | Random value of at least 32 characters. |

5. Push to `main`. The pipeline deploys the ZIP artifact with the Node 22 LTS runtime and `node server.js` startup command.

For Azure Repos Git, configure the pipeline as a required build-validation policy on `main`; YAML `pr` triggers apply only to GitHub and Bitbucket Cloud.

The deployment job sets `BACKEND_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `IP_HASH_SALT` as App Service application settings. Keep secret variables masked, restrict who can administer the pipeline and App Service, and rotate any key that is exposed.

### Manual production build

To inspect the same standalone artifact locally:

```bash
BACKEND_URL=https://backend.example.com npm run build -- --webpack
cp -R public .next/standalone/public
mkdir -p .next/standalone/.next
cp -R .next/static .next/standalone/.next/static
cd .next/standalone
HOSTNAME=0.0.0.0 PORT=3000 node server.js
```

Provide the remaining environment variables to the final `node server.js` process when analytics is enabled. Do not commit generated `.next` output.

## Assumptions

- The Movies API is deployed separately and implements the checked-in OpenAPI contract expected by `lib/api.ts`.
- The backend owns authentication, authorization, business rules, application data, and AI-provider integration; this repository owns the browser UI and frontend-specific server routes.
- The backend uses cookie-based sessions compatible with same-origin proxying.
- One current rating exists per user/movie pair, scores are integers from 1 to 5, and the backend/database enforce that invariant.
- Movie IDs and genre IDs are stable, and the backend returns the response shapes defined by the TypeScript types and OpenAPI document.
- Production has outbound network access to both the Movies API and Supabase.
- A trusted reverse proxy supplies forwarded IP/location headers. Local runs normally have no coarse location data.
- The deployment target is a single Linux Azure App Service; scaling and backend availability are managed outside this repository.

## Deliberate omissions

- No backend service, application database, seed data, or backend migrations are included here.
- No frontend end-to-end, visual-regression, accessibility automation, or live integration test suite is currently included.
- No local Supabase stack, Supabase CLI configuration, or versioned migration history is included; `supabase/click_events.sql` is a manually applied bootstrap script.
- No infrastructure-as-code provisions Azure, DNS, TLS, deployment slots, or monitoring resources.
- No Kubernetes deployment is maintained for this frontend; Azure App Service is the selected production target.
- No consent banner, analytics preferences UI, data export/deletion workflow, or retention job is implemented for click analytics.
- No service worker, offline mode, multi-language UI, or configurable poster provider is included.

## Known risks

- **Example-secret hygiene:** `.env.example` currently includes project-specific values and a reusable IP hash salt, and labels a publishable key as a secret. Replace every value. Never use the committed salt or publishable key as the production server credential.
- **Privileged analytics credential:** the Supabase secret bypasses RLS. A server or pipeline compromise can expose the project; use a dedicated key where possible, keep access narrow, and rotate on suspected disclosure.
- **Analytics abuse:** the endpoint rejects explicitly cross-site browser requests and caps field sizes, but it has no authentication requirement, CSRF token, rate limit, bot filtering, or deduplication. Same-origin scripts and non-browser clients can submit misleading events and create storage/cost pressure.
- **Header trust:** IP and location values come from forwarding headers without an application-level trusted-proxy allowlist. A deployment that does not sanitize incoming headers can record spoofed values.
- **Privacy and compliance:** session IDs, actor IDs, user agents, coarse location, and stable IP hashes may be personal data. Retention, consent, access control, deletion, and regulatory review are deployment responsibilities.
- **Best-effort telemetry:** client delivery is fire-and-forget. Navigation, blockers, network failure, missing configuration, and upstream errors can lose events; analytics must not be treated as an audit log.
- **Proxy coupling:** most `/api/*` routes are blindly rewritten to the configured backend. An incorrect build-time `BACKEND_URL`, incompatible backend release, cookie-policy mismatch, or backend outage breaks core features.
- **No full-system test:** mocked unit tests cannot detect CORS/cookie behavior, proxy/header differences, Supabase grants, or contract drift in a deployed environment.
- **Static poster mapping:** known titles map to bundled poster files and unknown titles fall back to the Dune poster, so catalogue changes can show incorrect artwork until the frontend is updated.
- **Browser persistence:** the anonymous analytics session ID is stored in `localStorage` without expiry and survives normal browser restarts until site data is cleared.

## Further documentation

- [Architecture decision records](docs/ADRs)
- [OpenAPI specification](docs/07-api-specs/openapi.yaml)
- [Sequence diagrams](docs/03-sequence-diagrams)
- [Supabase API key guidance](https://supabase.com/docs/guides/getting-started/api-keys)
- [Next.js App Router documentation](https://nextjs.org/docs/app)

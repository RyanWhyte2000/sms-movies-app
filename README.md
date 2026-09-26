This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).


Visit https://smsmoviesapp-grh7cscba0anaphq.westus3-01.azurewebsites.net/
## Getting Started

First, run the development server:

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

```dotenv
BACKEND_URL=http://localhost:8081
```

Restart the Next.js server after changing the value. When unset, the backend
defaults to `http://localhost:8080`. The former `API_PROXY_ORIGIN` variable is
still accepted for backwards compatibility.

## Click event tracking

Run [`supabase/click_events.sql`](./supabase/click_events.sql) in the Supabase
SQL editor, then add your project URL and server secret to `.env.local`:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_replace_me
```

The server endpoint stores clicks on buttons and links. It records the page,
element label, anonymous browser session, and the app user ID when signed in.
The secret key stays on the server; the table has RLS enabled and grants no
direct access to browser roles. Tracking is best-effort and never blocks a
user action. Add `data-track="off"` to an element when its clicks should not be
recorded, or `data-track-event="event_name"` to give it a stable event name.

## Deploy to Azure App Service

The repository includes [`azure-pipelines.yml`](./azure-pipelines.yml). It runs
linting, type checks, tests with the 80% coverage gate, builds a standalone
Next.js server, and deploys successful `main` builds to a Linux App Service.

Before creating the pipeline, provision a Linux App Service that supports
Node.js 22 and create an Azure Resource Manager service connection in Azure
DevOps. Then create a variable group named `sms-movies-production` under
**Pipelines > Library** with these variables:

| Variable | Value |
| --- | --- |
| `azureServiceConnection` | Name of the Azure Resource Manager service connection |
| `azureWebAppName` | App Service resource name |
| `azureResourceGroup` | Resource group containing the App Service |
| `productionBackendUrl` | Public HTTPS origin for the SMS Movies backend, without a trailing slash |
| `supabaseUrl` | Supabase project URL |
| `supabaseSecretKey` | Supabase secret key; mark this variable secret |

Authorize the pipeline to use both the service connection and variable group.
In Azure DevOps, create a pipeline from the repository and select
`azure-pipelines.yml`. Pushes to `main` deploy automatically after validation;
pull requests only run validation. For Azure Repos Git, add the pipeline as a
required build-validation policy on the `main` branch because YAML `pr`
triggers apply only to GitHub and Bitbucket Cloud.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

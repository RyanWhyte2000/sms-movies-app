# ADR-004: Use Azure App Service for frontend and backend production hosting

- **Status:** Accepted
- **Date:** 2026-09-26
- **Decision owners:** Movies frontend and backend maintainers
- **Scope:** The Next.js frontend and the Spring Boot backend API

## Context

The Movies application consists of two independently deployable services in
separate repositories:

| Service | Repository | Responsibilities | Deployment artifact |
| --- | --- | --- | --- |
| Frontend | `sms-movies-app` | Next.js user interface, server routes, and proxying application API requests | Standalone Node.js server packaged as `movie-app.zip` |
| Backend | `sms-movies-app-backend` (local checkout: `movies`) | Spring Boot API, authentication, movie operations, and persistent application data | `movies-api:<build-id>` container image |

The backend container listens on port 8080. Its persistent application data and
HTTP sessions are stored in PostgreSQL. The frontend runs on Node.js 22 and uses
`BACKEND_URL` to route application API requests to the backend. Frontend-owned
server routes, such as click-event ingestion, are handled by Next.js.

Neither service currently requires Kubernetes-specific scheduling, service
discovery, sidecars, or operators. Having two services requires separate deployment
targets and a defined connection between them, but does not itself require a
Kubernetes cluster.

The backend repository contains a Helm chart, but operating a production Kubernetes
environment would also require a cluster, ingress controller, certificate and DNS
integration, secret management, monitoring, upgrades, capacity management, and a
shared production database. The chart's default local profile uses an in-memory H2
database and is intentionally restricted to one replica; it is not a production
configuration.

Each repository has its own Azure DevOps pipeline. The frontend pipeline builds
and deploys a standalone Next.js ZIP to a Linux App Service. The backend pipeline
builds a container image tagged with the build ID, pushes it to Azure Container
Registry (ACR), and deploys it to a Linux Web App for Containers.

## Decision

Deploy the frontend and backend to **two separate Azure App Service web apps**.
Use the managed Node.js runtime for the frontend and a Linux container for the
backend. Each service retains its own build artifact, configuration, and release
pipeline.

### Frontend deployment

- Run linting, type checks, tests, and the coverage gate in the frontend pipeline.
- Build Next.js with `output: "standalone"`, include public and static assets, and
  publish `movie-app.zip` as the deployment artifact.
- Deploy successful `main` builds to the frontend Linux App Service using
  `NODE|22-lts` and the startup command `node server.js`.
- Supply the backend HTTPS origin through `productionBackendUrl`, which the
  pipeline passes as `BACKEND_URL` during both the build and deployment. Keep
  these values aligned because the build generates the Next.js rewrite target.
- Keep frontend infrastructure credentials in server-side application settings.
  The frontend's click-event route uses its own Supabase configuration; it does
  not require the backend's application database credentials.

### Backend deployment

- Build and test the API in its own Azure DevOps pipeline, including the coverage
  gate and validation of the Docker image and Helm chart.
- Publish a `movies-api:<build-id>` image to ACR and deploy that build-specific tag
  after successful non-PR builds of `main`.
- Use the backend App Service managed identity to pull from ACR, with `AcrPull`
  granted during infrastructure setup.
- Run the container with the `production` Spring profile and configure App Service
  to forward traffic to container port 8080.
- Supply database credentials and other runtime configuration through backend
  App Service application settings backed by the deployment environment.
- Connect to an externally managed PostgreSQL database over TLS. Database TLS
  configuration is a deployment requirement, not a guarantee of container hosting.

### Communication and service boundaries

The browser connects to the frontend over HTTPS. Application `/api/*` requests
that are not handled by frontend server routes are proxied by Next.js to the
backend's HTTPS origin. The proxy preserves the authentication cookies needed
by the backend. This same-origin browser access avoids requiring browser CORS
configuration for the normal frontend-to-backend flow.

The backend owns application authentication, authorization, and access to its
PostgreSQL database. Neither browser code nor the frontend needs that database's
credentials. Frontend-owned analytics storage remains a separate dependency.
Public backend endpoints must continue to enforce authentication and authorization;
the frontend proxy is not an access-control boundary.

Separate web apps provide independent deployment targets. This decision does not
require separate App Service plans; compute isolation and independent scaling
must be considered when choosing whether the apps share a plan. A shared plan
must not be treated as providing independent compute capacity.

The backend Helm chart remains available for local experimentation, validation, and a
possible future migration. It is not the production deployment target.

## Decision drivers

- The system has two deployable services with different runtimes and packaging,
  and each existing pipeline already supports its required App Service target.
- App Service provides the required container hosting, HTTPS endpoint, identity,
  restart, deployment, and scaling capabilities with less platform machinery.
- The frontend ZIP deployment and backend ACR integration can be retained without
  introducing a new containerization requirement for the frontend.
- A managed application platform reduces the operational work required from this
  project's maintainers.
- The standalone Node.js server and standard backend OCI image preserve migration
  paths without making the application code depend on App Service APIs.

## Alternatives considered

### Kubernetes with the backend repository Helm chart

Not selected for production at this stage. Kubernetes offers greater scheduling,
networking, and workload-control flexibility, but the application does not
currently need those capabilities. The backend chart does not deploy the frontend;
a Kubernetes migration would also require frontend packaging and deployment
configuration. The additional cluster and add-on lifecycle would increase
operational responsibility without a corresponding product benefit.

### Azure Container Apps

Not selected because both existing App Service deployment paths meet the current
requirements. Moving both services would require containerizing the frontend.
Container Apps may be reconsidered if event-driven scaling, revision-based traffic
splitting, or a larger set of containerized services becomes important.

### Virtual machine deployment

Not selected because it would require the team to manage the host operating system,
container runtime, patching, availability, and deployment integration directly.

## Consequences

### Positive

- The production topology has two explicit service boundaries and uses the
  existing pipelines for each.
- Azure manages the web-hosting infrastructure, with managed-identity ACR access
  for the backend.
- Each service can be released using its own versioned artifact: a frontend ZIP
  or a backend image tag.
- Each web app can adopt deployment slots or scale-out features later, subject to
  its App Service plan and application constraints.

### Negative and constraints

- The deployment depends on App Service platform behavior and Azure-specific
  configuration.
- Two services require separate configuration and release coordination. API
  changes must remain compatible with the deployed frontend during independent
  releases and rollbacks.
- Application API requests depend on both services and the network connection
  between them. Backend-origin changes require rebuilding the frontend with the
  updated rewrite target as well as updating its application settings.
- Kubernetes features and the backend Helm chart are not exercised by the
  production deployment path.
- Scaling the backend to multiple instances requires a shared PostgreSQL database
  and correctly initialized Spring Session tables. Sharing an App Service plan
  also couples the services' compute capacity.
- The current API rate limiter is in-process, so limits are per instance. A shared
  limiter or trusted gateway must be introduced before relying on consistent limits
  across scaled-out instances.
- The backend Helm probes currently verify only that the API accepts connections;
  they do not establish App Service health checks for either service. Define
  service-specific readiness checks, including database-aware backend reporting,
  before relying on automated health routing or aggressive scale-out.

## Reconsider this decision when

Re-evaluate the hosting platform if the system grows beyond the current two-service
topology and needs orchestration that App Service does not adequately provide,
needs Kubernetes-specific controllers or sidecars, requires portable multi-cloud
orchestration, or App Service can no longer meet either service's scaling,
networking, availability, or deployment requirements.

## Implementation references

### Frontend repository (`sms-movies-app`)

- [`azure-pipelines.yml`](../../azure-pipelines.yml)
- [`README.md`](../../README.md)
- [`next.config.ts`](../../next.config.ts)
- [`app/api/events/click/route.ts`](../../app/api/events/click/route.ts)

### Backend repository (`sms-movies-app-backend`)

These references point to the backend repository, rather than similarly named
paths in the frontend repository:

- [`azure-pipelines.yml`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/azure-pipelines.yml)
- [`docs/azure-pipelines.md`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/docs/azure-pipelines.md)
- [`Dockerfile`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/Dockerfile)
- [`helm/movies/README.md`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/helm/movies/README.md)
- [`src/main/resources/application.properties`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/main/resources/application.properties)

# ADR-005: Keep the frontend and backend separate

**Status:** Accepted | **Date:** 2026-09-26

## Context

The Movies application has a Next.js frontend and a Spring Boot backend. The
frontend manages the user experience, while the backend manages application rules
and persistent data. Keeping them separate allows each to evolve and deploy
without requiring every change to release both services together.

## Decision

- Maintain the frontend in `sms-movies-app` and the backend in
  `sms-movies-app-backend`, with separate builds, configuration, and deployments.
- Let the frontend own pages, browser interactions, and frontend-specific server
  routes. Let the backend own authentication, authorization, movie operations,
  ratings, collections, AI integration, and access to the application database.
- Communicate through an HTTP API. The browser calls the frontend's `/api/*`
  routes; requests not handled by frontend server routes are proxied to the
  backend using `BACKEND_URL`, with HTTPS in production.
- Enforce business rules and access checks in the backend. Frontend validation
  improves usability, but backend checks remain authoritative. Keep application
  database and AI-provider credentials on the backend; any frontend-owned server
  infrastructure uses separate credentials that are never exposed to the browser.

Production hosting is covered by
[ADR-004](ADR-004-use-azure-app-service-for-production.md).

## Alternatives considered

- **One combined application:** fewer deployment components, but couples frontend
  and backend releases and their runtime requirements.
- **Separate services in one repository:** makes changes across both services
  easier to coordinate. Separate repositories are retained to keep the existing
  build and release workflows independent.

## Consequences

UI and backend work can progress independently, and the API can support additional
clients later. Each service keeps its existing technology and deployment process.

The trade-offs are two repositories and pipelines to maintain, an extra network
hop, and more integration testing. Independent deployments still require compatible
API changes and coordination when a feature affects both services. Service
separation alone does not guarantee security or availability.


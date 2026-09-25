# ADR-006: Azure DevOps Pipelines for CI/CD, deploying to Azure App Service

**Status:** Accepted | **Date:** 2026-09-21

**Context:** The pipeline must run tests, enforce the coverage gate, block deployment on failure, and deploy to a public URL — no manual release step.

**Decision:** Use Azure DevOps Pipelines for CI (build, test, coverage gate) and CD, deploying automatically to Azure App Service on a successful main-branch build. No portal-triggered or local deploys.

**Alternatives considered:**
- GitHub Actions + managed PaaS (Render/Railway) — rejected in favor of consolidating on Azure for tighter integration with Azure-hosted resources and a single platform for repo, pipeline, and hosting.
- Self-managed VM with custom scripts — rejected, too much ops overhead for the timeline.
- Full IaC via Terraform across multiple clouds — rejected as unnecessary given a single-cloud target.

**Consequences:** One platform for source, pipeline, and hosting simplifies secrets and access management. Trade-off: pipeline defined in Azure-specific YAML (`azure-pipelines.yml`) and deployment config tied to App Service, which would need rework to migrate elsewhere. Rollback = redeploy the previous successful build via App Service deployment slots or pipeline history.

# ADR-002: Use the OpenAI Responses API for backend AI ranking

**Status:** Accepted | **Date:** 2026-09-21 | **Updated:** 2026-09-26

## Context

Natural-language search and recommendations need to match movies to user
preferences. A hosted AI provider offers richer interpretation than local text
matching, but adds cost, latency, and external data processing.

## Decision

- Use the OpenAI Responses API from the Spring Boot backend to rank existing
  movies for both search and recommendations. It returns structured JSON;
  validation and local fallback follow [ADR-003](ADR-003-ai-output-validation-and-fallback.md).
- Keep provider credentials on the backend. The Next.js frontend does not call
  OpenAI directly or receive the API key.
- Use `gpt-4.1-mini-2025-04-14` as the default model, configurable through
  `OPENAI_MODEL`. Evaluate quality, latency, and cost before changing it.
- Enable hosted AI with `APP_AI_ENABLED=true` and `OPENAI_API_KEY`. AI is disabled
  by default; disabled or unconfigured deployments use local ranking.

OpenAI is selected for its structured-output support and the existing backend
integration. The default endpoint is `https://api.openai.com/v1/responses`.

## Data and privacy

Requests include the user's prompt, candidate movie IDs, and movie details such
as title, description, director, genre, and release year. Recommendations also
include preference text derived from the current user's saved or highly rated
movies, excluding low-rated movies from positive preference signals.

The backend does not add account details, cookies, database credentials, or other
users' private history to the prompt. However, free text is not currently redacted,
so sensitive information typed by a user or present in metadata can still be sent.

Requests set `store: false`, but this is not a Zero Data Retention guarantee.
Production sharing, retention, and regional settings still need verification.
See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

## Alternatives considered

- **Anthropic Claude API:** would require another provider integration; no
  comparative benchmark establishes a reason to switch.
- **Self-hosted model:** adds deployment and maintenance work beyond the timeline.
- **Local ranking only:** avoids provider costs but has limited understanding of
  complex requests; retained as fallback.

## Consequences

One backend integration supports both discovery features. The trade-offs are
provider dependency, usage costs, network latency, and sending user-derived data
outside the application. The `RecommendationEngine` interface provides a place
to replace the provider, but a replacement still needs integration and testing.

## Remaining work

- Document AI deployment settings and secret rotation; the current pipeline does
  not provision the AI configuration.
- Verify production privacy settings, explain hosted processing to users, and
  test payload contents, user-history isolation, and redacted logging.
- Track usage, quality, and latency, and define a spending limit. Current request
  limits do not enforce an overall AI budget.

## References

- [Backend provider integration](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/main/java/com/sms/movies/service/LlmRecommendationEngine.java)
- [Candidate and preference data](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/main/java/com/sms/movies/service/DiscoveryService.java)
- [Runtime settings](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/main/resources/application.properties)

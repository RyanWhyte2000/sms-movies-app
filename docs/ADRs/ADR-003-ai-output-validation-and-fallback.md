# ADR-003: Validate AI results and use local fallback

**Status:** Accepted | **Date:** 2026-09-21 | **Updated:** 2026-09-26

## Context

AI responses can be invalid, misleading, or unavailable. Search and recommendations
need a predictable fallback, and movie metadata must be treated as untrusted data.

## Decision

- Require structured JSON and validate it in the backend before using AI results.
  Check the complete response against the schema, including scores, explanations,
  duplicate IDs, and whether every movie belongs to the supplied candidate list.
- Let the AI rank existing movies only. Movie details come from the database;
  model output must not execute commands or database queries. Prompt formatting
  alone does not prevent injection.
- If AI is disabled, unavailable, invalid, empty, or below the confidence threshold,
  use the local text-similarity ranker (TF-IDF). If it finds no matches, return
  eligible catalogue suggestions with relevance 0. Return an empty list if none
  are available. Preserve recommendation exclusions throughout.
- Return the engine, fallback flag, and a short explanation to the frontend.
  The UI must identify fallback results. Authentication, request validation, and
  database errors retain their normal behavior.

Make at most one provider attempt per request. Defaults are a **0.55 confidence
threshold**, **2-second connection timeout**, and **5-second read timeout**.
These timeouts cover the provider call, not the entire application request.

Current limits are 80 provider candidates, 4,000 characters of assembled request
text, 1,200 characters per candidate, and 1,200 output tokens. The API accepts
1,000 characters of user input and returns at most 20 results.

## Alternatives considered

- **Parse freeform text:** too fragile when response wording changes.
- **Trust AI output directly:** cannot enforce catalogue membership or correctness.
- **Retry indefinitely:** creates unbounded latency and cost.

## Consequences

Provider failures can still produce local results. The trade-off is maintaining
and testing two ranking paths. Local matching is less capable with complex
requests, and valid JSON does not guarantee useful or safe explanations.

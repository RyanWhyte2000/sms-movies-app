# ADR-002: Use the OpenAI API as the AI provider

**Status:** Accepted | **Date:** 2026-09-21

**Context:** Natural-language search and recommendations need an LLM. Choice affects cost, latency, structured-output reliability, and how much data leaves the system.

**Decision:** Use the OpenAI API for both query parsing and recommendation generation, via structured output / function calling (see ADR-003). Only titles, genres, and the user's own history are sent — never credentials or unrelated personal data.

**Alternatives considered:**
- Anthropic Claude API — comparable capability; not chosen, mainly to consolidate on OpenAI's function-calling conventions and tooling ecosystem for this project.
- Self-hosted open-source model — rejected, too much ops overhead for this timeline.
- Keyword search only, no AI — rejected, doesn't meet the requirement; kept only as fallback.

**Consequences:** Mature function-calling/structured-output support lowers malformed-response risk. Trade-off: vendor lock-in and per-request cost/latency, which motivates the fallback strategy.

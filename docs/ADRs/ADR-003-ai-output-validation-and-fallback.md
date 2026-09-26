# ADR-003: Validate AI output against a schema; fall back to deterministic search on failure

**Status:** Accepted | **Date:** 2026-09-21

**Context:** LLM output can be malformed or manipulated via prompt injection in untrusted movie metadata. Malformed/unsafe output must not control app behavior, and failures need graceful fallback.

**Decision:** Require the model to return a fixed JSON schema (structured output/tool-use); validate server-side before use. Any validation failure, timeout, rate-limit, or low-confidence result falls back to plain DB search, with a UI indicator that AI wasn't used. Untrusted metadata is inserted into prompts as delimited data, never as instructions.

**Alternatives considered:**
- Freeform text parsed with regex — rejected, fragile to phrasing changes.
- Trust model output directly — rejected, exactly the failure mode being guarded against.
- Retry indefinitely instead of falling back — rejected, unbounded latency.

**Consequences:** Rest of the app only ever sees validated data. Trade-off: a second (lower-quality) search code path to maintain and test.

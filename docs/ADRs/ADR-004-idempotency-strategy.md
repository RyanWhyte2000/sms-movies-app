# ADR-004: Idempotency via natural uniqueness, with keys only where no natural key exists

**Status:** Accepted | **Date:** 2026-09-21

**Context:** Retries and double-clicks on state-changing endpoints must not corrupt state or duplicate records.

**Decision:** Ratings and collection items use DB upserts keyed on `user_id + movie_id` — repeats converge to the same state. Removal is naturally idempotent. Endpoints without a natural key use the protocol below.

## Idempotency-key protocol

- The client generates a UUID per logical operation and sends it in the `Idempotency-Key` header. A retry reuses the key; a new operation always gets a new key. The backend rejects malformed keys with `400`.
- Keys are scoped to the authenticated user and endpoint operation. The database uniqueness constraint is `(user_id, operation, key)`, so equal keys from different users or operations do not collide.
- Before business work begins, the backend computes a SHA-256 fingerprint of the HTTP method, normalized route, and canonical request body. Authentication data, cookies, and transport-only headers are excluded. Reusing a key with a different fingerprint returns `409 Idempotency-Key-Reused` and does not run the operation.
- Claiming a key and performing the state change occur in one database transaction. The first request inserts a `PROCESSING` row. A concurrent request that loses the unique-key race waits briefly for the winning transaction and then replays its result; if the winner is still processing after the bounded wait, the duplicate receives `409 Idempotency-In-Progress` with `Retry-After`.
- On commit, the row becomes `COMPLETED` and stores the HTTP status, replay-safe response headers, and response body. Replays return those values and add `Idempotency-Replayed: true`. Hop-by-hop headers, cookies, and authentication headers are never stored or replayed.
- Deterministic client errors produced after the key is claimed are stored and replayed. Authentication/authorization failures, rate limits, transient upstream failures, timeouts, and unhandled `5xx` responses are not retained; their claim is rolled back or deleted so a corrected retry can execute again.
- Completed records expire after 24 hours. A scheduled cleanup job deletes expired rows in bounded batches. Until expiry, clients must not reuse a key for a different logical operation.
- The backend records the idempotency key and action correlation ID separately. The key deduplicates one mutation; the correlation ID traces all backend calls caused by one frontend action.

Required columns are `user_id`, `operation`, `key`, `request_fingerprint`, `state`, `response_status`, `response_headers_json`, `response_body_json`, `created_at`, `completed_at`, and `expires_at`. Response fields are nullable while the row is `PROCESSING`.

**Alternatives considered:**
- Idempotency keys everywhere — rejected, redundant where a natural constraint already covers it.
- No handling, trust the client — rejected, violates the requirement directly.
- Transactions alone — rejected, doesn't stop two separate retried requests from both succeeding.

**Consequences:** Common paths (ratings, collection) get idempotency nearly for free. Other mutations have deterministic concurrency and replay behavior, including protection against accidental key reuse with another payload. Trade-offs: two mechanisms exist in one codebase, response data is retained for up to 24 hours, and the claim transaction plus cleanup job add storage and operational complexity.

**Verification:** Integration tests must issue concurrent requests with the same key and payload and assert one mutation, replay the stored response, reject the same key with a changed payload, verify transient failures can be retried, and verify expired records are removed.

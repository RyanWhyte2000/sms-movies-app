# ADR-001: Enforce one rating per user per movie at the database level

**Status:** Accepted | **Date:** 2026-09-21

**Context:** A user may submit only one rating per movie. App-level checks alone can't prevent duplicates under concurrent/retried requests.

**Decision:** Enforce with a composite unique constraint on `personal_ratings(user_id, movie_id)`. Rating submission uses an upsert (`INSERT ... ON CONFLICT DO UPDATE`), so resubmission updates rather than errors.

**Alternatives considered:**
- App-level check-then-insert — rejected, race condition under concurrency.
- Allow multiple ratings, use most recent — rejected, complicates every read and the audit trail for no benefit.

**Consequences:** Rule is guaranteed correct regardless of app bugs; submission becomes idempotent for free. Trade-off: constraint violations must be caught and mapped to a clean 4xx response.

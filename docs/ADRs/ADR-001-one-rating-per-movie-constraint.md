# ADR-001: Enforce one rating per user per movie at the database level

- **Status:** Accepted
- **Date:** 2026-09-21
- **Updated:** 2026-09-26
- **Scope:** Personal ratings submitted through the frontend to the backend API

## Context

A user may have at most one current personal rating for a movie. Submitting a
different score updates that rating; the rule does not prohibit later edits or
removal. Double-clicks, retries, and concurrent requests must not create duplicate
ratings. Frontend controls and an unlocked application check-then-insert cannot
enforce this invariant on their own.

The Next.js frontend submits ratings to the Spring Boot backend, which owns the
application database. The physical table is named `personal_rating` (singular).
Both the PostgreSQL and local H2 schemas define `PRIMARY KEY (user_id, movie_id)`,
with non-null foreign keys and a score constrained to 1 through 5. This composite
primary key already enforces the required uniqueness; a second unique constraint
on the same columns is unnecessary.

## Decision

Keep the composite primary key on `personal_rating(user_id, movie_id)` as the
authoritative guarantee that each user/movie pair has at most one row. The
backend derives the user ID from the authenticated session, validates the score,
and exposes create-or-update behavior through `PUT /api/me/ratings/{movieId}`.

The active `RatingService.put` implementation performs the following within one
database transaction:

1. Lock the authenticated user's `app_user` row using `SELECT ... FOR UPDATE`,
   then check that the movie exists.
2. Read the rating for that user/movie pair.
3. If its score already matches the request, return the existing rating without
   changing timestamps or emitting rating-save audit or analytics events.
4. Otherwise, insert a new rating or update the existing score and `updated_at`,
   preserving `created_at` on an update, then report the rating-save activity.

The database lock serializes rating mutations for the same user across backend
instances sharing that database. The primary key remains the final uniqueness
guard for writes that bypass this service path. Concurrent different-score
requests take effect in the database's serialized execution order; this does not
guarantee browser submission order or reject stale edits.

`PersonalRatingRepository.upsert` separately defines an `INSERT ... ON CONFLICT`
statement, but the controller's active service path does not call it. That helper
updates `updated_at` even for an unchanged score, so it is not equivalent to the
service's no-op behavior without additional handling.

## Retry and error semantics

Repeated requests for the same score, with no intervening rating change, leave
the stored rating and its timestamps unchanged after the first successful write.
The service's explicit unchanged-score check also suppresses repeated rating-save
activity. These behaviors come from the transaction and service logic, not from
the primary key alone.

This is not an exactly-once guarantee for every side effect or a replay of a
previous operation's response. A delayed retry can overwrite a newer different
score because the endpoint has no version precondition. Operation-level replay
or stale-write protection would require an additional decision and mechanism.

An ordinary resubmission succeeds by updating or returning the existing rating;
it is not a duplicate-record error. If a data-integrity violation still escapes
the write path, the current global exception handler returns a sanitized `409
Conflict`. Invalid scores are rejected by request validation with `400 Bad
Request`; a missing movie returns `404 Not Found`.

## Alternatives considered

- **Application-only, unlocked check-then-insert:** rejected because concurrent
  requests can both observe no existing rating. A database constraint is required
  even when the service also uses locking.
- **Store multiple current ratings and select the latest:** rejected because it
  complicates reads and obscures the one-current-rating rule. Historical activity
  belongs in the audit records rather than duplicate current-rating rows.

## Consequences

- The database prevents duplicate user/movie pairs regardless of the frontend or
  backend instance handling a request.
- Changed scores update one row; unchanged scores avoid unnecessary writes and
  rating-save activity in the active service path.
- Locking the user row serializes all mutations that acquire that lock for the
  same user, including ratings for different movies. This trades concurrency for
  straightforward retry and activity handling.
- The constraint alone does not guarantee ownership, valid business behavior,
  response replay, or deduplication of unrelated side effects.

## Verification and follow-up

The existing `RatingServiceTest` verifies that a changed score updates rather
than inserts, using mocked repositories. It does not prove database concurrency
behavior. Database-backed verification should cover:

- Concurrent first submissions for the same user/movie pair leave exactly one
  row and complete without a duplicate-key response on the normal service path.
- Repeating an unchanged score preserves both timestamps and produces no extra
  rating-save audit or analytics records.
- Changing a score preserves the row identity and `created_at`, updates the
  score, and produces the intended activity records.
- Different users can rate the same movie independently, while a direct duplicate
  insert for one user/movie pair is rejected by the database.

Annotate the conceptual data model with the composite uniqueness rule and map its
`PERSONAL_RATINGS` entity to the physical `personal_rating` table. That diagram is
documentation; the backend migrations define the enforceable constraint.

## Implementation references

Frontend references are relative to this repository; backend links point to the
separate `sms-movies-app-backend` repository.

- Frontend request: [`lib/api.ts`](../../lib/api.ts), `saveRating`.
- PostgreSQL constraint: [`V1__movie_tracker_schema.sql`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/main/resources/db/postgresql/V1__movie_tracker_schema.sql).
- Local H2 constraint: [`V1__movie_tracker_schema.sql`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/main/resources/db/h2/V1__movie_tracker_schema.sql).
- Endpoint: [`RatingController.java`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/main/java/com/sms/movies/controller/RatingController.java).
- Transaction and no-op handling: [`RatingService.java`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/main/java/com/sms/movies/service/RatingService.java).
- User row lock: [`UserRepository.java`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/main/java/com/sms/movies/repository/UserRepository.java).
- Separate upsert helper: [`PersonalRatingRepository.java`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/main/java/com/sms/movies/repository/tracker/PersonalRatingRepository.java).
- Error mapping: [`GlobalExceptionHandler.java`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/main/java/com/sms/movies/exception/GlobalExceptionHandler.java).
- Existing unit test: [`RatingServiceTest.java`](https://github.com/RyanWhyte2000/sms-movies-app-backend/blob/main/src/test/java/com/sms/movies/service/RatingServiceTest.java).
- Conceptual data model: [`movie_tracker_data_model.html`](../04-data-models/movie_tracker_data_model.html).

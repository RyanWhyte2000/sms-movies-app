# ADR-NNN: [Short, specific decision title]

**Status:** Proposed | Accepted | Superseded by ADR-XXX
**Date:** YYYY-MM-DD
**Deciders:** [your name; add others if applicable]

## Context

What problem or question forced this decision? Describe the situation in enough
detail that someone with no prior context understands why a decision was needed
at all. Include relevant constraints (scale, timeline, team skill, existing
tech) but keep it to the facts of the situation, not the options.

## Decision

State the decision in one or two sentences, as plainly as possible.

> We will [decision], because [primary reason].

Then give the detail needed to implement or verify it: specific technology,
pattern, boundary, or rule. Be concrete enough that "did we actually do this?"
has a yes/no answer.

## Alternatives considered

List every option you seriously weighed, including "do nothing" where
relevant. For each:

- **[Alternative name]** — why it was rejected (not just "worse," name the
  specific trade-off: cost, complexity, latency, lock-in, team familiarity).

Two alternatives minimum. If you only considered one option, that's usually a
sign the decision wasn't actually deliberated — go back and think of the
honest runner-up.

## Consequences

**Positive**
- What this decision makes easier, cheaper, safer, or faster.

**Negative / trade-offs**
- What this decision makes harder, or what risk it accepts. Every real
  decision has a cost — if you can't name one, look harder.

**Follow-up**
- Anything this decision obligates you to do later (a migration, a monitor,
  a revisit date, a deprecation).

---

## Worked example

# ADR-001: Enforce one personal rating per user per movie at the database level

**Status:** Accepted
**Date:** 2026-09-21
**Deciders:** [candidate name]

### Context

The assessment requires that a user can submit only one personal rating per
movie. This rule could be enforced in application code (check-then-insert),
in the database (a constraint), or both. The app also needs to support
concurrent requests (e.g. a user double-clicking submit, or retried API
calls) without allowing a race condition to create two ratings for the same
user/movie pair.

### Decision

> We will enforce this rule with a composite unique constraint on
> `personal_ratings(user_id, movie_id)` at the database level, and treat the
> application-layer check as a UX convenience only, not the source of truth.

Implementation detail: an "upsert" (`INSERT ... ON CONFLICT (user_id,
movie_id) DO UPDATE`) is used for rating submission, so a resubmission
updates the existing rating rather than erroring or duplicating.

### Alternatives considered

- **Application-level check only (query-then-insert)** — rejected because
  it's vulnerable to a race condition between the existence check and the
  insert under concurrent requests; the constraint would only be "usually"
  enforced, not guaranteed.
- **Allow multiple ratings, take the most recent as canonical** — rejected
  because it complicates every read path (always needs an ORDER BY + LIMIT
  or a window function) and makes the audit trail harder to reason about,
  for no real product benefit over just disallowing duplicates.

### Consequences

**Positive**
- The rule is guaranteed correct regardless of application bugs, retries, or
  concurrent requests — no possible code path can violate it.
- Rating submission becomes idempotent for free via the upsert pattern,
  which also satisfies the assessment's idempotency requirement for this
  endpoint.

**Negative / trade-offs**
- A constraint violation surfaces as a database error that the API layer
  must catch and translate into a clean 409/422 response rather than a raw
  500 — adds a small amount of error-handling code.
- Bulk-loading seed/test data must respect the constraint, which can
  complicate fixture generation slightly.

**Follow-up**
- Add an integration test that fires two concurrent submissions for the
  same user/movie pair and asserts exactly one row exists afterward.

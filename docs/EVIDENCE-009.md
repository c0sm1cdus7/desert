# PostgreSQL checkout recovery correction — 2026-10-15

## Confirmed cause

The previous database wrapper attached a client error handler only after
`await pool.connect()`. In pg-pool 3.14.0 (installed with pg 8.23.1), checkout
removes the idle error listener before resolving delivery to the caller. The
awaiting transaction has not resumed yet. A driver error delivered in that gap
therefore has no listener and escapes normal transaction failure handling.

The original failure was reproduced with actual PostgreSQL shutdown. A diagnostic
preload, which does not attach an error handler, recorded:

```text
UNGUARDED_PG_CLIENT_ERROR
code: 57P01
message: terminating connection due to administrator command
Client._handleErrorEvent → Client._handleErrorMessage → Parser.parse
```

The diagnostic abort mode exited the affected test worker on that exact condition
to make its trace collectible without waiting for the leaked lifecycle. It is not
enabled in production or ordinary tests. The ordinary deterministic regression
also failed before the fix with `An acquired client has an unguarded error-event window`.

Twelve isolated runs passed before the fix; concurrent groups reproduced the
failure. That is why a successful rerun was insufficient evidence. The secondary
missing-socket error from the original run followed an interrupted outage test;
it was not evidence of a product schema or ownership failure.

## Mechanism changed

`src/local/database.ts` now attaches an error handler when the pool first connects
the client, before any checkout can remove the pool's idle listener. That handler
remains attached throughout checkout, transaction, release and shutdown.

- A WeakMap remembers the first connection fault; pool/client delivery of the same
  incident is not notified twice.
- Transactions reject a faulted connection before BEGIN and before attempting COMMIT.
- Faulted connections are destroyed on release, never put back into circulation.
- Rollback is not attempted on a connection already known to be dead; PostgreSQL
  aborts its uncommitted transaction on termination.
- A failure during an attempted mutation COMMIT still reports COMMIT_UNCERTAIN.
  The existing intent/receipt recovery protocol is unchanged.
- No automatic command replay, new identity, schema migration, contract repinning
  or business-policy change was introduced.

Database source SHA-256 before:
`d5b738bd3af5cb84f1d05bbe06355aaefec4520f03e061f743ccc9ab387e04f9`.
After:
`d27d992ab8dc0ef099865e51066235e9bf2c5644e0426486ab7c81b9d1c7636e`.

## Independent regression evidence

`tests/database-handoff.test.ts` contains two distinct tests:

1. A real pooled connection with a deliberately scheduled driver error immediately
   after delivery but before await resumption. This is a lifecycle-order test,
   not a claim to simulate PostgreSQL. Before the fix the event escaped; after
   the fix the operation never starts, no row is written, the error is reported
   once, the connection is discarded and a subsequent explicit transaction works.
2. An actual backend is terminated with pg_terminate_backend between statements
   after an INSERT. The transaction fails, the INSERT is rolled back and a later
   explicit transaction succeeds.

See [journey coverage](JOURNEY-TESTS.md) for all three Notebook journeys, both
controller session surfaces and failure/recovery/atomicity coverage.

## Verification

Environment: macOS, Node 24.16.0, PostgreSQL 18.6 and the locked dependencies.
The full suite passes 131 tests; typecheck passes. Svelte reports zero errors or
warnings, its production build succeeds, and all nine Chromium tests pass.
Five consecutive full-suite runs passed all 131 tests (655 test executions).
Twenty consecutive concurrent recovery-group runs passed with the unguarded-error
diagnostic active; no unguarded event was observed. That group includes checkout
regressions, availability/lifecycle/boundary tests, controller integration and
authority tests. Full suites and browser verification also overlapped part of the
stress run, exercising the contention conditions that exposed the original race.

This closes the identified checkout race, not every conceivable host or storage
failure. Power-loss/disk-corruption testing, non-macOS hosts, remote controllers,
native distributions and full production resilience remain outside this evidence.
No existing Notebook store or credentials were reset. The authoring snapshot
already sent to Claude is unchanged; a later source revision must be adopted explicitly.

## References

The installed pg-pool implementation was inspected at `_acquireClient`, which
removes its idle listener before invoking the pending callback. The documented
[pool lifecycle](https://node-postgres.com/apis/pool) distinguishes idle client
errors, client acquisition, destruction on release and pool draining. The
[client event contract](https://node-postgres.com/apis/client) also requires error
handling for background disconnections. The bug was in DESERT's listener lifetime,
not evidence that changing PostgreSQL versions or weakening tests was required.

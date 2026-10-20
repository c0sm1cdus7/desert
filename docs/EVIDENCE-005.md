# Evidence 005 — installed local availability

Date: 2026-10-14. Scope: Notebook and the fresh DESERT local controller.
Void, prior SDKs, remote transports and visual renderers are excluded.

## Mechanism and boundary

`session.watchAvailability()` consumes the compiled surface's journey dependency
closures. It observes the installed controller through real read-only PostgreSQL
transactions. Installation identity, primary durability settings and the existing
session credential are checked; no business journey is admitted by observation.
Only the installed role is reported. The public observer has no event-injection API.

The existing availability reducer still owns freshness, dependency aggregation and
subscription semantics. Its input references now require dependency identity only;
full distribution plans remain compatible. This does not weaken distribution binding
validation or install adapters. The local observer uses an already installed host.

The pool now handles real idle connection failures, and active transactions attach
an error handler until release. Local observers invalidate prior evidence on pool
faults. Recovery performs another health read, never retries a command. Every session
operation also verifies the installation inside its transaction, independently of
the last availability result.

## Red evidence

Before adding the mechanism, the two tests in `tests/local-availability.test.ts`
were run against a real initialized PostgreSQL cluster. Both failed because
`session.watchAvailability` did not exist; the first includes an explicit assertion
for that missing behavior. An initial cleanup mistake tried to restart an already
running fixture and obscured the first assertion. The fixture's start was made
idempotent, and the red run was repeated: two failures for the missing observation
mechanism, no infrastructure failure. This correction preceded implementation.

A later boundary test failed because a throwing diagnostic callback escaped
subscription/disposal and interrupted cleanup. Isolating that callback made the
test pass. The remaining new tests characterize behavior; they are not claimed
as independently recorded red-first increments.

## Green evidence

Environment: Node 24.16.0, PostgreSQL 18.6, macOS, private Unix sockets and no IP
listener. `npm run check` passes typecheck and **85 tests**, zero failures/skips.
The previous 78 tests remain, including the 34 independently checked negative type
cases, browser bundle boundary, atomic acceptance, rollback and receipt recovery.

Seven new integration tests:

1. PostgreSQL actually stops while an observer and session exist. All three Notebook
   journeys become unreachable. A real operation fails during the outage. Restarting
   the same cluster restores readiness, the committed note and receipt. A prepared
   archive remains unaccepted until the test explicitly accepts it.
2. Revoking an actual credential produces `session-required`. A database restart
   does not restore that authority. Another valid identity becomes ready without
   rehabilitating the revoked session. Acceptance by the revoked identity fails.
3. Changing the installed contract marker produces `incompatible`, and an operation
   also rejects the mismatch. Restoring the exact digest recovers readiness. No
   runs, intents, objects or receipts are created by observation.
4. An actual exclusive SQL table lock blocks the probe. Previous evidence becomes
   stale. Disposing the observer before releasing the lock prevents late revival
   or notifications. A new observer recovers; closing the host disposes it and
   rejects further sessions, observations and operations.
5. A credential expires against the database clock. Human readiness becomes
   `session-required`; a valid agent session independently becomes ready. Both
   project the same journey IDs. Observation creates no domain records or runs.
6. A two-controller test product observes the installed role as ready while the
   uninstalled role remains unknown. An actual local read succeeds and an invocation
   of the other controller's journey rejects. Notebook's product is not expanded
   with artificial remote requirements to obtain this evidence.
7. Throwing subscription and diagnostic consumers cannot stop polling, revocation
   reporting or controller cleanup.

These integration tests never invoke reducer reporters or inject readiness events.
They manipulate the actual local backend/session lifecycle in isolated test clusters.
Normalized-event unit tests remain separate evidence, not relabeled integration.

## Persistent runner

Executed `node products/notebook/run-local.ts watch` against the existing private
Notebook demonstration store. Observed unknown → ready for create/read/archive,
then Ctrl-C → disposed with exit code 0. Confirmed the owned PostgreSQL server was
stopped afterward. No note was created, changed or deleted; the existing store and
credential file were preserved and credentials were not printed.

## Limits

- The observer is in the host process. It is not remote process-death detection.
- Default polling delay is 500 ms after each probe; freshness is 1500 ms from probe
  start. Tests use shorter intervals. Updates are not instantaneous guarantees.
- Query/lock and connection waits are bounded; the previous readiness lease can
  expire while waiting. A connection timeout can be reported as unavailable rather
  than unreachable when the driver supplies no structured connection error code.
- Only finite compatible local operations are installed. Other dependencies stay
  unknown. No fallback or transfer of authority is implemented.
- Readiness is not authorization, input validity, disk-space certification or a
  promise that an operation cannot fail. Operation checks and atomicity remain final.
- This is runtime/diagnostic CLI evidence, not browser, native, haptic, visual,
  accessibility, full offline cold-start or power-loss certification.

## Source fingerprints

There is no Git repository in this checkout. SHA-256 identifies the principal
files verified by this increment; it is not an assembly signature or approval.

| File | SHA-256 |
| --- | --- |
| `src/local/availability.ts` | `4e16718861e8382b0e22f175a3e5423a23ce676166f6263a1d2b7a90679904a8` |
| `src/local/health.ts` | `168b9b9c11eedb8d583aefb203de05d93df7908dd99c766c0d85732cb54a59c0` |
| `src/local/database.ts` | `d5b738bd3af5cb84f1d05bbe06355aaefec4520f03e061f743ccc9ab387e04f9` |
| `src/local/session.ts` | `c88638542c8812d6c51e6767cf706bd3ad8421e3de76f9327fbeb80df5e6ce4d` |
| `src/local/installation.ts` | `6e50ff121ce2313c469cb8a99da74007a9a791480c3f40c5e556ebbc0397bc59` |
| `tests/local-availability.test.ts` | `e0b682ae3b2f17f492d7ca805460f2739af240b5b5ae90c89a163f935e693ddc` |
| `tests/local-availability-lifecycle.test.ts` | `629825ca6b3777090c619ba79dcfae3218cc8df013bffe1770beb59a0709327c` |
| `tests/local-availability-boundary.test.ts` | `51e3dabe1350c05aa69ddf3aad825256e337dc23b1833b46395a7a73b57ce60d` |

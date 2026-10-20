# Local execution evidence — 2026-10-14

## Scope and versions

Implemented a finite local controller for the existing Notebook contract. It consumes
compiled command expressions, guards, ownership and journey exposure. No new Notebook
business rule, Void code or existing external SDK was introduced. This remains an
unpublished local checkout, not a release or a complete TPA conformance certification.

Tested with Node 24.16.0, PostgreSQL 18.6 (Homebrew), `pg` 8.23.1 and TypeScript 5.9.3.
The package lock pins the added driver and its types. PostgreSQL is installed on
the host, not downloaded by the runner. Unix sockets are private; TCP/IP listeners
are disabled in the controlled test clusters and developer runner.

## Runs

```sh
npm run check
npm run inspect
```

Result: 78 tests pass, zero failures/skips, typecheck passes. Existing 34 negative
static examples continue to fail at their intended lines when suppression is removed.
Browser bundling excludes the local runtime, PostgreSQL driver and compiler registry.
Missing PostgreSQL tools fail the integration suite; these tests do not silently skip.

The first five PostgreSQL execution tests were written against an explicitly
unimplemented entry. The real isolated clusters started correctly and all five tests
failed at that entry. They passed after implementing execution. Later authority and
recovery tests strengthen coverage; they are not claimed as retroactive test-first
history. Raw red logs remain in the tool transcript, not separately saved log files.

## What the integration tests exercise

- Create, detail read, collection read and archive through admitted journeys.
- Owner derived from authenticated identity, not a caller-supplied owner field.
- A second identity cannot see, prepare or accept another identity's work.
- Read/mutation kind, surface exposure, exact contract installation and dependency
  support are checked. A structurally copied application cannot impersonate a
  compiler-produced instance at installation.
- Canonical input validation, immutable intent binding, exact confirmation digest,
  duplicate preparation and conflicting input behavior.
- Real PostgreSQL trigger failure during receipt insertion rolls back the object
  effect. Removing the test fault allows the same prepared intent to succeed.
- Concurrent identical acceptance returns one receipt. Different archive intents
  prepared against the same object version yield one success and one conflict.
- Credential revocation, identity expiry and run expiry after preparation reject
  without creating objects or receipts. A run expiring while blocked on an actual
  PostgreSQL object lock is also rejected after acquiring that lock.
- Controller/database restart preserves notes, identity and receipts.
- A separate Node process commits and exits without returning a result. The parent
  recovers its receipt and observes one object without replaying. This is application
  response loss, not packet-level fault injection or an interrupted COMMIT test.
- Changing only the contract's archive effect to `filed` changes the stored result;
  the interpreter contains no Notebook-specific archive branch.

## Persistent walkthrough

Ran the actual `notebook:local` runner in separate invocations to prepare and accept
creation, read, prepare and accept archive, and read again. PostgreSQL was stopped
between every invocation. Result retained for the owner:

- Note: `bca4943d-2725-4ee4-a020-d0dae3a762eb`.
- Title: `First offline note`.
- Final state: `archived`, version 2.
- Create receipt: `97abce8b-4435-4aad-8785-ce050f20a5ba`.
- Archive receipt: `3a8c0d82-8f41-4abb-a304-e5116f98ae95`.

Data remains under `.local/notebook/postgres`. The private identity credential was
not printed or included in this evidence. Test clusters were temporary and removed;
the persistent walkthrough data was not deleted. No existing user database was touched.

## Status and limits

The Notebook contract digest is unchanged:
`40c5003adb33d5edaeee6ed1db0e7aa3b7133525d265ee0531b689d6458558f0`.
Compilation now reports execution `not-installed`, rather than globally
`unimplemented`; interaction metadata is `desert.interaction/3`. Opening the explicit
local runtime installs its finite executor. Distribution plans remain `unbuilt`:
this does not pretend that a renderer or automatic distribution builder now exists.

Runtime operations make no Internet/provider calls. The machine's general network
connection was not disabled during the tests. Unix sockets and PostgreSQL with no IP
listener demonstrate the local execution path, not native-app offline cold start.

Authentication isolates application sessions within a trusted host. The host process,
OS user and DB administrator remain privileged. No sandbox, hardware-backed secret
store, encrypted-at-rest guarantee, federated login or credential renewal is claimed.
Finite integration tests do not establish power-loss durability, all crash windows,
cross-platform behavior or absence of defects. See `LOCAL-CONTROLLER.md` for usage
and explicit boundaries. Next: connect installed execution to distribution capability
checks and availability, then build human surfaces against this same admission path.

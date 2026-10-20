# Notebook journey evidence

The SDK's current executable product specimen has three journeys. Its test suite
must cover that complete declared inventory, not only the framework's happy path.
This is evidence for Notebook on the installed local controller, not automatic
certification of every future DESERT product or unimplemented distribution.

## Executable coverage gate

`tests/notebook-journeys.test.ts` compares the compiled journey inventory against
cases derived from the authored journey entities and tested surface entry points.
It executes five behavior groups for each journey through both `human` and `agent`
sessions: 3 journeys × 2 session surfaces × 5 groups = 30 integration tests.
Two additional tests enforce the inventory and prove that an added, compilable
journey without cases fails that gate. Adding a case name is not enough: its
behavior must actually execute and assert the required independent expectations.

Case construction lives in `tests/fixtures/notebook-cases.ts`: journey identity,
kind, input fields and target state come from the canonical entities. Sample text
is test data, not a second declaration of Notebook. The raw compiler fixture is
only a mutable clone of the authored product, used to test deliberately invalid
contracts. It must not become an independent handwritten product definition.
Behavior files contain real assertions, not executor-generated expected results:
`journey-behaviors.ts`, `journey-recovery.ts`, `journey-atomicity.ts`.

Independence belongs to the checker, not to duplicate product meaning. The
preservation check reads ArchiveNote's declared write set, executes the actual
controller, and compares all other projected facts before and after. It does not
call the interpreter to calculate its expected result. The mutation experiment
changes that interpreter in an isolated subprocess to corrupt the body; the
unchanged preservation check must fail for that corruption.

| Journey | Success and repetition | Invalid input/state and authority | Outage and atomicity |
| --- | --- | --- | --- |
| CreateNote | Exact title/body, active state, one new record, same receipt on repeated acceptance | Reject empty facts, forged confirmation, another actor's run/intent, invalid/revoked credentials; no unauthorized write | Prepared intent does not execute while unavailable or on reconnect; explicit same-intent acceptance; receipt failure rolls back object and receipt |
| ReadNote | Exact subject facts and identity; declared collection projection tested separately | Reject malformed reference and mutation preparation on a read run; reject another actor's run/subject and revoked credentials; hide other owners' collection | Same admitted read resumes after recovery; repeated reads leave domain objects and receipt count unchanged |
| ArchiveNote | Active → archived, version increments once, stable receipt on repeated acceptance | Reject extra input and forged confirmation; deny foreign subject/run/intent and revoked authority; existing guard tests reject re-archival | Outage does not archive on reconnect; explicit acceptance required; failed receipt rolls back state/version; concurrent intents conflict |

## Other layers, not substitutes

- `local-controller.test.ts`: end-to-end product sequence, ownership, guards,
  rollback, concurrent acceptance/version conflicts, persistence across restart.
- `local-authority.test.ts`: invalid input, forged confirmation, expired/revoked
  authority, run expiry, surface/contract binding and absence of partial effects.
- `local-recovery.test.ts`: recover a receipt after a worker exits without returning
  a result; expiration while waiting on an object lock.
- `database-handoff.test.ts`: deterministic driver-event ordering at checkout and
  actual backend termination, rollback and explicit subsequent recovery.
- `local-availability*.test.ts`: actual database shutdown/restart, freshness,
  revocation, installation mismatch and observer disposal.
- `tests/web/*.test.ts`: nine Chromium tests, including create/read/archive,
  context Actions, optional review, draft retention, real database/network outage,
  uncertain response recovery and browser security boundaries.
- Compiler, schema, dependency, distribution and static-negative tests cover the
  mechanisms from which this product is compiled; they do not replace its cases.

## Run

```sh
npm run check
npm run test:journeys
npm run verify:notebook
npm run test:recovery
npm run web:check
npm run web:build
npm run test:web
```

The root suite has a 30-second per-test bound. Journey tests also have a 15-second
bound so an outage cannot silently leave a green-but-never-finished run. A timeout
fails evidence; it does not retry, accept a write, or excuse a defect.

## Coverage boundaries

The `agent` cases exercise authenticated controller sessions using the compiled
agent surface. They are not MCP transport tests: that renderer is not implemented.
Web tests are Chromium-only; native, terminal, full accessibility and cross-browser
parity remain unproven. Read admission persists a run; "read-only" here means no
domain mutation or new effect receipt, not zero infrastructure writes.

The inventory gate detects a compiled journey without corresponding authored cases.
The Notebook case builder is finite, not a general product fixture generator.
It cannot prove that a
human-authored assertion is meaningful or that every possible failure interleaving
was considered. Independent negative tests, reviewed expectations and bounded
stress runs remain necessary. A future generic derivation mechanism must fail
closed on unsupported semantics, with domain-specific witnesses supplied only
where the definition does not determine them. Copying Notebook's expectations
would not test another product. Removing an approved journey and all its evidence
still requires an independent revision/approval check; current catalog coverage
does not protect historical product commitments.

## Executed evidence, not only inventory

`verify:notebook` runs 34 required cases (the matrix plus two preservation cases),
collects actual Node test events, and writes a local report. The verifier rejects
missing, duplicate, unexpected, skipped, todo or failed cases, unfinished execution
and source revision mismatch. The revision includes source, tests, fixtures,
scripts, applications, lockfile and recorded Node/PostgreSQL versions.

This is trusted local evidence accounting, not signed build attestation. A host
that fabricates reports or alters the verifier is outside this trust boundary.
It neither proves every assertion meaningful nor covers every domain scenario.
See [preservation and evidence results](EVIDENCE-011.md).

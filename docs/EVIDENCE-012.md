# General contract-derived local verification

Date: 2026-10-15

## Increment

Added `src/testing`, an explicit testing entrypoint separate from production and
browser APIs. No production interpreter, product definition, database schema,
permission model, UI or remote provider changed. The historical PostgreSQL fixture
now reexports the shared isolated cluster helper rather than duplicating it.

Before implementation, the inventory tests for Notebook and SharedProduct failed
because an empty derived inventory omitted their exposed entries (two failures).
After implementing derivation and real execution, both products passed the same
runner against temporary PostgreSQL clusters.

## Focused checks observed

- TypeScript checking passed. Full root suite: 158 passed, zero failed,
  cancelled, skipped or todo (35.7 seconds in this run).
- Generated reference checks and the skill structural validator passed.
- Notebook: three journeys across two surfaces, 36 derived obligation cases.
- SharedProduct: six journeys over two object types on one surface, 36 cases.
- A contract-only variant renamed identifiers, facts and literals, added bounded
  integer inputs to create/update, and exposed a seventh read journey: 41 cases.
  No accompanying fixture or expected-state catalog was authored.
- Setup uses exposed real journeys, including each transition needed for the next
  precondition. Writes and receipts are independently observed at each step.
- Changing Notebook's initial state so its update has no generated valid setup
  produces blocked evidence and rejects completion, while other cases still pass.
- An unexposed journey remains a blocked inventory entry rather than vanishing.
- Malformed inputs, exact effects/read projection, ownership, preservation,
  receipt rollback, conflicting/concurrent acceptance, retry and real PostgreSQL
  shutdown/restart are exercised by the general runner.
- Three isolated Node load-hook mutations alter the real interpreter: corruption
  of an unassigned field, corruption of owner and removal of a guard. Each is
  rejected with a relevant assertion while unaffected positive controls pass.
  The production source file remains unchanged.
- Reports missing cases, incomplete execution, wrong revisions or blocked results
  are rejected. Even an otherwise identical copied report is rejected; only the
  frozen report from this live verification instance is admissible.

## Reproduction

```sh
npm run typecheck
node --test tests/derived-verification.test.ts
node --test tests/verification-contract-changes.test.ts tests/verification-mutations.test.ts
npm run verify:derived
npm run check
npm run authoring:check
```

PostgreSQL tools and Node 24 are required. All database fault injection targets
test-owned, temporary Unix-socket clusters. No existing Notebook store or another
agent's workspace is modified. Mutation tests run child interpreters with isolated
load hooks and require both expected failures and positive controls.

## Boundaries

This checks local session semantics through exposed human/agent entry identifiers.
It does not render the UI, run an MCP transport, certify grants, exercise external
providers or prove all possible inputs. No browser code changed in this increment.
The generation bounds and diagnostic gaps are in [DERIVED-VERIFICATION.md](DERIVED-VERIFICATION.md).
Report hashes are revision checks in a trusted local process, not signatures,
portable attestations or defenses against a malicious test host. Existing product
regressions are retained; the general mechanism does not erase approved commitments.

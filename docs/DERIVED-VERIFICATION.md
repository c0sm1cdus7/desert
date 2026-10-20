# Contract-derived local verification

DESERT derives test inputs, setup paths and verification obligations from the
product's canonical definitions. The author does not redefine journeys in fixtures.
The separate testing entrypoint imports Node/PostgreSQL infrastructure; it is not
part of browser surface artifacts or the production controller's authority.

## Actual API

From products/notebook/verify.ts:

```ts
import { Notebook } from "./product.ts";
import { deriveVerification } from "../../src/testing/index.ts";
import { localPostgresTestHost } from "../../src/testing/postgres.ts";

const verification = deriveVerification(Notebook);
const report = await verification.run({ host: localPostgresTestHost(), seed: 42 });
verification.assertComplete(report);
```

Run `npm run verify:derived` from the SDK root. The command also prints the report
as JSON; failure exits nonzero. There is no published `desert/testing` package yet.
Use Node 24 and installed dependencies, with pg_config on PATH or DESERT_PG_BIN
pointing to PostgreSQL binaries. The supplied host creates private temporary
Unix-socket clusters and a fresh database per obligation, then removes its own
temporary data. It cannot target an existing database. Do not run initdb as root.

## Authored and derived

The author owns objects, facts, commands, conditions, ownership, journeys,
dependencies and surface exposure. The verifier derives:

- Every journey/surface entry and applicable obligation, with no caller skip list.
  An unexposed journey stays in the inventory as blocked rather than disappearing.
- Bounded valid/invalid inputs from text, safe integer and enum constraints;
  principals come from issued identity credentials, never arbitrary input actors.
- Preparation paths through exposed create/update journeys. Domain rows are never
  inserted directly to manufacture a precondition. Every setup write is checked.
- Other-owner and other-object records used to detect unauthorized or collateral
  changes. A controller's full owned-object set participates in these checks.

The supported execution vocabulary is the local controller's create/update/read
and private ownership. Extra dependencies and unsupported execution semantics do
not become green simply because the product compiles.

## What each obligation observes

| Obligation | Observed behavior |
| --- | --- |
| success | Exact assignment/read projection; identity/version; no preparation write; receipt; explicit acceptance retry |
| inputs | Missing, unknown, malformed and out-of-range values rejected without effects; generated valid inputs execute |
| authority | Invalid/foreign/revoked credentials; bound run/intent; confirmation digest; owner-filtered collection |
| guards | Reachable counterexample for each nontrivial update guard; rejection without domain effects; valid control |
| atomicity | Mutations roll back when receipt insertion fails; explicit retry succeeds; reads leave domain/receipts unchanged |
| concurrency | Concurrent acceptance of one intent has one result; competing stale update intent cannot write |
| recovery | Actual PostgreSQL stop/restart changes journey availability; no automatic write replay; original operation resumes explicitly |

Each entry has five base obligations. Mutations add concurrency; updates add
guards. One obligation may exercise multiple inputs and operations. The count is
not a claim that five or seven checks exhaust every possible product behavior.

`assertions.ts` independently checks raw persisted facts and receipts against the
contract. It does not call production materialization, validation or condition
helpers. A separate small planner predicts setup reachability, not expected
observations. Interpreter-mutation tests must still demonstrate that this boundary
detects incorrect implementations; derivation alone is not independence.

## Bounded generation and failures

Seed controls deterministic sample values, not UUIDs, timing or infrastructure.
Text samples cover declared length bounds (maximum 1024 code points for generation),
integers sample bounds/interior candidates and enums enumerate members. Compatible
guard literals are candidates too. Search is bounded to 128 input combinations,
256 reachable states and setup paths of eight operations. These are resource
bounds, not product restrictions or exhaustive property-based generation.

Missing setup, missing counterexample, missing sentinel setup and exceeded bounds
produce `blocked` cases with reasons. They are never counted as passes. A missing
witness means this generator could not construct one, not that none exists.
Do not add product-name exceptions or SQL-insert fabricated states to make it green.
Extend the vocabulary/generator with independent evidence, or keep the gap visible.
Singleton guards have no valid type-correct negative witness; their shape semantics
and positive path remain checked. Do not use this as a general skip mechanism.

## Evidence boundary

Reports include scope, contract and plan digests, mechanism revision before/after,
Node/platform/flags within that revision, PostgreSQL version, seed and all cases.
The mechanism revision hashes SDK source and package/lock files. `assertComplete`
requires exact inventory, all passed, unchanged matching revision and the frozen
report issued by that verification instance. It rejects missing, blocked, failed,
modified, stale and copied reports. An operational host/cleanup failure throws;
it cannot fabricate a completed report.

This is a trusted local execution check, not a security attestation. A report's
JSON can be persisted for inspection but cannot be reimported as accepted evidence;
rerun for a fresh claim. There is no signature, loaded-binary attestation, protection
against a malicious host/custom adapter, or portable evidence admission protocol.

## Keep these distinctions

100% of declared journeys receiving applicable obligations is not 100% of all
possible behavior. Removing an approved journey from the contract still needs an
independent requirements baseline; current-catalog derivation cannot detect that
product omission. Keep negative compiler tests, interpreter mutants, hand-authored
incident regressions and actual browser/transport tests. Human and agent entries
here are controller sessions, not proof of a rendered UI, consent or MCP server.

Notebook and the shared-controller product use the same runner. The contract-change
test renames identifiers/fields/literals, adds bounded integer inputs and exposes
an additional read journey without supplying corresponding fixtures. No domain
names occur in `src/testing`. General grants, external effects, native surfaces,
cross-store transactions and universal TPA conformance remain outside this increment.

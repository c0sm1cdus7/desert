# Derived local verification

Generated from the bundled SDK documentation; do not edit this snapshot.

## Source: docs/DERIVED-VERIFICATION.md

Source SHA-256: 286e8ea35c05a92dbd6a446e8048002993311a2ad354e9efb8787af1dd8226c3

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

# Testing entrypoints and contracts

Generated from this bundle's source. Do not edit this snapshot.
Regenerate with npm run authoring:generate; npm run authoring:check detects drift.
Paths below are relative to the SDK root. Read imports/types together; these are
verbatim modules, not standalone snippets or a published package API.

- src/testing/index.ts
- src/testing/types.ts
- src/testing/postgres.ts
- products/notebook/verify.ts

## src/testing/index.ts

Source SHA-256: 6b131ecbe9135a0a1cd940494cbe121154b5c980c9f8ac794a4f16fd2a215f5c

```ts
import assert from "node:assert/strict";
import { compile } from "../compile.ts";
import { loadDefinition } from "../compiled-definition.ts";
import { freezeDeep, type Frozen } from "../json.ts";
import { deriveCases } from "./plan.ts";
import { digest, mechanismRevision } from "./revision.ts";
import { runVerification } from "./run.ts";
import type { HostFactory, VerificationReport } from "./types.ts";

export type { VerificationReport, VerificationCase, VerificationHost, HostFactory } from "./types.ts";

export function deriveVerification(definition: unknown) {
  const application = compile(definition);
  const product = loadDefinition(application);
  const cases = deriveCases(product);
  const planDigest = digest({ version: "desert.verification/1", product, cases });
  const issued = new WeakMap<object, { hostRevision: string, seed: number }>();
  return Object.freeze({
    cases: freezeDeep(structuredClone(cases)),
    contractDigest: application.digest,
    async run(options: { host: HostFactory, seed: number }) {
      const report = await runVerification(product, application, cases, planDigest, options.host, options.seed);
      issued.set(report, { hostRevision: report.hostRevision, seed: report.seed });
      return freezeDeep(report);
    },
    assertComplete(report: Frozen<VerificationReport>) {
      assert.equal(report.scope, "local-controller-sessions", "EVIDENCE_SCOPE_MISMATCH");
      assert.equal(report.contractDigest, application.digest, "CONTRACT_REVISION_MISMATCH");
      assert.equal(report.planDigest, planDigest, "PLAN_REVISION_MISMATCH");
      assert.equal(report.revisionBefore, mechanismRevision(), "MECHANISM_REVISION_MISMATCH");
      assert.equal(report.revisionAfter, report.revisionBefore, "REVISION_CHANGED_DURING_RUN");
      assert.equal(report.completed, true, "INCOMPLETE_EXECUTION");
      assert.deepEqual(report.cases.map(({ status, reason, ...item }) => item), cases, "INCOMPLETE_CASE_INVENTORY");
      assert.ok(cases.length > 0, "NO_JOURNEYS_TO_VERIFY");
      assert.ok(report.cases.every(item => item.status === "passed"), "UNSATISFIED_OBLIGATIONS");
      const execution = issued.get(report);
      assert.ok(execution, "UNRECOGNIZED_EXECUTION_REPORT");
      assert.equal(report.hostRevision, execution.hostRevision, "HOST_REVISION_MISMATCH");
      assert.equal(report.seed, execution.seed, "SEED_MISMATCH");
    },
  });
}
```

## src/testing/types.ts

Source SHA-256: dd98c6f96928228104fed7ff8c6fa2a4e4024be1e4a5f05a286ccc31c7049429

```ts
import type { compile } from "../compile.ts";
import type { openLocalController } from "../local.ts";
import type { JourneyDefinition } from "../program-grammar.ts";
import type { Facts, StoredObject, Receipt } from "../local/types.ts";

export type { Facts, StoredObject, Receipt };
export type Application = ReturnType<typeof compile>;
export type Controller = Awaited<ReturnType<typeof openLocalController>>;
export type Mutation = Extract<JourneyDefinition, { kind: "mutation" }>;
export type Step = { journey: Mutation, surfaceId: string, input: Facts };
export type Snapshot = { objects: StoredObject[], receipts: Receipt[] };
export type Obligation = "success" | "inputs" | "authority" | "guards" | "atomicity" | "concurrency" | "recovery";
export type VerificationCase = { id: string, journeyId: string, surfaceId: string, obligation: Obligation };
export type CaseResult = VerificationCase & { status: "passed" | "failed" | "blocked", reason?: string };
export type VerificationReport = {
  scope: "local-controller-sessions", contractDigest: string, planDigest: string,
  revisionBefore: string, revisionAfter: string, hostRevision: string, seed: number,
  completed: boolean, cases: CaseResult[],
};
export interface TestSandbox {
  controller: Controller;
  snapshot(): Promise<Snapshot>;
  rejectReceipts(enabled: boolean): Promise<void>;
  stop(): void;
  start(): void;
  close(): Promise<void>;
}
export interface VerificationHost {
  revision(): string;
  open(application: Application, role: string): Promise<TestSandbox>;
  close(): Promise<void>;
}
export type HostFactory = () => VerificationHost;

export class VerificationGap extends Error {}
```

## src/testing/postgres.ts

Source SHA-256: a629d1cff09fcbb297348855ab5887981760ffd61580fcb838aa6d90a97c777d

```ts
import { Pool } from "pg";
import { openLocalController } from "../local.ts";
import { postgresCluster } from "./postgres-cluster.ts";
import type { HostFactory, Receipt, StoredObject } from "./types.ts";

export function localPostgresTestHost(): HostFactory {
  return () => {
    const cluster = postgresCluster();
    return {
      revision: () => cluster.version(),
      async open(application, role) {
        const database = await cluster.database();
        const controller = await openLocalController(application, { ...database, role });
        const admin = new Pool({ host: database.socketDirectory, database: database.database, user: database.user,
          connectionTimeoutMillis: 3000, statement_timeout: 5000 });
        admin.on("error", () => {});
        return {
          controller, stop: cluster.stop, start: cluster.start,
          async snapshot() {
            const objects = await admin.query<StoredObject>("SELECT id, object_type, version, facts FROM desert_objects ORDER BY id");
            const receipts = await admin.query<{ result: Receipt }>("SELECT result FROM desert_receipts ORDER BY intent_id");
            return { objects: objects.rows, receipts: receipts.rows.map(row => row.result) };
          },
          async rejectReceipts(enabled) {
            if (enabled) await admin.query(`CREATE FUNCTION verification_receipt_fault() RETURNS trigger LANGUAGE plpgsql AS
              $$ BEGIN RAISE EXCEPTION 'VERIFICATION_RECEIPT_FAULT'; END $$;
              CREATE TRIGGER verification_receipt_fault BEFORE INSERT ON desert_receipts
              FOR EACH ROW EXECUTE FUNCTION verification_receipt_fault()`);
            else await admin.query("DROP TRIGGER verification_receipt_fault ON desert_receipts; DROP FUNCTION verification_receipt_fault()");
          },
          async close() {
            cluster.start();
            try { await controller.close(); } finally { await admin.end(); }
          },
        };
      },
      async close() { cluster.dispose(); },
    };
  };
}
```

## products/notebook/verify.ts

Source SHA-256: fd3d7698f47d71e2bdc5be65533f811f5e395d032e0eab2dce98f3ca79f6f214

```ts
import { Notebook } from "./product.ts";
import { deriveVerification } from "../../src/testing/index.ts";
import { localPostgresTestHost } from "../../src/testing/postgres.ts";

const verification = deriveVerification(Notebook);
const report = await verification.run({ host: localPostgresTestHost(), seed: 42 });
console.log(JSON.stringify(report, null, 2));
verification.assertComplete(report);
```

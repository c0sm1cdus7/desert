# Local execution queue — host infrastructure boundary

This increment is a host-only kernel, not a VOID Environments module, remote CLI
enrollment protocol, or installed provider integration. It does not connect an
actor merely because an executable is declared. Product authors cannot mount this
kernel through a View, Journey, module, string reference, or renderer callback.

## Contract and authority

The trusted host registers an environment, then an actor within that environment.
The actor holds one exact fixed process adapter and a durable concurrency limit.
References are issued objects; cloned objects and caller-supplied identifiers do
not acquire authority. A second environment's actor has a different identity even
when both use the same provider name. Changing a durable actor binding is rejected,
not silently treated as a compatible restart.

The process adapter declares an absolute executable, fixed argument vector, fixed
working directory, typed JSON input schema, runtime limit, and output byte limit.
Job input is encoded as JSON on stdin with the durable operation identity. It is
never interpolated into arguments or shell source. The launcher uses no shell and
does not inherit the host's environment variables or credentials. Adapter code and
the host/database administrator remain trusted; this is not an OS sandbox.

## Durable lifecycle

Enqueue commits the job and its exact submission key before returning a reference.
Repeating the key and identical canonical input returns the same job. Different
input under that key fails. Lookup recovers the original identity without enqueueing.
Keys are scoped to the bound actor, not global product command identities. The
future accepted-effect contract must bind the selected actor as well as the input;
moving an operation to another actor is not automatic retry or reconciliation.

Workers serialize claims on the actor row. The configured concurrency limit counts
leased, running, **and uncertain** jobs. A lost lease is uncertain, never queued
again. An unresolved process may still have effects, so uncertainty retains its
permit until a future trusted reconciliation mechanism can prove a safe outcome.
This intentionally favors stopping over duplicate or overlapping work.
Queued claims use submission order within an actor. Concurrent execution does not
promise completion order; the host explicitly chooses which actor to service, so
no cross-actor fairness or autonomous scheduling policy is implied.

Successful exit, nonzero exit, and confirmed inability to spawn are observations,
not proof of arbitrary provider effects. Timeout, output overflow, cancellation
after start, and lost worker ownership are uncertain. No failure is retried
automatically. Cancellation before launch prevents execution; cancellation after
launch requests termination and cannot imply rollback of effects already made.

The kernel uses its own PostgreSQL schema and version marker. It does not modify
the canonical controller tables, product installation, accepted command receipts,
or identity schema. Its enqueue transaction is **not** atomic with DESERT command
acceptance. A process cannot provide transactional exactly-once effects by itself.

Registration is trusted host configuration, not remote identity attestation or
proof that a named executable is installed. The registered environment name does
not authenticate a machine. The binding digest covers the launch configuration
and input schema, not the executable's filesystem contents or dependencies.
The OS user and host administrator must protect that code. This kernel exposes no
connected/ready indicator based on registration alone.

## Host API and anatomy

The entrypoint is `src/execution.ts`, deliberately absent from `src/index.ts` and
the product authoring vocabulary. `openExecutionQueue(connection, { leaseMs })`
uses the same private Unix-socket and durable PostgreSQL transaction owner as the
local controller, without installing that controller's schema.

```ts
const queue = await openExecutionQueue(trustedLocalDatabase);
const environment = await queue.registerEnvironment({
  name: "fixture-local", label: "Fixture machine",
});
const actor = await queue.registerActor(environment, {
  name: "fixture", label: "Fixture actor", concurrency: 1, adapter: FixtureAdapter,
});
const job = await queue.enqueue(actor, {
  key: "original-operation-identity", input: { message: "Hello", mode: "echo" },
});
await runNextExecution(queue, actor);
const observed = await queue.inspect(job);
```

`FixtureAdapter` is an explicitly registered `fixedProcessAdapter(...)`; its
TypeBox input schema provides both TypeScript input checking and runtime
validation. The executable example and its configuration live in
`tests/fixtures/execution-host.ts`. There is no default provider or executable.

| Owner | Responsibility |
| --- | --- |
| `execution/types.ts` | Typed host references, input inference, observations |
| `execution/adapter.ts` | Closed fixed launch configuration and canonical input |
| `execution/bindings.ts` | Immutable durable environment/actor registrations |
| `execution/jobs.ts` | Exact submission identity, lookup, inspection, cancellation |
| `execution/claims.ts` | Transactional permits, leases, fencing, terminal observations |
| `execution/process.ts` | Direct child launch, bounded stdin/stdout/stderr, termination |
| `execution/worker.ts` | One explicitly invoked work cycle; no implicit daemon |
| `execution/queue.ts`, `context.ts`, `schema.sql` | Isolated installation, transaction reuse, issued-reference admission |

Queued cancellation releases no executing work. An expired lease is recorded as
uncertain when a worker next attempts a claim; there is no background sweeper.
An idle worker must explicitly call `runNextExecution` again. Queue closure is not
a durable cancellation request. A process still running after host loss remains
uncertain on the next lease reconciliation, not ready for automatic replay.

## Missing links before VOID can publish this capability

- Authenticated environment enrollment, delegated identity grants, revocation,
  heartbeat evidence, and scoped remote transport.
- Typed product relationships linking Tasks, Environments, Actors, and Jobs; plain
  text identifiers are not a substitute for those contracts.
- A canonical accepted effect/outbox boundary that enqueues atomically with the
  originating command receipt, including exact authority and effect binding.
- Provider-specific fixed adapters, credentials, supported CLI discovery,
  conversation/session ownership, and observable completion/reconciliation.
- Explicit reconciliation of uncertain jobs, crash recovery across process trees,
  and durable cancellation acknowledgement from a remote worker.
- The VOID CLI distribution and a tested Environments/actor selection experience.

No real Kenon, Claude, Codex, GitHub, Railway, Resend, or Apple process is invoked
by the fixtures. Tests launch only the repository's deterministic JSON fixture.

## Verification

Executed on 2026-10-22: 13 focused tests pass against isolated real PostgreSQL
clusters and the deterministic fixture process; SDK TypeScript passes. Coverage
includes reference provenance, exact schema-derived types, immutable bindings,
duplicate submissions, actor concurrency, cancellation before/after launch,
timeout/output bounds, failed spawn/nonzero exit, stale-worker fencing, corrupted
input rejection, schema-version mismatch, transactional enqueue failure, and
database restart without loss of the queued operation identity.

Database restart tests reconnect explicitly. They do not promise that a stale
existing connection's first request succeeds, or silently replay that request.
No test qualifies remote transports, actual provider effects, process-tree
containment, or atomic command/outbox acceptance.

The initial tests were written before the kernel; their first run failed because the
entry module did not exist. That is scaffolding evidence, not a behavior-level
red/green claim or a qualification of remote/provider execution.

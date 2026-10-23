# Prepared response exposes facts absent from surface reads

Date: 2026-10-15. Updated: 2026-10-21. Status: **human and agent response
projection corrected; 1096/1096 SDK tests pass**. This is
controller-response evidence, separate from UI conformance or global security
qualification. The historical reproduction below is retained.

The frozen-source verification also passed all 27 VOID contract/runtime tests and
30 browser tests. Exact commands, artifact identities and limits are recorded in
[VOID verification](../../void/docs/VERIFICATION.md).

## Shared preparation-response boundary

The owner approved the agent visibility rule on 2026-10-21: a preparation may
return only facts published by that surface's own reads or values supplied by
inputs of that operation, never unrelated internal facts. This is a visibility
ceiling, not a requirement to return every readable fact.

`src/preparation-projection.ts` derives the minimal response once: same-object
read details plus affected fields authorized by those reads, collection fields,
or the operation's input assignments. Ownership is always excluded. A sibling
operation's inputs or another surface's reads never widen that response.
`src/command-input-targets.ts` resolves actual input-assignment targets, so a
stored fact merely named like an aliased input is not disclosed.

Every compiled mutation carries `responseFields`; human `reviewFields` reuses
the same array. `src/local/effects.ts` applies that authority to both human and
agent responses, including repeated preparation, without a surface-kind fallback.
Missing/incompatible metadata or an old interaction protocol fails closed.
The single protocol owner is `src/interaction/protocol.ts`, version
`desert.interaction/7`.

Independent agent tests first reproduced the leak in pure projection and three
authenticated HTTP cases. The corrected cases verify initial/repeated create,
input-free update and aliased-input responses; full effects remain stored,
confirmation digests still cover those complete effects, forged confirmations
fail and acceptance/recovery retain one receipt per occurrence. Tests:
`tests/prepared-agent-projection-contract.test.ts` and
`tests/prepared-agent-response-visibility.test.ts`.

## Earlier human-only correction

`src/local/effects.ts` now resolves the exact compiled mutation on the run's
authenticated surface and restricts human response facts to that mutation's
existing `reviewFields`. Missing/incompatible projection fails closed; it never
falls back to the complete effect. There is no second visibility list.
Both initial and repeated preparation use this owner. The stored effect,
confirmation digest, atomic acceptance and receipt identity remain unchanged.

`tests/prepared-response-visibility.test.ts` independently reproduced a raw HTTP
response containing `privateFact: "test-only-secret"` before the correction.
It now passes against an authenticated loopback gateway and isolated PostgreSQL:
submit/create and review/archive, exact initial/repeated response keys, ownership
exclusion, preserved hidden facts in storage, unchanged confirmation digest,
forged digest rejection, one effect per occurrence and identical retry receipts.
`tests/prepared-projection-contract.test.ts` separately checks per-mutation
projection, missing/incompatible authority and unchanged agent semantics.

At that checkpoint, agent mutations had no preparation-response projection.
The shared correction above supersedes that remaining branch; it does not install
a remote activity endpoint or a new permission system.

## Original scope

Before correction, `preparedView` returned all resulting object facts except the
ownership field. An exposed mutation could therefore return a preserved fact that no read journey
on the caller's surface exposes, even when that mutation does not change the fact.
The same field can also be absent from every agent read.

This is surface-projection over-disclosure, not demonstrated cross-owner access,
an authentication bypass, or proof of a deployed secret leak. The current domain
vocabulary has no explicit private-field policy. Here, **unexposed** means absent
from all declared read fields/collections and the human review projection.
The reproduction uses only a synthetic value, `test-only-secret`.

The updated review presenter filters what it renders. It does not remove data
already delivered in the prepare response and must not be described as a transport
confidentiality boundary.

## Original evidence path — before the human correction

- `src/local/effects.ts`, `materialize`: merges existing facts with the changes.
- `src/local/effects.ts`, `preparedView`: filters only the owner field.
- `src/local/prepare.ts`: both initial preparation and repeated preparation return
  `preparedView`.
- `src/web/dispatch.ts`: the prepare handler returns `session.prepare` directly.
- `src/web/gateway.ts`: serializes that dispatch result without another fact projection.

The pure functions below were executed with Node 24.16.0. No existing database or
store was opened or modified. The authenticated HTTP path was inspected, not
executed for this security finding.

## Original reproduction

From the SDK directory, using Node 24, execute this module with `node --input-type=module`
or place it in a temporary diagnostic module with matching import paths:

```js
import { compile } from "./src/compile.ts";
import { Notebook } from "./products/notebook/product.ts";
import { localProgram } from "./src/local/program.ts";
import { materialize, preparedView } from "./src/local/effects.ts";

const definition = structuredClone(Notebook);
definition.objects[0].facts.privateFact = { kind: "text" };
definition.journeys.find(j => j.id === "create-note")
  .command.values.privateFact = { kind: "literal", value: "test-only-secret" };
const application = compile(definition);
const program = localProgram(application, "notes");
const mutation = program.journey("human", "archive-note");
const effect = materialize(program, mutation, "test-owner", {}, "test-object", {
  id: "test-object", object_type: "note", version: 1,
  facts: { title: "Public", body: "Public body", owner: "test-owner",
    state: "active", privateFact: "test-only-secret" },
});
const result = preparedView(program, {
  id: "test-run", journey: "archive-note",
}, { id: "test-intent", effect, confirmation_digest: "test-digest" });
console.log(result.facts);
```

Observed result:

```json
{
  "title": "Public",
  "body": "Public body",
  "state": "archived",
  "privateFact": "test-only-secret"
}
```

Independent comparison in the same execution:

- Human detail fields: `title`, `body`, `state`.
- Human collection fields: `title`, `state`.
- Human Archive review fields: `title`, `body`, `state`.
- Archive effect assignment keys: `state` only.
- No human or agent read includes `privateFact`.
- The owner value is excluded, but `privateFact` is returned.

## Earlier correction rationale and agent decision

For human preparations, `program.application.surface(run.surface)` gives
the compiler-produced projection. Resolving the exact mutation by `run.journey`
and restricting response facts to its `reviewFields` reuses the current
same-surface exposure rule rather than invent a second visibility list. That list
includes identifying read details and consequential fields exposed by same-surface
reads or the mutation's declared inputs; it excludes ownership. Field labels,
another surface's reads, and arbitrary stored fields do not expand it.

Only the response projection changes. Keep the complete persisted effect,
confirmation digest, acceptance checks, operation identity and receipt semantics
unchanged. Repeated preparation must apply the same projection. Missing or
incompatible projection metadata must not fall back to all facts.

That candidate was limited to human surfaces. Agent mutations did not
carry `reviewFields`; their response semantics require an explicit decision before
a general fix. A future neutral preparation projection could avoid making an
executor depend on human review naming, but is a separate contract change, not
authorization to add a new policy capability.

The later explicit agent decision and independent authenticated agent checks are
recorded above. Human evidence alone was not used to qualify that branch.

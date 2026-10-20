# Prepared response exposes facts absent from surface reads

Date: 2026-10-15. Status: open; inspected and reproduced in memory. No controller
fix is included in the interaction-bank corrections. This finding is not part of
the UI conformance green result.

## Exact scope

`preparedView` returns all resulting object facts except the ownership field.
An exposed mutation can therefore return a preserved fact that no read journey
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

## Evidence path

- `src/local/effects.ts`, `materialize`: merges existing facts with the changes.
- `src/local/effects.ts`, `preparedView`: filters only the owner field.
- `src/local/prepare.ts`: both initial preparation and repeated preparation return
  `preparedView`.
- `src/web/dispatch.ts`: the prepare handler returns `session.prepare` directly.
- `src/web/gateway.ts`: serializes that dispatch result without another fact projection.

The pure functions below were executed with Node 24.16.0. No existing database or
store was opened or modified. The authenticated HTTP path was inspected, not
executed for this security finding.

## Reproduction

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

## Minimal correction candidate — not implemented or approved

For human preparations, `program.application.surface(run.surface)` already gives
the compiler-produced projection. Resolving the exact mutation by `run.journey`
and restricting response facts to its `reviewFields` would reuse the current
same-surface exposure rule rather than invent a second visibility list. That list
includes identifying read details and consequential fields exposed by same-surface
reads or the mutation's declared inputs; it excludes ownership. Field labels,
another surface's reads, and arbitrary stored fields do not expand it.

Only the response projection should change. Keep the complete persisted effect,
confirmation digest, acceptance checks, operation identity and receipt semantics
unchanged. Repeated preparation must apply the same projection. Missing or
incompatible projection metadata must not fall back to all facts.

This candidate is limited to human surfaces. Agent mutations currently do not
carry `reviewFields`; their response semantics require an explicit decision before
a general fix. A future neutral preparation projection could avoid making an
executor depend on human review naming, but is a separate contract change, not
authorization to add a new policy capability.

Before closing this finding, independently test authenticated initial and repeated
prepare responses with an unchanged unexposed fact, a changed exposed fact,
ownership exclusion, direct submit, required review, and any approved agent rule.
Assert raw response keys as well as rendered absence. Also prove that projection
does not change persisted effects or digest-bound acceptance/retry behavior.

# Shared-controller authoring and skill revision — 2026-10-15

## Defect and scope

The old RequirementsFor<ObjectId> required controller.objects to be ObjectId[].
Consequently a controller owning both memo and bookmark could govern neither
object through typed authoring, despite the compiler and local executor supporting
both. This was an SDK type defect, not a one-controller-per-object product rule.

The correction infers the controller independently and checks object membership.
Every member of an uncertain controller union must own the requested object;
an unconstrained string[] descriptor is not static evidence. Existing runtime
membership checks remain mandatory because TypeScript is not an authority boundary.
No serialized grammar, Notebook contract, database schema or executor was changed.

## Red, then green

Before the correction, `npm run typecheck` exited 2: six authored fixture journeys
and three positive type controls failed because multi-object controller arrays
were not assignable to the required single-object array. This was the intended
missing behavior, not a failed dependency or runner.

After the correction, typecheck passed. The negative-type harness removes error
suppression in memory and checks the exact failure lines. All 41 negative examples
remain rejected, including four added examples for unowned reads, a foreign read
controller, an uncertain controller union and a widened runtime descriptor.

## Executed evidence

- `tests/fixtures/shared-controller.ts`: two objects, one role, private ownership,
  six explicitly authored create/read/update journeys, one agent interaction artifact.
- `tests/shared-controller.test.ts`: exact journey inventory and dependencies;
  raw runtime membership rejection; all six journeys against one real PostgreSQL
  store; per-object facts, denied foreign identity, denied cross-type subjects,
  repeated transition rejection, same-intent receipt replay, and controller reopen.
- Focused regression group: 4/4 passing (three shared-controller tests and the
  negative-type harness).
- `npm run check`: typecheck and 134/134 root tests passing.
- `npm run web:check`: zero errors and warnings.
- `npm run web:build`: production build succeeds.
- `npm run test:web`: 9/9 real browser tests passing.

The new runtime test is a multi-object regression, not a claim to fully cover a new
production product. Notebook's separate journey matrix remains present and green.

## Authoring delivery

Skill 0.3.0-draft adds controller membership guidance, journey/entry coverage,
honest distinction between controller and visual evidence, and gap-review constraints.
References are regenerated from actual source. The structural skill validator passes;
this is not independent behavioral certification of an agent using the skill.

The new immutable bundle includes the earlier PostgreSQL recovery correction
(EVIDENCE-009). The older exported bundle and Claude's working copy are untouched.
Exact delivered content is identified by AUTHORING-MANIFEST.json, not package
version alone. Instructions for project-local Claude Code installation are in
AUTHORING.md; no installation is performed by this delivery.

## Explicit non-claims

One controller owning several objects does not add multi-object command effects,
distributed transactions, consent authority, external effects, outbox, scheduler,
delegation, sandbox isolation, a multi-object human renderer or an MCP transport.
Kenon's proposed new capabilities remain proposals requiring separate decisions.

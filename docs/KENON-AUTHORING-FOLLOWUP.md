# Kenon authoring follow-up — skill 0.3.0-draft

## Read before adapting

Use the new source bundle `desert-authoring-2026-10-15-r2` under
`/Users/francoaltuna/kenon-para-abed/`. Read AUTHORING.md, verify its manifest with
Node 24, then read skills/desert/SKILL.md and its authoring, verification and gap
references. Read docs/EVIDENCE-010.md for the controller correction and
docs/EVIDENCE-009.md for the PostgreSQL correction absent from the original export.

Keep that export immutable. Adapt a fresh working copy, carrying forward your
Kenon product and tests deliberately. Do not overlay the previous SDK, erase your
work, reset a database or silently repin an installation. Report the new digest
and the changes made on top of it; the original manifest describes the baseline,
not the modified product working copy.

## Install the skill in Claude Code

After verifying the export, copy its complete `skills/desert` folder, references
included, to the Kenon project's `.claude/skills/desert`. Check for an existing
installation first; compare/preserve it rather than blindly overwriting it. This
is project-local, not a personal/global installation. Invoke `/desert` and confirm
the loaded version is 0.3.0-draft. Record the matching SDK path and manifest digest.
If discovery fails, read the exact SKILL.md path and report the discovery failure.
Installation does not itself update the SDK or establish behavioral conformance.
See [official installation semantics](https://code.claude.com/docs/en/skills).

## Adapt the executable subset

G8 identified a real authoring defect: a controller can now own multiple object
types and each journey statically requires its object's membership. You need not
split a controller just to satisfy the old type signature. See
tests/fixtures/shared-controller.ts and tests/shared-controller.test.ts.

Re-evaluate your three-controller workaround. This does not remove legitimate
deployment boundaries; it removes the accidental restriction. The human renderer
remains single-object, and multi-object atomic command effects are not implemented.
Do not use casts, custom handlers or invented constructors to hide remaining gaps.

## Complete product evidence

The reviewed subset declares ten journeys but its four tests exercise nine.
Add `revoke-connector`: success, durable revoked state, repeated/invalid transition
and foreign-identity rejection with no effects. Cover each declared journey and
each exposed entry, including the three reads exposed on `director-agent` and
rejection of unexposed mutation attempts on that surface.

Build an independently expected journey/entry inventory checked against compiled
contracts; additions or missing cases must fail the gate. Map applicable happy
paths, input/state failures, identity/scope, atomicity, concurrency/retry and
dependency loss/recovery. State why any case is inapplicable. Shared SDK evidence
supports this mapping but does not automatically certify Kenon.

Direct begin/prepare/accept tests are controller evidence, not a human review test.
Keep UI evidence unexecuted until a supported renderer is built and walked. Testing
an agent session artifact does not prove MCP transport support. The record subset
still does not provision connectors or run Oversee. Fix source links to resolve to
the actual delivered code; the reviewed `desert-subset/` reference did not resolve.

## Refine proposals without treating them as approved

- G2/G4: distinguish atomic local acceptance plus a pending operation from remote
  provider execution. Do not promise one database transaction with an external API.
- G3: effect properties can overlap (external, spending, irreversible). An unknown
  effect's semantics/scope blocks execution; do not silently classify it as outward
  and treat consent as sufficient.
- G5: surface exposure is not authority or necessarily public networking. Internal
  admissions need enforcement too. Model selection and Oversee escalation rules
  remain Kenon behavior, not hardcoded SDK semantics.
- G6: a reference does not grant access; cross-owner references are not universally
  forbidden when a future accepted authority contract legitimately allows them.
- G7: distinguish preparation, accepted execution and outcome observation. No
  external effect can run before acceptance. Separate intent and operation lifecycles.
- G8: controller object membership is fixed; atomic effects across multiple objects
  remain a separate capability proposal.

No approval is granted here for new role policies, consent gates, external effects,
scheduling, delegation, isolation or multi-object writes. Return the revised subset,
exact revision/digest, journey evidence matrix and still-open proposals. Preserve
approved Kenon intent; do not reduce it to the currently executable record subset.

# Journey dependencies, controller bindings and availability

Date: 2026-10-14. Local increment; no publication, old SDK change or OS work.

## Implemented

Notebook declares a controller role separately from deployment. Each journey
references its controller and any additional dependencies. The compiler derives
the complete transitive closure, validates role/object compatibility, and rejects
cycles and unknown references. Distributions bind dependencies locally or remotely.
A local plan requires no declared remote service; mixed plans remain possible.

Client availability consumes those derived closures. Unknown and expired evidence
block readiness. Fresh matching observations enable dependency readiness only;
session-required, incompatible, unreachable and unavailable are distinct reasons.
Subscriptions publish updates and expiry without navigation. Reporting sessions
reject obsolete callbacks; disposal cancels timers. Recovery does not replay work.

## Verification

With Node 24.16.0:

```sh
npm run check
npm run inspect
```

Result: TypeScript passes, 67 tests pass, zero failures/skips. The type test verifies
34 expected source-line errors after removing suppression in memory. Browser
bundling also checks availability does not import Node or contract-authoring modules.
Notebook inspection emits five unbuilt plans, including a fully local binding plan.

Current Notebook digest:
`40c5003adb33d5edaeee6ed1db0e7aa3b7133525d265ee0531b689d6458558f0`.

Contract format is now `desert.contract/3`; interaction format is
`desert.interaction/2`. Full journey contracts must state their requirements and
human availability uses `journey-dependencies`. Clients now declare `bindings`,
not one implicit remote controller; services declare what they `provide`.
Old descriptors are rejected rather than silently assigned offline semantics.
Legacy shape-only validation remains supported.

## Test-first history

- Dependency compilation: the initial run had four failures and a generic rejection
  false positive. A positive compile control was added before implementation;
  all five then failed. The five now pass through semantic checks.
- Binding plans: four tests failed against the previous remote-only grammar before
  implementation. All four now pass, including a mixed transitive-dependency fixture.
- Availability: six behavioral tests failed against an explicitly unimplemented
  entry before the reducer, sessions and timer mechanism were implemented. All pass.
- Lifecycle review added three tests: two already passed; the reentrant subscriber
  case exposed a real stale-notification bug. Revision-aware delivery fixed it.
- Static dependency cases and strengthened browser-boundary assertions are additional
  coverage, not claimed retroactive red/green history.

Runs are in the tool transcript; raw red logs were not saved as standalone files.
Counts are evidence for this finite increment, not proof that no defect can exist.

## Boundaries

The mixed archive provider exists only in test fixtures, not the Notebook contract.
Tests inject normalized observations at an adapter boundary. They do not simulate
a provider API or prove a network stack, LAN connection or database integration.

`notes-local` names an adapter requirement, not an installed controller. The
execution plan remains `unimplemented`, distribution plans remain `unbuilt`, and
there is no business `execute` API. No notes were written, no database was opened
and no network provider was activated. The availability module itself runs.

Compiled input to the availability runtime is trusted build output. Its snapshots
are isolated and immutable but not signed, authenticated or an authority token.
The reporting adapter must verify the peer/session and choose a justified finite
lease; merely claiming the expected digest is not authentication. No local fallback
inherits remote authority. Actual adapter registration/build verification is pending.

Still required for an offline product: governed execution, trusted identity, local
durability, atomic acceptance, retry reconciliation, installed resources, cold start
and host-specific tests. The current model supports finite read/mutation journeys;
branch-scoped requirements and arbitrary effect dependencies are not implemented.

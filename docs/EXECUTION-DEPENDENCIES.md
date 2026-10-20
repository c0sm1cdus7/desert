# Execution dependencies, local products and controller reachability

Date: 2026-10-14.
Status: contracts, distribution bindings and normalized live availability implemented.
Local Node/PostgreSQL execution and real session availability probes now exist;
remote adapters and finished offline applications remain unimplemented.
See `LOCAL-CONTROLLER.md`, `EVIDENCE-004.md` and `EVIDENCE-005.md`.
The 2026-10-15 Svelte increment transports this real local evidence to an already-open
browser and preserves its draft through interruption; see `EVIDENCE-006.md`. It does
not add browser offline installation or remote controller federation.

## Owner requirements

- DESERT must allow completely offline products. A central controller is not a
  universal prerequisite. Execution may be local, including an embedded controller.
- Products may mix journeys that require a remote connection and journeys that do
  not. The journey contract must express its requirements, not leave them to UI code.
- Connectivity means connection to the required controller or other dependency,
  not a generic Internet-connected flag.
- Surface availability must update in place when those dependencies change. Losing
  a remote connection must not disable unrelated local journeys or destroy the shell.

These requirements do not approve a particular local database, native runtime,
synchronization algorithm or API spelling. No new Notebook journey is authorized
by the examples below.

## Distinctions

The controller is an execution/authority role, not necessarily a central server,
separate process, HTTP endpoint or Node runtime. A local implementation still needs
the guarantees applicable to its product: identity, policy evaluation, persistence,
atomicity, receipts and recovery. It is not a client-side bypass of remote authority.

An offline-first/local product is not equivalent to caching a remote product. If
the accepted authority is remote, losing its connection does not make a local cache
authoritative. Moving or replicating authority requires a separate explicit contract.

Independent axes:

1. Product/journey dependencies and the authority each operation needs.
2. Distribution bindings placing compatible implementations locally or remotely.
3. Current availability, protocol compatibility, session and freshness evidence.
4. Surface feedback appropriate to the affected interaction and host.

## Implemented authoring API

```ts
const NotesController = controllerRole({
  id: "notes", objects: [Note], requires: [],
});

const CreateNote = mutationJourney("create-note", CreateNoteRecord, {
  controller: NotesController, dependencies: [],
});

const NotebookLocal = clientDistribution({
  id: "notebook-local", product: Notebook, surface: HumanNotebook,
  renderer: "terminal-cli",
  bindings: [localBinding(NotesController, "notes-local")],
});

const NotebookWeb = clientDistribution({
  id: "notebook-web", product: Notebook, surface: HumanNotebook,
  renderer: "svelte-web",
  bindings: [remoteBinding(NotesController, NotebookService)],
});
```

`NotesController` denotes a typed role; `NotebookService` is a deployment binding,
not an arbitrary URL supplied by an actor. The same journey dependency can be
satisfied locally without a network connection, or remotely when the product's
authority/scope contract permits that topology. These two bindings do not imply
shared data, synchronization or the ability to switch an existing store's authority.

If a future journey also calls a remote provider, that dependency must be declared
at its owning operation/capability and included in the journey's resolved requirement
graph. Do not duplicate schemas or business requirements across commands, journeys
and renderers: typed references and derivation retain one authoritative definition.
An omitted or unresolved requirement is not implicitly "offline allowed".

The compiler derives the full transitive closure and rejects missing bindings,
unknown references, cycles and competing controller roles for an object. This finite
vocabulary has no branch-specific dependencies yet. Future branches should gate the relevant operation/branch,
not arbitrarily disable independent work earlier in the journey. Local preparation
and remote acceptance remain distinct.

## Availability and authority

- Internet unavailable, local controller ready: local journeys can proceed.
- Internet unavailable, required controller reachable over LAN: network topology
  alone is not grounds to disable the journey.
- Internet available, required remote controller unreachable: dependent work is
  unavailable, regardless of an online indicator.
- Controller reachable, session expired or protocol incompatible: reachability
  is not eligibility. Report the correct typed reason.
- Local controller unavailable or local durable storage failing: offline-capable
  does not mean always available. Report the dependency actually at fault.
- Controller ready, external provider unavailable: only paths requiring that
  provider are affected, according to their accepted execution contract.

Availability is an observation, not a promise of future command acceptance. Recheck
current authority and invariants at acceptance. A lost response may mean unknown
outcome, not failure; reconcile the original operation without blind replay.

Dependency observations need a declared freshness policy. A live channel can update
offers promptly, but no network monitor can prove instantaneous continuous reachability.
Unknown/stale evidence must not be presented as confirmed ready.

## Offline completeness

An offline product must have its required code, interaction resources, execution
mechanisms, identity/authority basis and durable storage locally available for the
promised operations. For web, loading/cold-starting the installed application offline
must be demonstrated separately from keeping an already-open tab alive. A network
login, license check, remote font or required external API can invalidate an otherwise
unsupported claim of complete offline operation. Define the installation boundary.

The TypeScript/Node/PostgreSQL stack remains the accepted initial reference stack.
It does not imply embedding Node/PostgreSQL in every native client. Additional local
hosts/stores require explicit compatible implementations and evidence. Naming a local
binding does not make it supported on iOS, web or any other target.

Offline command queues, shared-state synchronization, conflict resolution and
delegated expiring authority are separate capabilities. None follows automatically
from an offline shell, local drafts or a local controller binding.

## Live availability boundary

`createAvailability(plan)` from `src/client.ts` consumes a trusted compiled client
plan. `subscribe` immediately emits a snapshot and publishes later changes without
navigation. Each journey derives `dependenciesReady` and typed `blockers` from its
resolved dependency closure; this is not `authorized` or `canExecute`.

An adapter opens a reporting session with `begin(dependency)`. It reports a matching
contract digest plus an explicit finite freshness lease, or an unavailable reason.
Expiry updates subscribers automatically. Replacing or closing a reporting session
invalidates its callbacks; the adapter must close an obsolete session when a transport
or identity changes. Recovery updates observations, never replays a command.

The reporting port is a trusted adapter boundary, not actor input or a network
endpoint. A claimed matching digest is a compatibility observation, not proof of
identity. Adapters must verify their peers and freshness before reporting. Those
remote adapters and protocol negotiation are not implemented yet. The local executor's
`session.watchAvailability()` feeds the reducer from read-only PostgreSQL transactions,
verifying the actual installation and credential. It derives dependency references
from the compiled surface, observes its installed role only, and leaves other roles
unknown. It exposes no manual reporting port to its consumer.

The client module remains an observation reducer with subscriptions and timers, not
a network monitor. Its unit tests inject normalized events. Separate local integration
tests stop/restart PostgreSQL, revoke/expire actual credentials, alter installation
metadata and block real SQL probes. They do not establish LAN, browser or device
conformance. Local and remote dependency observations use the same reducer.

Distribution plans remain `unbuilt`. `notes-local` names an adapter requirement;
`products/notebook/local.ts` explicitly bootstraps the local implementation. The
planner itself does not install it. No automatic fallback transfers remote
authority to a local store. Identical product contracts do not imply shared data.

## Remaining work

Extend the implemented local admission/acceptance boundary to compatible remote
adapters. Reject unsupported hosts at build/installation, rather than
silently emulating them. Prove offline cold start, suspension/restart, storage failure,
session transitions and uncertain receipts in real integrations. Branch-scoped
requirements, alternative local stores, synchronization and native selection remain separate.
See `EVIDENCE-003.md` for the completed increment and its exact limits. Void is out of scope.

# Author a real product

## Establish the runnable baseline

This is a source bundle, not a published npm package. Its root contains package.json,
src/, products/, tests/ and this skill. Read AUTHORING.md for verification and prerequisites.
With Node 24 on PATH:

```sh
npm ci --ignore-scripts
npm run authoring:check
npm run typecheck
npm run inspect
```

Inspect compiles Notebook and prints schemas, validation results, surfaces and plans.
Execution remains not-installed and distributions unbuilt until explicitly supplied.
Read [Notebook](notebook.md): the complete declarations under `products/notebook/src/`,
then the host and build integration outside that directory. These are the files
the source gate and runtime tests consume; the root bridge files only re-export.

## Facts and ownership

Use objectType({ id, facts }), text, integer, enumeration, principal, imageAsset and labels.
Text accepts minLength/maxLength; integer accepts minimum/maximum within safe-integer
bounds. Enums are closed. Facts are required in this vocabulary. See [API](api.md)
for exact generic signatures and the closed runtime grammar.

Notebook declares owner: principal() and ownershipPolicy(Note, "owner").
The policy references the object, not a journey name. The compiler resolves that
object for each journey; the executor enforces ownership for its reads and writes.
Create must assign the owner with actorId() from the authenticated session.
Clients cannot supply the owner and updates cannot transfer it.

This is private ownership only. General policy({ allow: ... }), named roles,
delegation and conditional human approval are not installed APIs. Ownership
cannot substitute for a Director/Being collaboration policy.

## Changes, not service callbacks

Use createCommand(id, object, { input, values }) and
updateCommand(id, object, { input, when, set }). Inputs reference existing fact keys;
their schemas are derived. fromInput, literal and actorId are the expressions.
Creates cover every fact. Updates declare equality conditions and nonempty changes.
Unknown fields, incompatible assignments and invalid enums are rejected.

Notebook's archive declares when: { state: "active" } and sets state to "archived".
The interpreter consumes this: no separate archive service repeats the rule.
An enum lists values; it does not implement transitions.

External effects are unsupported. There is no valid shellEffect, provider callback,
outbox or MCP-effect constructor yet. Use [gap handling](gaps.md), not a local create
that secretly runs a provider operation.

## Dependencies and journeys

controllerRole({ id, objects, requires }) identifies the object's controller.
mutationJourney(id, command, { controller, dependencies }) binds a command to
requirements. readJourney(id, object, { fields, collection, requires }) declares
detail and collection projections. Requirements are explicit for both.

A controller role may own several object types. Each journey requires membership
of its own object, not exclusive ownership of that type. Preserve literal types
from controllerRole; a broad runtime descriptor must pass runtime compilation,
not be cast into static evidence. The compiler checks actual membership even when
JavaScript or assertions bypass authoring checks. See the bundle's
tests/fixtures/shared-controller.ts and tests/shared-controller.test.ts for an
executable two-object product, six journeys and one local store.

This does not enable one command to mutate several objects or execute a
cross-controller transaction. A composed product may expose multiple read contexts;
each operation still declares its own authoritative source and controller.

Mutation helpers derive confirmation: "prepared-effect" and outcome: "receipt".
These bind execution, not screen count. There is no confirmation: "none",
outcome: "durable-receipt", or object-argument mutationJourney overload.
Local versus remote comes from distribution bindings, not an Internet flag.
The current local executor rejects extra unsupported capability dependencies.

## Human and agent interaction

humanSurface({ id, journeys, locale }) and agentSurface(id, journeys) expose exact
journey references from the mounted module catalog. They cannot define navigation,
labels, input presentation, review policy or connection behavior a second time.

Each module registers its execution journey with a label, presentation and (for a
mutation) humanReview. `publishObject` owns the object's detail View, title fact,
field representations and subject actions. The compiler derives wire labels,
commit modes and field metadata from those declarations. Notebook creates without
an additional review and archives only after review; neither choice grants authority.

Views are `defineView` objects composed from `Components` and typed ports, without
CSS, callbacks or renderer identifiers. Journeys bind outputs to operations or
navigation. The root owns workspace, destinations, entry and navigation exactly
once. Read scopes derive from the admitted View program, not an implicit collection.

Connection policy is SDK-owned. It tracks controller dependencies, keeps drafts
only in session memory and reconnects without replaying commands. The agent surface
uses the same canonical preparation and acceptance; it exposes only listed journeys
and published fields. Binary image acquisition is currently browser-only.

## Assemble, build and test

Declare each capability with `defineModule`, mount it through `moduleCatalog`, and
assemble one root with `composeProduct`. `compile(NotebookProduct)` accepts that
issued composition, not a detached wire definition or a copy. The internal wire
compiler remains available to protocol tests; it is not a second product authoring API.

The Notebook anatomy is `src/modules/notes/{commands,journeys,views}` plus
`note.object.ts`, `note.publication.ts`, `notes.dependencies.ts` and `notes.module.ts`.
`src/modules.ts` publishes the integrated catalogs. `src/views/` owns workspace and
navigation; `src/notebook.product.ts` is the root. Host scripts run the source gate
before importing this authored tree. Use surface(id) for clients, not the execution plan.

The Svelte builder rejects unsupported compositions, languages and primitives.
The SDK template renders the admitted View program using its shared visual catalog,
generated surface and validator, without product CRUD handlers. `buildHumanModule`
and `buildDistribution` derive the program from the compiled composition; callers
cannot supply another program. Distribution helpers produce plans; the separate
buildDistribution entrypoint realizes the installed svelte-web target.
Read [distribution builds](distributions.md) before building or mounting. Compiling
a native, CLI or controller target name does not implement that target.

Run npm run check, npm run web:check, npm run web:build and npm run test:web using
AUTHORING.md prerequisites. Tests use isolated PostgreSQL stores.
Read [verification](verification.md) for independent expected behavior and
[runtime](runtime.md) before persistent execution.

Map the actual product's actors, objects, authority, effects, failures and recovery
before extending the example. Missing support belongs in a proposal, never an
unapproved simplification of the product.

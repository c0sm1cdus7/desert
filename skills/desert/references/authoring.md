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
Read [Notebook](notebook.md) in file order: the complete product, actual Svelte
binding and build integration. These source files are what the bundle tests.

## Facts and ownership

Use objectType({ id, facts }), text, integer, enumeration and principal.
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
Creates cover every fact. Updates require nonempty equality conditions and changes.
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

This does not enable a command to mutate several objects, cross-controller
transactions or a multi-object human renderer. Those remain separate capabilities.

Mutation helpers derive confirmation: "prepared-effect" and outcome: "receipt".
These bind execution, not screen count. There is no confirmation: "none",
outcome: "durable-receipt", or object-argument mutationJourney overload.
Local versus remote comes from distribution bindings, not an Internet flag.
The current local executor rejects extra unsupported capability dependencies.

## Human and agent interaction

humanSurface accepts journey references in journeys, entry, primaryAction and
subjectActions, not a nested navigation authoring object. Its current family has
a read entry, create primary action and update subject actions on the entry object.
It is not a general multi-object context framework.

Every exposed mutation has an explicit commit entry: submit for the form/action
invocation, or review to await another confirmation. Reads have no commit mode.
Neither grants consent authority. Notebook creates directly and archives from
Actions with review. Reading an object does not create a mutation-step footer.

Provide complete language labels and the connection contract shown in Notebook.
Missing labels and unsupported semantics are errors. agentSurface(id, journeys)
exposes only listed journeys. No general MCP renderer is installed.

## Assemble, build and test

product({ id, objects, dependencies, policies, journeys, surfaces }) composes
definitions. version, execution, profile fields and callbacks are not accepted
product fields. compile(product) checks grammar and references and freezes projections.
Use surface(id) for clients, not the private execution plan.

The Svelte builder rejects unsupported compositions, languages and primitives.
The SDK's generic template renders HumanProduct with the generated surface and
validator, without business CRUD. Distribution helpers produce plans only; the
separate buildDistribution entrypoint realizes the installed svelte-web target.
Read [distribution builds](distributions.md) before building or mounting. Compiling
a native, CLI or controller target name does not implement that target.

Run npm run check, npm run web:check, npm run web:build and npm run test:web using
AUTHORING.md prerequisites. Tests use isolated PostgreSQL stores.
Read [verification](verification.md) for independent expected behavior and
[runtime](runtime.md) before persistent execution.

Map the actual product's actors, objects, authority, effects, failures and recovery
before extending the example. Missing support belongs in a proposal, never an
unapproved simplification of the product.

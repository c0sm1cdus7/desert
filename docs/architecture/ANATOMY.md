# DESERT SDK anatomy

DESERT separates product declarations, admitted execution and visual rendering.
VOID declares its capabilities; it does not implement a controller or draw its
own controls. This map follows executable source. Open requirements are listed
separately; a type or folder is not evidence that a runtime exists.

## The complete path

```text
Product source
  Module → Object + Policy + Command + Journey + View + Destination
       ↓ composeProduct
  Owned field/journey metadata + minimal exposure → canonical surfaces
       ↓ internal wire validation + compileViewProgram
  Validated, frozen domain + ViewProgram + derived catalog + storyboard
       ↓ public compile(composedProduct)
  One bound application; builders and hosts derive its admitted ViewProgram
       ├── execution: Session → Begin → Prepare → Accept → Receipt
       └── presentation: authorized projection → ResolvedView → catalog owners
```

## Authoring contracts

| Piece | Actual owner | Responsibility |
| --- | --- | --- |
| Public authoring API | [index.ts](../../src/index.ts) | Exports portable declarations, not database/framework infrastructure. |
| Object and fact types | [contracts.ts](../../src/contracts.ts) and [field-definition.ts](../../src/field-definition.ts) | Declares object identity and typed facts. Field kinds have one schema owner. Stored records contain facts, not Views. |
| Command | [commands.ts](../../src/commands.ts) | Declares create/update input and effect; no arbitrary handler. |
| Canonical journey | [journeys.ts](../../src/journeys.ts) | Declares a read or mutation, required controller/capabilities and outcome. |
| View journey binding | [modules/authored-types.ts](../../src/modules/authored-types.ts) | Public `ViewJourney` binds activities through actual objects and issued references; [program-schema.ts](../../src/views/program-schema.ts) defines its compiled wire form. Input-free actions do not invent an editor. |
| Policy | [journeys.ts](../../src/journeys.ts) | Declares ownership; runtime enforces it on reads and mutations. |
| Execution role | [dependencies.ts](../../src/dependencies.ts) | Names the controller responsibility. It is not a product controller class. |
| View grammar | [modules/authored-types.ts](../../src/modules/authored-types.ts) and [views/schema.ts](../../src/views/schema.ts) | Public `View` retains object-reference docks until composition; the wire grammar supplies the same ordered content and finite catalog descriptors. No CSS, HTML or callbacks. |
| Component authoring | [views/components.ts](../../src/views/components.ts) and [views/define-view.ts](../../src/views/define-view.ts) | `Components.Header(...)`, `Components.Stack(...)` and the other closed builders create catalog values. `defineView(...)` places them and derives renderer node IDs; consumers never author a node `kind` or `id`. |
| View ports | [views/authoring-ports.ts](../../src/views/authoring-ports.ts) | Declares local inputs/outputs once and provides typed property references. |
| References | [views/reference-helpers.ts](../../src/views/reference-helpers.ts) | Validates fact/output/input references. IDs are serialized identities, not paths or style hooks. |
| Object publication | [modules/publish-object.ts](../../src/modules/publish-object.ts) | Associates a detail View, title fact, field labels/representations and offered action journeys with one object definition. |
| Human presentation semantics | [modules/human-presentation.ts](../../src/modules/human-presentation.ts) and [modules/schema.ts](../../src/modules/schema.ts) | Fields publish their labels and semantic representations; execution registrations publish operation labels and mutations declare whether human review is required. |
| Module | [modules/definition.ts](../../src/modules/definition.ts) | Owns definitions and explicitly publishes public contracts. |
| Product root | [modules/compose.ts](../../src/modules/compose.ts) | Mounts modules; derives domain, View program and indexes. No second authored registry. |
| Public compilation | [modules/compiled-product.ts](../../src/modules/compiled-product.ts) | Accepts only the issued composition and binds its application to its one admitted View program. Detached wire data is not a public product build entrypoint. |
| Public catalogs | [modules/module-catalog.ts](../../src/modules/module-catalog.ts) | Derives typed `Journeys`, `Views`, `Commands`, `Destinations` and `Dependencies` from mounted manifests. Commands derive from published mutation journeys, not a second command registry. |
| Cross-module references | [modules/references.ts](../../src/modules/references.ts) and [modules/admission.ts](../../src/modules/admission.ts) | Issues opaque references and admits exact module ownership before snapshotting and serializing. A copied ID/owner shape is not a valid reference. |
| Exposure | [surfaces.ts](../../src/surfaces.ts) | Composed human authoring accepts only `id`, execution journey objects and `locale`; agent exposure selects execution journeys. Neither grants authority. |
| Exposure compilation | [modules/compile-surfaces.ts](../../src/modules/compile-surfaces.ts) | Derives canonical field/operation labels, field representations and human review modes from their owners before domain compilation. |
| Navigation ownership | [navigation-ownership.ts](../../src/navigation-ownership.ts) | One guard and type exclude competing navigation from composed human exposure. |
| Connection policy | [connection-policy.ts](../../src/connection-policy.ts) | Fixed SDK availability/draft/reconnect guarantees, injected rather than repeated by products. |
| Distribution | [distributions.ts](../../src/distributions.ts) | Separates deployable controller/client artifacts from the product definition. |

TypeScript provides author feedback; the closed schemas and compilers also check
JSON at runtime. A cast cannot authorize an invalid reference or a write.
The portable protocol retains IDs so it can be serialized across runtimes;
authoring helpers reference the real definitions rather than duplicating names.
A definition's `name` identifies the View; it is not a renderer component key.
The compiler generates placement identities such as `content.0` internally.
Component values and Views also carry private issuance provenance: an equal
object, spread copy or raw protocol descriptor does not replace a catalog value.
See [component authoring](COMPONENT-AUTHORING.md) for the complete finite API.
A read binding explicitly references `detailView`. Publication does not select a
fallback: the compiler checks that the referenced View and its authorized data
projection agree. These are references to one registered View, not two definitions.

## Composition and validation

[assertProductSource](../../src/authoring/index.ts) checks the product source tree
before evaluation. VOID's build, host and inspection scripts use it. It rejects
private module imports, product rendering/styling, callbacks and infrastructure
imports. This is a trusted-authoring gate, not a sandbox for hostile JavaScript.

Declarative values infer their types: check contracts with `satisfies`, preserve
literal identities with `as const`, and let SDK constructors infer their generic
arguments. The gate rejects value annotations (`const Notes: View = ...`), explicit
constructor type arguments, coercive assertions and explicit `any`/`unknown`
types. Type-check suppression directives in comments are rejected as well; the
same text inside a string remains ordinary product data. This rule applies to the
admitted product source tree, not to infrastructure,
runtime parsers or tests. Type aliases, interfaces and `typeof` remain available
for contracts without widening a value:

```ts
const NotesPorts = viewPorts({ inputs: { notes: "collection" }, outputs: ["create", "select"] });
export const NotesView = defineView({
  name: "notes", outputs: NotesPorts.outputs,
  topDock: Components.Toolbar({ actions: [
    { output: NotesPorts.output.create, label: "Create note", icon: "create" },
  ] }),
  content: [
    Components.Header({ title: "Notes", subtitle: "Your private notes." }),
    Components.Stack({ title: "All notes", items: [
      Components.Collection({ input: NotesPorts.inputs.notes, output: NotesPorts.output.select }),
    ] }),
  ],
}) satisfies View;
type NotesDefinition = typeof NotesView;
```

This is product data built with SDK constructors, not a rendering callback.
The Header stands alone; only the collection is grouped in the titled Stack.
The constructors derive their property types from the same canonical schemas
used at runtime. Extra properties, custom styles and unissued child objects are
rejected. Module admission also requires the registered result of `defineView`;
calling a file `something.view.ts` does not grant rendering authority.

[Module/root link constraints](../../src/modules/links.ts) derive permitted owned
identities, public owner-qualified references and each View's output ports from
the declarations themselves. The source gate does not replace TypeScript or the
runtime compilers; raw input still undergoes runtime validation.

[Module ownership](../../src/modules/ownership.ts) rejects duplicate/private or
foreign-owned references. [Publication validation](../../src/modules/object-publication.ts)
keeps published Views and field metadata out of persisted object facts and strips
authored field metadata from the compiled View-program publication. Field labels
and representations still affect the derived canonical human surface; they are
not excluded from the complete installation digest.
[Publication semantics](../../src/views/publication-semantics.ts) owns the shared
title/fact/subject-action invariants. Authoring helpers and module admission call
that owner; View-program admission reuses its reference/subject checks and adds
the distinct authorized-read and source-binding requirements.

[compile](../../src/compile.ts) checks canonical types, effects, policies,
dependencies and exposure. [compileViewProgram](../../src/views/program.ts)
checks executable View bindings, authorized data projections, finite supported
activities and output reachability. Unknown semantics fail; they are not ignored.

## One authoring owner for human semantics

A composed human exposure selects execution journey objects and locale. The
actual [VOID declaration](../../../void/src/surfaces.ts) is:

```ts
export const VoidHumanSurface = humanSurface({
  id: "human",
  journeys: ExposedJourneys,
  locale: "en",
});
```

`ExposedJourneys` contains the published Notes and Tasks execution references.
Both surfaces additionally expose private image reads; only human exposure
selects image import until an agent binary-acquisition capability is installed.
Presentation-only destinations are not execution operations. Operation display
labels are not redeclared here. The
[human exposure boundary](../../src/human-exposure.ts) rejects authored `fieldRepresentations`,
legacy `inputs`, `commit` and `language` maps, connection policy and competing navigation, including
equal duplicates. The authoring helper accepts no other properties.

The [object publication](../../../void/src/modules/notes/note.publication.ts)
owns each field's `label` and `representation`, through a typed fact reference.
The installed representations are `text`, `paragraphs`, `image` and `tags`. Paragraphs
require a text fact; image requires an `imageAsset()` fact; tags require `labels()`.
Assets and labels cannot be object titles or text collection summaries. Duplicate, foreign, unknown and
principal field references fail.
The [execution registration](../../../void/src/modules/notes/notes.module.ts)
owns its operation `label`. An exposed mutation also explicitly declares
`humanReview: "required"` or `"not-required"`; a read cannot declare review.
Required human metadata is checked when the operation is exposed, so a headless
module does not need to manufacture display metadata.

[compileSurfaceExposures](../../src/modules/compile-surfaces.ts) translates those
declarations into canonical `language`, `fieldRepresentations` and `commit` maps
before the internal wire compilation. Each presented field has an explicit compatible
representation. Text/paragraphs derive text/multiline inputs; image facts derive
the shared file control and staged-image contract described below. Labels derive
the shared labels control with limits from their canonical input schema, not a
comma-separated text field. A form only
contains the command's authorized inputs.
`required`/`not-required` become `review`/`submit`. These maps
are generated protocol values, not another authored registry. Missing metadata
fails instead of falling back to fact names, journey IDs or output names.

Human review is not preparation, consent authority or atomic acceptance.
`humanReview: "not-required"` omits the additional human review step; admission,
prepared-effect validation, acceptance and receipt recovery still apply.
The compiler supplies the fixed [SDK connection policy](../../src/connection-policy.ts):
availability follows journey dependencies, drafts remain in session memory, and
reconnect refreshes without replaying mutations.

Read-only paragraphs use the same published representation without requiring
any mutation. Representation never grants editing authority. The neutral
[field representation schema](../../src/field-representation.ts) is shared by
publication and the canonical surface; the old `inputs` map is rejected, not
retained as a second owner or fallback. The composed Notebook example uses the
same canonical representation contract. This changes the canonical surface
definition and its installation digest; it is not an automatic store migration.

The compiled human projection also derives `fieldKinds` from those actual facts.
View-program admission validates its complete key set and representation/type
compatibility using the same predicate, including after browser serialization.
Neither map is an authored override. This is wire coherence validation, not
proof of authenticity or permission to execute; the controller remains the
execution authority.

## Public object-reference catalogs

[`moduleCatalog`](../../src/modules/module-catalog.ts) consumes registered module
manifests once. Each manifest selects public definitions by object reference,
for example `exports: { journeys: { createNote: CreateNote } }`. The integrator
then exports projections such as `Journeys = Modules.journeys`; consumers write
`journey: Journeys.createNote`, not a string lookup or an implementation import.

[`admission.ts`](../../src/modules/admission.ts) validates ownership, mounting,
reference kind and execution/presentation capability before JSON snapshotting.
[`lower-references.ts`](../../src/modules/lower-references.ts) serializes admitted
references into the existing protocol. Runtime identity checks complement static
typing: forged handles, clones and unmounted homonymous modules cannot pass just
because their IDs match. Wire validators remain internal protocol boundaries,
not an alternative public View-authoring API.

The source gate traces catalog projections through aliases and re-exports. A View
may consume proven View references; renaming a journey or mixed catalog to `Views`
does not grant permission. Modules cannot depend on another module or the root
catalog. The root composes shared activities after creating its module catalog,
avoiding a circular dependency between a journey and its own registry.

## One navigation owner

[The module catalog](../../src/modules/catalog.ts) derives definitions and the
storyboard. Destination order is an authored product choice, not file discovery.
Home is a destination, not a mandatory module or an SDK-wide entry rule.
`humanSurface()` exposes execution; it cannot declare `entry`, `primaryAction`,
`subjectActions` or `navigation`. The composed View program owns entry and action
bindings. The former standalone human/agent authoring route is removed. Notebook
now uses the same `composeProduct`, module publications, `Components` and declared
workspace as VOID. No renderer precedence rule chooses between two declarations.

Public `compile(NotebookProduct)` accepts an issued composition. Builders and
controller hosts retrieve its admitted program from the compiled application;
neither `buildDistribution` nor `buildHumanModule` accepts a `viewProgram`
override. Internal protocol/compiler tests may still exercise raw wire definitions
with `src/compile.ts`; that does not create another public renderer or entry rule.

The complete example is [Notebook's root](../../products/notebook/src/notebook.product.ts).
Its [Notes module](../../products/notebook/src/modules/notes/notes.module.ts) owns
commands, journeys, Views and the object publication. The product-level
[workspace](../../products/notebook/src/views/workspace.view.ts) mounts the left
navigation View. Older flat Notebook filenames only re-export these declarations.

Navigation entries explicitly declare their destination reference, group and
content/utility purpose. Labels and icons remain destination metadata; neither an
icon nor a reserved ID determines grouping. Registered destinations need not all
appear in navigation. The serialized contract is `desert.view-program/4`:
`workspace` is a required authored View reference and a validated wire View ID.
Earlier versions are rejected, not silently reinterpreted.

Every create, update and subject-action binding declares its `source` read.
In authoring this is the registered read object or an issued public read
reference, never its string ID. The type rejects mutations and presentation-only
journeys; admission checks the exact identity and a paired read presentation.
The wire compiler additionally checks exposure and the mutation/read object
match. There is no unique-read inference, even when only one read is installed:

```ts
export const CreateNoteExperience = {
  id: CreateNote.id, kind: "create", source: ReadNotes,
  view: NoteEditorView, preferredDock: "right",
  outputs: [
    { ...viewOutput(NoteEditorView, NoteEditorPorts.output.save), action: { kind: "submit" } },
    { ...viewOutput(NoteEditorView, NoteEditorPorts.output.close), action: { kind: "close" } },
  ],
} satisfies ViewJourney;
```

[`sourceRead`](../../src/views/program-bindings.ts) is the shared source resolver
for admission and the interpreter. It never chooses the first matching read.
This explicit source determines the post-mutation collection and the authorized
read used for subject detail, not another copy of the object's facts.

[resolveProgramWorkspace](../../src/views/program-workspace.ts) is the shared
admission/runtime owner of the supported root composition: a destination outlet
and an optional left navigation View. That View declares its own identity and a
navigation node consuming the one list above. No leftDock means no navigation
surface. The renderer cannot fabricate one from exposure metadata. Unsupported
slots, nested docks and right docks fail; this is not a general side-dock engine.

The shared [ToolbarLayout](../../src/svelte/pieces/ToolbarLayout.svelte) accepts
identity data and alone mounts [ToolbarIdentity](../../src/svelte/pieces/ToolbarIdentity.svelte).
Its title uses the surface reading guide when no leading control is present;
otherwise it follows the actual control group. Consumer title markup and padding
overrides are rejected by the toolbar ownership gate. The guide and title formula
live in the shared surface-reading and toolbar-layout owners, respectively.

## Execution and controller availability

[localSession](../../src/local/session.ts) is the installed dispatch boundary:

```ts
session.begin(journeyId, subjectId) // Omit subjectId for creation.
session.preflight(journeyId, partialInput, { subject, expectedVersion })
session.read(runId)
session.prepare(createRunId, input)
session.prepare(editRunId, input, { expectedVersion }) // Original authorized read revision.
session.accept(intentId, confirmationDigest)
session.receipt(intentId)
```

[Admission](../../src/local/admission.ts) checks trusted identity, exposure,
subject and authority. [Preparation](../../src/local/prepare.ts) validates the
canonical input and the original edit revision. [Acceptance](../../src/local/accept.ts)
commits atomically with the receipt and retains the prepared concurrency guard.
Retries recover the same occurrence, not a replacement write.

[Availability](../../src/local/availability.ts) tracks the required controller
using expiring evidence. It is not `navigator.onLine`. An available dependency
is still not permission to execute a subject action. Drafts and original edit
bases remain in the shared client; reconnect does not replay them automatically.

The [HTTP gateway](../../src/web/gateway.ts), [protocol](../../src/web/protocol.ts)
and [dispatch](../../src/web/dispatch.ts) forward the same session operations.
There is no NotesController implementation, module-specific write API or
product event broker. A controller role can govern several object types.
VOID's symbol `NotesController` is a `controllerRole(...)` declaration in
[notes.dependencies.ts](../../../void/src/modules/notes/notes.dependencies.ts).
The host resolves that published role and installs the SDK's controller; the
symbol does not provide methods or a second execution path.

[Controller hosts](../../src/local/controller-host.ts) and
[openLocalController](../../src/local/controller.ts) accept an explicit set of
controller roles, not a single assumed Notes role. One installed controller can
serve the Notes and Tasks roles. The installation checks the actual product,
contract digest and role set; listing a role does not authorize an unrelated
command, prove remote connectivity or enroll another machine.

## Command, journey and conditional activity

A command is a typed effect and its input/subject requirements. A canonical
journey exposes that operation through declared execution dependencies and
confirmation/outcome semantics. A View journey binding places that experience
and maps View outputs to finite navigation/submission actions. These layers do
not create a second command implementation.

[`preflightMutation`](../../src/local/preflight.ts) checks partial input,
ownership, current state guards and the edit revision without creating a run or
executing a command. Its result distinguishes incomplete, invalid, blocked and
ready. Ready is an observation, not approval or a lock: prepare and accept still
perform their canonical checks.

The installed [activity engine](../../src/activities/index.ts) adds durable
conditional input collection around one installed mutation journey:

| Owner | Responsibility |
| --- | --- |
| [authoring.ts](../../src/activities/authoring.ts) | Typed journey/View references and `activityInputs(journey)` references; steps never contain command handlers. |
| [catalog.ts](../../src/activities/catalog.ts) | Admits only installed operations and registered component-built Views, binds the contract/catalog digest, and validates dynamic plans. |
| [coverage.ts](../../src/activities/coverage.ts) | Checks earlier-input conditions and complete, nonduplicate command input coverage on every admitted branch. |
| [drafts.ts](../../src/activities/drafts.ts) and [records.ts](../../src/activities/records.ts) | Persist identity/surface-scoped drafts, answers, revisions, expiry and cancellation. |
| [prepare.ts](../../src/activities/prepare.ts) | Reuses preflight, canonical run admission and preparation once the active steps are complete. |
| [acceptance.ts](../../src/activities/acceptance.ts) | Invalidates old approvals after edits/cancellation; activity completion and the canonical effect/receipt commit together. |

The bounded conditional vocabulary is equality/inequality against a previously
collected scalar, at most 32 steps and 256 analyzed branch combinations. A plan
can be created at runtime, including by an agent, but cannot install new commands,
Views, input fields or arbitrary conditions. Earlier edits invalidate later
completed answers and the old prepared approval. The command's schema remains
the authority; this is not arbitrary runtime rewriting of its requirements.

`LocalSession` exposes `activityCreate`, `activityList`, `activityRead`,
`activityAnswer`, `activityReopen`, `activityPrepare` and `activityCancel`;
creation binds a caller occurrence to the exact plan/request digest. The same typed dispatch is available over
the HTTP adapter and MCP when the host explicitly installs an activity catalog.
Final execution still uses `accept` with the exact prepared confirmation.
There is no automatic acceptance or cross-identity assignment. The human
[activity model](../../src/web/client/activity-model.ts) and
[projection](../../src/web/client/activity-projection.ts) now drive the same
shared form/review/panel owners. Back reopens a durable step and invalidates old
preparation; accepted/uncertain work retains the original operation identity.
VOID's Guided note exercises this interpreter with its existing creation command.
Earlier generated browser checkpoints cover desktop/mobile completion, reload and
recovery; qualification of a later source/build must be rerun, not inferred from
those checkpoints. Cross-identity delegation, cross-surface continuation,
cross-object atomic workflows and asset/label-valued steps remain unsupported.
Conditional steps do not make command input requirements conditional: every
admitted branch must still collect all canonical inputs exactly once.

## Identity entry and agent transport

[`serveIdentityHost`](../../src/local/identity-host.ts) mounts a protected local
product without manufacturing a developer identity. The shared
[AccessGate](../../src/svelte/pieces/AccessGate.svelte) chooses onboarding when no
administrator exists, locked sign-in when there is no valid session, or the
declared product workspace when access is ready. Home remains the product entry;
the access gate is not a competing navigation registry.

[`humanIdentityAccess`](../../src/identity/access.ts) owns first-administrator
initialization, password sign-in, session lock and administrator-only identity
creation/listing/disabling. Password hashing and session issuance live in
[password.ts](../../src/identity/password.ts) and
[sessions.ts](../../src/identity/sessions.ts). The
[identity gateway](../../src/identity/gateway.ts) uses the common HTTP transport,
same-origin checks, contract binding and HTTP-only session cookies. First-admin
web initialization requires the host's one-use bootstrap invitation; the browser
does not receive a reusable controller credential. Lock immediately hides and
disposes the mounted workspace, persists a local lock barrier and requests server
revocation. An unreachable controller cannot undo that local lock on reload.

The [browser access client](../../src/web/client/access.ts) issues a binding for
one authenticated workspace instance. The [transport](../../src/web/client/transport.ts)
and gateway verify this binding on protected requests and responses, including
private image bytes. The binding is not a credential: authentication still uses
the HTTP-only cookie. Another tab changing that cookie must retire the old
instance, not submit its draft under the newly signed-in identity. Late responses
cannot restore that instance. An unavailable controller does not prove logout;
it cannot erase the active draft or cause a write to replay. Identity-scoped
Activity recovery journals survive disposal, including an uncertain acceptance.

The closed `Components.Identity()` composition publishes current public identity
data; its explicit `lock` output is session control, not a fabricated domain
mutation. Administrative identity methods are infrastructure only: no admin UI
or alternate product action path is claimed. Password recovery, agent OAuth,
remote enrollment and production deployment hardening remain unfinished.
[`developer-host.ts`](../../src/local/developer-host.ts) is a separate explicit
test/development fixture boundary, not the normal protected VOID entry.

The real [MCP adapter](../../src/mcp/server.ts) binds an SDK-issued agent session
and derives tools from the canonical [Requests](../../src/web/protocol.ts).
It exposes catalog, preflight, begin/read/prepare/accept/receipt/offer, plus activity
operations only when installed. Human sessions are rejected. Tool descriptions
and read-only hints grant no authority; canonical dispatch authenticates the
session and enforces its exposure. Acceptance is explicit; lost delivery recovers
the original receipt. [stdio.ts](../../src/mcp/stdio.ts) runs this server over the
actual MCP stdio transport. This does not install remote OAuth, provider CLI
discovery or a shared cross-surface Home/sidebar navigator.

## Private image inputs and reads

[`imageAsset()`](../../src/field-definition.ts) declares an image fact, not a URL,
filesystem path or a renderer override. Commands assign it only through a
compatible `fromInput(...)`. The shared [asset reference schema](../../src/assets/types.ts)
is a closed kernel-issued locator; knowing its value grants no read or write
authority. The compiler rejects authored literals and text collection summaries
for these facts.

The [form projection](../../src/interaction/frame-presenters.ts) selects the
existing `control.files` catalog owner. The session's
[file host](../../src/svelte/controls/file-host.ts) retains actual browser `File`
handles; the draft/frame contain only bounded metadata. Selecting a file does
not upload it. [Draft validation](../../src/web/client/draft-validation.ts)
validates all scalar inputs and the selected file policy without manufacturing
an asset reference. A controller upload is required before canonical input
validation and preparation can succeed.

On an explicit submit, [mutationFlow](../../src/web/client/mutations.ts) begins
the installed journey, stages the selected bytes, then prepares and accepts the
same command. [The private image session](../../src/assets/session.ts) binds
staging to identity, surface, run, input field, contract and private store.
Original bytes are preserved; the shared optimizer produces bounded image
renditions. Asset links, object effects and the receipt commit in one acceptance
transaction. A lost upload response performs a status lookup, never automatic
byte replay. Failed work retains the local draft; completion/disposal releases
its browser handles.

The shared Image owner uses a private reader context, never product `fetch` or
public URLs. [The model reader](../../src/web/client/model.ts) permits only an
active published read and expires results after navigation or closure.
[Server image reads](../../src/assets/read.ts) independently revalidate canonical
read authority, published fields, current ownership and attached asset links
before and after storage access. Blob URLs remain local to the mounted Image
owner and are revoked on replacement/unmount; private images do not enter the
public prefetch cache.

The first installed asset vertical is image import plus title collection and
private image detail. Asset-aware thumbnail collections, asset-initialized
update forms and activity-scoped staging are not installed. Activity admission
explicitly rejects asset inputs rather than treating them as scalar answers.
Derived verification also reports `ASSET_INPUT_REQUIRES_STAGED_FIXTURE` when it
lacks a real staged host fixture; generated UUIDs are not acceptance evidence.

## Isolated execution queue kernel

[`execution.ts`](../../src/execution.ts) is a host-only infrastructure entrypoint,
not a public product authoring escape. It provides durable environment-scoped
actors, typed validated job input, fixed trusted executable adapters and per-actor
concurrency. The queue uses its own `desert_execution` schema and explicit worker
calls; registering an actor is not evidence of a connected machine.

[`claims.ts`](../../src/execution/claims.ts) serializes permit claims and fences
worker leases. [`process.ts`](../../src/execution/process.ts) invokes a fixed
executable without a shell, uses static arguments and an empty environment, and
passes structured input through stdin with time/output limits. An uncertain
worker outcome retains its permit and is not automatically replayed. This is not
an OS sandbox or complete process-tree containment.

The [kernel contract and evidence](LOCAL-EXECUTION-QUEUE.md) identify every missing
link: environment enrollment, provider adapters, Task-to-actor references,
canonical command-acceptance outbox integration, reconciliation and the product
Environments UI. No provider CLI or external account was invoked to demonstrate
this kernel; tests use a deterministic fixture child and real PostgreSQL.

## The nonvisual interpreter

[viewProgramModel](../../src/web/client/view-program.ts) consumes the validated
program. Its [controller port](../../src/web/client/transport.ts) is derived from
the existing typed transport protocol. The browser still uses the same HTTP
adapter. The internal Node-only [local host](../../src/local/view-program.ts)
injects that port into the same interpreter and forwards operations through
canonical dispatch using an SDK-issued `LocalSession`; it checks both the session's
exposure and contract binding before admission. It borrows the session and owns
only its availability watcher and model lifecycle. It does not create credentials,
an endpoint, a new execution engine or an agent exposure. The browser bundle does
not import this local host.

[Read scopes](../../src/web/client/view-scopes.ts) isolate each read
journey's state. [Model scope](../../src/web/client/model-scope.ts) owns internal
normalization: it references canonical read/mutation declarations, represents an
optional primary creation explicitly, and never fabricates an empty journey ID
or rewrites the canonical surface. Presentation has its own scope without a read.
Initial entry selects its declared scope, not the first registered collection.
The pure `readScopes(program, surface)` derivation is shared with tests; callers
cannot omit a model scope and fall back to surface-level navigation.
[Projection](../../src/web/client/view-projection.ts) resolves
authorized facts, toolbar actions and canonical form contracts.
[Title resolution](../../src/web/client/view-identity.ts) interprets explicit
`subject-title` and `operation-label` bindings; a literal title stays literal.
Published actions retain their declared icon and require the matching source
read, current dependency readiness and subject eligibility. Publication alone
does not make a command available.

[Event ownership](../../src/web/client/view-events.ts) issues an opaque identity
for each mounted activity. A late blur, submit, Close or Accept from a superseded
instance cannot act on the current one, even when both use the same View and input
names. This identity is runtime-local, not a product ID, serialized contract field
or controller credential. [InstanceFrame](../../src/svelte/InstanceFrame.svelte)
captures that instance's callbacks while the outer Drawer remains mounted; this
preserves the existing entry/exit motion and responsive host.

The supported vocabulary includes presentation, read, create, input-bearing update,
input-free subject action and bounded conditional activity. An action declares its source read and has no authored
View; it enters the same canonical preparation/review/acceptance/recovery path.
Compilation rejects entry edges to subject-dependent updates/actions without a
selected subject. Availability does not authorize substituting a different subject
at acceptance.
Multiple object/read/create flows are supported; creations and updates name their source read
and initialize each input from an explicit authorized fact. A View can be reused
by create and edit without knowing either journey ID.
Canonical execution is shared by human and agent exposures. Home, Media, System,
Appearance, Identity and Visual catalog are presentation-only View journey bindings; a common cross-surface
journey navigator is not installed. The internal local host proves transport
independence for the currently admitted human View program; it does not enable
the same navigator over MCP or a remote API. Public cross-surface navigation,
serializable event ownership and a deliberately projected navigator state contract
remain unimplemented. The model's snapshots and runtime-local event identities
are not remote DTOs. The
[prepared-response projection correction](../BANK-SECURITY-FINDING.md) now derives
one response authority for human and agent mutations from that surface's own
reads and the operation's input assignments. The controller applies it to initial
and repeated preparation; unrelated stored facts and ownership are excluded.
Human review reuses the same projection. The full stored effect and confirmation
digest remain unchanged. This closes that response leak; it does not turn
local view events into a remotely navigable contract or install delegation.

## Catalog and renderer

These are distinct inventories, not competing sources of truth:

| Catalog | Construction |
| --- | --- |
| Product definitions and storyboard | Derived from module/root registrations by [modules/catalog.ts](../../src/modules/catalog.ts). |
| Public component values | [Components](../../src/views/components.ts) derives closed typed builders from the View grammar, with issuance checks in [component-values.ts](../../src/views/component-values.ts). |
| Semantic interaction pieces | [InteractionCatalog](../../src/interaction/catalog.ts), with states, groups and [foundation ownership](../../src/interaction/catalog-ownership.ts). |
| Web implementations | [webRenderers](../../src/svelte/renderer-registry.ts), checked exhaustively for `PrimitiveId` by [WebRendererBank](../../src/svelte/renderer-contracts.ts). |
| Sealed adapter gateway | [adapter-catalog.ts](../../src/svelte/adapter-catalog.ts) exports actual existing owners; [adapter-contract.ts](../../src/svelte/adapter-contract.ts) restricts the admitted props/slots and derives their types from those owners. No new DOM or alternative controls. |
| Visual inspection | [InspectionCatalog](../../src/svelte/catalog/InspectionCatalog.svelte) derives entries from the semantic catalog and [public bank inventory](../../src/svelte/explorer/PublicCatalogBank-model.ts); specimens use the same registered owners. |

Header, Stack, toolbar, media-library, Appearance, System and Identity compositions have View grammar and shared
owners; they are not all entries of `InteractionCatalog`. Exhaustiveness of that
registry does not establish global component ownership.

The active authored-View route is concrete:

```text
ViewProduct: model snapshot + owned events
  → adapter-catalog.ViewWorkspace
    → CatalogWorkspace: existing shell, left navigation and search overlay
      → CatalogWorkspaceContent: finite body selection
        → ViewContent → ContentFlow: ordered content, not a mandatory Stack
      ├─ ViewItem → catalog owners / BankRenderer
      ├─ InspectionContent → Inspection → InspectionCatalog
      └─ MediaContent → MediaLibrary → existing CatalogHome + Viewer
    → Panel → TransientRenderer → existing Drawer
      → InstanceFrame → SurfaceFrame → FrameBody → catalog owners
    → FailureDialog → BankRenderer
```

| Read this implementation | What it owns |
| --- | --- |
| [ViewProduct](../../src/svelte/views/ViewProduct.svelte) | Closed catalog adapter. [ViewProductContent](../../src/svelte/pieces/ViewProductContent.svelte) instantiates the shared model with its authenticated browser binding and hands resolved data/events to the workspace. [Browser session lifecycle](../../src/web/client/browser-session.ts) owns invitation consumption, subscriptions, unload protection and disposal, not layout. |
| [ViewWorkspace](../../src/svelte/pieces/ViewWorkspace.svelte) | Finite workspace composition; retains destination content and coordinates search, album navigation and focus using the approved shell. [Workspace](../../src/svelte/views/Workspace.svelte) is a thin compatibility adapter to that same owner. |
| [CatalogWorkspace](../../src/svelte/explorer/CatalogWorkspace.svelte) | Owns the existing viewport, heading motion, navigation, search overlay and panels. Accepts typed data, not incoming content, search, panel or bottom render slots. |
| [CatalogWorkspaceContent](../../src/svelte/pieces/CatalogWorkspaceContent.svelte) | Selects the installed `view-program`, `public-catalog` or `access` body from the private [workspace content contract](../../src/svelte/pieces/workspace-content.ts). Retains the same existing DOM and catalog owners. |
| [ContentFlow](../../src/svelte/pieces/ContentFlow.svelte) | Renders ordered content; standalone header identity belongs to the workspace, titled Stacks group their own children. |
| [Inspection](../../src/svelte/pieces/Inspection.svelte) | Retains the local Visual catalog and opens its examples. [InspectionCatalog](../../src/svelte/catalog/InspectionCatalog.svelte) owns bank/group wrappers and instance-scoped entry lookup. |
| [MediaLibrary](../../src/svelte/pieces/media/Library.svelte) | Owns the media wrapper, selection queue and viewer focus; reuses [Viewer](../../src/svelte/pieces/media/Viewer.svelte), not a second media UI. |
| [Panel](../../src/svelte/views/Panel.svelte) | Adapts a resolved panel and its event identity to the existing [Drawer](../../src/svelte/pieces/Drawer.svelte); it does not choose sizes or paint. |

The migrated adapters import only admitted gateway entries. The
[adapter gate](../../src/authoring/visual-boundary/adapter.ts) rejects raw HTML,
native markup, CSS, arbitrary/dynamic components, native-attribute forwarding
and shadowed catalog names; the [runtime-global gate](../../src/authoring/visual-boundary/adapter-globals.ts)
also rejects direct DOM/global escape routes. `TransientRenderer` and
`ControlBankRenderer` alias the same actual BankRenderer but admit only their
respective private frame identity/file-host capabilities. The generic entry
does not gain those capabilities or native action attributes.

`Components.SystemStatus()` expands through
[system-status.ts](../../src/web/client/system-status.ts) into existing Stack,
Fact and Text pieces. Inventory comes from compiled exposure; readiness comes
from current controller evidence. It cannot claim that a registered dependency
is connected. `Components.Appearance()` uses the existing shared catalog
appearance owner and device-local persisted preferences, not a product mutation
or consumer styling override. Media reuses the same hero/cards/viewer for the
installed image, video and audio types; a typed sample library is not an upload
service or an authenticated managed media store.

[BankRenderer](../../src/svelte/BankRenderer.svelte) validates its node and selects
the corresponding registered owner. Its [dispatcher gate](../../src/authoring/visual-boundary/dispatch.ts)
checks that finite dispatch path separately from ordinary component adapters.
Catalog owners legitimately implement DOM and motion. Their
[closed composition boundary](../../src/authoring/visual-boundary/composition.ts)
distinguishes locally owned internal snippets from caller-supplied rendering;
moving a wrapper into an owner does not authorize arbitrary public slots.

Workspace consumers receive semantic focus, scroll and catalog-selection actions,
not a DOM element or arbitrary component instance. The finite body contract has no
component/render callback, child markup or native attributes. Its negative source
and type tests reject those escape routes. This closure does not retroactively
qualify every private owner or eliminate the separately inventoried legacy debt.

The [gateway integrity check](../../src/authoring/visual-boundary/gateway.ts)
derives implementation identities from the existing owner type map. A gateway
cannot substitute an owner, wrap it, import styles or execute extra code. The
[nonvisual dependency graph](../../src/authoring/visual-boundary/dependency-graph.ts)
follows each sealed adapter's runtime helpers and barrel exports beyond the
Svelte directory. Private styles/components, opaque imports, unregistered packages
and browser drawing authority fail the build there too. Type-only references
remain legal. The browser-session host admits only its registered invitation,
history and unload capabilities, not arbitrary access to the browser.

The actual [generated-project runner](../../src/build/svelte/project.ts) calls
the [shared visual boundary](../../src/authoring/visual-boundary/source.ts) before
its worker. Removing a required sealed source does not disable the check.
The [worker](../../src/build/svelte/worker.mjs) performs Svelte/TypeScript checking
before Vite can emit a build. An invalid semantic prop value cannot pass merely
because Vite normally transpiles TypeScript without typechecking it.

The generated host owns styling bootstrap: its
[root layout](../../src/build/svelte/template/src/routes/+layout.svelte) imports
the existing [theme.css](../../src/svelte/theme.css), which assembles shared
tokens, typography, geometry and material. The
[page](../../src/build/svelte/template/src/routes/+page.svelte) selects the
renderer; `ViewProduct` does not import CSS or depend on a legacy renderer to
load it. The [bootstrap gate](../../src/authoring/visual-boundary/bootstrap.ts)
admits that theme import and the framework-owned child slot, not another public
render extension. [Catalog appearance](../../src/svelte/pieces/catalog-appearance.ts)
separately mounts/restores the shared root profile; it is not product styling.

Geometry/material/motion belong to shared owners such as
[StackLayout](../../src/svelte/pieces/StackLayout.svelte),
[Action](../../src/svelte/pieces/Action.svelte),
[FieldWell](../../src/svelte/pieces/FieldWell.svelte) and
[pane material](../../src/svelte/pieces/pane-material.css).
The web implementation uses the installed Svelte/shadcn bank. Separate native
catalogs are not implemented; there is no claim of iOS/Android/Linux native parity.

## Boundaries not yet closed

- The [visual ownership audit](visual-ownership-inventory.md) still records
  consumer overrides and open escape hatches. A zero-new-debt check does not
  certify that all existing consumers are sealed. The active adapter/gateway
  closures above are not whole-renderer or transitive legacy qualification.
- Authored View-program navigation has explicit groups and purposes. The older
  standalone catalog workspace retains its separate compatibility adapter; that
  legacy route is not evidence of full catalog ownership qualification.
- Arbitrary authored side-dock Views, cross-identity activity delegation and
  cross-object atomic workflows are not installed by module registration.
  The bounded activity kernel and human interpreter above do not imply arbitrary
  workflow graphs, asset-valued steps or qualified product walkthroughs.
- Protected local onboarding/sign-in/lock exist. Recovery, agent OAuth,
  identity-administration UI and remote environment enrollment do not.
- MCP stdio shares canonical execution. It does not establish production remote
  transport, OAuth policy, provider provisioning or full navigator parity.
- The isolated execution kernel is not connected to canonical command acceptance
  or task assignment, and uncertain job reconciliation remains unimplemented.
- Contract evolution is explicit. Changes alter the installation/build contract;
  existing stores must not be silently repinned or erased.

For the actual product declarations, continue with
[VOID anatomy](../../../void/docs/ANATOMY.md). For executed evidence and remaining
qualification, use [implementation status](../STATUS.md).

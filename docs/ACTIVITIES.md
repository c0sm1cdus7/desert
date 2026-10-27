# Conditional activities — first installed runtime increment

Status: durable runtime, authenticated HTTP/MCP and a human View-program
interpreter are implemented. VOID declares an optional Guided note experience
using the existing creation command. Real PostgreSQL and headless human cases
pass. Generated VOID browser checkpoints also exercise desktop/mobile Guided note;
later source changes require their own build qualification. This does not
implement a Capibara document product, delegated identity assignment or a native
activity renderer.

## One operation owner

An existing mutation journey still owns its command, requirements, controller,
permissions, exact prepared effect and receipt. An activity coordinates collecting
inputs in ordered, conditionally visible Views and explicitly preparing that one
operation. It does not create another command executor or business validator.

`session.preflight(journeyId, partialInput, { subject?, expectedVersion? })` is
different from `prepare`. It runs an authenticated PostgreSQL READ ONLY transaction,
uses the compiled command input validator and the same owner/state checks, and
returns `ready`, `incomplete`, `invalid` or `blocked`. Missing inputs, canonical
validation issues and current blockers are separate. It creates no run, intent,
receipt or domain object and returns no stored subject facts. Ready is an
observation, not permission or a promise that later acceptance will succeed.

Current commands have unconditional input requirements and equality guards on
stored object state. The activity's conditions choose presentation branches; they
cannot weaken those requirements. Every possible admitted branch must collect all
command inputs exactly once. Conditional business requirements need a future
canonical command-language increment, not a second validator in a step.

## Typed authoring and installed catalogs

The product declares an activity experience beside its canonical execution
journey, using registered Views and typed command-input references:

```ts
const Input = activityInputs(GuidedNote);

export const GuidedNoteJourney = activityExperience({
  journey: GuidedNote,
  steps: [
    { view: NoteTitleView, inputs: [Input.title] },
    { view: NoteBodyView, inputs: [Input.body] },
  ],
  review: NoteReviewView,
}, ReadNotes);
```

The module registers those three Views and the experience once, with
`humanReview: "required"`. Its read View emits a typed output that starts the
experience. VOID keeps ordinary Create note unchanged and offers Guided note as
an explicit additional action; both reference the exact same create command.
No View executes an operation, and no string names a component or command input.

`composeProduct`, human-module generation and distribution builds validate the
plan against installed command constraints. `compile(composedProduct)` binds the
admitted program to the application; the controller host derives its activity
catalog from that binding, without a separately supplied `viewProgram` option or
another product allowlist. `activitiesDigest` binds the generated build to the exact
catalog installed in both controller and session hosts. Missing or changed
bindings fail before serving the build. Builds with no activities omit the field.

The lower-level catalog below remains available to a host exposing dynamic plans
without a product View program. It is not an additional catalog required by VOID.

The Node host creates an `activityIndex(application, { journeys, views })` with
canonical mutation definitions or public module references and registered View
objects constructed with `defineView` and `Components`. Raw, copied and serialized
Views cannot bypass component authoring; issued module View references retain
their prior admission. Mutations must exactly match the compiled application. The catalog's
digest binds the contract, operations and Views. The author uses object references
and issued typed input tokens, not step IDs or manually typed command-input names.

```ts
const catalog = activityIndex(application, {
  journeys: [Journeys.createNote],
  views: [Views.Title, Views.Body, Views.Review],
});
const Input = activityInputs(Journeys.createNote);

const captureNote = catalog.define({
  journey: Journeys.createNote,
  steps: [
    { view: Views.Title, inputs: [Input.title] },
    { view: Views.Body, inputs: [Input.body] },
  ],
  review: Views.Review,
});
```

The excerpt assumes those three local Views have been declared. Each collection
View has one canonical form port; the review View has one context port. Nested
docks, unbound toolbar actions and root/navigation/media/appearance compositions
are rejected. This increment does not infer how arbitrary View outputs should
execute. It is not a replacement component bank.

The emitted `/1` plan has internal View and journey IDs. Runtime-created JSON
plans pass the same closed admission through `catalog.admit`: unknown operations,
Views, fields, extra properties, callbacks, forward conditions, missing branches
and duplicated active input ownership fail. Conditions are equality/inequality
against an earlier collected command input. Maximums are 32 steps and 256 finite
branch scenarios; exceeding a bound fails, never silently truncates the graph.

The catalog registers a trusted host allowlist against compiled execution, not a
new public module-mounting API. It grants neither session exposure nor authority.
The normal product/module compiler still owns module composition.

## Human presentation without another renderer

The nonvisual activity interpreter produces the existing Form, Context, Toolbar
and adaptive View-panel data. It adds no Svelte component, CSS, motion, geometry
or renderer-specific product variant. Human activity experiences currently
collect text inputs for a create command. The canonical runtime also supports
subject activities, but their human binding is not installed yet. Array/asset
collection and unsupported form primitives fail closed.

Continue saves only the current step; absent values in other steps are ignored
using diagnostics from the canonical validator, not copied constraints. The
shared form feedback presents errors for touched fields. Each current field
starts with an explicit empty value, so a command permitting present-empty text
can continue without fabricating a nonempty title. Back calls `activityReopen`
and invalidates any prepared approval before returning to the earlier form.
Final Continue prepares the existing command and shows its canonical review;
only the explicit confirmation can accept it.

The browser host persists only a journal version, occurrence, activity and journey
references, plus the exact pending intent reference when accepting. That pending
marker must persist before the request can be sent; storage failure prevents
acceptance. The interpreter receives a finite host port and cannot access browser
storage or generate identities itself. No answer, prepared facts, confirmation
digest, password or token is stored in the journal. Acknowledged steps live in
PostgreSQL; edits not yet continued remain private session memory.

Reload prioritizes the exact journal occurrence over other discovered drafts.
When creation's reply was lost and the activity ID is still unknown, it retries
that same persisted occurrence idempotently; discovery cannot adopt a different
draft instead. Retrying creation never implies accepting its operation.
A pending acceptance remains recovery-only across reload, failed reads and failed
receipt lookups. Its toolbar offers Check result, not another acceptance or a
Close that would discard recovery. Responses must match the requested activity,
installed plan and original pending intent before any state or journal adoption.
Only the existing canonical receipt checks can complete recovery. An unversioned
prepared journal is conservatively treated as uncertain; a versioned review that
was never submitted remains an ordinary review.

The private browser namespace includes the authenticated identity, contract and
surface. Explicit developer mode has a separate namespace; missing or locked
access cannot fall back to it. Old unscoped journal data is neither adopted nor
deleted automatically. Disposal clears private model state and invalidates late
responses without clearing a pending journal. Switching identity cannot expose
the preceding identity's answers or pending operation.
These protections inspect the persisted journal before local restoration: an
early Close or opening a different activity cannot erase a pending acceptance
while initial connection or read requests are still in flight.

Recovery currently stays fail-closed when no original receipt can be found or the
current activity has a different preparation. It does not infer that execution
failed, replay the operation or silently abandon the pending reference. A product
workflow for explicitly resolving such terminal ambiguity is not yet installed.

## Durable lifecycle

Install the catalog using `openLocalController(application, { ...database,
roles: [controllerRole], activities: catalog })`. The authenticated session then exposes:

| Method | Meaning |
| --- | --- |
| `activityCreate(occurrence, plan, options?)` | Persist or recover that exact caller-created UUID occurrence for the authenticated identity and current surface. |
| `activityList({ limit?, after? }?)` | Discover open, unexpired drafts using bounded metadata pages; no answer values. |
| `activityRead(id)` | Resume that exact draft, catalog revision and, when present, its authorized canonical prepared projection. |
| `activityAnswer(id, revision, step, input)` | Save one reachable step under optimistic revision checking. |
| `activityReopen(id, revision, step)` | Reopen a reachable step and immediately invalidate that step's completion, all later completions and any preparation. |
| `activityPrepare(id, revision)` | Explicitly prepare the final canonical operation after complete collection and fresh preflight. |
| `activityCancel(id, revision)` | Close the activity and invalidate its outstanding preparation. |
| `accept(intentId, confirmationDigest)` | Existing canonical acceptance; effect, receipt and activity completion are atomic. |
| `receipt(intentId)` | Existing recovery, with no replay or replacement operation. |

The HTTP gateway exposes those same methods through the same authenticated cookie,
origin, contract and request-schema boundary. The optional [MCP adapter](MCP.md)
exposes the same methods only when its bound controller installed the activity catalog.

Changing an earlier answer increments the draft revision, invalidates all later
step completions and any prior preparation. Later answer values are retained
privately for the existing identity but are excluded from current progress and
command input until explicitly submitted again. No stale prepared intent can be
accepted through a direct API call. Cancellation and expiry also gate canonical
acceptance, not merely UI buttons. Concurrent answers against one revision cannot
both succeed. Preparation retries return the original intent.

Reopening uses the same revision and database-lock boundary as answering; a UI
Back button cannot merely move its local index while leaving approval live. The
snapshot's `currentInput` contains retained values only for its current reachable
step. It does not expose answers from inactive branches or make those values
completed command inputs. The caller must explicitly submit the step again.

An activity has a seven-day execution lifetime. Expiration prevents further edits
or acceptance but does not delete private draft storage. This is a chosen bounded
initial runtime policy, not a completed retention/erasure product policy.

Creation requires an occurrence UUID persisted by the caller before sending the
request. Retrying that occurrence with the exact plan and subject/version options
returns the current draft, without resetting answers or extending its lifetime.
Concurrent identical creates converge through one database uniqueness constraint.
Reusing an occurrence with different material fails with
`ACTIVITY_OCCURRENCE_CONFLICT`. Occurrences are scoped to identity and surface;
they are retry identities, not grants or authored component identifiers.

Discovery defaults to 50 records and allows 1–100 per page, ordered by creation
time and an internal identity tie-breaker. The cursor belongs to the same identity
and surface. Expired, cancelled and completed activities do not appear in this
open-work list; a known ID remains readable for recovery. A changed activity
catalog appears as unavailable metadata instead of silently authorizing an old
plan. Discovery is read-only and never returns drafts' answer values.

Activities are currently bound to one authenticated identity **and surface**.
Actor/assignee fields are rejected; copying a plan does not delegate permission.
Cross-identity requests, visibility grants, approval roles, reassignment and
cross-surface continuation need a dedicated authority contract and remain open.

## Compatibility and evidence

Local installation schema revision is now **4** (owned by `LocalSchemaVersion`). An older host must not reopen a
database with activity-bound intents and bypass their acceptance guard. Old stores
are rejected unchanged; no automatic migration, reset or contract repinning is
performed. New tables hold private draft state and the binding between preparation
revision and canonical intent. This is not encryption at rest or an adversarial
same-OS-user/DB-administrator isolation boundary.

Independent tests cover canonical missing/invalid/ready preflight with zero write
counts; conditional branches; unknown semantics and reference forgery; true
PostgreSQL restart; competing revisions; identity/surface isolation; stale direct
acceptance; cancellation; expiry; preparation retries; removed catalog rejection;
forced completion failure with domain/receipt rollback; occurrence retry across
restart; competing creation; bounded private discovery; immediate Back invalidation;
and authenticated HTTP and MCP lifecycle paths. Preflight and durable lifecycle REDs
were observed before their implementations. Catalog tests were written after the
initial admission implementation and are characterization/negative evidence, not
claimed retroactive TDD. New human tests exercise shared Form projection, field
validation, stale View events, reload, Back/revoked approval, lost acceptance
replies with other open work, storage failure before acceptance, exact response
and intent correlation, disposal during acceptance, legacy journal recovery and
identity-scoped browser storage. Build tests reject invalid branches before publishing files
and reject absent or mismatched host catalogs. VOID runtime tests verify that
Guided note and ordinary Create note use the same command and produce private
Notes only after explicit acceptance. Checkpoint N's generated VOID browser suite
passed all 54 cases, including Guided note at 390/1600 pixels, reload, Back,
revised preparation and explicit acceptance. The complete post-migration SDK
suite passed 1441/1441. Session-change and occurrence-retry regressions are covered
without accepting a replacement intent or discovering unrelated open work.
Exact build identity and qualification limits are in
[VOID verification](../../void/docs/VERIFICATION.md). These results do not install
cross-identity assignment, common cross-surface navigation or conditional
business-input requirements, and do not constitute complete visual acceptance.

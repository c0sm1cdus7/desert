# Runtime, authority and stack

Generated from the bundled SDK documentation; do not edit this snapshot.

## Source: docs/STACK.md

Source SHA-256: 15c609b17a0e71e74b493bf1fcd7ad341cf916711b4b7698f35e3f3fca168dbc

# Reference stack — 2026-10-15

## Accepted owner decision

The owner explicitly selected TypeScript, Node.js, PostgreSQL and Svelte/SvelteKit.
DESERT is the SDK; TPA is its architecture and semantic contract language.
This is a new implementation, not a migration or copy of the previous SDK.

- TypeScript: product authoring, compiler and controller implementation.
- Node.js: initial authoritative runtime host; not a client requirement.
- PostgreSQL: first durable storage implementation; transactional guarantees
  must be tested against PostgreSQL, not inferred from an in-memory substitute.
- Svelte: first human renderer; SvelteKit: web host and build integration.
- A shared, versioned protocol connects surfaces to the controller. Surface
  frameworks cannot introduce domain rules, authority or hidden write paths.

An approval of the stack does not assert that any of these integrations exist.
The initial remote-controller topology is not universal. The owner explicitly
requires fully offline products and local controllers, with per-journey dependencies
and availability based on the required controller, not Internet access. The stack
above is the initial reference implementation, not a requirement to embed Node or
PostgreSQL in every client. See execution dependencies (SDK file: `docs/EXECUTION-DEPENDENCIES.md`).
The later owner decision selects shadcn-svelte as the web component foundation.
The presence of other implementation dependencies is not a separate product or
platform capability approval.

## Native surfaces: requirement and implementation direction

The current owner decision requires one typed TypeScript bank consumed by web,
future Swift and future native Android renderers. Each renderer uses its own
platform libraries; UIKit informs interaction review, not the portable grammar.
Future Swift/Kotlin bindings must derive from the canonical exported protocol,
not a second manually maintained model. See the explicit
native mapping proposal and limits (SDK file: `docs/NATIVE-RENDERER-MAPPING.md`).

The earlier Capacitor discussion is historical, not the selected native-widget
direction or an installed capability. A packaged web view cannot be labelled a
Swift/Android-native renderer. Native hosts and widgets remain unimplemented;
visionOS also requires separate interaction/capability work. No quality guarantee
or device/API support follows from a renderer name, package or bridge import.

Native clients must not require SvelteKit server routes or a Node runtime inside
the device. The initial authoritative Node/PostgreSQL runtime is separate from
surface delivery; a different local controller host requires its own installed
execution semantics. Packaging UI does not install that host.

Device capabilities are observed, scoped and fallible. Haptics are complementary,
respect preferences and hardware availability, and never establish business
success. Native packaging does not grant offline write authority or trust.
Authentication, app suspension, secure storage, links, keyboard, safe areas,
accessibility and reconnect behavior need explicit integration tests.

## Sources checked

- https://capacitorjs.com/docs — web-focused native runtime and native bridge.
- https://capacitorjs.com/docs/getting-started/environment-setup — supported targets.
- https://capacitorjs.com/docs/getting-started — bundled web assets and native projects.
- https://capacitorjs.com/docs/apis/haptics — device feedback API and hardware limits.
- https://svelte.dev/docs/kit/adapter-static — static client build option.
- https://developer.android.com/compose — native Kotlin UI toolkit.
- https://developer.apple.com/visionos/ — Apple spatial platform.

## Dependency choices in the first compiler slice

TypeBox describes the bootstrap contract grammar once, producing its runtime
schema and authoring types. Ajv validates that grammar and the generated object
schemas. These are implementation dependencies, not the TPA language itself.
Only trusted build inputs generate schemas; the validator is not an execution
sandbox for hostile JavaScript or arbitrary packages.

The contract digest identifies the shape definition and format, not the entire
build, installed mechanisms, authorization or acceptance. A future assembly lock
must identify those independently. No native implementation should treat a digest
claim received from a peer as proof of origin or authorization.

## Source: docs/NATIVE-RENDERER-MAPPING.md

Source SHA-256: da66f3a422f5e0351fdefc002283efa5cb1d8ef9b65cdf8aab2d78e6921f73b0

# Native renderer mapping — proposal, not implementation

The canonical TypeScript/TypeBox bank is the only authored semantic source.
Future Swift and Kotlin bindings must be generated from its exported protocol
and validated with shared positive/negative fixtures, not maintained as parallel
handwritten product definitions. Svelte components, CSS, URL paths and DOM events
do not belong in those bindings. No Swift or Android renderer is installed.

## Preserve the logical operation

| Bank meaning | Future Apple realization | Required invariant |
| --- | --- | --- |
| `control.select`: identity, label, optional value, options and disabled/required state | A native picker/menu with stable option identities | Activating a permitted value emits one `select.change` immediately; no additional Confirm step. Dismissing or highlighting alone cannot change the value. |
| `control.money`: exact minor units and declared currencies/scales | Native text entry and the same native choice adapter | Currency changes use the existing `money.change` transition; no conversion, staged acceptance or invented domain write. |
| `control.popover`: open state and ordered typed information | A native anchored contextual popover | No task toolbar, scrim or background focus trap. Dismissal updates `popover.open`; opening does not run a command. |
| `action`: intent, label, icon and readiness | Native button/action component shared across ordinary placement and toolbars | Preserve typed intent, pending/disabled behavior and accessible name. Circular/capsule faces and borderless toolbars belong to the renderer profile, not author-supplied style fields. |
| Task/dialog frame `/6` | Appropriate native task/dialog presentation | Keep explicit journey review, uncertainty, dismissal and controller acceptance separate from local control selection. |
| Top toolbar: title/place, optional typed `face`, navigation and actions | One shared header composition over native controls | A supplied face sits above the action/title rail, horizontally centered in the full header. Absence reserves no face space. Use the same rule on persistent and transient surfaces; current presenters supply faces only for dialogs/messages. Keep dismissal reachable at enlarged text sizes. |

Apple's [SwiftUI Picker](https://developer.apple.com/documentation/swiftui/picker)
offers a selection binding and labelled, tagged choices; this is a candidate
adapter, not an additional DESERT selection model. Its binding must accept only
canonical validated transitions and reconcile owner updates without feedback
loops. An optional value is explicit absence, not the first item chosen by default.

[UIPopoverPresentationController](https://developer.apple.com/documentation/uikit/uipopoverpresentationcontroller)
provides anchoring, permitted bounds and interaction passthrough configuration.
Its system adaptation can produce a sheet on compact size classes. Consequently,
merely naming this API does not establish compliance with DESERT's nonmodal,
toolbar-free contextual interaction. Verify the actual trait/device behavior;
if an adapter cannot meet the declared semantics, report a capability gap rather
than silently turning a selector into a confirmation dialog.

## Semantic contract versus platform delivery

Stable identities, selected values, disabled options, requiredness, event kinds
and controller authority are portable. Pointer hover, keyboard focus navigation,
safe-area geometry, system material, accessibility APIs and optional haptics are
platform delivery concerns. A native adapter may use native APIs without copying
web gestures, but it may not change what counts as a committed choice.

The current renderer-requirements bundle declares finite node/event/features.
It is not an implemented Swift/Kotlin generator, native validator or comprehensive
platform-capability negotiation system. JSON Schema alone does not enforce all
semantic checks, such as unique option identities and permitted selections.
Future native adapters need those checks and shared fixture parity before claiming
support; TypeScript or schema compilation alone is insufficient.

The same distinction applies to assets: the protocol carries logical identifiers
and descriptions, while each host resolves a permitted local/native resource.
The web's media URL is not a portable asset identity. Local exercise changes are
session drafts, not receipts, persistence, uploads or admitted business commands.

## Compatibility and open boundaries

Frame `/6` removes the obsolete toolbar-bearing selection frame. Legacy
`selection.confirm` remains a recognized intent only for bank-wire compatibility;
there is no current frame/selection host for it and product dispatch rejects it.
Do not reproduce it in a new native selection adapter. Native support must pin
the exact schema and installed capability revision and reject unknown meanings.

The retained `locked` contextual-popover flag prevents dismissal, not interaction
with the underlying surface; it does not imply modal authority. Device and
assistive-technology evidence for this combination is still required. An actual
step-wizard footer exception also requires a future explicit contract; a generic
journey or multi-step implementation is not an authored wizard by inference.

## Source: docs/LOCAL-CONTROLLER.md

Source SHA-256: c2ca0429b48cae9ebfaccd4c5f60eb32467a4dcefdb0ee291367d106a82ac8ca

# Local controller: Notebook on Node and PostgreSQL

Status: implemented and integration-tested on Node 24.16.0 and PostgreSQL 18.6,
macOS. No Internet, HTTP server, cloud identity or external provider is required
for the implemented operations. Dependencies and PostgreSQL must already be installed.
Linux uses the same Unix facilities but was not tested; Windows and native app hosts
are not implemented. This is a developer runtime, not production qualification.
The canonical Svelte Notebook build exposes the same local session
through a loopback-only HTTP host; no Internet service is required.

## Product code stays declarative

`products/notebook/src/modules/notes/commands/` defines the effects. The local interpreter evaluates
those expressions directly. It does not know what a note or an archive means.
`OnlyOwnerCanAccess` provides the owner field; it is not restated in a Notebook service.
The runtime supports the existing finite read/create/update and ownership vocabulary.
Unsupported extra dependencies fail installation rather than being treated as available.

## Open a controller

```ts
import { compile } from "../src/index.ts";
import { openLocalController } from "../src/local.ts";
import { NotebookProduct } from "../products/notebook/product.ts";
import { Dependencies } from "../products/notebook/src/modules.ts";

const application = compile(NotebookProduct);
const controller = await openLocalController(application, {
  socketDirectory: "/private/path/to/postgres-socket",
  database: "notebook",
  user: "local-host",
  roles: [Dependencies.notes.id],
});
```

Those infrastructure values must identify an existing, private local database;
the snippet is a configuration example, not a command to create that path. The
Notebook bootstrap supplies a real cluster automatically. The generic API accepts
only an absolute Unix socket directory owned by the current OS user with no group
or other access. Installation requires a writable primary with `fsync` and
`full_page_writes` enabled; transactions explicitly request synchronous commit.

Each database is pinned to one product, exact installation digest (the compiled
contract digest), installed role set and the sha256 of the generated infrastructure
DDL. `desert_installation.migration_chain` lists the committed migrations
(`src/storage/migrations/`) that led to that digest; a fresh install records none.
Reopening a different contract, or a database whose chain does not lead to its
digest through committed migrations, fails with `INSTALLATION_MISMATCH`.
Session operations recheck that installation inside their transaction, even if
an earlier availability snapshot was ready.
Migrations are generated by `node scripts/storage.ts plan` and applied per client
database by `migrateClient` (`src/storage/migrate.ts`); opening a controller does
not apply them yet. Signing and a full assembly/toolchain lock are not implemented.

## Identity is a host authority, not command input

The privileged host calls `controller.identities.issue(label)` and protects the
returned random bearer credential. Only its SHA-256 hash is stored in PostgreSQL.
`controller.connect(token, surfaceId)` exposes a limited session, not identity
administration or direct object writes. A caller cannot supply the owner in input.

Credentials default to a 30-day lifetime, configurable by the host. Admission
defaults to five minutes, configurable with `runLifetimeMs` up to one day. These
are host security lifetimes, not Notebook business facts. Expiration and revocation
fail closed; automatic renewal/credential rotation is not implemented. A runner with
an expired credential needs explicit host administration, not a new silent identity.

The trust boundary is the host process, database administrator and OS user. A
same-user process with filesystem/database access can bypass application isolation.
Do not expose the host object, raw DB credentials or the credential file to plugins
or an untrusted surface. This is not an adversarial code sandbox, OS login service,
hardware-backed keystore, encryption-at-rest guarantee or remote authentication API.

## Admission, preparation, acceptance

```ts
const session = controller.connect(identity.token, "human");
const run = await session.begin("create-note");
const intent = await session.prepare(run.id, {
  title: "Idea",
  body: "Write it down.",
});

const receipt = await session.accept(intent.id, intent.confirmationDigest);
const read = await session.begin("read-note", receipt.object.id);
const notes = await session.read(read.id);

const archive = await session.begin("archive-note", receipt.object.id);
const archiveIntent = await session.prepare(archive.id, {});
await session.accept(archiveIntent.id, archiveIntent.confirmationDigest);
```

Human renderers follow the declared commit mode: explicit submission or a separate
review, derived from each module journey's `humanReview` registration. Surface
declarations do not repeat entry, action lists or review rules. IDs in these session
calls are protocol values; authored journeys and views use issued object references.
Both retain exact prepared-effect acceptance. Its digest binds actor,
surface, run, journey, contract, input and exact effect, including subject/version.
The digest is not proof that a human saw a UI. An authenticated call accepts that
intent; this product does not declare an additional human-only approval policy.

A run permits one mutation occurrence. Repeated identical preparation returns the
same intent; changed input is rejected. Acceptance locks the run and affected object,
checks fresh identity, ownership, conditions and version, then recomputes the effect.
The object change, completed run and receipt commit together. The receipt is returned
only after commit. All statements use the same transaction client, following the
[node-postgres transaction contract](https://node-postgres.com/features/transactions).
Object/run locks use [PostgreSQL row locking](https://www.postgresql.org/docs/18/explicit-locking.html).

Repeated acceptance of the same intent returns the stored receipt, including after
run expiry, provided the identity remains valid. Two separately prepared mutations
against one version cannot both succeed. `session.receipt(intentId)` recovers a known
operation without replay. A commit transport error is reported as `COMMIT_UNCERTAIN`;
do not create a replacement intent automatically. Recovery itself can also be unavailable.

Input-bearing updates additionally require `session.prepare(runId, input,
{ expectedVersion })`. This is execution metadata, not an authored business field:
the editor supplies the positive safe-integer revision it originally read. Missing
metadata fails with `EDIT_BASE_REQUIRED`; malformed metadata with `INVALID_EDIT_BASE`.
A change accepted since that original read fails with `VERSION_CONFLICT` before
preparing a new intent. Preparation never silently rebases an editor onto the latest
record. Repeating the same input and base returns the original intent; changing either
fails with `INTENT_CONFLICT`. Acceptance retains its independent version check.
Create commands reject edit metadata. Existing zero-input updates can omit it; when
supplied, it must match. The same closed metadata schema validates session and HTTP
requests. This kernel capability does not by itself install an object editor in the
View program or qualify a product's UI.

Reads also require an admitted, unexpired read journey and current identity. They
apply the ownership policy and only return fields declared by the read contract.
Archived notes remain readable because the current read contract does not exclude them.

## Persistent developer runner

With Node 24 and PostgreSQL tools on PATH, from the DESERT checkout:

```sh
npm run notebook:local -- prepare create-note '{"title":"Idea","body":"Write it down."}'
npm run notebook:local -- accept <intent-id> <confirmation-digest>
npm run notebook:local -- read read-note
npm run notebook:local -- read read-note <note-id>
npm run notebook:local -- prepare archive-note '{}' <note-id>
npm run notebook:local -- accept <archive-intent-id> <confirmation-digest>
npm run notebook:local -- receipt <intent-id>
npm run notebook:local -- watch
```

Substitute IDs/digests from the prior output. The runner boots a dedicated cluster,
performs the requested operation and stops the cluster. It uses a private Unix socket
and sets an empty `listen_addresses`; it never connects to an existing user database.
Its data and local credential persist under `.local/notebook`, excluded from Git.
The credential is stored in a mode-0600 file within a mode-0700 directory; do not
share that file. This runner is a diagnostic CLI, not the planned Human Terminal renderer.

Concurrent runner invocations fail on `runner.lock`; runtime concurrency is tested
through independent database connections. After an interrupted runner, inspect its
own cluster/process before clearing a stale lock. Do not erase the data directory
to recover a session. Existing data, including the demonstration note, is retained.

## Observe the actual runtime

```ts
const availability = session.watchAvailability();
const unsubscribe = availability.subscribe(({ journeys }) => {
  console.log(journeys["create-note"]);
});

// On surface teardown:
unsubscribe();
availability.dispose();
```

This is executable API, not a suggested future adapter. The session supplies its
actual controller, exact compiled contract, exposed surface and credential. The
consumer cannot supply a digest, actor ID or a `ready` event. The controller derives
journey dependency closures from the existing compiled surface; only its installed roles
receives observations. Other dependencies remain unknown. This does not install or
validate an arbitrary distribution plan or claim its renderer exists.

The initial snapshot is unknown. A successful, read-only database transaction
checks installation identity, schema revision marker, durable writable-primary
settings and the actual credential. The same credential verification is used by
execution; probes do not take the write-path identity lock or admit journeys.
They create no objects, intents, runs or receipts.

Defaults are a 500 ms delay between completed probes and a 1500 ms evidence lifetime,
measured from probe start, not completion. Hosts may configure `pollIntervalMs` and
`validForMs` (positive integers up to 60000 ms, polling delay shorter than lifetime).
Probes are sequential. Evidence can become stale while a probe waits for a database
lock or connection; the last success is never renewed merely because a timer ran.

Subscribers receive snapshots without navigation, including freshness expiration.
Ready means recent dependency evidence, not permission, valid input or guaranteed
future execution. Lost reachability can take until the next failed probe or lease
expiry to appear; no instantaneous detection is claimed. Event-loop suspension also
delays notifications; `snapshot()` checks elapsed time when read after resumption.

| Actual condition | Observation |
| --- | --- |
| Compatible local installation and valid credential | Ready |
| Socket missing/refused or PostgreSQL terminating | `unreachable` |
| Revoked, expired or invalid credential | `session-required` |
| Different product, digest, role or revision marker | `incompatible` |
| Probe/storage error not classified above | `unavailable` |
| Prior evidence lifetime elapsed | `stale` |
| Observer or controller closed | `disposed` |

Idle pool failures are handled according to the [node-postgres pool error contract](https://node-postgres.com/apis/pool).
Every connected client also retains a lifetime error handler, including the gap
between pool checkout and await resumption. Faulted clients are rejected before
transaction work/commit and destroyed on release; faults never trigger replay.
See the checkout regression and fix (SDK file: `docs/EVIDENCE-009.md`).
PostgreSQL failures use [SQLSTATE codes](https://www.postgresql.org/docs/18/errcodes-appendix.html),
not translated error strings. Existing local identity/installation errors retain
their exact SDK error identifiers. A reachable database alone is insufficient.

Recovery means observing again, never replaying a write, silently replacing an
identity or accepting an intent. Closing the controller disposes all watchers,
cancels schedules and drains outstanding database work. An already completed
operation remains recoverable only through its receipt API and current authority.

`watch` prints snapshots only when their visible state changes. Stop it with Ctrl-C;
it stops its owned cluster and preserves the database. The tests exercise outages
only in isolated temporary clusters, never in the persistent demonstration store.

This monitor is in-process with the local host. A killed host cannot notify its own
dead subscribers; cross-process/device detection needs a separate transport adapter.
Probes are not exhaustive disk-space, schema-corruption, privilege or power-loss
certification. Command transactions remain responsible for actual execution failures.

## Still outside this increment

Native packaging, browser offline installation, remote availability probes,
remote controller deployment, external effects, sync, offline write queues,
unrestricted multi-step graphs, credential renewal UX, backup/restore and power-loss
fault injection. The installed conditional activity mechanism is bounded by an
admitted catalog and uses the same prepare/accept protocol; it is not an arbitrary
workflow engine. See activities (SDK file: `docs/ACTIVITIES.md`) for its exact limits.
Local transactions are real; these missing integrations are not implied by them.

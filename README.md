# DESERT

Define the product. Derive its representations. Verify the mechanisms.

DESERT is a new Software Development Kit for TPA: the architecture and semantic
language of typed product contracts. Its purpose is to reduce repeated decisions
and prevent different channels from implementing different products under one name.
The human cost of correcting those inconsistencies motivates this work.

**Status: typed contracts, a local PostgreSQL executor and a working Svelte Notebook surface with real availability and draft recovery. Not a complete SDK.**
See [current support](docs/STATUS.md) and the [accepted stack](docs/STACK.md).
The [2026-10-23 external enforcement handoff](docs/HANDOFF-VISUAL-ENFORCEMENT-2026-10-23.md)
records the current visual-ownership failures, owner requirements and independent
review plan. This development checkpoint is not a qualified visual release.
The [SDK anatomy](docs/architecture/ANATOMY.md) maps the real authoring contracts,
module composition, execution lifecycle and catalogs; VOID is its modular product example.
For the complete skill, actual API and reproducible Notebook, start at
[the authoring bundle guide](AUTHORING.md). Share the whole bundle, not isolated snippets.
The controller/compiler remain a fresh implementation. The owner-authorized
Tres Marías visual subset is reused with attribution; see the
[port audit](docs/TRES-MARIAS-AUDIT.md).

The [human web renderer](docs/WEB-RENDERER.md) consumes a shared versioned bank,
with a live kitchen sink and a complete contract-to-controller source walkthrough.
Products select typed interaction needs, not custom CSS or component variants.

## The code that works today

```ts
import { compile } from "./src/index.ts";
import { NotebookProduct } from "./products/notebook/product.ts";

const application = compile(NotebookProduct);
application.inputSchema("create-note-record");
application.validateInput("create-note-record", {
  title: "Idea", body: "Define the product.",
});
application.describe();
```

`NotebookProduct` is issued by `composeProduct`, from one module catalog and one
workspace View. Its declarations live in `products/notebook/src/`; the flat files
beside that directory are import bridges, not another product definition. Public
compilation rejects raw domain objects and copied compositions.

The author writes the field meaning once. The compiler produces a closed JSON
schema, and validation consumes that exact schema. Changing a supported contract
constraint changes accepted values without another handwritten validator.

`describe()` produces a JSON-serializable `desert.shapes/1` projection. This is
shape metadata, not a surface layout, API, authorization, assembly attestation or
product capability declaration. `src/client.ts` exposes the shared validator
without importing the compiler or Node crypto.

## Run locally

Use Node 24 (the tested version is pinned in `.nvmrc`). With that Node on PATH:

```sh
npm ci --ignore-scripts
npm run check
npm run inspect
```

The tests use Node's runner. Integration tests require PostgreSQL tools on PATH
(`pg_config`, or `DESERT_PG_BIN` pointing to their directory). They create isolated
temporary clusters using Unix sockets and no IP listener; no existing database is
used. Browser integration tests additionally use Playwright Chromium against the production Svelte build.

## Open Notebook in a browser

```sh
npm run web:check
npm run web:build
npm run notebook:web
```

Open the private, single-use URL in `.local/notebook/web-launch.json`. The host
listens only on `127.0.0.1:4271`. Keep this file private; it admits a browser to
your local identity. After admission the address contains no secret.

Open Create note from the toolbar, submit its form, then open the saved note.
Archive note is an object toolbar action and requires its declared review. Data lives
in the same private PostgreSQL store as the local runner. Do not run both hosts
against that directory concurrently. Ctrl-C stops the host and preserves the store.

If the required controller becomes unavailable, its journey actions disable in
place. The already-open editor stays editable; recovery refreshes saved data without
reloading or submitting the draft. Draft retention is **session memory**, not a
promise to survive closing the tab. No service worker, sync or automatic write queue
is installed. A lost confirmation response can be checked against its original receipt.

Products do not write a second Svelte application. The SDK template mounts the
admitted View program through its access boundary:

```svelte
<script lang="ts">
  import AccessGate from "@desert/svelte/pieces/AccessGate.svelte";
  import { surface, validateInput, viewProgram } from "virtual:desert/surface";
</script>

<AccessGate {surface} {validateInput} {viewProgram} />
```

The build derives that module from `compile(NotebookProduct)`: field order, labels,
journeys, dependency references, precompiled input validators and the bound View
program. A build or host cannot supply a replacement program. The renderer does
not reimplement note ownership, state transitions or archive conditions.

The root composition owns the entry destination. Views own toolbar outputs;
journeys bind them to operations. The Notes module registers each mutation's
`humanReview` once: creation is `"not-required"`, archival is `"required"`.
The compiler derives submission/review behavior from that registration; the surface
does not repeat it. Both modes retain controller admission, exact-effect binding
and atomic acceptance. See the [current anatomy](docs/architecture/ANATOMY.md).

This contract revision changes the installation digest. Existing stores are not
automatically migrated, reset or repinned. Keep older installations intact; use a
separate test store or an explicitly supported migration before upgrading them.
See [surface boundaries and evidence](docs/EVIDENCE-006.md). Run
`npm run test:web` after building; install a compatible Playwright Chromium if absent.

## Read the implementation

- `products/notebook/src/notebook.product.ts`: product composition and workspace.
- `products/notebook/src/modules/notes/`: object publication, commands, journeys,
  views and the module's exported capabilities.
- `src/contracts.ts`: bootstrap grammar and inferred authoring types.
- `src/modules/compiled-product.ts`: public compilation of an issued composition.
- `src/compile.ts`: internal wire-contract validation and immutable artifacts.
- `src/schema.ts`: converts supported fact definitions to JSON Schema.
- `src/validation.ts`: shared strict validation mechanism.
- `src/client.ts`: controller-independent client entry.
- `src/compile-dependencies.ts`: derives each journey's transitive requirements.
- `src/availability.ts`: live dependency observations, freshness and subscriptions.
- `tests/`: independent expectations and change-only-the-contract checks.

## Notebook contracts now compile

```ts
import { compile } from "./src/index.ts";
import { NotebookProduct } from "./products/notebook/product.ts";
import { NotebookService, NotebookWeb, NotebookIOS, NotebookCLI }
  from "./products/notebook/distributions.ts";

const application = compile(NotebookProduct);
application.validateInput("create-note-record", { title: "Idea", body: "Write it down." });
application.surface("human");
application.planDistributions([NotebookService, NotebookWeb, NotebookIOS, NotebookCLI]);
```

Input schemas come from Note's facts; the author does not write another schema for
the terminal, web or agent protocol. Compilation rejects dangling references,
invalid assignments and owner injection. Type tests additionally reject wrong
field types, enum values, journey roles and human/agent distribution mismatches.

Distribution plans report `unbuilt`; compiled execution is `not-installed` until a
runtime is opened explicitly. The declarations alone persist nothing. SwiftUI
is a named target requirement in the specimen, not an approved native implementation
choice over Capacitor. See [verification and limitations](docs/EVIDENCE-002.md).

## Locality is a binding, not a different product

Notebook declares a `NotesController` role. Create, read and archive explicitly
reference it. A distribution can bind that same role locally or remotely:

```ts
localBinding(Dependencies.notes, "notes-local");
remoteBinding(Dependencies.notes, NotebookService);
```

`Dependencies` is the issued export catalog from `products/notebook/src/modules.ts`.
The role and journeys are declared inside `src/modules/notes/`; distribution bindings
are in `products/notebook/distributions.ts`. `NotebookLocal` compiles without a remote service. The explicit
bootstrap in `products/notebook/local.ts` supplies local execution on PostgreSQL.
`buildDistribution` now realizes the `svelte-web` target through a generic SDK
template. CLI, native and controller builders remain unavailable. Read
[distribution builds](docs/DISTRIBUTION-BUILDS.md) for the real API and limits.

`createAvailability(plan)` consumes the derived requirements and normalized adapter
observations. Subscribers get per-journey readiness changes, including lease expiry
and reconnection, without navigation or a global Internet flag. This is dependency
readiness, not authorization. No command is executed or replayed by this runtime.
See [dependency evidence and limitations](docs/EVIDENCE-003.md).

## Execute Notebook locally

```ts
const controller = await openLocalController(application, {
  socketDirectory, database, user, roles: [Dependencies.notes.id],
});

const identity = await controller.identities.issue("Local owner");
const session = controller.connect(identity.token, "human");

const run = await session.begin("create-note");
const intent = await session.prepare(run.id, { title: "Idea", body: "Write it down." });
const receipt = await session.accept(intent.id, intent.confirmationDigest);
const read = await session.begin("read-note", receipt.object.id);
const notes = await session.read(read.id);
```

Import `openLocalController` from `src/local.ts`; infrastructure identifiers belong
to a private local PostgreSQL installation. Identity issuance is a privileged host
operation, not an exposed journey. The example omits `try/finally`; actual hosts must
close their controller and protect credentials. A human renderer follows the declared
commit mode: explicit submission or a separate review, never automatic background acceptance.
Acceptance checks ownership, conditions and the current version
again; it commits the object, run state and receipt together.

For a persistent developer runner, start with:

```sh
npm run notebook:local -- prepare create-note '{"title":"Idea","body":"Write it down."}'
```

It returns an intent ID and confirmation digest. See [local controller usage](docs/LOCAL-CONTROLLER.md)
for accepting, reading, archiving, persistence, trust boundaries and recovery.

## Observe real local availability

```ts
const availability = session.watchAvailability();
availability.subscribe(({ journeys }) => {
  console.log(journeys["create-note"].dependenciesReady);
  console.log(journeys["create-note"].blockers);
});
```

The installed controller probes its actual PostgreSQL installation and session;
the consumer does not manufacture connectivity events. Readiness follows the
journey's compiled dependencies, expires if evidence grows stale and recovers after
the database returns. Recovery never replays commands or renews revoked credentials.
Dispose the watcher on teardown; closing the controller also disposes its watchers.

Run `npm run notebook:local -- watch` for live JSON observations (Ctrl-C to stop).
This is a developer diagnostic, not a visual surface. See [real outage tests](docs/EVIDENCE-005.md)
and [timing and trust limits](docs/LOCAL-CONTROLLER.md).

The [DESERT Skill](skills/desert/SKILL.md) is a bundled draft for product modeling
and implementation. It has passed structural validation, not behavioral evaluation.
It is not globally installed and does not replace the approved TPA guide.

## Where this goes

The reference stack is TypeScript, Node.js, PostgreSQL and Svelte/SvelteKit.
Local, remote and mixed binding plans now share per-journey dependency semantics.
The local Node/PostgreSQL runtime executes Notebook without Internet dependencies.
Complete application packaging, automatic distribution installation and additional human renderers
remain work ahead. The English Svelte renderer supports the admitted finite View
vocabulary, including typed forms, object contexts, media and guided activities;
unsupported compositions still fail admission. It is not a complete renderer for
every planned product capability.
See [execution dependencies](docs/EXECUTION-DEPENDENCIES.md).
Native consumers must share the
semantic protocol rather than duplicate product rules. Capacitor is an unresolved
candidate; producing an app package alone does not meet the native quality goal.

No generated document or green unit suite can replace evidence that the product
actually behaves as promised. Unsupported semantics are rejected, not invented.

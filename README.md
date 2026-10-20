# DESERT

Define the product. Derive its representations. Verify the mechanisms.

DESERT is a new Software Development Kit for TPA: the architecture and semantic
language of typed product contracts. Its purpose is to reduce repeated decisions
and prevent different channels from implementing different products under one name.
The human cost of correcting those inconsistencies motivates this work.

**Status: typed contracts, a local PostgreSQL executor and a working Svelte Notebook surface with real availability and draft recovery. Not a complete SDK.**
See [current support](docs/STATUS.md) and the [accepted stack](docs/STACK.md).
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
import * as desert from "./src/index.ts";

const Note = desert.objectType({
  id: "note",
  facts: {
    title: desert.text({ minLength: 1 }),
    body: desert.text({ minLength: 1 }),
  },
});

const Notebook = desert.product({ id: "notebook", objects: [Note] });
const application = desert.compile(Notebook);

application.schema("note");
application.validate("note", { title: "Idea", body: "Define the product." });
application.describe();
```

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

Create a note directly from its form. Read it as an object context and choose
Archive note from Actions; archival still requires its declared review. Data lives
in the same private PostgreSQL store as the local runner. Do not run both hosts
against that directory concurrently. Ctrl-C stops the host and preserves the store.

If the required controller becomes unavailable, its journey actions disable in
place. The already-open editor stays editable; recovery refreshes saved data without
reloading or submitting the draft. Draft retention is **session memory**, not a
promise to survive closing the tab. No service worker, sync or automatic write queue
is installed. A lost confirmation response can be checked against its original receipt.

The product's entire Svelte binding is:

```svelte
<script lang="ts">
  import HumanProduct from "../../../../src/svelte/HumanProduct.svelte";
  import { surface, validateInput } from "virtual:desert/notebook";
</script>

<HumanProduct {surface} {validateInput} />
```

The build derives that module from `compile(Notebook)`: field order, labels,
journeys, dependency references and standalone input validators. The renderer does
not reimplement note ownership, state transitions or archive conditions.
Notebook also declares the human interaction, shared by its human distribution targets:

```ts
entry: ReadNote,
primaryAction: CreateNote,
subjectActions: [ArchiveNote],
commit: {
  "create-note": "submit",
  "archive-note": "review",
},
```

Every exposed mutation needs a commit mode. A read cannot have one. `submit`
uses the explicit form/action invocation; `review` waits for a separate confirmation.
Neither mode removes controller admission, exact-effect binding or atomic acceptance.
The object context shows facts and Actions, not a mutation-journey footer.
See [context and commit-mode evidence](docs/EVIDENCE-007.md).

This contract revision changes the installation digest. Existing stores are not
automatically migrated, reset or repinned. Keep older installations intact; use a
separate test store or an explicitly supported migration before upgrading them.
See [surface boundaries and evidence](docs/EVIDENCE-006.md). Run
`npm run test:web` after building; install a compatible Playwright Chromium if absent.

## Read the implementation

- `products/notebook/product.ts`: product composition; adjacent modules own facts,
  effects, journeys, interaction and distribution definitions. Not a complete app.
- `src/contracts.ts`: bootstrap grammar and inferred authoring types.
- `src/compile.ts`: validates definitions and builds immutable artifacts.
- `src/schema.ts`: converts supported fact definitions to JSON Schema.
- `src/validation.ts`: shared strict validation mechanism.
- `src/client.ts`: controller-independent client entry.
- `src/compile-dependencies.ts`: derives each journey's transitive requirements.
- `src/availability.ts`: live dependency observations, freshness and subscriptions.
- `tests/`: independent expectations and change-only-the-contract checks.

## Notebook contracts now compile

```ts
import { compile } from "./src/index.ts";
import { Notebook } from "./products/notebook/product.ts";
import { NotebookService, NotebookWeb, NotebookIOS, NotebookCLI }
  from "./products/notebook/distributions.ts";

const application = compile(Notebook);
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
localBinding(NotesController, "notes-local");
remoteBinding(NotesController, NotebookService);
```

The actual declarations are in `products/notebook/dependencies.ts`, `journeys.ts`
and `distributions.ts`. `NotebookLocal` compiles without a remote service. The explicit
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
  socketDirectory, database, user, role: "notes",
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
remain work ahead; the initial English, text-record Svelte renderer is implemented.
See [execution dependencies](docs/EXECUTION-DEPENDENCIES.md).
Native consumers must share the
semantic protocol rather than duplicate product rules. Capacitor is an unresolved
candidate; producing an app package alone does not meet the native quality goal.

No generated document or green unit suite can replace evidence that the product
actually behaves as promised. Unsupported semantics are rejected, not invented.

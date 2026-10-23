# Complete executable Notebook source

Generated from this bundle's source. Do not edit this snapshot.
Regenerate with npm run authoring:generate; npm run authoring:check detects drift.
Paths below are relative to the SDK root. Read imports/types together; these are
verbatim modules, not standalone snippets or a published package API.

- products/notebook/src/modules.ts
- products/notebook/src/modules/notes/commands/archiveNote.command.ts
- products/notebook/src/modules/notes/commands/createNote.command.ts
- products/notebook/src/modules/notes/journeys/archiveNote.journey.ts
- products/notebook/src/modules/notes/journeys/browseNotes.journey.ts
- products/notebook/src/modules/notes/journeys/createNote.journey.ts
- products/notebook/src/modules/notes/journeys/readNotes.journey.ts
- products/notebook/src/modules/notes/note.object.ts
- products/notebook/src/modules/notes/note.publication.ts
- products/notebook/src/modules/notes/notes.dependencies.ts
- products/notebook/src/modules/notes/notes.module.ts
- products/notebook/src/modules/notes/views/createNote.view.ts
- products/notebook/src/modules/notes/views/note.view.ts
- products/notebook/src/modules/notes/views/notes.view.ts
- products/notebook/src/notebook.product.ts
- products/notebook/src/surfaces.ts
- products/notebook/src/views/navigation.view.ts
- products/notebook/src/views/workspace.view.ts
- products/notebook/product.ts
- products/notebook/distributions.ts
- products/notebook/inspect.ts
- products/notebook/local.ts
- products/notebook/run-local.ts
- products/notebook/build-web.ts
- products/notebook/check-web.ts
- products/notebook/run-web.ts
- products/notebook/verify.ts

## products/notebook/src/modules.ts

Source SHA-256: 06849dfe6a0673bd2955040b3a8c1018b1d4e14110ccfb0a980d252daa24b396

```ts
import { moduleCatalog } from "desert-sdk/src/index.ts";
import { NotesModule } from "./modules/notes/notes.module.ts";

export const Modules = moduleCatalog([NotesModule]);
export const Journeys = Modules.journeys;
export const Views = Modules.views;
export const Commands = Modules.commands;
export const Destinations = Modules.destinations;
export const Dependencies = Modules.dependencies;
```

## products/notebook/src/modules/notes/commands/archiveNote.command.ts

Source SHA-256: 089e17553c2419e87038ef5ff9a30c97e02b8333c6e27dd9255d4884c8386e8e

```ts
import { literal, updateCommand } from "desert-sdk/src/index.ts";
import { Note } from "../note.object.ts";

export const ArchiveNoteRecord = updateCommand("archive-note-record", Note, {
  input: [], when: { state: "active" }, set: { state: literal("archived") },
});
```

## products/notebook/src/modules/notes/commands/createNote.command.ts

Source SHA-256: 982cdaff8b1af83a122df5be58ed4d7cb7f92a3cc2b0f6c3068f379f2a2da5d9

```ts
import { actorId, createCommand, fromInput, literal } from "desert-sdk/src/index.ts";
import { Note } from "../note.object.ts";

export const CreateNoteRecord = createCommand("create-note-record", Note, {
  input: ["title", "body"],
  values: { title: fromInput("title"), body: fromInput("body"), owner: actorId(), state: literal("active") },
});
```

## products/notebook/src/modules/notes/journeys/archiveNote.journey.ts

Source SHA-256: 1589e1eb910b20ac2454fc0a75c0cd75337355b1afd4087a2572a8fc3e411700

```ts
import { mutationJourney, type ViewJourney } from "desert-sdk/src/index.ts";
import { ArchiveNoteRecord } from "../commands/archiveNote.command.ts";
import { NotesController } from "../notes.dependencies.ts";
import { ReadNote } from "./readNotes.journey.ts";

export const ArchiveNote = mutationJourney("archive-note", ArchiveNoteRecord, { controller: NotesController, dependencies: [] });
export const ArchiveNoteExperience = { id: ArchiveNote.id, kind: "action", source: ReadNote, outputs: [] } satisfies ViewJourney;
```

## products/notebook/src/modules/notes/journeys/browseNotes.journey.ts

Source SHA-256: dc23591089a5f3cc6229d28484bea6db22fe57854dd0da01c7a951d01fc256ad

```ts
import { viewOutput, type ViewJourney } from "desert-sdk/src/index.ts";
import { NoteView } from "../views/note.view.ts";
import { NotesView } from "../views/notes.view.ts";
import { CreateNote } from "./createNote.journey.ts";
import { ReadNote } from "./readNotes.journey.ts";

export const ReadNotesExperience = {
  id: ReadNote.id, kind: "read", view: NotesView, detailView: NoteView,
  outputs: [
    { ...viewOutput(NotesView, "create"), action: { kind: "journey", journey: CreateNote } },
    { ...viewOutput(NotesView, "select"), action: { kind: "select" } },
    { ...viewOutput(NoteView, "close"), action: { kind: "close" } },
  ],
} satisfies ViewJourney;
```

## products/notebook/src/modules/notes/journeys/createNote.journey.ts

Source SHA-256: 3556c69d675ebfbfaf046a0d3a7320be32f40c0b0ccdfff476bb174e098453ad

```ts
import { mutationJourney, viewOutput, type ViewJourney } from "desert-sdk/src/index.ts";
import { CreateNoteRecord } from "../commands/createNote.command.ts";
import { NotesController } from "../notes.dependencies.ts";
import { CreateNoteView } from "../views/createNote.view.ts";
import { ReadNote } from "./readNotes.journey.ts";

export const CreateNote = mutationJourney("create-note", CreateNoteRecord, { controller: NotesController, dependencies: [] });
export const CreateNoteExperience = {
  id: CreateNote.id, kind: "create", source: ReadNote, view: CreateNoteView, preferredDock: "right",
  outputs: [
    { ...viewOutput(CreateNoteView, "save"), action: { kind: "submit" } },
    { ...viewOutput(CreateNoteView, "close"), action: { kind: "close" } },
  ],
} satisfies ViewJourney;
```

## products/notebook/src/modules/notes/journeys/readNotes.journey.ts

Source SHA-256: 73f003644cc55f21cca8c8d25f54ff251ece86222c3489270dd3b958560eeacb

```ts
import { readJourney } from "desert-sdk/src/index.ts";
import { Note } from "../note.object.ts";
import { NotesController } from "../notes.dependencies.ts";

export const ReadNote = readJourney("read-note", Note, {
  fields: ["title", "body", "state"], collection: ["title", "state"],
  requires: { controller: NotesController, dependencies: [] },
});
```

## products/notebook/src/modules/notes/note.object.ts

Source SHA-256: 6ebaa8ea294933c9047bdc908a6d7aba241d4d0c9be994e8af5cf5f65c03f659

```ts
import { enumeration, objectType, ownershipPolicy, principal, text } from "desert-sdk/src/index.ts";

export const Note = objectType({
  id: "note",
  facts: {
    title: text({ minLength: 1 }),
    body: text({ minLength: 1 }),
    owner: principal(),
    state: enumeration(["active", "archived"]),
  },
});

export const OnlyOwnerCanAccess = ownershipPolicy(Note, "owner");
```

## products/notebook/src/modules/notes/note.publication.ts

Source SHA-256: dc57289f22dfb4fb91207c9d865bf342d615f40ccdeb23840ce29c2a08180603

```ts
import { factReference, publishObject } from "desert-sdk/src/index.ts";
import { Note } from "./note.object.ts";
import { NoteView } from "./views/note.view.ts";
import { ArchiveNote } from "./journeys/archiveNote.journey.ts";

export const PublishedNote = publishObject(Note, {
  view: NoteView, title: factReference(Note, "title"),
  fields: [
    { fact: factReference(Note, "title"), label: "Title", representation: "text" },
    { fact: factReference(Note, "body"), label: "Content", representation: "paragraphs" },
    { fact: factReference(Note, "state"), label: "Status", representation: "text" },
  ],
  actions: [{ journey: ArchiveNote, icon: "archive" }],
});
```

## products/notebook/src/modules/notes/notes.dependencies.ts

Source SHA-256: daa1acd09dea50cda2d9d38c0047056f0a3944f7a85be5f2877b9c9e47de1a50

```ts
import { controllerRole } from "desert-sdk/src/index.ts";
import { Note } from "./note.object.ts";

export const NotesController = controllerRole({ id: "notes", objects: [Note], requires: [] });
```

## products/notebook/src/modules/notes/notes.module.ts

Source SHA-256: 5bb397296a8113c3a1a0032756a0bafa625b9bb5d94b414c2f140fb7bc7d8223

```ts
import { defineModule } from "desert-sdk/src/index.ts";
import { OnlyOwnerCanAccess } from "./note.object.ts";
import { PublishedNote } from "./note.publication.ts";
import { NotesController } from "./notes.dependencies.ts";
import { CreateNote, CreateNoteExperience } from "./journeys/createNote.journey.ts";
import { ReadNote } from "./journeys/readNotes.journey.ts";
import { ReadNotesExperience } from "./journeys/browseNotes.journey.ts";
import { ArchiveNote, ArchiveNoteExperience } from "./journeys/archiveNote.journey.ts";
import { NotesView } from "./views/notes.view.ts";
import { NoteView } from "./views/note.view.ts";
import { CreateNoteView } from "./views/createNote.view.ts";

const NotesDestination = { id: "notes", label: "Notes", icon: "open", entryJourney: ReadNote } as const;

export const NotesModule = defineModule({
  id: "notes", objects: [PublishedNote], dependencies: [NotesController], policies: [OnlyOwnerCanAccess],
  journeys: [
    { execution: CreateNote, presentation: CreateNoteExperience, label: "Create note", humanReview: "not-required" },
    { execution: ReadNote, presentation: ReadNotesExperience, label: "Read notes" },
    { execution: ArchiveNote, presentation: ArchiveNoteExperience, label: "Archive note", humanReview: "required" },
  ],
  views: [NotesView, NoteView, CreateNoteView], destinations: [NotesDestination],
  exports: {
    dependencies: { notes: NotesController },
    journeys: { createNote: CreateNote, readNotes: ReadNote, archiveNote: ArchiveNote },
    views: { Notes: NotesView, Note: NoteView, CreateNote: CreateNoteView }, destinations: { Notes: NotesDestination },
  },
});
```

## products/notebook/src/modules/notes/views/createNote.view.ts

Source SHA-256: 34ffd636aa6d423afca0f4426f5074133ae36b9b3a4cc855487c542033917fa9

```ts
import { Components, ViewTitles, defineView, viewPorts } from "desert-sdk/src/index.ts";

const Ports = viewPorts({ inputs: { draft: "form" }, outputs: ["save", "close"] });

export const CreateNoteView = defineView({
  name: "create-note", outputs: Ports.outputs,
  topDock: Components.Toolbar({ actions: [{ output: Ports.output.close, label: "Close", icon: "close" }] }),
  bottomDock: Components.Toolbar({ actions: [{ output: Ports.output.save, label: "Create note", icon: "save" }] }),
  content: [Components.Header({ title: ViewTitles.operation }), Components.Form({ input: Ports.inputs.draft })],
});
```

## products/notebook/src/modules/notes/views/note.view.ts

Source SHA-256: 3dfeaf5a978b7bf451b0f01f6aa035a44593ad1627a9b3e2c0fc146c3b5cbd17

```ts
import { Components, ViewTitles, defineView, viewPorts } from "desert-sdk/src/index.ts";

const Ports = viewPorts({ inputs: { note: "context" }, outputs: ["close"] });

export const NoteView = defineView({
  name: "note", outputs: Ports.outputs,
  topDock: Components.Toolbar({ actions: [{ output: Ports.output.close, label: "Close", icon: "close" }] }),
  content: [Components.Header({ title: ViewTitles.subject }), Components.Context({ input: Ports.inputs.note })],
});
```

## products/notebook/src/modules/notes/views/notes.view.ts

Source SHA-256: 7184dae2291e832919b0b7e6d21a4b1ce232bba27b5d3da11d2228e982df2fda

```ts
import { Components, defineView, viewPorts } from "desert-sdk/src/index.ts";

const Ports = viewPorts({ inputs: { notes: "collection" }, outputs: ["create", "select"] });

export const NotesView = defineView({
  name: "notes", outputs: Ports.outputs,
  topDock: Components.Toolbar({ actions: [{ output: Ports.output.create, label: "Create note", icon: "create" }] }),
  content: [
    Components.Header({ title: "Read notes", subtitle: "Your private notebook." }),
    Components.Stack({ title: "Notes", items: [Components.Collection({ input: Ports.inputs.notes, output: Ports.output.select })] }),
  ],
});
```

## products/notebook/src/notebook.product.ts

Source SHA-256: 5a0e862548d3b71b4a99efa33901b7394ce31aa06d938c27c58c90b882726e53

```ts
import { composeProduct } from "desert-sdk/src/index.ts";
import { Modules, Destinations } from "./modules.ts";
import { WorkspaceView } from "./views/workspace.view.ts";
import { NavigationView } from "./views/navigation.view.ts";
import { HumanNotebook, AgentNotebook } from "./surfaces.ts";

export const NotebookProduct = composeProduct({
  id: "notebook", label: "Notebook", modules: Modules,
  views: [WorkspaceView, NavigationView], workspace: WorkspaceView,
  surfaces: [HumanNotebook, AgentNotebook], entry: Destinations.Notes,
  navigation: [{ destination: Destinations.Notes, group: "Explore", purpose: "content" }],
});

export const Notebook = NotebookProduct.definition;
export const NotebookViewProgram = NotebookProduct.viewProgram;
```

## products/notebook/src/surfaces.ts

Source SHA-256: c58b68a9f0f426ac934ccbdff0f1ee06bb2bf3b6c00974c3356e70b7083a835a

```ts
import { agentSurface, humanSurface } from "desert-sdk/src/index.ts";
import { Journeys } from "./modules.ts";

const ExposedJourneys = [Journeys.createNote, Journeys.readNotes, Journeys.archiveNote] as const;
export const HumanNotebook = humanSurface({ id: "human", journeys: ExposedJourneys, locale: "en" });
export const AgentNotebook = agentSurface("agent", ExposedJourneys);
```

## products/notebook/src/views/navigation.view.ts

Source SHA-256: a3934fda54f738b1c6b195dac297165afdbaba3f305334b2327c26d0ceb0c1ed

```ts
import { Components, ViewTitles, defineView } from "desert-sdk/src/index.ts";

export const NavigationView = defineView({ name: "navigation", content: [Components.Header({ title: ViewTitles.product }), Components.Navigation()] });
```

## products/notebook/src/views/workspace.view.ts

Source SHA-256: 9564a63f411eaa7c790840d7bf8151fe4a4a919ef935466894f5efd2d5c3f051

```ts
import { Components, defineView } from "desert-sdk/src/index.ts";
import { NavigationView } from "./navigation.view.ts";

export const WorkspaceView = defineView({ name: "workspace", leftDock: Components.Dock(NavigationView), content: [Components.Destination()] });
```

## products/notebook/product.ts

Source SHA-256: 16c542fb80f72c2e833cce45a60bfefc3edc7e1b574c916f15bd6552aadc9e72

```ts
export { Notebook, NotebookProduct, NotebookViewProgram } from "./src/notebook.product.ts";
```

## products/notebook/distributions.ts

Source SHA-256: 43a37ef00600a67da93981211d2d70470fad28b9e3c1b1d8cf007de1c2088d94

```ts
import { clientDistribution, controllerDistribution, localBinding, remoteBinding } from "../../src/index.ts";
import { Dependencies } from "./src/modules.ts";
import { Notebook } from "./product.ts";
import { AgentNotebook, HumanNotebook } from "./surfaces.ts";

export const NotebookService = controllerDistribution({
  id: "notebook-service", product: Notebook, runtime: "node", storage: "postgresql",
  serves: [HumanNotebook, AgentNotebook], provides: [Dependencies.notes],
});

export const NotebookWeb = clientDistribution({
  id: "notebook-web", product: Notebook, surface: HumanNotebook,
  renderer: "svelte-web", bindings: [remoteBinding(Dependencies.notes, NotebookService)],
});

export const NotebookIOS = clientDistribution({
  id: "notebook-ios", product: Notebook, surface: HumanNotebook,
  renderer: "swiftui-ios", bindings: [remoteBinding(Dependencies.notes, NotebookService)],
});

export const NotebookCLI = clientDistribution({
  id: "notebook-cli", product: Notebook, surface: HumanNotebook,
  renderer: "terminal-cli", bindings: [remoteBinding(Dependencies.notes, NotebookService)],
});

export const NotebookLocal = clientDistribution({
  id: "notebook-local", product: Notebook, surface: HumanNotebook,
  renderer: "terminal-cli", bindings: [localBinding(Dependencies.notes, "notes-local")],
});
```

## products/notebook/inspect.ts

Source SHA-256: 1b681d8c1730afa82c54acbcafe36f13ca36284730a56ed650c8e4ed61687221

```ts
import * as desert from "../../src/index.ts";
import { fileURLToPath } from "node:url";
import { assertProductSource } from "../../src/authoring/index.ts";

await assertProductSource(fileURLToPath(new URL("./src", import.meta.url)));
const { NotebookProduct } = await import("./product.ts");
const { NotebookCLI, NotebookIOS, NotebookLocal, NotebookService, NotebookWeb } = await import("./distributions.ts");

const application = desert.compile(NotebookProduct);

console.log(JSON.stringify({
  product: application.id,
  contractDigest: application.digest,
  inputSchema: application.inputSchema("create-note-record"),
  validInput: application.validateInput("create-note-record", { title: "DESERT", body: "Define the product." }),
  incompleteInput: application.validateInput("create-note-record", { title: "DESERT" }),
  human: application.surface("human"),
  execution: application.executionPlan().status,
  distributions: application.planDistributions([NotebookService, NotebookWeb, NotebookIOS, NotebookCLI, NotebookLocal])
    .map(plan => ({ id: plan.id, status: plan.status, requirements: plan.requirements })),
}, null, 2));
```

## products/notebook/local.ts

Source SHA-256: da7af35e3af3ee5a38398f14ade2f2fe1896badab28ecd0e9691a71e7f76898a

```ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "../../src/index.ts";
import { openLocalController } from "../../src/local.ts";
import { requirePrivatePath, startLocalPostgres } from "../../src/local/postgres-host.ts";
import { assertProductSource } from "../../src/authoring/index.ts";

export async function openNotebookLocal(directory: string) {
  await assertProductSource(fileURLToPath(new URL("./src", import.meta.url)));
  const { NotebookProduct } = await import("./product.ts");
  const { NotesController } = await import("./dependencies.ts");
  const postgres = startLocalPostgres(directory);
  const application = compile(NotebookProduct);
  let controller: Awaited<ReturnType<typeof openLocalController>> | undefined;
  try {
    controller = await openLocalController(application, { ...postgres.database, roles: [NotesController.id] });
    const identityPath = join(directory, "identity.json");
    let identity: { id: string, token: string };
    if (existsSync(identityPath)) {
      requirePrivatePath(identityPath, false);
      identity = JSON.parse(readFileSync(identityPath, "utf8"));
    } else {
      identity = await controller.identities.issue("Local owner");
      writeFileSync(identityPath, JSON.stringify(identity), { mode: 0o600, flag: "wx" });
    }
    const session = controller.connect(identity.token, "human");
    const opened = controller;
    return { application, session, async close() { await opened.close(); postgres.stop(); } };
  } catch (error) { await controller?.close(); postgres.stop(); throw error; }
}
```

## products/notebook/run-local.ts

Source SHA-256: f51a1e7ff7494655c7d6747dd4885b217f87a023a46d303eee92b184ed3f06e5

```ts
import { fileURLToPath } from "node:url";
import { openNotebookLocal } from "./local.ts";
import { watchNotebook } from "./watch-local.ts";

const [operation, reference, payload, subject] = process.argv.slice(2);
const supported = ["prepare", "accept", "read", "receipt", "watch"];
if (!operation || !supported.includes(operation) || (operation !== "watch" && !reference)) {
  console.error("Usage: notebook:local prepare <journey> <input-json> [subject] | accept <intent> <digest> | read <journey> [subject] | receipt <intent> | watch");
  process.exitCode = 1;
} else {
  const notebook = await openNotebookLocal(fileURLToPath(new URL("../../.local/notebook/", import.meta.url)));
  try {
    const { session } = notebook;
    let result: unknown;
    if (operation === "watch") {
      await watchNotebook(session);
    } else if (operation === "prepare") {
      if (payload === undefined) throw new Error("Input JSON is required");
      const input: unknown = JSON.parse(payload);
      const run = await session.begin(reference!, subject);
      result = await session.prepare(run.id, input);
    } else if (operation === "accept") {
      if (!payload) throw new Error("Confirmation digest is required");
      result = await session.accept(reference!, payload);
    } else if (operation === "read") {
      result = await session.read((await session.begin(reference!, payload)).id);
    } else result = await session.receipt(reference!);
    if (operation !== "watch") console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Local operation failed");
    process.exitCode = 1;
  } finally { await notebook.close(); }
}
```

## products/notebook/build-web.ts

Source SHA-256: 38f7b1c7f5844e6da714d58eaf9ce11af25c82f5899ad3118c9027596c345273

```ts
import { fileURLToPath } from "node:url";
import { compile } from "../../src/index.ts";
import { buildDistribution } from "../../src/build/index.ts";
import { assertProductSource } from "../../src/authoring/index.ts";

await assertProductSource(fileURLToPath(new URL("./src", import.meta.url)));
const { NotebookProduct } = await import("./product.ts");
const { NotebookService, NotebookWeb } = await import("./distributions.ts");

const manifest = await buildDistribution(compile(NotebookProduct), {
  distributions: [NotebookService, NotebookWeb],
  target: NotebookWeb.id,
  outputDirectory: process.argv[2] ?? fileURLToPath(new URL("../../build/notebook-web", import.meta.url)),
});
console.log(JSON.stringify({ status: manifest.status, distribution: manifest.distributionId,
  contractDigest: manifest.contractDigest, distributionDigest: manifest.distributionDigest }, null, 2));
```

## products/notebook/check-web.ts

Source SHA-256: 17a265409b75a3485fbd613baa26e9dc07325ad7ecb2c78439f456bbdb8b79de

```ts
import { compile } from "../../src/index.ts";
import { buildHumanModule } from "../../src/web/build.ts";
import { createBuildProject } from "../../src/build/svelte/project.ts";
import { fileURLToPath } from "node:url";
import { assertProductSource } from "../../src/authoring/index.ts";

await assertProductSource(fileURLToPath(new URL("./src", import.meta.url)));
const { NotebookProduct } = await import("./product.ts");
const { NotebookWeb } = await import("./distributions.ts");

const project = createBuildProject(await buildHumanModule(compile(NotebookProduct), NotebookWeb.surface));
try { const result = await project.run("check"); console.log(result.stdout); }
finally { project.close(); }
```

## products/notebook/run-web.ts

Source SHA-256: 6d6a19c8607dca93a0130732ae8ec4db3234c382cabd194ff148b5cfeabac942

```ts
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openNotebookLocal } from "./local.ts";
import { serveBuiltLocalSurface } from "../../src/build/serve.ts";

const directory = process.argv[3] ? resolve(process.argv[3]) :
  fileURLToPath(new URL("../../.local/notebook/", import.meta.url));
const port = process.argv[4] ? Number(process.argv[4]) : 4271;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("INVALID_LOCAL_PORT");
const notebook = await openNotebookLocal(directory);
const buildDirectory = process.argv[2] ?? fileURLToPath(new URL("../../build/notebook-web", import.meta.url));
try {
  const server = await serveBuiltLocalSurface({ buildDirectory, session: notebook.session, port });
  writeFileSync(join(directory, "web-launch.json"), JSON.stringify({ url: server.launchUrl }), { mode: 0o600 });
  console.log(`Notebook is running at ${server.origin}. Open the private launch URL in ${join(directory, "web-launch.json")}.`);
  await new Promise<void>(resolve => {
    function stop() { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); resolve(); }
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  await server.close();
} finally { await notebook.close(); }
```

## products/notebook/verify.ts

Source SHA-256: 5bc15814d5ece75576051ac07b22dc4aeff5f6223a37997869fc61bb2b0c7bcd

```ts
import { fileURLToPath } from "node:url";
import { assertProductSource } from "../../src/authoring/index.ts";
import { deriveVerification } from "../../src/testing/index.ts";
import { localPostgresTestHost } from "../../src/testing/postgres.ts";

await assertProductSource(fileURLToPath(new URL("./src", import.meta.url)));
const { Notebook } = await import("./product.ts");

const verification = deriveVerification(Notebook);
const report = await verification.run({ host: localPostgresTestHost(), seed: 42 });
console.log(JSON.stringify(report, null, 2));
verification.assertComplete(report);
```

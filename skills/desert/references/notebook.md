# Complete executable Notebook source

Generated from this bundle's source. Do not edit this snapshot.
Regenerate with npm run authoring:generate; npm run authoring:check detects drift.
Paths below are relative to the SDK root. Read imports/types together; these are
verbatim modules, not standalone snippets or a published package API.

- products/notebook/note.ts
- products/notebook/dependencies.ts
- products/notebook/commands.ts
- products/notebook/journeys.ts
- products/notebook/surfaces.ts
- products/notebook/product.ts
- products/notebook/distributions.ts
- products/notebook/inspect.ts
- products/notebook/local.ts
- products/notebook/run-local.ts
- products/notebook/build-web.ts
- products/notebook/check-web.ts
- products/notebook/run-web.ts
- products/notebook/verify.ts

## products/notebook/note.ts

Source SHA-256: bb794f0169a5c5144e9bfb2f0ea3b6ea19e9f66e8cdb8890290fa6831800da75

```ts
import { enumeration, objectType, ownershipPolicy, principal, text } from "../../src/index.ts";

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

## products/notebook/dependencies.ts

Source SHA-256: 7a1df50bc7470a0dd7d3e259cd2db87ed41505e08f3eb205af6fd9edbba8d79c

```ts
import { controllerRole } from "../../src/dependencies.ts";
import { Note } from "./note.ts";

export const NotesController = controllerRole({
  id: "notes", objects: [Note], requires: [],
});
```

## products/notebook/commands.ts

Source SHA-256: b814565b55954ac07a12558e1e2f091bafa987e46732b063eb931f1c4e6e72f6

```ts
import { actorId, createCommand, fromInput, literal, updateCommand } from "../../src/index.ts";
import { Note } from "./note.ts";

export const CreateNoteRecord = createCommand("create-note-record", Note, {
  input: ["title", "body"],
  values: {
    title: fromInput("title"),
    body: fromInput("body"),
    owner: actorId(),
    state: literal("active"),
  },
});

export const ArchiveNoteRecord = updateCommand("archive-note-record", Note, {
  input: [],
  when: { state: "active" },
  set: { state: literal("archived") },
});
```

## products/notebook/journeys.ts

Source SHA-256: 3f09b5c57cd6712122fc89b8efa17705e9b6b1c27dfdfe98a6ce706d5d597a6d

```ts
import { mutationJourney, readJourney } from "../../src/index.ts";
import { ArchiveNoteRecord, CreateNoteRecord } from "./commands.ts";
import { Note } from "./note.ts";
import { NotesController } from "./dependencies.ts";

export const CreateNote = mutationJourney("create-note", CreateNoteRecord, {
  controller: NotesController, dependencies: [],
});
export const ReadNote = readJourney("read-note", Note, {
  fields: ["title", "body", "state"],
  collection: ["title", "state"],
  requires: { controller: NotesController, dependencies: [] },
});
export const ArchiveNote = mutationJourney("archive-note", ArchiveNoteRecord, {
  controller: NotesController, dependencies: [],
});
```

## products/notebook/surfaces.ts

Source SHA-256: 7a261d134a8735e27830a4bd51f76ab0129d44a3be5590e3523f36632d6b36a1

```ts
import { agentSurface, humanSurface } from "../../src/index.ts";
import { ArchiveNote, CreateNote, ReadNote } from "./journeys.ts";

export const HumanNotebook = humanSurface({
  id: "human",
  journeys: [CreateNote, ReadNote, ArchiveNote],
  entry: ReadNote,
  primaryAction: CreateNote,
  subjectActions: [ArchiveNote],
  inputs: { "note.body": "input.multiline" },
  commit: {
    "create-note": "submit",
    "archive-note": "review",
  },
  language: {
    locale: "en",
    fields: { "note.title": "Title", "note.body": "Content", "note.state": "Status" },
    journeys: { "create-note": "Create note", "read-note": "Read notes", "archive-note": "Archive note" },
  },
  connection: {
    availability: "journey-dependencies",
    draftRetention: "session-memory",
    reconnect: "refresh-without-replay",
  },
});

export const AgentNotebook = agentSurface("agent", [CreateNote, ReadNote, ArchiveNote]);
```

## products/notebook/product.ts

Source SHA-256: aca3d8f9b48b6526e891474d1ad3643d1b311ed37b63b8d02696ecff83314488

```ts
import { product } from "../../src/index.ts";
import { Note, OnlyOwnerCanAccess } from "./note.ts";
import { ArchiveNote, CreateNote, ReadNote } from "./journeys.ts";
import { AgentNotebook, HumanNotebook } from "./surfaces.ts";
import { NotesController } from "./dependencies.ts";

export const Notebook = product({
  id: "notebook",
  objects: [Note],
  dependencies: [NotesController],
  policies: [OnlyOwnerCanAccess],
  journeys: [CreateNote, ReadNote, ArchiveNote],
  surfaces: [HumanNotebook, AgentNotebook],
});
```

## products/notebook/distributions.ts

Source SHA-256: 8c7e3f3b9baa48272cfd51bc22b7d1b4cae7177c8a0f8d82d217a58a743edc8b

```ts
import { clientDistribution, controllerDistribution, localBinding, remoteBinding } from "../../src/index.ts";
import { NotesController } from "./dependencies.ts";
import { Notebook } from "./product.ts";
import { AgentNotebook, HumanNotebook } from "./surfaces.ts";

export const NotebookService = controllerDistribution({
  id: "notebook-service", product: Notebook, runtime: "node", storage: "postgresql",
  serves: [HumanNotebook, AgentNotebook], provides: [NotesController],
});

export const NotebookWeb = clientDistribution({
  id: "notebook-web", product: Notebook, surface: HumanNotebook,
  renderer: "svelte-web", bindings: [remoteBinding(NotesController, NotebookService)],
});

export const NotebookIOS = clientDistribution({
  id: "notebook-ios", product: Notebook, surface: HumanNotebook,
  renderer: "swiftui-ios", bindings: [remoteBinding(NotesController, NotebookService)],
});

export const NotebookCLI = clientDistribution({
  id: "notebook-cli", product: Notebook, surface: HumanNotebook,
  renderer: "terminal-cli", bindings: [remoteBinding(NotesController, NotebookService)],
});

export const NotebookLocal = clientDistribution({
  id: "notebook-local", product: Notebook, surface: HumanNotebook,
  renderer: "terminal-cli", bindings: [localBinding(NotesController, "notes-local")],
});
```

## products/notebook/inspect.ts

Source SHA-256: 91681b2a9bf6d1659d4fa4c85336d95dd43dd25bd94eb0c3feb8cb582ad8b77b

```ts
import * as desert from "../../src/index.ts";
import { Notebook } from "./product.ts";
import { NotebookCLI, NotebookIOS, NotebookLocal, NotebookService, NotebookWeb } from "./distributions.ts";

const application = desert.compile(Notebook);

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

Source SHA-256: 4c6eee7c4810d4e3933541c5b9bf8f9fadabb8215bda358d8af34ef4dd701ed7

```ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compile } from "../../src/index.ts";
import { openLocalController } from "../../src/local.ts";
import { requirePrivatePath, startLocalPostgres } from "../../src/local/postgres-host.ts";
import { NotesController } from "./dependencies.ts";
import { Notebook } from "./product.ts";

export async function openNotebookLocal(directory: string) {
  const postgres = startLocalPostgres(directory);
  const application = compile(Notebook);
  let controller: Awaited<ReturnType<typeof openLocalController>> | undefined;
  try {
    controller = await openLocalController(application, { ...postgres.database, role: NotesController.id });
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

Source SHA-256: b6855892ba4e739a098e55951040cc3b08465dfed171ea663ca859def8c20152

```ts
import { fileURLToPath } from "node:url";
import { compile } from "../../src/index.ts";
import { buildDistribution } from "../../src/build/index.ts";
import { Notebook } from "./product.ts";
import { NotebookService, NotebookWeb } from "./distributions.ts";

const manifest = await buildDistribution(compile(Notebook), {
  distributions: [NotebookService, NotebookWeb],
  target: NotebookWeb.id,
  outputDirectory: process.argv[2] ?? fileURLToPath(new URL("../../build/notebook-web", import.meta.url)),
});
console.log(JSON.stringify({ status: manifest.status, distribution: manifest.distributionId,
  contractDigest: manifest.contractDigest, distributionDigest: manifest.distributionDigest }, null, 2));
```

## products/notebook/check-web.ts

Source SHA-256: 012a056d4707b0285c71aff06e0eeb68dc13a4d929529697ec8fa250ef564900

```ts
import { compile } from "../../src/index.ts";
import { buildHumanModule } from "../../src/web/build.ts";
import { createBuildProject } from "../../src/build/svelte/project.ts";
import { Notebook } from "./product.ts";
import { NotebookWeb } from "./distributions.ts";

const project = createBuildProject(await buildHumanModule(compile(Notebook), NotebookWeb.surface));
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

Source SHA-256: fd3d7698f47d71e2bdc5be65533f811f5e395d032e0eab2dce98f3ca79f6f214

```ts
import { Notebook } from "./product.ts";
import { deriveVerification } from "../../src/testing/index.ts";
import { localPostgresTestHost } from "../../src/testing/postgres.ts";

const verification = deriveVerification(Notebook);
const report = await verification.run({ host: localPostgresTestHost(), seed: 42 });
console.log(JSON.stringify(report, null, 2));
verification.assertComplete(report);
```

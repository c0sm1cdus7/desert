import assert from "node:assert/strict";
import test from "node:test";
import { assertProductSource } from "../src/authoring/index.ts";
import { catalogSource, sourceFixture } from "./fixtures/module-catalog-source.ts";

test("module catalog mounting and view-only references are admitted by provenance", async () => {
  await sourceFixture({ ...catalogSource,
    "views/home.view.ts": 'import { Views as PublicViews } from "../modules.ts"; export const Home = { id: "home", rightDock: { kind: "view", view: PublicViews.Notes }, content: [] };',
  }, async root => assert.equal((await assertProductSource(root)).files.length, 5));
});

test("view-only provenance survives aliases, explicit reexports and individual View handles", async () => {
  for (const bridge of [
    'export { Views as Available } from "./modules.ts";',
    'import { Views as SourceViews } from "./modules.ts"; const value = SourceViews; export { value as Available };',
    'import { Views } from "./modules.ts"; export const Available = Views.Notes;',
  ]) {
    await sourceFixture({ ...catalogSource, "arbitrary-name.ts": bridge,
      "views/home.view.ts": 'import { Available } from "../arbitrary-name.ts"; export const Home = { id: "home", rightDock: { kind: "view", view: Available }, content: [] };',
    }, async root => assert.equal((await assertProductSource(root)).files.length, 6));
  }
});

test("a filename or exported name cannot grant View access to activities and commands", async () => {
  for (const projection of ["Modules", "Modules.journeys", "Modules.commands", "Modules.destinations", "Modules.dependencies",
    "{ safe: Modules.views, hidden: Modules.journeys }", "{ ...Modules.views, hidden: Modules.commands }"]) {
    await sourceFixture({ ...catalogSource,
      "views.ts": `import { Modules } from "./modules.ts"; export const Views = ${projection};`,
      "views/home.view.ts": 'import { Views } from "../views.ts"; export const Home = { id: "home", content: [], rightDock: { kind: "view", view: Views } };',
    }, async root => assert.rejects(assertProductSource(root), /VIEW_ACTIVITY_IMPORT/));
  }
});

test("one safe import cannot launder a second activity import from the same barrel", async () => {
  await sourceFixture({ ...catalogSource,
    "views/home.view.ts": 'import { Views, Journeys as Extra } from "../modules.ts"; export const Home = { id: "home", content: [], rightDock: { kind: "view", view: Views.Notes }, extra: Extra };',
  }, async root => assert.rejects(assertProductSource(root), /VIEW_ACTIVITY_IMPORT/));
});

test("transitive activity reexports stay forbidden even beside genuine view aliases", async () => {
  await sourceFixture({ ...catalogSource,
    "public.ts": 'export { Views as Safe, Commands as Views } from "./modules.ts";',
    "views/home.view.ts": 'import { Views } from "../public.ts"; export const Home = { id: "home", content: [], rightDock: { kind: "view", view: Views } };',
  }, async root => assert.rejects(assertProductSource(root), /VIEW_ACTIVITY_IMPORT/));
});

test("capabilities cannot import root or foreign catalogs to acquire another module", async () => {
  for (const target of ["../../modules.ts", "../other/other.module.ts"]) {
    await sourceFixture({ ...catalogSource,
      "modules/notes/escape.ts": `import { Modules } from "${target}"; export const escaped = Modules.views;`,
      "modules/other/other.module.ts": 'import { defineModule } from "desert-sdk/src/index.ts"; export const OtherModule = defineModule({ id: "other" });',
    }, async root => assert.rejects(assertProductSource(root), /CROSS_MODULE_IMPORT/));
  }
});

test("moduleIndex cannot authorize a direct private import or cloned module manifest", async () => {
  await sourceFixture({ ...catalogSource,
    "private.ts": 'import { NotesView } from "./modules/notes/views/notes.view.ts"; export const stolen = NotesView;',
  }, async root => assert.rejects(assertProductSource(root), /PRIVATE_MODULE_IMPORT/));
  await sourceFixture({ ...catalogSource,
    "modules.ts": 'import { moduleIndex } from "desert-sdk/src/index.ts"; import { NotesModule } from "./modules/notes/notes.module.ts"; export const Modules = moduleIndex([{ ...NotesModule }]);',
  }, async root => assert.rejects(assertProductSource(root), /MODULE_MANIFEST_ACCESS/));
});

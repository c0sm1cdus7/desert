// Plan §14 at composition: a product declares messages; the human exposures' locale selects one bundle, which resolves every
// message the product and its modules declare into the compiled program. A key the bundle lacks is MESSAGE_MISSING.
import assert from "node:assert/strict";
import test from "node:test";
import { Check } from "@sinclair/typebox/value";
import { agentExposure, composeProduct, humanExposure, messageCatalog } from "../src/index.ts";
import { NotebookProduct } from "../products/notebook/product.ts";
import { Messages, m } from "../products/notebook/src/messages/keys.ts";
import { Modules, Destinations, Journeys } from "../products/notebook/src/modules.ts";
import { WorkspaceView } from "../products/notebook/src/views/workspace.view.ts";
import { NavigationView } from "../products/notebook/src/views/navigation.view.ts";
import { HumanNotebook, AgentNotebook } from "../products/notebook/src/exposures.ts";
import { DeclaredViewSchema, ViewSchema } from "../src/views/schema.ts";
import { ProductDefinitionSchema } from "../src/contracts.ts";
import { JourneySchema } from "../src/program-grammar.ts";
import { declaredSchema, keysAsText, resolveMessages } from "../src/views/declared.ts";

const notebook = (overrides: object = {}) => ({ id: "notebook", label: m.notebook.label, messages: Messages, modules: Modules,
  views: [WorkspaceView, NavigationView], workspace: WorkspaceView, exposures: [HumanNotebook, AgentNotebook], entry: Destinations.Notes,
  navigation: [{ destination: Destinations.Notes, group: m.notebook.explore, purpose: "content" as const }], ...overrides });

test("the compiled program carries the English sentence of every declared message, product and module alike", () => {
  const program = NotebookProduct.viewProgram;
  assert.equal(program.label, "Notebook");
  assert.deepEqual(program.navigation, [{ destination: "notes", group: "Explore", purpose: "content" }]);
  assert.deepEqual(program.destinations.map(item => item.label), ["Notes"]);
  const notes = program.views.find(view => view.id === "notes");
  assert.deepEqual(notes?.content[0], { kind: "header", id: "content.0", title: "Read notes", subtitle: "Your private notebook." });
  assert.equal(notes?.topDock?.actions[0]?.label, "Create note");
  const human = NotebookProduct.definition.surfaces?.find(surface => surface.kind === "human");
  assert.deepEqual(human?.kind === "human" ? human.language : undefined, { locale: "en",
    fields: { "note.body": "Content", "note.state": "Status", "note.title": "Title" },
    journeys: { "archive-note": "Archive note", "create-note": "Create note", "read-note": "Read notes" } });
  for (const view of program.views) assert.equal(Check(ViewSchema, view), true, view.id);
});

test("MESSAGE_MISSING: a declared key the selected bundle lacks fails the composition", () => {
  const partial = messageCatalog({ en: { notebook: { label: "Notebook" } } } as const);
  assert.throws(() => composeProduct(notebook({ messages: partial })), /^Error: MESSAGE_MISSING: notes\.destination is not in the en bundle$/);
  const other = messageCatalog({ es: { notebook: { label: "Cuaderno", explore: "Explorar" } } } as const);
  assert.throws(() => composeProduct(notebook({ messages: other })), /^Error: MESSAGE_MISSING: no en bundle; the catalog has es$/);
});

test("one bundle per build: human exposures in two locales, a missing catalog and a look-alike catalog are refused", () => {
  const spanish = humanExposure({ id: "spanish", journeys: [Journeys.readNotes], locale: "es" });
  assert.throws(() => composeProduct(notebook({ exposures: [HumanNotebook, spanish, AgentNotebook] })),
    { message: "MESSAGE_LOCALE_CONFLICT: human exposures declare en, es; one build resolves one bundle" });
  assert.throws(() => composeProduct(notebook({ messages: undefined }) as never), { message: "MESSAGE_CATALOG: messages is not a catalog from a generated keys.ts" });
  assert.throws(() => composeProduct(notebook({ messages: { ...Messages } }) as never), /MESSAGE_CATALOG/);
  assert.throws(() => composeProduct(notebook({ exposures: [agentExposure("agent", [Journeys.readNotes])] }) as never),
    { message: "MISSING_COMPOSITION_HUMAN_SURFACE" });
});

test("a literal where a message is declared is refused at run time too, not only by the type checker", () => {
  assert.throws(() => composeProduct(notebook({ label: "Notebook" }) as never), { message: "INVALID_PRODUCT_COMPOSITION" });
});

test("the declared schema family changes message fields only: domain schemas are the compiled ones, field for field", () => {
  assert.deepEqual(declaredSchema(ProductDefinitionSchema), ProductDefinitionSchema);
  assert.deepEqual(declaredSchema(JourneySchema), JourneySchema);
  const view = { version: "desert.view/1", id: "v", content: [{ kind: "header", id: "h", title: { key: "notes.readNotes" } }] };
  assert.equal(Check(DeclaredViewSchema, view), true);
  assert.equal(Check(ViewSchema, view), false);
  assert.equal(Check(ViewSchema, keysAsText(view)), true);
  assert.deepEqual(resolveMessages(view, Messages.bundle("en")),
    { content: [{ id: "h", kind: "header", title: "Read notes" }], id: "v", version: "desert.view/1" });
});

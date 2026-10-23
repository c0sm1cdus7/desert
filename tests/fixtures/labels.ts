import { objectType, labels, text, principal, controllerRole, ownershipPolicy, createCommand, updateCommand, mutationJourney, readJourney, fromInput, actorId,
  agentExposure, humanExposure, composeProduct, moduleIndex, publishObject, factReference, initializeInput, Components, ViewTitles, defineView, viewPorts, viewOutput,
} from "../../src/index.ts";
import { compile } from "../../src/compile.ts";
import type { HumanSurface } from "../../src/web/types.ts";
import { readScopes } from "../../src/web/client/view-scopes.ts";
import { WorkspaceView, NavigationView } from "./workspace-view.ts";

export const Item = objectType({ id: "labeled-item", facts: {
  title: text(), projects: labels(), owner: principal(),
} });
export const Controller = controllerRole({ id: "labeled-items", objects: [Item], requires: [] });
const requires = { controller: Controller, dependencies: [] };
export const CreateItem = mutationJourney("create-item", createCommand("create-item-record", Item, {
  input: ["title", "projects"], values: { title: fromInput("title"), projects: fromInput("projects"), owner: actorId() },
}), requires);
export const EditItem = mutationJourney("edit-item", updateCommand("edit-item-record", Item, {
  input: ["title", "projects"], when: {}, set: { title: fromInput("title"), projects: fromInput("projects") },
}), requires);
export const ReadItems = readJourney("read-items", Item, {
  fields: ["title", "projects"], collection: ["title"], requires,
});
const listPorts = viewPorts({ inputs: { records: "collection" }, outputs: ["select", "create"] });
const detailPorts = viewPorts({ inputs: { record: "context" }, outputs: ["close"] });
const editorPorts = viewPorts({ inputs: { draft: "form" }, outputs: ["save", "close"] });
const ListView = defineView({ name: "items", outputs: listPorts.outputs,
  topDock: Components.Toolbar({ actions: [{ output: listPorts.output.create, label: "Create", icon: "create" }] }),
  content: [Components.Header({ title: "Items" }), Components.Collection({ input: listPorts.inputs.records, output: listPorts.output.select })] });
const DetailView = defineView({ name: "item", outputs: detailPorts.outputs,
  topDock: Components.Toolbar({ actions: [{ output: detailPorts.output.close, label: "Close", icon: "close" }] }),
  content: [Components.Header({ title: ViewTitles.subject }), Components.Context({ input: detailPorts.inputs.record })] });
const EditorView = defineView({ name: "item-editor", outputs: editorPorts.outputs,
  topDock: Components.Toolbar({ actions: [{ output: editorPorts.output.close, label: "Close", icon: "close" }] }),
  bottomDock: Components.Toolbar({ actions: [{ output: editorPorts.output.save, label: "Save", icon: "save" }] }),
  content: [Components.Header({ title: ViewTitles.operation }), Components.Form({ input: editorPorts.inputs.draft })] });
const editorOutputs = [
  { ...viewOutput(EditorView, "save"), action: { kind: "submit" } },
  { ...viewOutput(EditorView, "close"), action: { kind: "close" } },
] as const;
const Home = { id: "items", label: "Items", icon: "open", entryJourney: ReadItems } as const;
export const LabeledItemsProduct = composeProduct({ id: "labels-test", label: "Items", modules: moduleIndex([]),
  objects: [publishObject(Item, { view: DetailView, title: factReference(Item, "title"),
    fields: [{ fact: factReference(Item, "title"), label: "Title", representation: "text" },
      { fact: factReference(Item, "projects"), label: "Projects", representation: "tags" }], actions: [{ journey: EditItem, icon: "edit" }] })],
  dependencies: [Controller], policies: [ownershipPolicy(Item, "owner")],
  journeys: [
    { execution: CreateItem, label: "Create", humanReview: "not-required", presentation: {
      id: CreateItem.id, kind: "create", source: ReadItems, view: EditorView, preferredDock: "right", outputs: editorOutputs } },
    { execution: EditItem, label: "Edit", humanReview: "not-required", presentation: {
      id: EditItem.id, kind: "update", source: ReadItems, view: EditorView, preferredDock: "right", outputs: editorOutputs,
      initialize: [initializeInput(EditItem.command, "title", factReference(Item, "title")),
        initializeInput(EditItem.command, "projects", factReference(Item, "projects"))] } },
    { execution: ReadItems, label: "Items", presentation: { id: ReadItems.id, kind: "read", view: ListView, detailView: DetailView,
      outputs: [
        { ...viewOutput(ListView, "create"), action: { kind: "journey", journey: CreateItem } },
        { ...viewOutput(ListView, "select"), action: { kind: "select" } },
        { ...viewOutput(DetailView, "close"), action: { kind: "close" } },
      ] } },
  ],
  views: [ListView, DetailView, EditorView, WorkspaceView, NavigationView], workspace: WorkspaceView,
  destinations: [Home], entry: Home, navigation: [{ destination: Home, group: "Explore", purpose: "content" }],
  exposures: [agentExposure("agent", [CreateItem, EditItem, ReadItems]), humanExposure({ id: "human", journeys: [CreateItem, EditItem, ReadItems], locale: "en" })],
});
export const LabeledItems = LabeledItemsProduct.definition;
export const program = LabeledItemsProduct.viewProgram;
export const application = compile(LabeledItems);
export const surface = application.surface("human") as HumanSurface;
export const scope = readScopes(program, surface).find(scope => scope.read.id === ReadItems.id)!;

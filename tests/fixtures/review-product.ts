import {
  objectType, text, principal, enumeration, controllerRole, ownershipPolicy,
  createCommand, updateCommand, mutationJourney, readJourney, fromInput, literal, actorId,
  Components, ViewTitles, defineView, viewPorts, viewOutput, publishObject, factReference,
  composeProduct, moduleIndex, humanExposure, clientDistribution, controllerDistribution, remoteBinding,
} from "../../src/index.ts";
import { NavigationView, WorkspaceView } from "./workspace-view.ts";

export function reviewProduct(options: { renamed?: boolean; emptyTitle?: boolean; createReview?: boolean; hideState?: boolean } = {}) {
  const name = <const Name extends string>(value: Name) => options.renamed ? `renamed_${value}` as const : value;
  const fields = { title: "headline", body: "content", state: "status", owner: "identity" } as const;
  const Note = objectType({ id: name("note"), facts: {
    headline: text({ minLength: options.emptyTitle ? 0 : 1 }), content: text(),
    status: enumeration(["active", "archived"]), identity: principal(), privateFact: text(),
  } });
  const Controller = controllerRole({ id: name("notes"), objects: [Note], requires: [] });
  const requires = { controller: Controller, dependencies: [] };
  const Create = mutationJourney(options.renamed ? "accept" : "create-note", createCommand(name("create-note-record"), Note, {
    input: [fields.title, fields.body], values: {
      headline: fromInput(fields.title), content: fromInput(fields.body),
      status: literal("active"), identity: actorId(), privateFact: literal("unexposed-private-value"),
    },
  }), requires);
  const Archive = mutationJourney(name("archive-note"), updateCommand(name("archive-note-record"), Note, {
    input: [], when: { status: "active" }, set: { status: literal("archived") },
  }), requires);
  const Read = readJourney(name("read-note"), Note, {
    fields: [fields.title, fields.body, ...(!options.hideState ? [fields.state] : []), ...(options.createReview ? ["privateFact" as const] : [])],
    collection: [fields.title], requires,
  });
  const ReadStatus = readJourney(name("read-note-status"), Note, { fields: [fields.title, fields.state], collection: [fields.title], requires });
  const list = viewPorts({ inputs: { records: "collection" }, outputs: ["create", "select"] });
  const status = viewPorts({ inputs: { records: "collection" }, outputs: ["select"] });
  const detail = viewPorts({ inputs: { record: "context" }, outputs: ["close"] });
  const editor = viewPorts({ inputs: { draft: "form" }, outputs: ["save", "close"] });
  const NotesView = defineView({ name: name("notes"), outputs: list.outputs,
    topDock: Components.Toolbar({ actions: [{ output: list.output.create, label: "Create note", icon: "create" }] }),
    content: [Components.Header({ title: "Notes" }), Components.Collection({ input: list.inputs.records, output: list.output.select })],
  });
  const NoteView = defineView({ name: name("note"), outputs: detail.outputs,
    topDock: Components.Toolbar({ actions: [{ output: detail.output.close, label: "Close", icon: "close" }] }),
    content: [Components.Header({ title: ViewTitles.subject }), Components.Context({ input: detail.inputs.record })],
  });
  const StatusView = defineView({ name: name("note-status"), outputs: status.outputs,
    content: [Components.Header({ title: "Statuses" }), Components.Collection({ input: status.inputs.records, output: status.output.select })],
  });
  const CreateView = defineView({ name: name("create-note"), outputs: editor.outputs,
    topDock: Components.Toolbar({ actions: [{ output: editor.output.close, label: "Close", icon: "close" }] }),
    bottomDock: Components.Toolbar({ actions: [{ output: editor.output.save,
      label: options.createReview ? "Review" : "Create note", icon: options.createReview ? "review" : "save" }] }),
    content: [Components.Header({ title: ViewTitles.operation }), Components.Form({ input: editor.inputs.draft })],
  });
  const Notes = { id: name("notes-home"), label: "Notes", icon: "open", entryJourney: Read } as const;
  const Statuses = { id: name("statuses-home"), label: "Statuses", icon: "open", entryJourney: ReadStatus } as const;
  const Human = humanExposure({ id: "human", journeys: [Create, Read, ReadStatus, Archive], locale: "en" });
  const Product = composeProduct({ id: name("notebook"), label: "Notebook", modules: moduleIndex([]),
    objects: [publishObject(Note, { view: NoteView, title: factReference(Note, fields.title),
      fields: [
        { fact: factReference(Note, fields.title), label: "Title", representation: "text" },
        { fact: factReference(Note, fields.body), label: "Content", representation: "paragraphs" },
        { fact: factReference(Note, fields.state), label: "Status", representation: "text" },
        ...(options.createReview ? [{ fact: factReference(Note, "privateFact"), label: "Fixture witness", representation: "text" as const }] : []),
      ], actions: [{ journey: Archive, icon: "archive" }] })],
    dependencies: [Controller], policies: [ownershipPolicy(Note, fields.owner)],
    journeys: [
      { execution: Create, label: "Create note", humanReview: options.createReview ? "required" : "not-required",
        presentation: { id: Create.id, kind: "create", source: Read, view: CreateView, preferredDock: "right", outputs: [
          { ...viewOutput(CreateView, "save"), action: { kind: "submit" } },
          { ...viewOutput(CreateView, "close"), action: { kind: "close" } },
        ] } },
      { execution: Read, label: "Read notes", presentation: { id: Read.id, kind: "read", view: NotesView, detailView: NoteView, outputs: [
        { ...viewOutput(NotesView, "create"), action: { kind: "journey", journey: Create } },
        { ...viewOutput(NotesView, "select"), action: { kind: "select" } },
        { ...viewOutput(NoteView, "close"), action: { kind: "close" } },
      ] } },
      { execution: ReadStatus, label: "Read note status", presentation: { id: ReadStatus.id, kind: "read", view: StatusView, detailView: NoteView, outputs: [
        { ...viewOutput(StatusView, "select"), action: { kind: "select" } },
        { ...viewOutput(NoteView, "close"), action: { kind: "close" } },
      ] } },
      { execution: Archive, label: "Archive note", humanReview: "required",
        presentation: { id: Archive.id, kind: "action", source: Read, outputs: [] } },
    ],
    views: [NotesView, NoteView, StatusView, CreateView, WorkspaceView, NavigationView], workspace: WorkspaceView,
    destinations: [Notes, Statuses], entry: Notes, navigation: [
      { destination: Notes, group: "Explore", purpose: "content" },
      { destination: Statuses, group: "Explore", purpose: "content" },
    ], exposures: [Human],
  });
  const Service = controllerDistribution({ id: name("notebook-service"), product: Product.definition,
    runtime: "node", storage: "postgresql", serves: [Human], provides: [Controller] });
  const Web = clientDistribution({ id: name("notebook-web"), product: Product.definition, surface: Human,
    renderer: "svelte-web", bindings: [remoteBinding(Controller, Service)] });
  return { Product, Human, Service, Web, Read, ReadStatus, Create, Archive, Controller, fields };
}

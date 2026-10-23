import { compile } from "../../src/compile.ts";
import { actorId, createCommand, fromInput, mutationJourney, objectType, ownershipPolicy, principal,
  readJourney, text } from "../../src/index.ts";
import { EditingNotebook, EditNote } from "./editing-notebook.ts";
import { NotesController } from "../../products/notebook/dependencies.ts";
import { Note } from "../../products/notebook/note.ts";
import { controllerRole } from "../../src/dependencies.ts";
import { program } from "./view-program.ts";
import type { HumanSurface } from "../../src/web/types.ts";
import { viewExposure } from "./view-exposure.ts";
import assert from "node:assert/strict";

export const Card = objectType({ id: "card", facts: { title: text({ minLength: 1 }), body: text({ minLength: 1 }), owner: principal() } });
const MultiController = controllerRole({ id: NotesController.id, objects: [Note, Card], requires: [] });
export const CreateCard = mutationJourney("create-card", createCommand("create-card-record", Card, {
  input: ["title", "body"], values: { title: fromInput("title"), body: fromInput("body"), owner: actorId() },
}), { controller: MultiController, dependencies: [] });
export const ReadCards = readJourney("read-cards", Card, { fields: ["title", "body"], collection: ["title"],
  requires: { controller: MultiController, dependencies: [] } });
assert.ok(EditingNotebook.dependencies);
assert.ok(EditingNotebook.policies);
export const MultiNotebook = { ...EditingNotebook, objects: [...EditingNotebook.objects, Card],
  dependencies: EditingNotebook.dependencies.map(item => item.id === NotesController.id ? MultiController : item),
  policies: [...EditingNotebook.policies, ownershipPolicy(Card, "owner")],
  journeys: [...EditingNotebook.journeys, CreateCard, ReadCards],
  surfaces: EditingNotebook.surfaces.map(viewExposure).map(surface => surface.kind !== "human" ? surface : { ...surface,
    journeys: [...surface.journeys, CreateCard.id, ReadCards.id],
    commit: { ...surface.commit, [CreateCard.id]: "submit" as const },
    fieldRepresentations: { ...surface.fieldRepresentations, "card.title": "text" as const, "card.body": "text" as const },
    language: { ...surface.language, fields: { ...surface.language.fields, "card.title": "Card title", "card.body": "Card body" },
      journeys: { ...surface.language.journeys, [CreateCard.id]: "Create card", [ReadCards.id]: "Read cards" } },
  }),
};
export const multiApplication = compile(MultiNotebook);
export const multiSurface = multiApplication.surface("human") as HumanSurface;
const renamed = (id: string) => id === "notes" ? "cards" : id === "detail" ? "card-detail" : "card-editor";
export const multiProgram = {
  ...program,
  objects: [{ object: "note", view: "detail", title: { object: "note", field: "title" }, actions: [{ journey: EditNote.id, icon: "edit" }] }],
  views: [...program.views.map(view => view.id !== "detail" && view.id !== "editor" ? view : { ...view, content: [
    { ...view.content[0], title: { kind: view.id === "detail" ? "subject-title" as const : "operation-label" as const } }, view.content[1],
  ] }), ...program.views.filter(view => ["notes", "detail", "editor"].includes(view.id)).map(view => ({
    ...view, id: renamed(view.id),
  })), { ...program.views[3], id: "edit-note", content: [
    { ...program.views[3].content[0], title: { kind: "operation-label" } }, program.views[3].content[1],
  ] }],
  journeys: [...program.journeys,
    { id: ReadCards.id, kind: "read", view: "cards", detailView: "card-detail", outputs: [
      { view: "cards", output: "create", action: { kind: "journey", journey: CreateCard.id } },
      { view: "cards", output: "select", action: { kind: "select" } },
      { view: "card-detail", output: "close", action: { kind: "close" } },
    ] },
    { id: CreateCard.id, kind: "create", source: ReadCards.id, view: "card-editor", preferredDock: "right", outputs: [
      { view: "card-editor", output: "save", action: { kind: "submit" } },
      { view: "card-editor", output: "close", action: { kind: "close" } },
    ] },
    { id: EditNote.id, kind: "update", source: "read-note", view: "edit-note", preferredDock: "right",
      initialize: [{ input: "title", fact: "title" }, { input: "body", fact: "body" }], outputs: [
        { view: "edit-note", output: "save", action: { kind: "submit" } },
        { view: "edit-note", output: "close", action: { kind: "close" } },
      ] },
  ],
  destinations: [...program.destinations, { id: "cards", label: "Cards", icon: "open", entryJourney: ReadCards.id }],
  navigation: [...program.navigation, { destination: "cards", group: "Explore", purpose: "content" }],
} as const;

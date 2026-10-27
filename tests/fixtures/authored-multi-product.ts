import { Components, ViewTitles, agentExposure, composeProduct, controllerRole, defineView,
  factReference, fromInput, humanExposure, mutationJourney, ownershipPolicy, publishObject,
  readJourney, updateCommand, viewOutput, viewPorts } from "../../src/index.ts";
import { authoredNotebookSource, notePublication } from "./authored-notebook.ts";
import { Note, CreateNote, ReadNote, ArchiveNote } from "./notebook-domain.ts";
import { NoteView } from "./authored-view-program.ts";
import { Card, CreateCard as CardOperation } from "./multi-view-program.ts";
import { fixtureText } from "./messages.ts";

const controller = controllerRole({ id: "notes", objects: [Note, Card], requires: [] });
const requires = { controller, dependencies: [] };
const CreateCard = mutationJourney(CardOperation.id, CardOperation.command, requires);
const ReadCards = readJourney("read-cards", Card, { fields: ["title", "body"], collection: ["title"], requires });
const EditNote = mutationJourney("edit-note", updateCommand("edit-note-record", Note, {
  input: ["title", "body"], when: { state: "active" }, set: { title: fromInput("title"), body: fromInput("body") },
}), requires);

const detail = viewPorts({ inputs: { record: "context" }, outputs: ["close"] });
function detailView<const Name extends string>(name: Name) {
  return defineView({ name, outputs: detail.outputs,
    topDock: Components.Toolbar({ actions: [{ output: detail.output.close, label: fixtureText.close, icon: "close" }] }),
    content: [Components.Header({ title: ViewTitles.subject }), Components.Context({ input: detail.inputs.record })] });
}
const NoteDetail = detailView("detail"), CardDetail = detailView("card-detail");
const editor = viewPorts({ inputs: { draft: "form" }, outputs: ["save", "close"] });
function editorView<const Name extends string>(name: Name) {
  return defineView({ name, outputs: editor.outputs,
    topDock: Components.Toolbar({ actions: [{ output: editor.output.close, label: fixtureText.close, icon: "close" }] }),
    bottomDock: Components.Toolbar({ actions: [{ output: editor.output.save, label: fixtureText.save, icon: "save" }] }),
    content: [Components.Header({ title: ViewTitles.operation }), Components.Form({ input: editor.inputs.draft })] });
}
const CardEditor = editorView("card-editor"), NoteEditor = editorView("edit-note");
const list = viewPorts({ inputs: { records: "collection" }, outputs: ["create", "select"] });
const CardsView = defineView({ name: "cards", outputs: list.outputs,
  topDock: Components.Toolbar({ actions: [{ output: list.output.create, label: fixtureText.createCard, icon: "create" }] }),
  content: [Components.Header({ title: fixtureText.cards }), Components.Collection({ input: list.inputs.records, output: list.output.select })] });
const ReadCardsJourney = { id: ReadCards.id, kind: "read", view: CardsView, detailView: CardDetail, outputs: [
  { ...viewOutput(CardsView, "create"), action: { kind: "journey", journey: CreateCard } },
  { ...viewOutput(CardsView, "select"), action: { kind: "select" } },
  { ...viewOutput(CardDetail, "close"), action: { kind: "close" } },
] } as const;
const CreateCardJourney = { id: CreateCard.id, kind: "create", source: ReadCards, view: CardEditor, preferredDock: "right", outputs: [
  { ...viewOutput(CardEditor, "save"), action: { kind: "submit" } },
  { ...viewOutput(CardEditor, "close"), action: { kind: "close" } },
] } as const;
const EditNoteJourney = { id: EditNote.id, kind: "update", source: ReadNote, view: NoteEditor, preferredDock: "right",
  initialize: [{ input: "title", fact: "title" }, { input: "body", fact: "body" }], outputs: [
    { ...viewOutput(NoteEditor, "save"), action: { kind: "submit" } },
    { ...viewOutput(NoteEditor, "close"), action: { kind: "close" } },
  ] } as const;
const CardsDestination = { id: "cards", label: fixtureText.cards, icon: "open", entryJourney: ReadCards } as const;
const source = authoredNotebookSource();
const notes = source.journeys[2];
const readNotes = { ...notes, presentation: { ...notes.presentation, detailView: NoteDetail, outputs: [
  notes.presentation.outputs[0], notes.presentation.outputs[1],
  { ...viewOutput(NoteDetail, "close"), action: { kind: "close" } },
] } } as const;
const exposed = [CreateNote, ReadNote, ArchiveNote, CreateCard, ReadCards, EditNote] as const;

const product = {
  ...source,
  objects: [publishObject(Note, { ...notePublication, view: NoteDetail, actions: [{ journey: EditNote, icon: "edit" }] }),
    publishObject(Card, { view: CardDetail, title: factReference(Card, "title"), actions: [], fields: [
      { fact: factReference(Card, "title"), label: fixtureText.cardTitle, representation: "text" },
      { fact: factReference(Card, "body"), label: fixtureText.cardBody, representation: "text" },
    ] })],
  dependencies: [controller], policies: [...source.policies, ownershipPolicy(Card, "owner")],
  exposures: [humanExposure({ id: "human", journeys: exposed, locale: "en" }), agentExposure("agent", exposed)],
  views: [...source.views.filter(view => view !== NoteView), NoteDetail, CardsView, CardDetail, CardEditor, NoteEditor],
  journeys: [source.journeys[0], source.journeys[1], readNotes, source.journeys[3], source.journeys[4],
    { execution: CreateCard, presentation: CreateCardJourney, label: fixtureText.createCard, humanReview: "not-required" },
    { execution: ReadCards, presentation: ReadCardsJourney, label: fixtureText.readCards },
    { execution: EditNote, presentation: EditNoteJourney, label: fixtureText.editNote, humanReview: "not-required" }],
  destinations: [...source.destinations, CardsDestination],
  navigation: [...source.navigation, { destination: CardsDestination, group: fixtureText.explore, purpose: "content" }],
} as const;

export const AuthoredMultiProduct = composeProduct(product);

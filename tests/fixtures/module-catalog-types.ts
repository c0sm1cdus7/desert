import { defineModule, moduleIndex, composeProduct, humanExposure, agentExposure, viewOutput, ViewVersion, type View, type AuthoredViewJourney } from "../../src/index.ts";
import { WorkspaceView, NavigationView } from "./workspace-view.ts";
import { Note, OnlyOwnerCanAccess } from "../../products/notebook/note.ts";
import { NotesController } from "../../products/notebook/dependencies.ts";
import { CreateNote, ReadNote, ArchiveNote } from "../../products/notebook/journeys.ts";

const NotesView = { version: ViewVersion, id: "notes", outputs: ["create", "select"], content: [] } as const satisfies View;
const DetailView = { version: ViewVersion, id: "detail", outputs: ["close"], content: [] } as const satisfies View;
const EditorView = { version: ViewVersion, id: "editor", outputs: ["save"], content: [] } as const satisfies View;
const ReadJourney = { id: ReadNote.id, kind: "read", view: NotesView, detailView: DetailView, outputs: [
  { ...viewOutput(NotesView, "create"), action: { kind: "journey", journey: CreateNote } },
  { ...viewOutput(NotesView, "select"), action: { kind: "select" } },
  { ...viewOutput(DetailView, "close"), action: { kind: "close" } },
] } as const;
const CreateJourney = { id: CreateNote.id, kind: "create", source: ReadNote, view: EditorView, preferredDock: "right", outputs: [
  { ...viewOutput(EditorView, "save"), action: { kind: "submit" } },
] } as const;
const About = { id: "about", kind: "presentation", view: NotesView, outputs: [] } as const;
const NotesDestination = { id: "notes", label: "Notes", icon: "open", entryJourney: ReadNote } as const;
const source = { id: "notes", objects: [Note], dependencies: [NotesController], policies: [OnlyOwnerCanAccess],
  views: [NotesView, DetailView, EditorView], destinations: [NotesDestination], journeys: [
    { execution: CreateNote, presentation: CreateJourney, label: "Create note", humanReview: "not-required" },
    { execution: ReadNote, presentation: ReadJourney, label: "Notes" },
    { execution: ArchiveNote, label: "Archive note", humanReview: "required" }, { presentation: About },
  ], exports: { journeys: { createNote: CreateNote, readNotes: ReadNote, about: About }, views: { Notes: NotesView },
    destinations: { notes: NotesDestination }, dependencies: { NotesController } },
} as const;
const NotesModule = defineModule(source);
const Modules = moduleIndex([NotesModule]);
const Journeys = Modules.journeys;
const Views = Modules.views;
const Commands = Modules.commands;
const directReadSource = { ...CreateJourney, source: ReadNote } satisfies AuthoredViewJourney;
const presentedReadSource = { ...CreateJourney, source: ReadJourney } satisfies AuthoredViewJourney;
const publicReadSource = { ...CreateJourney, source: Journeys.readNotes } satisfies AuthoredViewJourney;
// @ts-expect-error Source cannot be omitted or inferred from the mounted reads.
const missingReadSource = { id: CreateNote.id, kind: "create", view: EditorView, preferredDock: "right", outputs: [] } satisfies AuthoredViewJourney;
// @ts-expect-error Serialized read ids are not authored references.
const readSourceId = { ...CreateJourney, source: ReadNote.id } satisfies AuthoredViewJourney;
// @ts-expect-error A mutation execution cannot substitute for a read source.
const mutationSource = { ...CreateJourney, source: CreateNote } satisfies AuthoredViewJourney;
// @ts-expect-error An issued mutation reference is still not a read source.
const publicMutationSource = { ...CreateJourney, source: Journeys.createNote } satisfies AuthoredViewJourney;
// @ts-expect-error A presentation-only journey is not an object read.
const presentationSource = { ...CreateJourney, source: About } satisfies AuthoredViewJourney;
// @ts-expect-error An issued presentation-only journey is not an object read.
const publicPresentationSource = { ...CreateJourney, source: Journeys.about } satisfies AuthoredViewJourney;
const createId: typeof CreateNote.id = Journeys.createNote.id;
const commandId: typeof CreateNote.command.id = Commands.createNote.id;
const notesId: "notes" = Views.Notes.id;
viewOutput(Views.Notes, "create");
const human = humanExposure({ id: "human", journeys: [Journeys.createNote, Journeys.readNotes], locale: "en" });
agentExposure("agent", [Journeys.createNote, Journeys.readNotes]);
// @ts-expect-error Catalog aliases are exhaustive, not arbitrary string keys.
Journeys.creatNote;
// @ts-expect-error Private views are absent from the public catalog.
Views.Editor;
// @ts-expect-error A read does not manufacture a mutation command.
Commands.readNotes;
// @ts-expect-error A presentation-only activity does not manufacture a command.
Commands.about;
// @ts-expect-error An issued module does not expose its private registration arrays.
NotesModule.journeys;
// @ts-expect-error Output vocabulary stays tied to the referenced View definition.
viewOutput(Views.Notes, "save");
// @ts-expect-error Presentation-only activities cannot enter execution exposure.
humanExposure({ id: "human", journeys: [Journeys.about], locale: "en" });
// @ts-expect-error Agent execution exposure has the same presentation-only boundary.
agentExposure("agent", [Journeys.about]);
// @ts-expect-error Command references are not executable journey references.
humanExposure({ id: "human", journeys: [Commands.createNote], locale: "en" });
// @ts-expect-error Views cannot substitute for journey exposure.
humanExposure({ id: "human", journeys: [Views.Notes], locale: "en" });
// @ts-expect-error Module exports must preserve definition kind and exact typed identity.
defineModule({ ...source, exports: { ...source.exports, views: { Notes: CreateNote } } });

const root = { id: "notebook", label: "Notebook", modules: Modules, exposures: [human],
  workspace: WorkspaceView, views: [WorkspaceView, NavigationView], entry: Modules.destinations.notes,
  navigation: [{ destination: Modules.destinations.notes, group: "Explore", purpose: "content" }],
} as const;
composeProduct(root);
// @ts-expect-error A mount array cannot substitute for the issued module catalog.
composeProduct({ ...root, modules: [NotesModule] });
// @ts-expect-error A journey reference is not a destination reference.
composeProduct({ ...root, entry: Journeys.readNotes });
// @ts-expect-error A command reference cannot navigate to a destination.
composeProduct({ ...root, entry: Commands.createNote });
// @ts-expect-error Stable serialized identities are not authored object references.
composeProduct({ ...root, entry: "notes" });
void [createId, commandId, notesId];

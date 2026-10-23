import * as SDK from "../../src/index.ts";
import { Note, OnlyOwnerCanAccess, NotesController, ArchiveNote, CreateNote, ReadNote } from "./notebook-domain.ts";
import { program } from "./view-program.ts";
import { notePublication } from "./authored-notebook.ts";
import { WorkspaceView, NavigationView } from "./workspace-view.ts";
import { HomeView, NotesView, NoteView as DetailView, NoteEditorView as EditorView } from "./authored-view-program.ts";
import { authorFixture } from "./author-fixture.ts";

export { HomeView, NotesView, DetailView, EditorView };
export const ReadJourney = {
  ...program.journeys[1], view: NotesView, detailView: DetailView,
  outputs: [
    { view: NotesView, output: "create", action: { kind: "journey", journey: CreateNote } },
    { view: NotesView, output: "select", action: { kind: "select" } },
    { view: DetailView, output: "close", action: { kind: "close" } },
  ],
} as const;
export const CreateJourney = {
  ...program.journeys[2], source: ReadNote, view: EditorView,
  outputs: [
    { view: EditorView, output: "save", action: { kind: "submit" } },
    { view: EditorView, output: "close", action: { kind: "close" } },
  ],
} as const;
export const NotesDestination = { ...program.destinations[1], entryJourney: ReadNote };

export function notesSource() {
  return authorFixture({
    id: "notes", objects: [SDK.publishObject(Note, notePublication)],
    dependencies: [NotesController], policies: [OnlyOwnerCanAccess],
    journeys: [
      { execution: CreateNote, presentation: CreateJourney, label: "Create note", humanReview: "not-required" },
      { execution: ReadNote, presentation: ReadJourney, label: "Read notes" },
      { execution: ArchiveNote, label: "Archive note", humanReview: "required" },
    ],
    views: [NotesView, DetailView, EditorView], destinations: [NotesDestination],
    exports: {
      journeys: { createNote: CreateNote, readNotes: ReadNote, archiveNote: ArchiveNote },
      views: { Notes: NotesView, Note: DetailView }, destinations: { notes: NotesDestination },
      dependencies: { NotesController },
    },
  } as const);
}

export const mountModules = SDK.moduleIndex;

export function catalogFixture() {
  const owned = notesSource();
  const module = SDK.defineModule(owned);
  const modules = mountModules([module]);
  const HomeJourney = {
    ...program.journeys[0], view: HomeView,
    outputs: [{ view: HomeView, output: "notes", action: { kind: "journey", journey: modules.journeys.readNotes } }],
  } as const;
  const HomeDestination = { ...program.destinations[0], entryJourney: HomeJourney };
  const source = {
    id: "notebook", label: "Notebook", modules,
    exposures: [
      SDK.humanExposure({ id: "human", journeys: [modules.journeys.createNote, modules.journeys.readNotes,
        modules.journeys.archiveNote], locale: "en" }),
      SDK.agentExposure("agent", [modules.journeys.createNote, modules.journeys.readNotes, modules.journeys.archiveNote]),
    ],
    workspace: WorkspaceView, views: [HomeView, WorkspaceView, NavigationView],
    journeys: [{ presentation: HomeJourney }], destinations: [HomeDestination],
    entry: HomeDestination,
    navigation: [
      { destination: HomeDestination, group: "Explore", purpose: "content" },
      { destination: modules.destinations.notes, group: "Explore", purpose: "content" },
    ],
  } as const;
  return { module, modules, source, HomeJourney, owned };
}

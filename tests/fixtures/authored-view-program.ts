import { viewOutput } from "../../src/index.ts";
import { CreateNote, ReadNote } from "./notebook-domain.ts";
import { program } from "./view-program.ts";
import { WorkspaceView, NavigationView } from "./workspace-view.ts";
import { authorFixture } from "./author-fixture.ts";
import { declaredFixture } from "./messages.ts";

export const [HomeView, NotesView, NoteView, NoteEditorView, CatalogView] = authorFixture([
  program.views[0], program.views[1], program.views[2], program.views[3], program.views[4],
] as const);
export const HomeJourney = { ...declaredFixture(program.journeys[0]), view: HomeView, outputs: [
  { ...viewOutput(HomeView, "notes"), action: { kind: "journey", journey: ReadNote } },
] } as const;
export const ReadNotesJourney = { ...declaredFixture(program.journeys[1]), view: NotesView, detailView: NoteView, outputs: [
  { ...viewOutput(NotesView, "create"), action: { kind: "journey", journey: CreateNote } },
  { ...viewOutput(NotesView, "select"), action: { kind: "select" } },
  { ...viewOutput(NoteView, "close"), action: { kind: "close" } },
] } as const;
export const CreateNoteJourney = { ...declaredFixture(program.journeys[2]), source: ReadNote, view: NoteEditorView, outputs: [
  { ...viewOutput(NoteEditorView, "save"), action: { kind: "submit" } },
  { ...viewOutput(NoteEditorView, "close"), action: { kind: "close" } },
] } as const;
export const CatalogJourney = { ...declaredFixture(program.journeys[3]), view: CatalogView } as const;
export const HomeDestination = { ...declaredFixture(program.destinations[0]), entryJourney: HomeJourney } as const;
export const NotesDestination = { ...declaredFixture(program.destinations[1]), entryJourney: ReadNote } as const;
export const CatalogDestination = { ...declaredFixture(program.destinations[2]), entryJourney: CatalogJourney } as const;
export const authoredProgram = {
  workspace: WorkspaceView,
  views: [HomeView, NotesView, NoteView, NoteEditorView, CatalogView, NavigationView, WorkspaceView],
  journeys: [HomeJourney, ReadNotesJourney, CreateNoteJourney, CatalogJourney],
  destinations: [HomeDestination, NotesDestination, CatalogDestination],
  entry: HomeDestination,
  navigation: program.navigation.map((item, index) => ({ ...declaredFixture(item),
    destination: [HomeDestination, NotesDestination, CatalogDestination][index]!,
  })),
} as const;

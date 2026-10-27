import { humanExposure, agentExposure, moduleIndex, publishObject, factReference } from "../../src/index.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { Note, OnlyOwnerCanAccess, NotesController, ArchiveNote, CreateNote, ReadNote } from "./notebook-domain.ts";
import { authoredProgram, NoteView } from "./authored-view-program.ts";
import { fixtureText, FixtureMessages } from "./messages.ts";

export const notePublication = {
  view: NoteView, title: factReference(Note, "title"), actions: [],
  fields: [
    { fact: factReference(Note, "title"), label: fixtureText.title, representation: "text" },
    { fact: factReference(Note, "body"), label: fixtureText.content, representation: "paragraphs" },
    { fact: factReference(Note, "state"), label: fixtureText.status, representation: "text" },
  ],
} as const;

export function publishedNotebookNote() { return publishObject(Note, notePublication); }

export function authoredNotebookSurfaces() {
  const journeys = [CreateNote, ReadNote, ArchiveNote];
  return [humanExposure({ id: "human", journeys, locale: "en" }), agentExposure("agent", journeys)];
}

export function authoredNotebookSource() {
  return { messages: FixtureMessages,
    id: Notebook.id, label: fixtureText.notebook, modules: moduleIndex([]),
    objects: [publishedNotebookNote()], dependencies: [NotesController], policies: [OnlyOwnerCanAccess],
    exposures: authoredNotebookSurfaces(), views: authoredProgram.views, destinations: authoredProgram.destinations,
    workspace: authoredProgram.workspace, entry: authoredProgram.entry, navigation: authoredProgram.navigation,
    journeys: [
      { presentation: authoredProgram.journeys[0] },
      { execution: CreateNote, label: fixtureText.createNote, humanReview: "not-required", presentation: authoredProgram.journeys[2] },
      { execution: ReadNote, label: fixtureText.readNotes, presentation: authoredProgram.journeys[1] },
      { presentation: authoredProgram.journeys[3] },
      { execution: ArchiveNote, label: fixtureText.archiveNote, humanReview: "required" },
    ],
  } as const;
}

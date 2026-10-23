import { humanExposure, agentExposure, moduleIndex, publishObject, factReference } from "../../src/index.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { Note, OnlyOwnerCanAccess, NotesController, ArchiveNote, CreateNote, ReadNote } from "./notebook-domain.ts";
import { authoredProgram, NoteView } from "./authored-view-program.ts";

export const notePublication = {
  view: NoteView, title: factReference(Note, "title"), actions: [],
  fields: [
    { fact: factReference(Note, "title"), label: "Title", representation: "text" },
    { fact: factReference(Note, "body"), label: "Content", representation: "paragraphs" },
    { fact: factReference(Note, "state"), label: "Status", representation: "text" },
  ],
} as const;

export function publishedNotebookNote() { return publishObject(Note, notePublication); }

export function authoredNotebookSurfaces() {
  const journeys = [CreateNote, ReadNote, ArchiveNote];
  return [humanExposure({ id: "human", journeys, locale: "en" }), agentExposure("agent", journeys)];
}

export function authoredNotebookSource() {
  return {
    id: Notebook.id, label: "Notebook", modules: moduleIndex([]),
    objects: [publishedNotebookNote()], dependencies: [NotesController], policies: [OnlyOwnerCanAccess],
    exposures: authoredNotebookSurfaces(), views: authoredProgram.views, destinations: authoredProgram.destinations,
    workspace: authoredProgram.workspace, entry: authoredProgram.entry, navigation: authoredProgram.navigation,
    journeys: [
      { presentation: authoredProgram.journeys[0] },
      { execution: CreateNote, label: "Create note", humanReview: "not-required", presentation: authoredProgram.journeys[2] },
      { execution: ReadNote, label: "Read notes", presentation: authoredProgram.journeys[1] },
      { presentation: authoredProgram.journeys[3] },
      { execution: ArchiveNote, label: "Archive note", humanReview: "required" },
    ],
  } as const;
}

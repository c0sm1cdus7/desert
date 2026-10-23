import { viewOutput, type ViewJourney } from "desert-sdk/src/index.ts";
import { NoteView } from "../views/note.view.ts";
import { NotesView } from "../views/notes.view.ts";
import { CreateNote } from "./createNote.journey.ts";
import { ReadNote } from "./readNotes.journey.ts";

export const ReadNotesExperience = {
  id: ReadNote.id, kind: "read", view: NotesView, detailView: NoteView,
  outputs: [
    { ...viewOutput(NotesView, "create"), action: { kind: "journey", journey: CreateNote } },
    { ...viewOutput(NotesView, "select"), action: { kind: "select" } },
    { ...viewOutput(NoteView, "close"), action: { kind: "close" } },
  ],
} satisfies ViewJourney;

import { factReference, publishObject } from "desert-sdk/src/index.ts";
import { Note } from "./note.object.ts";
import { NoteView } from "./views/note.view.ts";
import { ArchiveNote } from "./journeys/archiveNote.journey.ts";

export const PublishedNote = publishObject(Note, {
  view: NoteView, title: factReference(Note, "title"),
  fields: [
    { fact: factReference(Note, "title"), label: "Title", representation: "text" },
    { fact: factReference(Note, "body"), label: "Content", representation: "paragraphs" },
    { fact: factReference(Note, "state"), label: "Status", representation: "text" },
  ],
  actions: [{ journey: ArchiveNote, icon: "archive" }],
});

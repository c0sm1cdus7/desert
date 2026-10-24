import { factReference, publishObject } from "desert-sdk/src/index.ts";
import { Note } from "./note.object.ts";
import { NoteView } from "./views/note.view.ts";
import { m } from "../../messages/keys.ts";
import { ArchiveNote } from "./journeys/archiveNote.journey.ts";

export const PublishedNote = publishObject(Note, {
  view: NoteView, title: factReference(Note, "title"),
  fields: [
    { fact: factReference(Note, "title"), label: m.notes.titleField, representation: "text" },
    { fact: factReference(Note, "body"), label: m.notes.contentField, representation: "paragraphs" },
    { fact: factReference(Note, "state"), label: m.notes.statusField, representation: "text" },
  ],
  actions: [{ journey: ArchiveNote, icon: "archive" }],
});

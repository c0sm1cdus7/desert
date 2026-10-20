import { mutationJourney, readJourney } from "../../src/index.ts";
import { ArchiveNoteRecord, CreateNoteRecord } from "./commands.ts";
import { Note } from "./note.ts";
import { NotesController } from "./dependencies.ts";

export const CreateNote = mutationJourney("create-note", CreateNoteRecord, {
  controller: NotesController, dependencies: [],
});
export const ReadNote = readJourney("read-note", Note, {
  fields: ["title", "body", "state"],
  collection: ["title", "state"],
  requires: { controller: NotesController, dependencies: [] },
});
export const ArchiveNote = mutationJourney("archive-note", ArchiveNoteRecord, {
  controller: NotesController, dependencies: [],
});

import { readJourney } from "desert-sdk/src/index.ts";
import { Note } from "../note.object.ts";
import { NotesController } from "../notes.dependencies.ts";

export const ReadNote = readJourney("read-note", Note, {
  fields: ["title", "body", "state"], collection: ["title", "state"],
  requires: { controller: NotesController, dependencies: [] },
});

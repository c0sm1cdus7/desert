import { actorId, createCommand, fromInput, literal } from "desert-sdk/src/index.ts";
import { Note } from "../note.object.ts";

export const CreateNoteRecord = createCommand("create-note-record", Note, {
  input: ["title", "body"],
  values: { title: fromInput("title"), body: fromInput("body"), owner: actorId(), state: literal("active") },
});

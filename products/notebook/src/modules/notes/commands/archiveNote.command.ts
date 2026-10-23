import { literal, updateCommand } from "desert-sdk/src/index.ts";
import { Note } from "../note.object.ts";

export const ArchiveNoteRecord = updateCommand("archive-note-record", Note, {
  input: [], when: { state: "active" }, set: { state: literal("archived") },
});

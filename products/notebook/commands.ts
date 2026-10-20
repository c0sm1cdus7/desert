import { actorId, createCommand, fromInput, literal, updateCommand } from "../../src/index.ts";
import { Note } from "./note.ts";

export const CreateNoteRecord = createCommand("create-note-record", Note, {
  input: ["title", "body"],
  values: {
    title: fromInput("title"),
    body: fromInput("body"),
    owner: actorId(),
    state: literal("active"),
  },
});

export const ArchiveNoteRecord = updateCommand("archive-note-record", Note, {
  input: [],
  when: { state: "active" },
  set: { state: literal("archived") },
});

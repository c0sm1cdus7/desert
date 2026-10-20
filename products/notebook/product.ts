import { product } from "../../src/index.ts";
import { Note, OnlyOwnerCanAccess } from "./note.ts";
import { ArchiveNote, CreateNote, ReadNote } from "./journeys.ts";
import { AgentNotebook, HumanNotebook } from "./surfaces.ts";
import { NotesController } from "./dependencies.ts";

export const Notebook = product({
  id: "notebook",
  objects: [Note],
  dependencies: [NotesController],
  policies: [OnlyOwnerCanAccess],
  journeys: [CreateNote, ReadNote, ArchiveNote],
  surfaces: [HumanNotebook, AgentNotebook],
});

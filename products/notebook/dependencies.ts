import { controllerRole } from "../../src/dependencies.ts";
import { Note } from "./note.ts";

export const NotesController = controllerRole({
  id: "notes", objects: [Note], requires: [],
});

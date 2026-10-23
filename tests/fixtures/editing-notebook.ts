import { fromInput, mutationJourney, updateCommand } from "../../src/index.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { Note } from "../../products/notebook/note.ts";
import { NotesController } from "../../products/notebook/dependencies.ts";

export const EditNote = mutationJourney("edit-note", updateCommand("edit-note-record", Note, {
  input: ["title", "body"], when: { state: "active" },
  set: { title: fromInput("title"), body: fromInput("body") },
}), { controller: NotesController, dependencies: [] });

export const EditingNotebook = {
  ...Notebook,
  journeys: [...Notebook.journeys, EditNote],
  surfaces: Notebook.surfaces.map(surface => surface.kind === "human" ? {
    ...surface, journeys: [...surface.journeys, EditNote.id],
    commit: { ...surface.commit, [EditNote.id]: "submit" as const },
    language: { ...surface.language, journeys: { ...surface.language.journeys, [EditNote.id]: "Edit note" } },
  } : { ...surface, journeys: [...surface.journeys, EditNote.id] }),
};

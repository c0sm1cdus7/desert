import { mutationJourney, viewOutput, type ViewJourney } from "desert-sdk/src/index.ts";
import { CreateNoteRecord } from "../commands/createNote.command.ts";
import { NotesController } from "../notes.dependencies.ts";
import { CreateNoteView } from "../views/createNote.view.ts";
import { ReadNote } from "./readNotes.journey.ts";

export const CreateNote = mutationJourney("create-note", CreateNoteRecord, { controller: NotesController, dependencies: [] });
export const CreateNoteExperience = {
  id: CreateNote.id, kind: "create", source: ReadNote, view: CreateNoteView, preferredDock: "right",
  outputs: [
    { ...viewOutput(CreateNoteView, "save"), action: { kind: "submit" } },
    { ...viewOutput(CreateNoteView, "close"), action: { kind: "close" } },
  ],
} satisfies ViewJourney;

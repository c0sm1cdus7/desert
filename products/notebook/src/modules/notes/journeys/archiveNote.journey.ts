import { mutationJourney, type ViewJourney } from "desert-sdk/src/index.ts";
import { ArchiveNoteRecord } from "../commands/archiveNote.command.ts";
import { NotesController } from "../notes.dependencies.ts";
import { ReadNote } from "./readNotes.journey.ts";

export const ArchiveNote = mutationJourney("archive-note", ArchiveNoteRecord, { controller: NotesController, dependencies: [] });
export const ArchiveNoteExperience = { id: ArchiveNote.id, kind: "action", source: ReadNote, outputs: [] } satisfies ViewJourney;

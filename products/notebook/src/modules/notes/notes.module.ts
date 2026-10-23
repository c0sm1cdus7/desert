import { defineModule } from "desert-sdk/src/index.ts";
import { OnlyOwnerCanAccess } from "./note.object.ts";
import { PublishedNote } from "./note.publication.ts";
import { NotesController } from "./notes.dependencies.ts";
import { CreateNote, CreateNoteJourney } from "./journeys/createNote.journey.ts";
import { ReadNote } from "./journeys/readNotes.journey.ts";
import { ReadNotesJourney } from "./journeys/browseNotes.journey.ts";
import { ArchiveNote, ArchiveNoteJourney } from "./journeys/archiveNote.journey.ts";
import { NotesView } from "./views/notes.view.ts";
import { NoteView } from "./views/note.view.ts";
import { CreateNoteView } from "./views/createNote.view.ts";

const NotesDestination = { id: "notes", label: "Notes", icon: "open", entryJourney: ReadNote } as const;

export const NotesModule = defineModule({
  id: "notes", objects: [PublishedNote], dependencies: [NotesController], policies: [OnlyOwnerCanAccess],
  journeys: [
    { execution: CreateNote, presentation: CreateNoteJourney, label: "Create note", humanReview: "not-required" },
    { execution: ReadNote, presentation: ReadNotesJourney, label: "Read notes" },
    { execution: ArchiveNote, presentation: ArchiveNoteJourney, label: "Archive note", humanReview: "required" },
  ],
  views: [NotesView, NoteView, CreateNoteView], destinations: [NotesDestination],
  exports: {
    dependencies: { notes: NotesController },
    journeys: { createNote: CreateNote, readNotes: ReadNote, archiveNote: ArchiveNote },
    views: { Notes: NotesView, Note: NoteView, CreateNote: CreateNoteView }, destinations: { Notes: NotesDestination },
  },
});

import { program, surface } from "./view-program.ts";
import { ArchiveNote, ReadNote } from "../../products/notebook/journeys.ts";
import type { ViewProgram } from "../../src/views/program-schema.ts";

export const actionProgram = {
  ...program,
  objects: [{ object: "note", view: "detail", title: { object: "note", field: "title" },
    actions: [{ journey: ArchiveNote.id, icon: "archive" }] }],
  journeys: [...program.journeys, { id: ArchiveNote.id, kind: "action", source: ReadNote.id, outputs: [] }],
} as const satisfies ViewProgram;
export { surface, ArchiveNote, ReadNote };

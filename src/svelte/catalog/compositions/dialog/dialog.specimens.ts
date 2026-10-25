// The witness of Dialog: a confirmation asking to move a note to Trash, with its status face, Cancel and the destructive
// answer. (A composition has one state; the locked and problem cases are exercised by tests/dialog-composition.test.ts.)
import type { CatalogSpecimen } from "../../types.d.ts";

export const DialogSpecimens = [
  { state: "default", props: { open: true, locked: false, tone: "destructive", face: { kind: "icon", icon: "archive" },
    title: "Move note to Trash?", subtitle: "You can restore the note from Trash.",
    secondary: { label: "Cancel", icon: "back", state: "ready", intent: { kind: "back" } },
    primary: { label: "Move to Trash", icon: "archive", state: "ready", intent: { kind: "accept" } } } },
] as const satisfies readonly CatalogSpecimen<"dialog">[];

// One witness of ConfirmationDialog: an open request to move a note to Trash, with Cancel and the confirming action.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ConfirmationDialogSpecimens = [
  { state: "default", props: { open: true, locked: false, invoke: () => {},
    frame: { version: "desert.surface-frame/6", kind: "confirmation", top: { title: "Move note to Trash?" },
      content: { kind: "message", text: "You can restore the note from Trash." },
      bottom: { secondary: { label: "Cancel", icon: "back", state: "ready", intent: { kind: "back" } },
        primary: { label: "Move to Trash", icon: "archive", state: "ready", intent: { kind: "accept" } } } } } },
] as const satisfies readonly CatalogSpecimen<"confirmation-dialog">[];

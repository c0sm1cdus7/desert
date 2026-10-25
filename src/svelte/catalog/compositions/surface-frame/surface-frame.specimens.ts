// One witness of SurfaceFrame: a confirmation presented as a message, with its cancel and confirm choices.
import type { CatalogSpecimen } from "../../types.d.ts";

export const SurfaceFrameSpecimens = [
  { state: "default", props: { presentation: "message", invoke: () => {}, frame: {
    version: "desert.surface-frame/6", kind: "confirmation", top: { title: "Move note to Trash?", face: { kind: "icon", icon: "archive" } },
    content: { kind: "message", text: "You can restore the note from Trash." },
    bottom: {
      secondary: { label: "Cancel", icon: "back", state: "ready", intent: { kind: "back" } },
      primary: { label: "Move to Trash", icon: "archive", state: "ready", intent: { kind: "accept" } },
    },
  } } },
] as const satisfies readonly CatalogSpecimen<"surface-frame">[];

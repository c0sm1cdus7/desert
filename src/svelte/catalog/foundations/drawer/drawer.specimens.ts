// One witness of Drawer per state: an open task the person can dismiss, and the same task locked while it commits.
import type { CatalogSpecimen } from "../../types.d.ts";

export const DrawerSpecimens = [
  { state: "open", props: { label: "Context", open: true, onclose: () => {}, invoke: () => {},
    frame: { version: "desert.surface-frame/6", kind: "specimen", top: { title: "Context" },
      content: { kind: "information", items: [{ kind: "text", text: "Keep the source context visible." }] }, bottom: {} } } },
  { state: "locked", props: { label: "Context", open: true, locked: true, onclose: () => {}, invoke: () => {},
    frame: { version: "desert.surface-frame/6", kind: "specimen", top: { title: "Context" },
      content: { kind: "information", items: [{ kind: "text", text: "Saving the note." }] }, bottom: {} } } },
] as const satisfies readonly CatalogSpecimen<"drawer">[];

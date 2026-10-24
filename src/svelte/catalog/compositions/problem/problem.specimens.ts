// One witness of Problem: an open, dismissible error message.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ProblemSpecimens = [
  { state: "default", props: { open: true, title: "Changes were not saved", severity: "error",
    description: "The connection closed before the note was stored. Try again when you are back online.", close: () => {} } },
] as const satisfies readonly CatalogSpecimen<"problem">[];

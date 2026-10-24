// One witness per measure of GroupedPanel, in its only state.
import type { CatalogSpecimen } from "../../types.d.ts";

export const GroupedPanelSpecimens = [
  { state: "default", variants: { measure: "reading" }, props: { measure: "reading" } },
  { state: "default", variants: { measure: "overview" }, props: { measure: "overview" } },
] as const satisfies readonly CatalogSpecimen<"grouped-panel">[];

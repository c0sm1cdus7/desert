// One witness per state of LabelRail: shown only, removable, and removable but disabled.
import type { CatalogSpecimen } from "../../types.d.ts";

export const LabelRailSpecimens = [
  { state: "read-only", props: { values: ["Design", "Research"] } },
  { state: "removable", props: { values: ["Design", "Research"], onremove: (index: number) => void index } },
  { state: "disabled", props: { values: ["Design", "Research"], disabled: true, onremove: (index: number) => void index } },
] as const satisfies readonly CatalogSpecimen<"label-rail">[];

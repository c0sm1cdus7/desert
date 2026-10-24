// One witness of ReferenceValues per state: known references (with and without a color) and a reference no longer known.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ReferenceValuesSpecimens = [
  { state: "default", props: { values: ["work", "home"],
    options: [{ value: "work", label: "Work", color: "blue" }, { value: "home", label: "Home" }] } },
  { state: "unavailable", props: { values: ["work", "archived"],
    options: [{ value: "work", label: "Work", color: "blue" }, { value: "home", label: "Home" }] } },
] as const satisfies readonly CatalogSpecimen<"reference-values">[];

// One witness per state: an empty labelled form laid out as a gapped grid, and one that fills its surface's height.
import type { CatalogSpecimen } from "../../types.d.ts";

export const FormSpecimens = [
  { state: "default", props: { label: "Unlock", submit: () => {}, fill: false } },
  { state: "filling", props: { label: "New note", submit: () => {}, fill: true } },
] as const satisfies readonly CatalogSpecimen<"form">[];

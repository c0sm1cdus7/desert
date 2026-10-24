// The one witness of ChoiceList: it has no props of its own; its rows arrive through `children`.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ChoiceListSpecimens = [
  { state: "default", props: {} },
] as const satisfies readonly CatalogSpecimen<"choice-list">[];

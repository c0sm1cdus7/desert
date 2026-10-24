// One witness per state of SearchField: waiting for a query, holding one, and unavailable.
import type { CatalogSpecimen } from "../../types.d.ts";

export const SearchFieldSpecimens = [
  { state: "empty", props: { value: "", placeholder: "Search in Notes", "aria-label": "Search in Notes" } },
  { state: "value", props: { value: "weekly plan", placeholder: "Search in Notes", "aria-label": "Search in Notes" } },
  { state: "disabled", props: { value: "", placeholder: "Search in Notes", "aria-label": "Search in Notes", disabled: true } },
] as const satisfies readonly CatalogSpecimen<"search-field">[];

// One witness per state of FactValue: a known value, a blank one and an absent one.
import type { CatalogSpecimen } from "../../types.d.ts";

export const FactValueSpecimens = [
  { state: "known", props: { value: "Buenos Aires" } },
  { state: "empty", props: { value: "" } },
  { state: "unknown", props: { value: null } },
] as const satisfies readonly CatalogSpecimen<"fact-value">[];

// One witness: a total, its segmented bar and the legend.
import type { CatalogSpecimen } from "../../types.d.ts";

export const MeterSpecimens = [
  { state: "default", props: { total: 12, totalLabel: "notes", label: "Notes by state", segments: [{ count: 7, label: "Draft" }, { count: 5, label: "Published" }] } },
] as const satisfies readonly CatalogSpecimen<"meter">[];

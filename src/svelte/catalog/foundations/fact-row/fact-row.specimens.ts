// One witness per state of FactRow: a scalar value, an unknown one, label tags, no labels, and named references.
import type { CatalogSpecimen } from "../../types.d.ts";

export const FactRowSpecimens = [
  { state: "value", props: { label: "city", value: "Buenos Aires" } },
  { state: "unknown", props: { label: "phone", value: null } },
  { state: "labels", props: { label: "tags", value: ["Design", "Research"] } },
  { state: "no-labels", props: { label: "tags", value: [] } },
  { state: "references", props: { label: "projects", value: ["10000000-0000-4000-8000-000000000001"],
    references: [{ value: "10000000-0000-4000-8000-000000000001", label: "Personal", color: "blue" }] } },
] as const satisfies readonly CatalogSpecimen<"fact-row">[];

// One witness per state of FactRow: a scalar value, an unknown one, label tags, no labels, named references, and a control
// row (its control comes from the slot; the specimen shows the row it sits in).
import type { CatalogSpecimen } from "../../types.d.ts";

export const FactRowSpecimens = [
  { state: "value", variants: { kind: "value" }, props: { kind: "value", label: "city", value: "Buenos Aires" } },
  { state: "unknown", variants: { kind: "value" }, props: { kind: "value", label: "phone", value: null } },
  { state: "labels", variants: { kind: "value" }, props: { kind: "value", label: "tags", value: ["Design", "Research"] } },
  { state: "no-labels", variants: { kind: "value" }, props: { kind: "value", label: "tags", value: [] } },
  { state: "references", variants: { kind: "value" }, props: { kind: "value", label: "projects", value: ["10000000-0000-4000-8000-000000000001"],
    references: [{ value: "10000000-0000-4000-8000-000000000001", label: "Personal", color: "blue" }] } },
  { state: "control", variants: { kind: "control" }, props: { kind: "control", label: "status" } },
] as const satisfies readonly CatalogSpecimen<"fact-row">[];

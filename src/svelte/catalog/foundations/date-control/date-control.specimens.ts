// One witness of DateControl per state: no date yet, a chosen date, a required date, and a disabled date.
import type { CatalogSpecimen } from "../../types.d.ts";

export const DateControlSpecimens = [
  { state: "empty", props: { node: { version: "desert.control/1", kind: "date", id: "date-control-specimen-empty",
    label: "Arrival", disabled: false, required: false, value: null } } },
  { state: "value", props: { node: { version: "desert.control/1", kind: "date", id: "date-control-specimen-value",
    label: "Arrival", disabled: false, required: false, value: "2026-10-16", minimum: "2026-10-01", maximum: "2026-12-31" } } },
  { state: "required", props: { node: { version: "desert.control/1", kind: "date", id: "date-control-specimen-required",
    label: "Due date", disabled: false, required: true, value: "2026-11-02" } } },
  { state: "disabled", props: { node: { version: "desert.control/1", kind: "date", id: "date-control-specimen-disabled",
    label: "Arrival", disabled: true, required: false, value: "2026-10-16" } } },
] as const satisfies readonly CatalogSpecimen<"date-control">[];

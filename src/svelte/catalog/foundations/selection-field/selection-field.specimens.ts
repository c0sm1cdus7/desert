// One witness per state of SelectionField: inline, as a field well, as a contextual value, and unavailable.
import type { CatalogSpecimen } from "../../types.d.ts";

export const SelectionFieldSpecimens = [
  { state: "inline", props: { selection: "specimen-text-size", label: "Text size", value: "standard", onchange: () => {},
    options: [{ value: "standard", label: "Standard", disabled: false }, { value: "large", label: "Large", disabled: false }] } },
  { state: "field-control", props: { selection: "specimen-text-size", label: "Text size", value: "large", fieldControl: true,
    onchange: () => {}, options: [{ value: "standard", label: "Standard", disabled: false }, { value: "large", label: "Large", disabled: false }] } },
  { state: "contextual", props: { selection: "specimen-status", label: "Status", value: "open", contextual: true, onchange: () => {},
    options: [{ value: "open", label: "Open", disabled: false }, { value: "done", label: "Done", disabled: false }] } },
  { state: "disabled", props: { selection: "specimen-text-size", label: "Text size", value: "standard", disabled: true, fieldControl: true,
    onchange: () => {}, options: [{ value: "standard", label: "Standard", disabled: false }, { value: "large", label: "Large", disabled: false }] } },
] as const satisfies readonly CatalogSpecimen<"selection-field">[];

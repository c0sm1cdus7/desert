// One witness of ClearInput per state: nothing to clear, a value to clear, and a value that cannot be cleared.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ClearInputSpecimens = [
  { state: "empty", props: { control: "clear-input-specimen-empty", value: "", label: "Clear title" } },
  { state: "value", props: { control: "clear-input-specimen-value", value: "Weekly plan", label: "Clear title" } },
  { state: "disabled", props: { control: "clear-input-specimen-disabled", value: "Weekly plan", label: "Clear title", disabled: true } },
] as const satisfies readonly CatalogSpecimen<"clear-input">[];

// One witness per state of FieldWellContent: the label of an editor, and the label inside a button.
import type { CatalogSpecimen } from "../../types.d.ts";

export const FieldWellContentSpecimens = [
  { state: "for-editor", props: { id: "field-well-content-specimen", label: "Display name", required: true } },
  { state: "in-button", props: { label: "Country" } },
] as const satisfies readonly CatalogSpecimen<"field-well-content">[];

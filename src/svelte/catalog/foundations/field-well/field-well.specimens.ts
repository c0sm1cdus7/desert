// One witness per state × presentation of FieldWell: an empty and a filled well, standard and on the access screen.
import type { CatalogSpecimen } from "../../types.d.ts";

export const FieldWellSpecimens = [
  { state: "empty", variants: { presentation: "standard" },
    props: { id: "field-well-specimen-empty", label: "Display name", filled: false, presentation: "standard" } },
  { state: "filled", variants: { presentation: "standard" },
    props: { id: "field-well-specimen-filled", label: "Display name", filled: true, required: true, presentation: "standard" } },
  { state: "empty", variants: { presentation: "access" },
    props: { id: "field-well-specimen-access-empty", label: "Password", filled: false, presentation: "access" } },
  { state: "filled", variants: { presentation: "access" },
    props: { id: "field-well-specimen-access-filled", label: "Password", filled: true, presentation: "access" } },
] as const satisfies readonly CatalogSpecimen<"field-well">[];

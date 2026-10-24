// One witness: an empty labelled form.
import type { CatalogSpecimen } from "../../types.d.ts";

export const FormSpecimens = [
  { state: "default", props: { label: "Unlock", submit: () => {} } },
] as const satisfies readonly CatalogSpecimen<"form">[];

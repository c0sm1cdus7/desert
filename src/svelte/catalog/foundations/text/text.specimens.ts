// One witness per inset of the body role.
import type { CatalogSpecimen } from "../../types.d.ts";

export const TextSpecimens = [
  { state: "default", variants: { inset: "none", kind: "body" }, props: { text: "A paragraph of reading text.", kind: "body", inset: "none" } },
  { state: "default", variants: { inset: "row", kind: "body" }, props: { text: "A paragraph aligned with rows.", kind: "body", inset: "row" } },
] as const satisfies readonly CatalogSpecimen<"text">[];

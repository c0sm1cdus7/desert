// One witness per kind × measure of List, in its only state; its rows come from row's and fact-row's own specimens.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ListSpecimens = [
  { state: "default", variants: { kind: "rows", measure: "reading" }, props: { kind: "rows", measure: "reading", label: "Destinations" } },
  { state: "default", variants: { kind: "rows", measure: "overview" }, props: { kind: "rows", measure: "overview" } },
  { state: "default", variants: { kind: "facts", measure: "reading" }, props: { kind: "facts", measure: "reading" } },
  { state: "default", variants: { kind: "facts", measure: "overview" }, props: { kind: "facts", measure: "overview", label: "Properties" } },
] as const satisfies readonly CatalogSpecimen<"list">[];

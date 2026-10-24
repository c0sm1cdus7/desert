// One witness per gap step.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ColumnSpecimens = [
  { state: "default", variants: { gap: "snug" }, props: { gap: "snug" } },
  { state: "default", variants: { gap: "close" }, props: { gap: "close" } },
  { state: "default", variants: { gap: "regular" }, props: { gap: "regular", measure: "reading" } },
  { state: "default", variants: { gap: "relaxed" }, props: { gap: "relaxed" } },
  { state: "default", variants: { gap: "section" }, props: { gap: "section", measure: "narrow", align: "center" } },
] as const satisfies readonly CatalogSpecimen<"column">[];

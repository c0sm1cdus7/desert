// One witness per overflow × justification; a scroll rail is labelled.
import type { CatalogSpecimen } from "../../types.d.ts";

export const InlineSpecimens = [
  { state: "default", variants: { overflow: "wrap", justify: "start" }, props: { gap: "close", overflow: "wrap", justify: "start", align: "center" } },
  { state: "default", variants: { overflow: "wrap", justify: "center" }, props: { gap: "close", overflow: "wrap", justify: "center", align: "center" } },
  { state: "default", variants: { overflow: "wrap", justify: "end" }, props: { gap: "close", overflow: "wrap", justify: "end", align: "center" } },
  { state: "default", variants: { overflow: "wrap", justify: "between" }, props: { gap: "close", overflow: "wrap", justify: "between", align: "center" } },
  { state: "default", variants: { overflow: "scroll", justify: "start" }, props: { gap: "close", overflow: "scroll", justify: "start", align: "center", label: "Albums" } },
  { state: "default", variants: { overflow: "scroll", justify: "center" }, props: { gap: "close", overflow: "scroll", justify: "center", align: "center", label: "Albums" } },
  { state: "default", variants: { overflow: "scroll", justify: "end" }, props: { gap: "close", overflow: "scroll", justify: "end", align: "center", label: "Albums" } },
  { state: "default", variants: { overflow: "scroll", justify: "between" }, props: { gap: "close", overflow: "scroll", justify: "between", align: "center", label: "Albums" } },
  { state: "default", variants: { overflow: "none", justify: "start" }, props: { gap: "close", overflow: "none", justify: "start", align: "center" } },
  { state: "default", variants: { overflow: "none", justify: "center" }, props: { gap: "close", overflow: "none", justify: "center", align: "center" } },
  { state: "default", variants: { overflow: "none", justify: "end" }, props: { gap: "close", overflow: "none", justify: "end", align: "center" } },
  { state: "default", variants: { overflow: "none", justify: "between" }, props: { gap: "close", overflow: "none", justify: "between", align: "center" } },
] as const satisfies readonly CatalogSpecimen<"inline">[];

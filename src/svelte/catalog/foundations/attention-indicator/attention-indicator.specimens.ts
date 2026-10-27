// One witness of AttentionIndicator per state and placement: the dot shown, and nothing drawn when attention is clear.
import type { CatalogSpecimen } from "../../types.d.ts";

export const AttentionIndicatorSpecimens = [
  { state: "required", variants: { placement: "inline" }, props: { required: true, placement: "inline" } },
  { state: "required", variants: { placement: "overlay" }, props: { required: true, placement: "overlay" } },
  { state: "clear", variants: { placement: "inline" }, props: { required: false, placement: "inline" } },
  { state: "clear", variants: { placement: "overlay" }, props: { required: false, placement: "overlay" } },
] as const satisfies readonly CatalogSpecimen<"attention-indicator">[];

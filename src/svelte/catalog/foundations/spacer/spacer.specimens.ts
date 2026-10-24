// One witness per size: each spacing step, and the fill that takes the remaining space.
import type { CatalogSpecimen } from "../../types.d.ts";

export const SpacerSpecimens = [
  { state: "default", variants: { size: "snug" }, props: { size: "snug" } },
  { state: "default", variants: { size: "close" }, props: { size: "close" } },
  { state: "default", variants: { size: "regular" }, props: { size: "regular" } },
  { state: "default", variants: { size: "relaxed" }, props: { size: "relaxed" } },
  { state: "default", variants: { size: "section" }, props: { size: "section" } },
  { state: "default", variants: { size: "fill" }, props: { size: "fill" } },
] as const satisfies readonly CatalogSpecimen<"spacer">[];

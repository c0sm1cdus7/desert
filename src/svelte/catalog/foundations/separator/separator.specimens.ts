// One witness per orientation × inset.
import type { CatalogSpecimen } from "../../types.d.ts";

export const SeparatorSpecimens = [
  { state: "default", variants: { orientation: "horizontal", inset: "none" }, props: { orientation: "horizontal", inset: "none" } },
  { state: "default", variants: { orientation: "horizontal", inset: "row" }, props: { orientation: "horizontal", inset: "row" } },
  { state: "default", variants: { orientation: "vertical", inset: "none" }, props: { orientation: "vertical", inset: "none" } },
  { state: "default", variants: { orientation: "vertical", inset: "row" }, props: { orientation: "vertical", inset: "row" } },
] as const satisfies readonly CatalogSpecimen<"separator">[];

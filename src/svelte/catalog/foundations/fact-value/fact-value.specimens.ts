// One witness per state × presentation of FactValue: a known value, a blank one and an absent one, inline and as reading copy.
import type { CatalogSpecimen } from "../../types.d.ts";

export const FactValueSpecimens = [
  { state: "known", variants: { presentation: "inline" }, props: { value: "Buenos Aires", presentation: "inline" } },
  { state: "known", variants: { presentation: "paragraph" }, props: { value: "Ideas for the trip.\nBook the ferry first.", presentation: "paragraph" } },
  { state: "empty", variants: { presentation: "inline" }, props: { value: "", presentation: "inline" } },
  { state: "empty", variants: { presentation: "paragraph" }, props: { value: "", presentation: "paragraph" } },
  { state: "unknown", variants: { presentation: "inline" }, props: { value: null, presentation: "inline" } },
  { state: "unknown", variants: { presentation: "paragraph" }, props: { value: null, presentation: "paragraph" } },
] as const satisfies readonly CatalogSpecimen<"fact-value">[];

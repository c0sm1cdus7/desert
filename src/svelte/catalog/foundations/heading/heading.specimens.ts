// One witness per kind of Heading, in its only state.
import type { CatalogSpecimen } from "../../types.d.ts";

export const HeadingSpecimens = [
  { state: "default", variants: { kind: "display" }, props: { kind: "display", text: "Franco", focusTarget: true } },
  { state: "default", variants: { kind: "page" }, props: { kind: "page", text: "Notes", focusTarget: true, align: "start" } },
  { state: "default", variants: { kind: "section" }, props: { kind: "section", text: "Foundations", id: "heading-specimen-section" } },
  { state: "default", variants: { kind: "group" }, props: { kind: "group", text: "Display name", required: true } },
] as const satisfies readonly CatalogSpecimen<"heading">[];

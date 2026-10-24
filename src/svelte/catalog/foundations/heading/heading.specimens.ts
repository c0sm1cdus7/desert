// One witness per kind of Heading, in its only state.
import type { CatalogSpecimen } from "../../types.d.ts";

export const HeadingSpecimens = [
  { state: "default", variants: { kind: "page" }, props: { kind: "page", text: "Notes" } },
  { state: "default", variants: { kind: "document-title" }, props: { kind: "document-title", text: "Weekly plan" } },
  { state: "default", variants: { kind: "rail-title" }, props: { kind: "rail-title", text: "Foundations", id: "heading-specimen-rail" } },
  { state: "default", variants: { kind: "group-label" }, props: { kind: "group-label", text: "Display name", required: true } },
] as const satisfies readonly CatalogSpecimen<"heading">[];

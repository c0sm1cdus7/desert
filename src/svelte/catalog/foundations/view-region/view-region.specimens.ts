// A view frame and an item frame.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ViewRegionSpecimens = [
  { state: "default", variants: { kind: "view" }, props: { kind: "view", id: "notes", inset: true } },
  { state: "default", variants: { kind: "item" }, props: { kind: "item", id: "notes.details" } },
  { state: "default", variants: { kind: "bare" }, props: { kind: "bare", id: "notes" } },
] as const satisfies readonly CatalogSpecimen<"view-region">[];

// Every kind of region, shown and hidden: a view frame, an item frame (a named section), a bare region, a place's
// document and a retained place (active while shown).
import type { CatalogSpecimen } from "../../types.d.ts";

export const ViewRegionSpecimens = [
  { state: "default", variants: { kind: "view" }, props: { kind: "view", id: "notes", inset: true } },
  { state: "hidden", variants: { kind: "view" }, props: { kind: "view", id: "notes", inset: true, visible: false } },
  { state: "default", variants: { kind: "item" }, props: { kind: "item", id: "notes.details" } },
  { state: "hidden", variants: { kind: "item" }, props: { kind: "item", id: "entry:action", label: "Button", visible: false } },
  { state: "default", variants: { kind: "bare" }, props: { kind: "bare", id: "notes" } },
  { state: "hidden", variants: { kind: "bare" }, props: { kind: "bare", id: "notes", visible: false } },
  { state: "default", variants: { kind: "document" }, props: { kind: "document", id: "travel-kit", label: "Travel kit" } },
  { state: "hidden", variants: { kind: "document" }, props: { kind: "document", id: "travel-kit", label: "Travel kit", visible: false } },
  { state: "default", variants: { kind: "retained" }, props: { kind: "retained", id: "notes", inset: true, active: true } },
  { state: "hidden", variants: { kind: "retained" }, props: { kind: "retained", id: "notes", visible: false, active: false } },
] as const satisfies readonly CatalogSpecimen<"view-region">[];

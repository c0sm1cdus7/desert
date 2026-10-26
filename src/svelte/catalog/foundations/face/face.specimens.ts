// One witness of Face per kind of face it draws (a status in each severity), one at its compact size, and one in each
// ink a host may ask for (a navigation destination's glyph: the accent for a place to browse, positive for the travel kit).
import type { CatalogSpecimen } from "../../types.d.ts";

export const FaceSpecimens = [
  { state: "icon", props: { face: { kind: "icon", icon: "catalog" } } },
  { state: "document", props: { face: { kind: "document" } } },
  { state: "warning", props: { face: { kind: "status", severity: "warning" } } },
  { state: "error", props: { face: { kind: "status", severity: "error" } } },
  { state: "symbol", props: { face: { kind: "symbol", text: "$" } } },
  { state: "flag", props: { face: { kind: "flag", region: "AR" } } },
  { state: "compact", props: { face: { kind: "flag", region: "BR" }, compact: true } },
  { state: "accent", props: { face: { kind: "icon", icon: "landmark" }, ink: "accent", compact: true } },
  { state: "positive", props: { face: { kind: "icon", icon: "backpack" }, ink: "positive", compact: true } },
] as const satisfies readonly CatalogSpecimen<"face">[];

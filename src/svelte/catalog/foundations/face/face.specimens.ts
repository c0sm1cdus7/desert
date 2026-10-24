// One witness of Face per kind of face it draws (a status in each severity), and one at its compact size.
import type { CatalogSpecimen } from "../../types.d.ts";

export const FaceSpecimens = [
  { state: "icon", props: { face: { kind: "icon", icon: "catalog" } } },
  { state: "document", props: { face: { kind: "document" } } },
  { state: "warning", props: { face: { kind: "status", severity: "warning" } } },
  { state: "error", props: { face: { kind: "status", severity: "error" } } },
  { state: "symbol", props: { face: { kind: "symbol", text: "$" } } },
  { state: "flag", props: { face: { kind: "flag", region: "AR" } } },
  { state: "compact", props: { face: { kind: "flag", region: "BR" }, compact: true } },
] as const satisfies readonly CatalogSpecimen<"face">[];

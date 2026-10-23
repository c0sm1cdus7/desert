// Who owns each file of the visual roots, read from the declarations and the layout: the one map every content
// rule asks, so "is this a foundation?", "whose vendor family is this?" have one answer.
import { posix } from "node:path";
import { pieceCompanions, type CatalogLayout } from "../layout.ts";
import type { LocatedDeclaration } from "./inventory.ts";

export type PieceKind = "foundation" | "composition";
export type Owner = Readonly<
  | { kind: "piece"; id: string; pieceKind: PieceKind; role: "entry" | "part" | "companion"; folder: string; dispatch: boolean }
  | { kind: "vendor"; family: string; foundation: string }
  | { kind: "mechanism"; id: string; owner: string; folder: string }
  | { kind: "infra" } | { kind: "generated" } | { kind: "fixed"; category: string }>;

export type Ownership = Readonly<{
  of: (path: string) => Owner | undefined;
  /** Declared piece id of a piece entry path, if the path is one. */
  pieceOfEntry: (path: string) => string | undefined;
  declaration: (id: string) => LocatedDeclaration | undefined;
}>;

export function ownershipOf(declarations: readonly LocatedDeclaration[], layout: CatalogLayout): Ownership {
  const files = new Map<string, Owner>(), vendor = new Map<string, string>(), entries = new Map<string, string>(), byId = new Map<string, LocatedDeclaration>();
  for (const located of declarations) {
    const { path, declaration } = located, folder = posix.dirname(path), at = (name: string) => posix.join(folder, name);
    byId.set(declaration.id, located);
    if (declaration.kind === "mechanism") {
      for (const name of [posix.basename(path), ...declaration.files]) files.set(at(name), { kind: "mechanism", id: declaration.id, owner: declaration.owner, folder });
      continue;
    }
    const piece = { id: declaration.id, pieceKind: declaration.kind, folder, dispatch: declaration.kind === "composition" && declaration.dispatch !== undefined } as const;
    files.set(at(declaration.owner.entry), { kind: "piece", ...piece, role: "entry" });
    entries.set(at(declaration.owner.entry), declaration.id);
    for (const name of declaration.owner.parts ?? []) files.set(at(name), { kind: "piece", ...piece, role: "part" });
    for (const companion of pieceCompanions) files.set(at(`${declaration.id}.${companion}.ts`), { kind: "piece", ...piece, role: "companion" });
    if (declaration.kind === "foundation") for (const family of declaration.owner.vendor ?? []) vendor.set(family, declaration.id);
  }
  for (const path of Object.values(layout.generated)) files.set(path, { kind: "generated" });
  for (const [category, paths] of Object.entries(layout.fixed)) for (const path of paths) files.set(path, { kind: "fixed", category });
  return Object.freeze({
    of(path: string): Owner | undefined {
      const known = files.get(path);
      if (known) return known;
      if (path.startsWith(`${layout.vendorFamilies}/`)) {
        const family = path.slice(layout.vendorFamilies.length + 1).split("/")[0] ?? "", foundation = vendor.get(family);
        return foundation ? { kind: "vendor", family, foundation } : undefined;
      }
      if (path.startsWith(`${layout.infra}/`)) return { kind: "infra" };
      return undefined;
    },
    pieceOfEntry: (path: string) => entries.get(path),
    declaration: (id: string) => byId.get(id),
  });
}

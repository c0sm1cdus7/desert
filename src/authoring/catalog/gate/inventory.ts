// Rule A. Law: a file under the visual roots exists only as a part of one declaration or one fixed category.
// Raises UNDECLARED_VISUAL_SOURCE (every unclaimed path) and CATALOG_DECLARATION (a path claimed twice).
import { posix } from "node:path";
import { pieceCompanions, type CatalogLayout } from "../layout.ts";
import type { ReadDeclaration } from "../read-declaration.ts";

export type LocatedDeclaration = Readonly<{ path: string; declaration: ReadDeclaration }>;
type Claim = Readonly<{ path: string; owner: string }>;
type FolderClaim = Readonly<{ folder: string; owner: string; accept: (path: string) => boolean }>;

function claimsOf({ path, declaration }: LocatedDeclaration, layout: CatalogLayout) {
  const folder = posix.dirname(path), at = (name: string) => posix.join(folder, name);
  const files: Claim[] = [{ path, owner: declaration.id }];
  const folders: FolderClaim[] = [];
  if (declaration.kind === "mechanism") {
    for (const name of declaration.files) files.push({ path: at(name), owner: declaration.id });
    return { files, folders };
  }
  for (const name of [declaration.owner.entry, ...declaration.owner.parts ?? []]) files.push({ path: at(name), owner: declaration.id });
  for (const companion of pieceCompanions) {
    const name = `${declaration.id}.${companion}.ts`;
    if (at(name) !== path) files.push({ path: at(name), owner: declaration.id });
  }
  if (declaration.kind === "foundation") for (const family of declaration.owner.vendor ?? []) {
    folders.push({ folder: posix.join(layout.vendorFamilies, family), owner: `${declaration.id} (vendor ${family})`, accept: () => true });
  }
  return { files, folders };
}

export function assertDeclaredSources(paths: readonly string[], declarations: readonly LocatedDeclaration[], layout: CatalogLayout): void {
  const owners = new Map<string, string>(), folders: FolderClaim[] = [
    { folder: layout.infra, owner: "infra", accept: path => path.endsWith(".ts") },
  ];
  const claim = (path: string, owner: string) => {
    const previous = owners.get(path);
    if (previous) throw new Error(`CATALOG_DECLARATION: ${path} is claimed by ${previous} and ${owner}`);
    owners.set(path, owner);
  };
  claim(layout.ledger, "ledger");
  for (const [category, files] of Object.entries(layout.fixed)) for (const path of files) claim(path, category);
  for (const located of declarations) {
    const claims = claimsOf(located, layout);
    for (const file of claims.files) claim(file.path, file.owner);
    for (const folder of claims.folders) {
      const twin = folders.find(other => other.folder === folder.folder);
      if (twin) throw new Error(`CATALOG_DECLARATION: ${folder.folder} is owned by ${twin.owner} and ${folder.owner}`);
      folders.push(folder);
    }
  }
  const inside = (path: string, folder: string) => path.startsWith(`${folder}/`);
  const unclaimed = paths.filter(path => !owners.has(path)
    && !folders.some(folder => inside(path, folder.folder) && folder.accept(path)));
  if (unclaimed.length) throw new Error(`UNDECLARED_VISUAL_SOURCE: ${[...unclaimed].sort().join(", ")}`);
}

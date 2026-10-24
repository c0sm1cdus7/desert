// Digests of a piece for the approvals ledger (rule L). The gate and the owner's approve command both call these
// functions over the same (path → bytes) reading, so a stamped digest and a recomputed one cannot disagree by method.
//   sourceDigest:   the piece's entry, parts, owned vendor family files, every mechanism it uses or owns, and the theme
//   contractDigest: the piece's catalog, contract and specimens files (a mechanism: its declaration file)
// Paths are part of the digest, and an absent file is encoded as absent, never as empty.
import { createHash } from "node:crypto";
import { posix } from "node:path";
import { pieceCompanions, type CatalogLayout } from "./layout.ts";
import type { LocatedDeclaration } from "./gate/inventory.ts";

export const digestVersion = "desert.catalog-digest/1" as const;
export const themeMechanism = "theme" as const;
export type DigestTree = Readonly<{ layout: CatalogLayout; paths: readonly string[]; declarations: readonly LocatedDeclaration[] }>;
/** The bytes of a file of the tree, or undefined when the tree has no such file. */
export type ReadBytes = (path: string) => Uint8Array | undefined;

const sortedUnique = (paths: readonly string[]) => [...new Set(paths)].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);

function declarationOf(tree: DigestTree, id: string): LocatedDeclaration {
  const located = tree.declarations.find(item => item.declaration.id === id);
  if (!located) throw new Error(`APPROVALS_LEDGER: ${id} is not declared, so it has no digest`);
  return located;
}

/** A mechanism's stylesheets; a mechanism that is not declared contributes a marker that always reads as absent. */
function mechanismFiles(tree: DigestTree, id: string): readonly string[] {
  const located = tree.declarations.find(item => item.declaration.id === id && item.declaration.kind === "mechanism");
  if (!located || located.declaration.kind !== "mechanism") return [`mechanism:${id}`];
  const folder = posix.dirname(located.path);
  return located.declaration.files.map(name => posix.join(folder, name));
}

/** The theme mechanism's files plus the fixed theme stylesheet entry, which every piece's appearance passes through. */
const themeFiles = (tree: DigestTree) => [...mechanismFiles(tree, themeMechanism), ...tree.layout.fixed[themeMechanism] ?? []];

const vendorFamilyFiles = (tree: DigestTree, family: string) => {
  const folder = `${posix.join(tree.layout.vendorFamilies, family)}/`;
  return tree.paths.filter(path => path.startsWith(folder));
};

const ownedMechanisms = (tree: DigestTree, owner: string) => tree.declarations
  .filter(item => item.declaration.kind === "mechanism" && item.declaration.owner === owner && item.declaration.id !== owner)
  .map(item => item.declaration.id);

/** Every file whose bytes make up the piece's appearance. */
export function sourceFiles(tree: DigestTree, id: string): readonly string[] {
  const { path, declaration } = declarationOf(tree, id);
  if (declaration.kind === "mechanism") return sortedUnique(id === themeMechanism ? themeFiles(tree) : mechanismFiles(tree, id));
  const at = (name: string) => posix.join(posix.dirname(path), name);
  const own = [declaration.owner.entry, ...declaration.owner.parts ?? []].map(at);
  const vendor = declaration.kind === "foundation" ? (declaration.owner.vendor ?? []).flatMap(family => vendorFamilyFiles(tree, family)) : [];
  const used = declaration.kind === "foundation" ? declaration.owner.mechanisms ?? [] : [];
  const mechanisms = [...used, ...ownedMechanisms(tree, id)].flatMap(mechanism => mechanismFiles(tree, mechanism));
  return sortedUnique([...own, ...vendor, ...mechanisms, ...themeFiles(tree)]);
}

/** Every file whose text makes up the piece's contract with its callers. */
export function contractFiles(tree: DigestTree, id: string): readonly string[] {
  const { path, declaration } = declarationOf(tree, id);
  if (declaration.kind === "mechanism") return [path];
  return sortedUnique(pieceCompanions.map(companion => posix.join(posix.dirname(path), `${id}.${companion}.ts`)));
}

/** sha256 over the sorted, de-duplicated (path, bytes) pairs, each length-prefixed so no two readings collide. */
export function digestOf(paths: readonly string[], read: ReadBytes): string {
  const hash = createHash("sha256").update(`${digestVersion}\n`);
  for (const path of sortedUnique(paths)) {
    const bytes = read(path);
    hash.update(`${path}\0`);
    if (bytes === undefined) hash.update("absent\0");
    else hash.update(`${bytes.byteLength}\0`).update(bytes);
  }
  return hash.digest("hex");
}

export const sourceDigest = (tree: DigestTree, id: string, read: ReadBytes) => digestOf(sourceFiles(tree, id), read);
export const contractDigest = (tree: DigestTree, id: string, read: ReadBytes) => digestOf(contractFiles(tree, id), read);

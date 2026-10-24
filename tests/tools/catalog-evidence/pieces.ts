// What the evidence shows for each requested piece, read from the catalog tree as data: its declaration, its specimens (by
// the ledger key rule J and the approve command use), the filler its `children` slot gets, and the Visual Catalog
// destinations that show it today. Raises EVIDENCE_UNKNOWN_PIECE for an id the catalog does not declare.
import { readFile } from "node:fs/promises";
import { join, posix } from "node:path";
import ts from "typescript";
import { readCatalogTree, type CatalogTree } from "../../../src/authoring/catalog/gate/run.ts";
import { readSpecimens, specimenKey } from "../../../src/authoring/catalog/gate/specimens.ts";
import { DesertLayout } from "../../../src/authoring/catalog/layout.ts";
import type { LocatedDeclaration } from "../../../src/authoring/catalog/gate/inventory.ts";
import { sharedOwnerPieces } from "../../../src/svelte/infra/shared-owners.ts";
import { sharedPurpose } from "../../../src/svelte/infra/shared-purpose.ts";

export type EvidenceSpecimen = Readonly<{ index: number; key: string; file: string }>;
/** A Visual Catalog destination and the destinations to open before it (a shared owner's part opens from its parent). */
export type CatalogDestination = Readonly<{ id: string; path: readonly string[] }>;
export type EvidencePiece = Readonly<{
  id: string; kind: "foundation" | "composition"; purpose: string; approval: "required" | "none";
  /** The owner entry as an `@desert/` import request, and the specimens module with its binding. */
  entry: string; specimens: Readonly<{ request: string; binding: string; list: readonly EvidenceSpecimen[] }> | undefined;
  /** The piece whose first specimens fill this piece's `children` slot, or undefined when there is no slot or no witness. */
  filler: EvidencePiece | undefined;
  destinations: readonly CatalogDestination[];
}>;

const request = (path: string) => `@desert/${path.slice("src/".length)}`;
/** A key used twice (rule J reports it) keeps its specimens apart on disk: the second copy gets `~2`. */
function distinct(keys: readonly string[]): readonly string[] {
  const seen = new Map<string, number>();
  return keys.map(key => { const count = (seen.get(key) ?? 0) + 1; seen.set(key, count); return count === 1 ? key : `${key}~${count}`; });
}

async function specimensOf(root: string, tree: CatalogTree, { path, declaration }: LocatedDeclaration) {
  const file = posix.join(posix.dirname(path), `${declaration.id}.specimens.ts`);
  if (!tree.paths.includes(file)) return undefined;
  const source = ts.createSourceFile(file, await readFile(join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const binding = `${declaration.binding}Specimens`;
  const read = readSpecimens(source, binding, node => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
  if (read.problems.length) throw new Error(`EVIDENCE_SPECIMENS: ${file}: ${read.problems.map(problem => problem.what).join("; ")}`);
  const keys = distinct(read.specimens.map(specimen => specimenKey(specimen.state, specimen.variants)));
  return { request: request(file), binding, list: keys.map((key, index) => ({ index, key, file: `${key}.png` })) };
}

/** The Visual Catalog pages of a piece: the resolved nodes it renders, and the shared-owner pages that name it. */
function destinationsOf(id: string, renders: readonly string[]): readonly CatalogDestination[] {
  const owners = Object.entries(sharedOwnerPieces).filter(([, piece]) => piece === id).map(([owner]) => owner);
  const pathTo = (owner: string): readonly string[] => {
    const parent = Object.hasOwn(sharedPurpose, owner) ? sharedPurpose[owner as keyof typeof sharedPurpose].partOf : undefined;
    return parent === undefined ? [] : [...pathTo(parent), parent];
  };
  return [...renders.map(node => ({ id: node, path: [] })), ...owners.map(owner => ({ id: owner, path: pathTo(owner) }))];
}

export type EvidenceCatalog = Readonly<{ tree: CatalogTree; pieces: readonly EvidencePiece[] }>;

/** The requested pieces (every foundation and composition when `ids` is "all"), in id order. */
export async function readEvidencePieces(root: string, ids: readonly string[] | "all"): Promise<EvidenceCatalog> {
  const tree = await readCatalogTree(root, DesertLayout);
  const located = new Map(tree.declarations.filter(item => item.declaration.kind !== "mechanism").map(item => [item.declaration.id, item]));
  const unknown = ids === "all" ? [] : ids.filter(id => !located.has(id));
  if (unknown.length) throw new Error(`EVIDENCE_UNKNOWN_PIECE: ${unknown.join(", ")} is not a declared foundation or composition`);
  const memo = new Map<string, EvidencePiece>();
  async function piece(id: string, depth: number): Promise<EvidencePiece> {
    const known = memo.get(id);
    if (known) return known;
    const item = located.get(id);
    if (!item || item.declaration.kind === "mechanism") throw new Error(`EVIDENCE_UNKNOWN_PIECE: ${id}`);
    const { declaration, path } = item;
    const accepts = declaration.slots?.children?.accepts ?? [];
    let filler: EvidencePiece | undefined;
    for (const candidate of depth === 0 ? accepts : []) {
      if (candidate === id || !located.has(candidate)) continue;
      const read = await piece(candidate, depth + 1);
      if (read.specimens?.list.length) { filler = read; break; }
    }
    const built: EvidencePiece = { id, kind: declaration.kind, purpose: declaration.purpose, approval: declaration.approval,
      entry: request(posix.join(posix.dirname(path), declaration.owner.entry)), specimens: await specimensOf(root, tree, item),
      filler, destinations: destinationsOf(id, declaration.renders ?? []) };
    if (depth === 0) memo.set(id, built);
    return built;
  }
  const wanted = ids === "all" ? [...located.keys()] : [...new Set(ids)];
  const pieces: EvidencePiece[] = [];
  for (const id of wanted.sort()) pieces.push(await piece(id, 0));
  return { tree, pieces };
}

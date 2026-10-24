// Rule B. Law: declarations agree with each other and with the files they name, and the pieces that render resolved
// nodes cover the resolved-node grammar exactly once, and only the switch is a capsule (one radius family). Raises
// CATALOG_DECLARATION naming the declaration and the broken reference.
import { posix } from "node:path";
import { ResolvedNodes } from "../../../interaction/catalog.ts";
import { capsuleOwner } from "../declaration-schema.ts";
import { themeMechanism, type CatalogLayout } from "../layout.ts";
import type { LocatedDeclaration } from "./inventory.ts";

const suffix = { foundation: ".catalog.ts", composition: ".catalog.ts", mechanism: ".mechanism.ts" } as const;

export function assertDeclarationsConsistent(declarations: readonly LocatedDeclaration[], existing: ReadonlySet<string>,
  layout: CatalogLayout): void {
  const fail = (what: string): never => { throw new Error(`CATALOG_DECLARATION: ${what}`); };
  const where = new Map<string, string>();
  for (const { path, declaration } of declarations) {
    const previous = where.get(declaration.id);
    if (previous) fail(`${declaration.id} is declared twice: ${previous} and ${path}`);
    where.set(declaration.id, path);
    const homes = layout.pieces[declaration.kind].map(folder =>
      posix.join(folder, declaration.id, `${declaration.id}${suffix[declaration.kind]}`));
    if (!homes.includes(path)) fail(`${declaration.id} is declared at ${path}; a ${declaration.kind} lives at ${homes.join(" or ")}`);
  }
  const pieces = new Set(declarations.filter(item => item.declaration.kind !== "mechanism").map(item => item.declaration.id));
  const foundations = new Set(declarations.filter(item => item.declaration.kind === "foundation").map(item => item.declaration.id));
  const mechanisms = new Set(declarations.filter(item => item.declaration.kind === "mechanism").map(item => item.declaration.id));
  if (!mechanisms.has(themeMechanism)) fail("the theme mechanism is not declared");
  const exists = (id: string, path: string) => existing.has(path) || fail(`${id} names ${path}, which does not exist`);
  for (const { path, declaration } of declarations) {
    const folder = posix.dirname(path), id = declaration.id;
    if (declaration.kind === "mechanism") {
      if (declaration.owner !== themeMechanism && !foundations.has(declaration.owner)) fail(`${id} is owned by unknown foundation ${declaration.owner}`);
      for (const file of declaration.files) exists(id, posix.join(folder, file));
      continue;
    }
    for (const file of [declaration.owner.entry, ...declaration.owner.parts ?? [], `${id}.contract.ts`]) exists(id, posix.join(folder, file));
    const accepted = Object.values(declaration.slots ?? {}).flatMap(slot => slot.accepts);
    const used = declaration.kind === "composition" ? [...declaration.uses, ...accepted] : accepted;
    for (const other of used) if (!pieces.has(other)) fail(`${id} uses unknown piece ${other}`);
    if (declaration.kind === "foundation") for (const mechanism of declaration.owner.mechanisms ?? []) {
      if (!mechanisms.has(mechanism)) fail(`${id} uses unknown mechanism ${mechanism}`);
    }
  }
  assertRendersCoverGrammar(declarations, fail);
  assertOneRadiusFamily(declarations, fail);
}

/** One radius family: only `capsuleOwner` (the switch) declares the capsule shape, as its shape or for a variant value. */
function assertOneRadiusFamily(declarations: readonly LocatedDeclaration[], fail: (what: string) => never): void {
  const refuse = (id: string, where: string) => fail(`${id} declares shape capsule${where}; only ${capsuleOwner} may be a capsule (one radius family)`);
  for (const { declaration } of declarations) if (declaration.kind === "foundation" && declaration.id !== capsuleOwner) {
    if (declaration.shape === "capsule") refuse(declaration.id, "");
    for (const [axis, values] of Object.entries(declaration.variantShapes ?? {})) for (const [value, shape] of Object.entries(values)) {
      if (shape === "capsule") refuse(declaration.id, ` for ${axis} ${value}`);
    }
  }
}

/** Every resolved node kind is rendered by exactly one declared piece, and nothing else is rendered (once the tree has a
 * resolved-node dispatcher, whose generated table needs every kind). */
function assertRendersCoverGrammar(declarations: readonly LocatedDeclaration[], fail: (what: string) => never): void {
  const kinds = new Set<string>(ResolvedNodes.entries.map(entry => entry.id)), renderer = new Map<string, string>();
  for (const { declaration } of declarations) if (declaration.kind !== "mechanism") for (const kind of declaration.renders ?? []) {
    if (!kinds.has(kind)) fail(`${declaration.id} renders ${kind}, which is not a resolved node kind`);
    const previous = renderer.get(kind);
    if (previous) fail(`${kind} is rendered by ${previous} and ${declaration.id}`);
    renderer.set(kind, declaration.id);
  }
  const missing = [...kinds].filter(kind => !renderer.has(kind));
  const dispatcher = declarations.some(({ declaration }) => declaration.kind === "composition" && declaration.dispatch === "resolved-node");
  if (dispatcher && missing.length) fail(`the resolved node kinds ${missing.join(", ")} are rendered by no piece (incomplete semantic bank)`);
}

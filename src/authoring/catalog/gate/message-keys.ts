// Rule B, messages. Law (plan §14): every SDK sentence has one owner. A piece lists the keys it uses (`messages`), and each
// listed key exists in every bundle (MESSAGE_MISSING); a bundle key no piece and no namespace module owns, or that two
// pieces claim, is CATALOG_DECLARATION; so is a purpose key the piece does not list. The `errors` namespace is exactly the
// codes a person can see (src/messages/error-codes.ts): a code without its key is MESSAGE_MISSING.
import { flattenMessages } from "../../../messages/catalog.ts";
import { surfaceErrorCodes } from "../../../messages/error-codes.ts";
import type { CatalogLayout } from "../layout.ts";
import type { LocatedDeclaration } from "./inventory.ts";

const errorsNamespace = "errors";

function parsed(locale: string, source: string): ReadonlyMap<string, string> {
  let tree: unknown;
  try { tree = JSON.parse(source); } catch { throw new Error(`MESSAGE_CATALOG: ${locale}.json is not JSON`); }
  return flattenMessages(locale, tree);
}

/** The errors namespace names exactly the surface codes, each present in every bundle. */
function assertErrorKeys(bundles: ReadonlyMap<string, ReadonlyMap<string, string>>, owner: string): void {
  const codes = new Set<string>(surfaceErrorCodes);
  for (const [locale, keys] of bundles) {
    for (const code of surfaceErrorCodes) if (!keys.has(`${errorsNamespace}.${code}`)) {
      throw new Error(`MESSAGE_MISSING: the error code ${code} reaches a person and ${locale}.json has no ${errorsNamespace}.${code}`);
    }
    for (const key of keys.keys()) if (key.startsWith(`${errorsNamespace}.`) && !codes.has(key.slice(errorsNamespace.length + 1))) {
      throw new Error(`CATALOG_DECLARATION: ${key} in ${locale}.json names no code a person can see (${owner})`);
    }
  }
}

export function assertMessageOwnership(declarations: readonly LocatedDeclaration[], sources: ReadonlyMap<string, string>,
  layout: CatalogLayout): void {
  const bundles = new Map([...sources].map(([locale, source]) => [locale, parsed(locale, source)] as const));
  const owners = new Map<string, string>();
  for (const { declaration } of declarations) {
    if (declaration.kind === "mechanism") continue;
    for (const key of declaration.messages ?? []) {
      const previous = owners.get(key);
      if (previous) throw new Error(`CATALOG_DECLARATION: ${key} is declared by ${previous} and ${declaration.id}; a message has one owner`);
      owners.set(key, declaration.id);
      for (const [locale, keys] of bundles) if (!keys.has(key)) throw new Error(`MESSAGE_MISSING: ${declaration.id} declares ${key}, which the ${locale} bundle lacks`);
    }
    if (typeof declaration.purpose !== "string" && !declaration.messages?.includes(declaration.purpose.key)) {
      throw new Error(`CATALOG_DECLARATION: ${declaration.id}'s purpose is ${declaration.purpose.key}, which ${declaration.id} does not list in messages`);
    }
  }
  const namespaces = layout.messages.namespaces;
  const errorsOwner = namespaces[errorsNamespace];
  if (errorsOwner !== undefined) assertErrorKeys(bundles, errorsOwner);
  for (const [locale, keys] of bundles) for (const key of keys.keys()) {
    if (owners.has(key) || Object.hasOwn(namespaces, key.split(".")[0] ?? "")) continue;
    throw new Error(`CATALOG_DECLARATION: ${key} in ${locale}.json is owned by no piece and by no namespace module`);
  }
}

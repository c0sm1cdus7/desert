import { moduleKinds, requireModuleHandle, type LocalEntry, type ModuleRecord } from "./references.ts";
import { declarationArray } from "./declaration-data.ts";
import type { ModuleIndex, RegisteredModule, AnyModuleIndex } from "./types.ts";

const catalogs = new WeakMap<object, readonly ModuleRecord[]>();
const productModules = new WeakMap<object, { modules: readonly ModuleRecord[]; identities: ReadonlyMap<object, LocalEntry> }>();
export function moduleIndex<const M extends readonly RegisteredModule[]>(modules: M): ModuleIndex<M> {
  const registered = declarationArray(modules).map(requireModuleHandle);
  if (new Set(registered.map(module => module.definition.id)).size !== registered.length) throw new Error("DUPLICATE_MODULE_ID");
  const result = Object.create(null) as Record<string, Readonly<Record<string, object>>>;
  for (const kind of [...moduleKinds, "commands"] as const) {
    const entries = Object.create(null) as Record<string, object>;
    for (const module of registered) for (const [alias, reference] of Object.entries(module.exports[kind])) {
      if (Object.hasOwn(entries, alias)) throw new Error("DUPLICATE_MODULE_EXPORT_ALIAS");
      entries[alias] = reference;
    }
    result[kind] = Object.freeze(entries);
  }
  Object.freeze(result);
  catalogs.set(result, Object.freeze(registered));
  return result as ModuleIndex<M>;
}
export function requireModuleIndex(value: unknown): readonly ModuleRecord[] {
  const found = typeof value === "object" && value !== null ? catalogs.get(value) : undefined;
  if (!found) throw new Error("UNREGISTERED_MODULE_CATALOG");
  return found;
}
export function recordProductModules(product: object, modules: readonly ModuleRecord[], identities: ReadonlyMap<object, LocalEntry>): void {
  productModules.set(product, { modules, identities: new Map(identities) });
}
export function requireMountedReference(product: object, module: ModuleRecord): void {
  if (!productModules.get(product)?.modules.includes(module)) throw new Error("UNMOUNTED_MODULE_REFERENCE");
}
export function requireLocalProductDependency(product: object, target: object): void {
  const composition = productModules.get(product);
  if (!composition) return;
  const admitted = composition.identities.get(target);
  if (admitted?.kind !== "dependency") throw new Error("UNREGISTERED_LOCAL_REFERENCE");
  if (Object.getOwnPropertyDescriptor(target, "id")?.value !== admitted.id) throw new Error("MUTATED_DEPENDENCY_REFERENCE");
}

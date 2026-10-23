import type { ModuleEntryKind, OwnedDefinitions, ResolvedModuleDefinition } from "./types.ts";
type ModuleReferenceKind = "view" | "journey" | "destination";
type ResolvedReference<K extends ModuleReferenceKind> = string | Readonly<{ kind: K; owner: string; id: string }>;

export const entryKinds = ["objects", "dependencies", "journeys", "views", "destinations"] as const;
export const productOwner = "@product";
export const journeyId = (journey: NonNullable<OwnedDefinitions["journeys"]>[number]) => journey.presentation?.id ?? journey.execution!.id;
export function entryIds(owner: OwnedDefinitions, kind: ModuleEntryKind): readonly string[] {
  return kind === "journeys" ? (owner.journeys ?? []).map(journeyId) : (owner[kind] ?? []).map(item => item.id);
}
export function validateOwnedDomain(owner: OwnedDefinitions) {
  const objects = new Set(entryIds(owner, "objects"));
  const dependencies = new Set(entryIds(owner, "dependencies"));
  const requireObject = (id: string) => { if (!objects.has(id)) throw new Error("FOREIGN_MODULE_OBJECT"); };
  const requireDependency = (id: string) => { if (!dependencies.has(id)) throw new Error("FOREIGN_MODULE_DEPENDENCY"); };
  for (const policy of owner.policies ?? []) requireObject(policy.object);
  for (const dependency of owner.dependencies ?? []) {
    if (dependency.kind === "controller") dependency.objects.forEach(requireObject);
    dependency.requires.forEach(requireDependency);
  }
  for (const registration of owner.journeys ?? []) {
    const { execution, presentation } = registration;
    if (!execution) {
      if (presentation?.kind !== "presentation") throw new Error("MISSING_MODULE_EXECUTION");
      continue;
    }
    if (presentation && (execution.id !== presentation.id || presentation.kind === "presentation" ||
      (presentation.kind === "read" ? execution.kind !== "read" :
        execution.kind !== "mutation" || execution.command.kind !== (presentation.kind === "update" || presentation.kind === "action" ? "update" : "create")))) {
      throw new Error("MODULE_JOURNEY_KIND_MISMATCH");
    }
    requireObject(execution.kind === "read" ? execution.object : execution.command.object);
    requireDependency(execution.requires.controller);
    execution.requires.dependencies.forEach(requireDependency);
  }
}

export type Owner = { id: string; definition: OwnedDefinitions; exports?: ResolvedModuleDefinition["exports"] };
export function ownershipRegistry(owners: readonly Owner[]) {
  const registry = new Map<ModuleEntryKind, Map<string, Owner>>();
  for (const kind of entryKinds) {
    const entries = new Map<string, Owner>();
    for (const owner of owners) for (const id of entryIds(owner.definition, kind)) {
      if (entries.has(id)) throw new Error(`DUPLICATE_MODULE_${kind.toUpperCase()}`);
      entries.set(id, owner);
    }
    registry.set(kind, entries);
  }
  function owned<K extends ModuleReferenceKind>(reference: ResolvedReference<K>, kind: K, caller: string, presentation: boolean): string {
    const key = `${kind}s` as ModuleEntryKind;
    const id = typeof reference === "string" ? reference : reference.id;
    const target = registry.get(key)!.get(id);
    if (!target) throw new Error(`UNKNOWN_MODULE_${kind.toUpperCase()}`);
    if (typeof reference === "string") {
      if (target.id !== caller && (caller !== productOwner || !target.exports?.[key]?.includes(id))) throw new Error("PRIVATE_MODULE_REFERENCE");
    } else {
      if (reference.kind !== kind || reference.owner !== target.id) throw new Error("INVALID_MODULE_REFERENCE");
      if (caller !== productOwner) throw new Error("CROSS_MODULE_REFERENCE");
      if (!target.exports?.[key]?.includes(id)) throw new Error("PRIVATE_MODULE_REFERENCE");
    }
    if (presentation && kind === "journey" && !target.definition.journeys?.find(item => journeyId(item) === id)?.presentation) {
      throw new Error("UNPRESENTED_MODULE_JOURNEY");
    }
    return id;
  }
  const resolve=<K extends ModuleReferenceKind>(reference:ResolvedReference<K>,kind:K,caller:string)=>owned(reference,kind,caller,true);
  const resolveExecution=(reference:ResolvedReference<'journey'>,caller:string)=>owned(reference,'journey',caller,false);
  return { registry, resolve, resolveExecution };
}

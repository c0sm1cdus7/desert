import { declarationArray, declarationRecord } from "./declaration-data.ts";
import { isModuleOwned, kindOf, moduleKinds, publicReference, requireJourneyUse,
  type LocalEntry, type ModuleRecord, type ReferenceUse } from "./references.ts";
import type { ModuleReferenceKind } from "./reference-types.ts";
import type { ModuleEntryKind } from "./types.ts";
import { requireDefinedView } from "../views/defined-view-registry.ts";

export function referenceAdmission(source: Record<string, unknown>, root: boolean, mounted: readonly ModuleRecord[] = []) {
  const identities = new Map<object, LocalEntry>();
  function register(value: unknown, kind: ModuleReferenceKind, entry?: LocalEntry) {
    const data = declarationRecord(value);
    if (publicReference(value) || isModuleOwned(value as object)) throw new Error("FOREIGN_MODULE_DEFINITION");
    if (kind === "view") requireDefinedView(value);
    const known = identities.get(value as object);
    if (known && known.kind !== kind) throw new Error("MODULE_REFERENCE_KIND_MISMATCH");
    const registered = entry ?? { kind, id: data.id as string, value: value as object };
    identities.set(value as object, registered);
    return registered;
  }
  for (const kind of moduleKinds) for (const value of source[kind] === undefined ? [] : declarationArray(source[kind])) {
    if (kind !== "journeys") { register(value, kindOf(kind)); continue; }
    const registration = declarationRecord(value);
    const execution = registration.execution ? declarationRecord(registration.execution) : undefined;
    const presentation = registration.presentation ? declarationRecord(registration.presentation) : undefined;
    if (!execution && !presentation) throw new Error("MISSING_MODULE_EXECUTION");
    const entry: LocalEntry = { kind: "journey", id: (presentation?.id ?? execution?.id) as string, value: value as object,
      ...(execution ? { execution: registration.execution as object } : {}),
      ...(presentation ? { presentation: registration.presentation as object } : {}) };
    if (execution) {
      register(registration.execution, "journey", entry);
      if (execution.kind === "mutation") register(execution.command, "command");
    }
    if (presentation) register(registration.presentation, "journey", entry);
  }
  function admit(target: unknown, kind: ModuleReferenceKind, use: ReferenceUse = "reference"): LocalEntry {
    if (typeof target === "string") throw new Error("STRING_MODULE_REFERENCE_FORBIDDEN");
    const emitted = publicReference(target, kind);
    if (emitted) {
      if (!root) throw new Error("CROSS_MODULE_REFERENCE");
      if (!mounted.includes(emitted.module)) throw new Error("UNMOUNTED_MODULE_REFERENCE");
      requireJourneyUse(emitted, use);
      return emitted;
    }
    if (typeof target !== "object" || target === null) throw new Error("UNREGISTERED_LOCAL_REFERENCE");
    const entry = identities.get(target);
    if (!entry) {
      if (isModuleOwned(target)) throw new Error(root ? "PRIVATE_MODULE_REFERENCE" : "CROSS_MODULE_REFERENCE");
      throw new Error("UNREGISTERED_LOCAL_REFERENCE");
    }
    if (entry.kind !== kind) throw new Error("MODULE_REFERENCE_KIND_MISMATCH");
    requireJourneyUse(entry, use);
    return entry;
  }
  function aliases() {
    const result = Object.fromEntries(moduleKinds.map(kind => [kind, Object.create(null)])) as
      Record<ModuleEntryKind, Record<string, LocalEntry>>;
    if (source.exports === undefined) return result;
    const exports = declarationRecord(source.exports);
    if (Object.keys(exports).some(kind => !moduleKinds.includes(kind as ModuleEntryKind))) throw new Error("INVALID_MODULE_EXPORTS");
    for (const kind of moduleKinds) {
      if (!Object.hasOwn(exports, kind)) continue;
      const seen = new Set<LocalEntry>();
      for (const [alias, value] of Object.entries(declarationRecord(exports[kind]))) {
        if (!alias || ["__proto__", "constructor", "prototype"].includes(alias)) throw new Error("INVALID_MODULE_EXPORTS");
        const entry = typeof value === "object" && value !== null ? identities.get(value) : undefined;
        if (!entry || entry.kind !== kindOf(kind)) throw new Error("UNKNOWN_MODULE_EXPORT");
        if (seen.has(entry)) throw new Error("DUPLICATE_MODULE_EXPORT_TARGET");
        seen.add(entry); result[kind][alias] = entry;
      }
    }
    return result;
  }
  return { identities, admit, aliases };
}
export type ReferenceAdmission = ReturnType<typeof referenceAdmission>;

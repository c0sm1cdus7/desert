import { freezeDeep } from "../json.ts";
import type { ModuleReferenceKind } from "./reference-types.ts";
import type { DeclaredModuleDefinition, ModuleEntryKind } from "./types.ts";
import { declarationRecord } from "./declaration-data.ts";

export type LocalEntry = { kind: ModuleReferenceKind; id: string; value: object; execution?: object; presentation?: object };
export type PublicEntry = LocalEntry & { module: ModuleRecord };
export type ModuleRecord = {
  handle: object; definition: DeclaredModuleDefinition;
  exports: Readonly<Record<ModuleEntryKind | "commands", Readonly<Record<string, object>>>>;
};
const modules = new WeakMap<object, ModuleRecord>();
const references = new WeakMap<object, PublicEntry>();
const ownedIdentities = new WeakSet<object>();
export const moduleKinds = ["objects", "dependencies", "journeys", "views", "destinations"] as const;
export const kindOf = (kind: ModuleEntryKind): ModuleReferenceKind => kind === "dependencies" ? "dependency"
  : kind.slice(0, -1) as ModuleReferenceKind;

export function requireModuleHandle(value: unknown): ModuleRecord {
  const found = typeof value === "object" && value !== null ? modules.get(value) : undefined;
  if (!found) throw new Error("UNREGISTERED_MODULE_HANDLE");
  return found;
}
export function publicReference(value: unknown, kind?: ModuleReferenceKind): PublicEntry | undefined {
  if (typeof value !== "object" || value === null) return;
  const found = references.get(value);
  if (!found) {
    if (Object.hasOwn(value, "owner") && Object.hasOwn(value, "kind") && Object.hasOwn(value, "id")) {
      throw new Error("UNREGISTERED_MODULE_REFERENCE");
    }
    return;
  }
  if (kind && found.kind !== kind) throw new Error("MODULE_REFERENCE_KIND_MISMATCH");
  return found;
}
export function isModuleOwned(value: object): boolean { return ownedIdentities.has(value); }

export function issueModule(definition: DeclaredModuleDefinition, identities: ReadonlyMap<object, LocalEntry>,
  aliases: Readonly<Record<ModuleEntryKind, Readonly<Record<string, LocalEntry>>>>): object {
  const handle = Object.freeze({ id: definition.id });
  const exports = Object.fromEntries([...moduleKinds, "commands"].map(kind => [kind, Object.create(null)])) as
    Record<ModuleEntryKind | "commands", Record<string, object>>;
  const record: ModuleRecord = { handle, definition, exports };
  const issued = new Map<LocalEntry, object>();
  function canonical(entry: LocalEntry): LocalEntry {
    if (entry.kind === "journey") {
      const registration = definition.journeys?.find(item => (item.presentation?.id ?? item.execution?.id) === entry.id);
      if (!registration) throw new Error("UNKNOWN_MODULE_JOURNEY");
      return { ...entry, value: registration, ...(registration.execution ? { execution: registration.execution } : {}),
        ...(registration.presentation ? { presentation: registration.presentation } : {}) };
    }
    const value = entry.kind === "command"
      ? definition.journeys?.flatMap(item => item.execution?.kind === "mutation" ? [item.execution.command] : []).find(item => item.id === entry.id)
      : definition[entry.kind === "dependency" ? "dependencies" : `${entry.kind}s` as Exclude<ModuleEntryKind, "journeys" | "dependencies">]?.find(item => item.id === entry.id);
    if (!value) throw new Error("UNKNOWN_MODULE_EXPORT");
    return { ...entry, value };
  }
  function issue(entry: LocalEntry) {
    const existing = issued.get(entry);
    if (existing) return existing;
    const token = Object.freeze({ kind: entry.kind, owner: definition.id, id: entry.id });
    references.set(token, { ...canonical(entry), module: record });
    issued.set(entry, token);
    return token;
  }
  for (const kind of moduleKinds) for (const [alias, entry] of Object.entries(aliases[kind])) {
    exports[kind][alias] = issue(entry);
    if (kind === "journeys" && entry.execution) {
      const execution = declarationRecord(entry.execution);
      if (execution.kind === "mutation") {
        const command = identities.get(execution.command as object);
        if (!command || command.kind !== "command") throw new Error("UNKNOWN_MODULE_COMMAND");
        exports.commands[alias] = issue(command);
      }
    }
  }
  for (const original of identities.keys()) ownedIdentities.add(original);
  freezeDeep(exports);
  modules.set(handle, record);
  return handle;
}

export type ReferenceUse = "reference" | "navigation" | "execution" | "read-source";
export function requireJourneyUse(entry: LocalEntry, use: ReferenceUse): void {
  if (entry.kind !== "journey") return;
  if (use === "navigation" && !entry.presentation) throw new Error("UNPRESENTED_MODULE_JOURNEY");
  if (use === "execution" && !entry.execution) throw new Error("MODULE_EXPOSURE_REQUIRES_EXECUTION");
  if (use === "read-source" && (!entry.execution || declarationRecord(entry.execution).kind !== "read" ||
    !entry.presentation || declarationRecord(entry.presentation).kind !== "read")) throw new Error("MODULE_SOURCE_REQUIRES_READ");
}

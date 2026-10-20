import type { ObjectDefinition } from "./contracts.ts";

export function uniqueById<T extends { id: string }>(items: T[], kind: string) {
  const result = new Map<string, T>();
  for (const item of items) {
    if (result.has(item.id)) throw new Error(`Duplicate ${kind}: ${item.id}`);
    result.set(item.id, item);
  }
  return result;
}

export function requireReference<T>(items: Map<string, T>, id: string, kind: string): T {
  const item = items.get(id);
  if (!item) throw new Error(`Unknown ${kind}: ${id}`);
  return item;
}

export function requireField(object: ObjectDefinition, name: string) {
  if (!Object.hasOwn(object.facts, name)) throw new Error(`Unknown field: ${object.id}.${name}`);
  return object.facts[name]!;
}

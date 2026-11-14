// Recursive fields and map keys change independently; append-only lists send only their new suffix.
import { plainRecord, stateHash } from "./state-hash.ts";
export type StatePatch =
  | { kind: "put"; value: unknown }
  | { kind: "append"; from: number; values: unknown[] }
  | { kind: "object" | "map"; changes: [string, StatePatch][]; remove: string[] };
const equal = (a: unknown, b: unknown) => a === b || stateHash(a) === stateHash(b);
export function statePatch(before: unknown, after: unknown): StatePatch {
  if (
    Array.isArray(before) &&
    Array.isArray(after) &&
    before.length <= after.length &&
    before.every((item, index) => equal(item, after[index]))
  )
    return { kind: "append", from: before.length, values: after.slice(before.length) };
  if (plainRecord(before) && plainRecord(after))
    return fields("object", new Map(Object.entries(before)), new Map(Object.entries(after)));
  if (stringMap(before) && stringMap(after) && keepsOrder(before, after)) return fields("map", before, after);
  return { kind: "put", value: after };
}
function stringMap(value: unknown): value is Map<string, unknown> {
  return value instanceof Map && [...value.keys()].every(key => typeof key === "string");
}
function keepsOrder(before: Map<string, unknown>, after: Map<string, unknown>): boolean {
  const expected = [...before.keys()]
    .filter(key => after.has(key))
    .concat([...after.keys()].filter(k => !before.has(k)));
  const actual = [...after.keys()];
  return expected.every((key, i) => key === actual[i]);
}
function fields(kind: "object" | "map", before: Map<string, unknown>, after: Map<string, unknown>): StatePatch {
  const changes: [string, StatePatch][] = [];
  for (const [key, value] of after) {
    if (!before.has(key)) changes.push([key, { kind: "put", value }]);
    else if (!equal(before.get(key), value)) changes.push([key, statePatch(before.get(key), value)]);
  }
  return { kind, changes, remove: [...before.keys()].filter(key => !after.has(key)) };
}
export function applyStatePatch(before: unknown, patch: StatePatch): unknown {
  if (patch.kind === "put") return patch.value;
  if (patch.kind === "append") {
    if (!Array.isArray(before) || before.length !== patch.from) throw new Error("Invalid list base");
    return before.concat(patch.values);
  }
  const values = patch.kind === "map" && stringMap(before) ? new Map(before) : new Map(Object.entries(before ?? {}));
  for (const key of patch.remove) values.delete(key);
  for (const [key, change] of patch.changes) values.set(key, applyStatePatch(values.get(key), change));
  return patch.kind === "map" ? values : Object.fromEntries(values);
}

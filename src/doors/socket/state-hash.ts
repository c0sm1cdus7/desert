// A semantic Merkle fingerprint: independent of v8's object aliases, cached only for immutable state nodes.
import { createHash } from "node:crypto";
import { serialize } from "node:v8";
const cached = new WeakMap<object, string>();
export function stateHash(value: unknown): string {
  if (value === null || typeof value !== "object") return digest(serialize(value));
  const known = cached.get(value);
  if (known) return known;
  const hash = createHash("sha256");
  if (Array.isArray(value)) {
    hash.update("array");
    for (const item of value) hash.update(stateHash(item));
  } else if (value instanceof Map) {
    hash.update("map");
    for (const [key, item] of value) hash.update(stateHash(key)).update(stateHash(item));
  } else if (plainRecord(value)) {
    hash.update("object");
    for (const key of Object.keys(value).sort()) hash.update(stateHash(key)).update(stateHash(value[key]));
  } else hash.update(serialize(value));
  const result = hash.digest("hex");
  cached.set(value, result);
  return result;
}
export const digest = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
export function plainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

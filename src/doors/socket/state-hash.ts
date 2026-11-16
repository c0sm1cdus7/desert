// Merkle hashes of immutable parts: primitives have value encodings, never V8 storage encodings.
import { createHash } from "node:crypto";
const cached = new WeakMap<object, string>();
function scalar(value: unknown): string {
  if (value === null) return "null;";
  if (typeof value === "string") return `string:${JSON.stringify(value)};`;
  if (typeof value === "number") return `number:${String(value)};`;
  if (typeof value === "boolean" || typeof value === "bigint" || value === undefined)
    return `${typeof value}:${String(value)};`;
  throw new Error("Unsupported state value");
}
const part = (value: unknown): string =>
  value !== null && typeof value === "object" ? `hash:${stateHash(value)};` : scalar(value);
export function stateHash(value: unknown): string {
  if (value === null || typeof value !== "object") return digest(Buffer.from(scalar(value)));
  const known = cached.get(value);
  if (known) return known;
  const hash = createHash("sha256");
  if (Array.isArray(value)) {
    hash.update(`array:${value.length}:`);
    for (let index = 0; index < value.length; index++) hash.update(index in value ? part(value[index]) : "hole;");
  } else if (value instanceof Map) {
    hash.update("map:");
    for (const [key, item] of value) hash.update(part(key)).update(part(item));
  } else if (value instanceof Set) {
    hash.update("set:");
    for (const item of value) hash.update(part(item));
  } else if (value instanceof Date) hash.update(`date:${String(value.getTime())};`);
  else if (value instanceof RegExp) hash.update(`regexp:${JSON.stringify([value.source, value.flags])};`);
  else if (ArrayBuffer.isView(value)) {
    hash.update(Buffer.isBuffer(value) ? "Buffer:" : `${Object.prototype.toString.call(value)}:`);
    if (value instanceof Float32Array || value instanceof Float64Array)
      for (const item of value) hash.update(scalar(item));
    else hash.update(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  } else if (value instanceof ArrayBuffer) hash.update("ArrayBuffer:").update(new Uint8Array(value));
  else if (stateRecord(value)) {
    hash.update("object:");
    for (const key of Object.keys(value).sort()) hash.update(scalar(key)).update(part(value[key]));
  } else throw new Error("Unsupported state value");
  const result = hash.digest("hex");
  cached.set(value, result);
  return result;
}
export const digest = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
function stateRecord(value: object): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === Object.prototype.toString.call({});
}
export function plainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

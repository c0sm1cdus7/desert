import { createHash } from "node:crypto";
import { isAbsolute } from "node:path";
import type { TSchema } from "@sinclair/typebox";
import { createSchemaValidator } from "../validation.ts";
import { freezeDeep, jsonSnapshot } from "../json.ts";
import type { FixedProcessAdapter, ProcessAdapterDefinition } from "./types.ts";

export const executionDigest = (value: unknown) => createHash("sha256").update(JSON.stringify(jsonSnapshot(value))).digest("hex");
export function requireName(value: string) {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(value)) throw new Error("EXECUTION_NAME_INVALID");
}
export function requireLabel(value: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) throw new Error("EXECUTION_LABEL_INVALID");
}
export function requireKeys(value: object, keys: readonly string[]) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length
    || Object.entries(Object.getOwnPropertyDescriptors(value)).some(([key, descriptor]) =>
      !keys.includes(key) || !("value" in descriptor) || !descriptor.enumerable)) throw new Error("EXECUTION_PROPERTIES_INVALID");
}
export function requireRange(value: number, minimum: number, maximum: number) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error("EXECUTION_LIMIT_INVALID");
}

type Adapter = { definition: ProcessAdapterDefinition<TSchema>; digest: string; validate(input: unknown): boolean };
const adapters = new WeakMap<object, Adapter>();

export function fixedProcessAdapter<const S extends TSchema>(definition: ProcessAdapterDefinition<S>): FixedProcessAdapter<S> {
  requireKeys(definition, ["name", "executable", "arguments", "workingDirectory", "input", "timeoutMs", "maxOutputBytes"]);
  requireName(definition.name);
  if (!isAbsolute(definition.executable) || !isAbsolute(definition.workingDirectory)
    || definition.executable.includes("\0") || definition.workingDirectory.includes("\0")) throw new Error("EXECUTION_ABSOLUTE_PATH_REQUIRED");
  if (!Array.isArray(definition.arguments) || definition.arguments.some(value => typeof value !== "string" || value.includes("\0"))) {
    throw new Error("EXECUTION_ARGUMENTS_INVALID");
  }
  requireRange(definition.timeoutMs, 1, 300000);
  requireRange(definition.maxOutputBytes, 1, 1048576);
  // TypeBox's symbol metadata is not part of the trusted JSON Schema contract.
  const input = JSON.parse(JSON.stringify(definition.input));
  const snapshot = freezeDeep({ ...definition, arguments: [...definition.arguments], input });
  const validate = createSchemaValidator(input);
  const reference = Object.freeze({ name: definition.name }) as FixedProcessAdapter<S>;
  adapters.set(reference, { definition: snapshot, digest: executionDigest(snapshot), validate });
  return reference;
}

export function requireAdapter(reference: FixedProcessAdapter): Adapter {
  const adapter = adapters.get(reference);
  if (!adapter) throw new Error("EXECUTION_ADAPTER_REQUIRED");
  return adapter;
}
export function executionInput(adapter: Adapter, input: unknown) {
  let value: ReturnType<typeof jsonSnapshot>;
  try { value = jsonSnapshot(input); } catch { throw new Error("EXECUTION_INPUT_INVALID"); }
  if (!adapter.validate(value) || Buffer.byteLength(JSON.stringify(value)) > 65536) throw new Error("EXECUTION_INPUT_INVALID");
  return value;
}

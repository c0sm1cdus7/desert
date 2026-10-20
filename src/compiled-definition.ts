import type { ProductDefinition } from "./contracts.ts";

const definitions = new WeakMap<object, string>();

export function rememberDefinition(application: object, definition: ProductDefinition) {
  definitions.set(application, JSON.stringify(definition));
}

export function loadDefinition(application: object): ProductDefinition {
  const source = definitions.get(application);
  if (!source) throw new Error("UNCOMPILED_APPLICATION");
  return JSON.parse(source);
}

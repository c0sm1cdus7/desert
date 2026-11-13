import { programCall } from "../../tools/boundaries/program-call.ts";
// A value an act's schema marks as secret never reaches the journal: what is written carries a reference instead.
import type { TSchema } from "@sinclair/typebox";
import { secretLimits } from "../../catalogs/levers.ts";
import type { Program, State, ToolRegistry } from "../../tools/tool-contract.ts";
export const capturable = (value: unknown): value is string =>
  typeof value === "string" && value.length >= secretLimits.minLength;
export const wordsOf = (schema: unknown, found = new Set<string>()): Set<string> => {
  if (!schema || typeof schema !== "object") return found;
  if ("const" in schema && typeof schema.const === "string") found.add(schema.const);
  if ("properties" in schema && schema.properties && typeof schema.properties === "object")
    for (const key of Object.keys(schema.properties)) found.add(key);
  for (const child of Object.values(schema)) wordsOf(child, found);
  return found;
};
export class Redactor<X extends Program> {
  private readonly values: Map<string, string>;
  private readonly save: (value: string) => string;
  private readonly kept: ReadonlySet<string>;
  constructor(journal: TSchema, values: Map<string, string>, save: (value: string) => string) {
    this.kept = wordsOf(journal);
    this.values = values;
    this.save = save;
  }
  capture(value: unknown, registry: ToolRegistry<X>, state?: State<X>, seen = new Set<string>()): void {
    if (!value || typeof value !== "object") return;
    const signature = JSON.stringify(value);
    if (seen.has(signature)) return;
    seen.add(signature);
    if ("input" in value) {
      const name: unknown = "act" in value ? value.act : Reflect.get(value, "option");
      const acts = registry.flatMap(tool =>
        Object.entries(tool.acts).filter(([option]) => option === name || tool.id === Reflect.get(value, "object")),
      );
      for (const [, act] of acts) {
        if (programCall(act.secretInput?.bind(act), value.input) !== false) this.captureSchema(act.input, value.input);
        if (state) this.capture(programCall(act.secretInputs?.bind(act), value.input, state), registry, state, seen);
      }
    }
    for (const item of Object.values(value)) this.capture(item, registry, state, seen);
  }
  private captureSchema(schema: unknown, value: unknown, branch = false): void {
    if (!schema || typeof schema !== "object") return;
    if (branch && typeof value === "string" && "pattern" in schema && typeof schema.pattern === "string")
      if (!new RegExp(schema.pattern).test(value)) return;
    if ("secret" in schema && schema.secret === true && capturable(value)) {
      if (this.values.has(value)) return;
      this.values.set(value, this.save(value));
    }
    if ("properties" in schema && schema.properties && typeof schema.properties === "object")
      for (const [key, child] of Object.entries(schema.properties))
        if (value && typeof value === "object") this.captureSchema(child, Reflect.get(value, key));
    if ("items" in schema && Array.isArray(value)) for (const item of value) this.captureSchema(schema.items, item);
    if ("anyOf" in schema && Array.isArray(schema.anyOf))
      for (const arm of schema.anyOf) this.captureSchema(arm, value, true);
  }
  scrub = <T>(value: T): T => redact(value, this.values, this.kept);
}
export function redact<T>(value: T, values: ReadonlyMap<string, string>, kept: ReadonlySet<string>): T {
  const replacements = [...values].sort(([a], [b]) => b.length - a.length);
  const text = (value: string) => replacements.reduce((text, [secret, id]) => text.split(secret).join(id), value);
  const copy = structuredClone({ value });
  const walk = (object: object): void => {
    const entries: [string, unknown][] = Object.entries(object);
    for (const [key, item] of entries) {
      if (typeof item === "string" && !kept.has(item)) Reflect.set(object, key, text(item));
      else if (item && typeof item === "object") walk(item);
      if (kept.has(key)) continue;
      const name = text(key);
      if (name === key) continue;
      Reflect.set(object, name, Reflect.get(object, key));
      Reflect.deleteProperty(object, key);
    }
  };
  walk(copy);
  return copy.value;
}

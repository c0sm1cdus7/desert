// Compara inclusiones de esquemas admitidos, con recorte de campos de lectura.
import { Kind, type TSchema } from "@sinclair/typebox";

type Mode = "input" | "reading";
type Shape = TSchema & {
  type?: string;
  const?: unknown;
  properties?: Record<string, TSchema>;
  required?: string[];
  items?: TSchema;
  anyOf?: TSchema[];
  additionalProperties?: unknown;
};
const common = ["type", "title", "description", "default", "examples"];
const keys: Record<string, string[]> = {
  String: [],
  Number: [],
  Integer: [],
  Boolean: [],
  Null: [],
  Literal: ["const"],
  Object: ["properties", "required", "additionalProperties"],
  Array: ["items"],
  Union: ["anyOf"],
};
function supported(schema: Shape): boolean {
  const kind = schema[Kind];
  const allowed = Object.hasOwn(keys, kind) ? keys[kind] : undefined;
  if (!allowed || Object.keys(schema).some(key => !common.includes(key) && !allowed.includes(key))) return false;
  if (kind === "Object" && schema.additionalProperties !== undefined && schema.additionalProperties !== false)
    return false;
  return true;
}
function branches(schema: Shape): TSchema[] {
  return schema[Kind] === "Union" ? (schema.anyOf ?? []) : [schema];
}
function check(source: Shape, target: Shape, path: string, mode: Mode): string[] {
  if (!supported(source) || !supported(target)) return [`${path}:unsupported-schema`];
  if (source[Kind] === "Union" || target[Kind] === "Union") {
    const variants = branches(source);
    const choices = branches(target);
    if (!variants.length || !choices.length) return [`${path}:unsupported-schema`];
    const failures = variants.flatMap(a => {
      const options = choices.map(b => check(a, b, path, mode));
      return options.some(result => result.length === 0)
        ? []
        : [options.flat().find(x => x.endsWith(":unsupported-schema")) ?? `${path}:incompatible-value`];
    });
    return [...new Set(failures)];
  }
  const a = source[Kind],
    b = target[Kind];
  if (a === "Literal") return checkLiteral(source, target, path);
  if (a !== b && !(a === "Integer" && b === "Number")) return [`${path}:incompatible-value`];
  if (a === "Array")
    return source.items && target.items
      ? check(source.items, target.items, `${path}[]`, mode)
      : [`${path}:unsupported-schema`];
  if (a !== "Object") return [];
  return checkObject(source, target, path, mode);
}
function checkLiteral(source: Shape, target: Shape, path: string): string[] {
  if (target[Kind] === "Literal") return source.const === target.const ? [] : [`${path}:incompatible-value`];
  let literalType = "";
  if (source.const === null) literalType = "Null";
  else if (typeof source.const === "string") literalType = "String";
  else if (typeof source.const === "number") literalType = "Number";
  else if (typeof source.const === "boolean") literalType = "Boolean";
  if (
    literalType === target[Kind] ||
    (target[Kind] === "Integer" && typeof source.const === "number" && Number.isInteger(source.const))
  )
    return [];
  return [`${path}:incompatible-value`];
}
function checkObject(source: Shape, target: Shape, path: string, mode: Mode): string[] {
  if (mode === "input" && (source.additionalProperties !== false || target.additionalProperties !== false))
    return [`${path}:unsupported-schema`];
  const sp = source.properties ?? {},
    tp = target.properties ?? {};
  const requiredSource = new Set(source.required ?? []),
    requiredTarget = new Set(target.required ?? []);
  const errors: string[] = [];
  for (const name of Object.keys(mode === "input" ? sp : tp)) {
    if (!Object.hasOwn(mode === "input" ? tp : sp, name))
      errors.push(`${path}.${name}:${mode === "input" ? "field-not-accepted" : "field-not-offered"}`);
  }
  for (const name of requiredTarget)
    if (!requiredSource.has(name) && Object.hasOwn(tp, name)) errors.push(`${path}.${name}:may-be-missing`);
  for (const name of Object.keys(sp))
    if (sp[name] && tp[name] && Object.hasOwn(tp, name))
      errors.push(...check(sp[name], tp[name], `${path}.${name}`, mode));
  return [...new Set(errors)];
}
function unsupported(schema: Shape, path: string, depth = 0): string[] {
  if (depth > 32 || !supported(schema)) return [`${path}:unsupported-schema`];
  if (schema[Kind] === "Object")
    return Object.entries(schema.properties ?? {}).flatMap(([name, value]) =>
      unsupported(value, `${path}.${name}`, depth + 1),
    );
  if (schema[Kind] === "Array")
    return schema.items ? unsupported(schema.items, `${path}[]`, depth + 1) : [`${path}:unsupported-schema`];
  if (schema[Kind] === "Union")
    return schema.anyOf?.length
      ? schema.anyOf.flatMap(value => unsupported(value, path, depth + 1))
      : [`${path}:unsupported-schema`];
  return [];
}
export function schemaInclusion(source: TSchema, target: TSchema, path: string, mode: Mode): string[] {
  const errors = [...new Set([...unsupported(source, path), ...unsupported(target, path)])];
  return errors.length ? errors : check(source, target, path, mode);
}

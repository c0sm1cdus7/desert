// Compara inclusiones de esquemas admitidos, con recorte de campos de lectura.
import { Kind, type TSchema } from "@sinclair/typebox";

type Mode = "entrada" | "lectura";
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
  if (!supported(source) || !supported(target)) return [`${path}:esquema-no-soportado`];
  if (source[Kind] === "Union" || target[Kind] === "Union") {
    const variants = branches(source);
    const choices = branches(target);
    if (!variants.length || !choices.length) return [`${path}:esquema-no-soportado`];
    const failures = variants.flatMap(a => {
      const options = choices.map(b => check(a, b, path, mode));
      return options.some(result => result.length === 0)
        ? []
        : [options.flat().find(x => x.endsWith(":esquema-no-soportado")) ?? `${path}:valor-incompatible`];
    });
    return [...new Set(failures)];
  }
  const a = source[Kind],
    b = target[Kind];
  if (a === "Literal") return checkLiteral(source, target, path);
  if (a !== b && !(a === "Integer" && b === "Number")) return [`${path}:valor-incompatible`];
  if (a === "Array")
    return source.items && target.items
      ? check(source.items, target.items, `${path}[]`, mode)
      : [`${path}:esquema-no-soportado`];
  if (a !== "Object") return [];
  return checkObject(source, target, path, mode);
}
function checkLiteral(source: Shape, target: Shape, path: string): string[] {
  if (target[Kind] === "Literal") return source.const === target.const ? [] : [`${path}:valor-incompatible`];
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
  return [`${path}:valor-incompatible`];
}
function checkObject(source: Shape, target: Shape, path: string, mode: Mode): string[] {
  if (mode === "entrada" && (source.additionalProperties !== false || target.additionalProperties !== false))
    return [`${path}:esquema-no-soportado`];
  const sp = source.properties ?? {},
    tp = target.properties ?? {};
  const requiredSource = new Set(source.required ?? []),
    requiredTarget = new Set(target.required ?? []);
  const errors: string[] = [];
  for (const name of Object.keys(mode === "entrada" ? sp : tp)) {
    if (!Object.hasOwn(mode === "entrada" ? tp : sp, name))
      errors.push(`${path}.${name}:${mode === "entrada" ? "campo-no-admitido" : "campo-no-ofrecido"}`);
  }
  for (const name of requiredTarget)
    if (!requiredSource.has(name) && Object.hasOwn(tp, name)) errors.push(`${path}.${name}:puede-faltar`);
  for (const name of Object.keys(sp))
    if (sp[name] && tp[name] && Object.hasOwn(tp, name))
      errors.push(...check(sp[name], tp[name], `${path}.${name}`, mode));
  return [...new Set(errors)];
}
function unsupported(schema: Shape, path: string, depth = 0): string[] {
  if (depth > 32 || !supported(schema)) return [`${path}:esquema-no-soportado`];
  if (schema[Kind] === "Object")
    return Object.entries(schema.properties ?? {}).flatMap(([name, value]) =>
      unsupported(value, `${path}.${name}`, depth + 1),
    );
  if (schema[Kind] === "Array")
    return schema.items ? unsupported(schema.items, `${path}[]`, depth + 1) : [`${path}:esquema-no-soportado`];
  if (schema[Kind] === "Union")
    return schema.anyOf?.length
      ? schema.anyOf.flatMap(value => unsupported(value, path, depth + 1))
      : [`${path}:esquema-no-soportado`];
  return [];
}
export function schemaInclusion(source: TSchema, target: TSchema, path: string, mode: Mode): string[] {
  const errors = [...new Set([...unsupported(source, path), ...unsupported(target, path)])];
  return errors.length ? errors : check(source, target, path, mode);
}

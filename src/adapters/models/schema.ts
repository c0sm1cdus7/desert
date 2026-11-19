// Translates provider schemas while checking answers against the complete local contract.
import { checkSchemaKeywords, localKeywords } from "./schema-keywords.ts";
import { isDeepStrictEqual } from "node:util";
import { Kind, TypeGuard } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

type Schema = Record<string, unknown>;
const kinds: Record<string, string> = {
  object: "Object",
  array: "Array",
  string: "String",
  number: "Number",
  integer: "Integer",
  boolean: "Boolean",
  null: "Null",
};
// Only the shape travels to the provider; every other constraint (patterns, formats, ranges, lengths) stays in the local
// contract that checks each answer. A keyword the provider might reject can never be sent by omission from a list.
const providerKeywords = new Set([
  "type",
  "properties",
  "required",
  "items",
  "enum",
  "const",
  "anyOf",
  "oneOf",
  "allOf",
  "description",
  "title",
]);
const providerOmitted = (key: string) => !providerKeywords.has(key);
const isObject = (value: unknown): value is Schema =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export function providerSchema(schema: Schema): Schema {
  checkSchemaKeywords(schema);
  const visit = (node: unknown, seen: Set<object>): unknown => {
    if (typeof node === "boolean") return node ? {} : { not: {} };
    if (!isObject(node)) throw new Error("schema");
    if (seen.has(node)) return {};
    const next = new Set(seen).add(node);
    if (typeof node.$ref === "string") {
      if (node.$ref !== "#" && !node.$ref.startsWith("#/")) throw new Error("schema reference");
      const path =
        node.$ref === "#"
          ? []
          : node.$ref
              .slice(2)
              .split("/")
              .map(part => part.replace(/~1/g, "/").replace(/~0/g, "~"));
      const target = path.reduce<unknown>((current, part) => (isObject(current) ? current[part] : undefined), schema);
      return visit(target, next);
    }
    if ("oneOf" in node && "anyOf" in node) throw new Error("schema branches");
    const result: Schema = {};
    for (const [key, value] of Object.entries(node)) {
      if (providerOmitted(key)) continue;
      if (key === "properties") {
        if (!isObject(value)) throw new Error("schema properties");
        result[key] = Object.fromEntries(Object.entries(value).map(([name, child]) => [name, visit(child, next)]));
      } else if (key === "items") result[key] = visit(value, next);
      else if (["anyOf", "oneOf", "allOf"].includes(key)) {
        if (!Array.isArray(value)) throw new Error("schema branches");
        result[key === "oneOf" ? "anyOf" : key] = value.map(child => visit(child, next));
      } else result[key] = value;
    }
    if (node.type === "object") result.additionalProperties = false;
    return result;
  };
  const result = visit(schema, new Set());
  if (!isObject(result)) throw new Error("schema");
  return result;
}
type Check = (node: unknown, data: unknown) => boolean;
const shallow = (node: Schema): Schema => {
  const removed = [
    "$defs",
    "definitions",
    "anyOf",
    "oneOf",
    "allOf",
    "enum",
    "const",
    "properties",
    "additionalProperties",
    "items",
    "contains",
    "minContains",
    "maxContains",
  ];
  return Object.fromEntries(Object.entries(node).filter(([key]) => !removed.includes(key) && !localKeywords.has(key)));
};
const basicCheck = (basic: Schema, kind: string, data: unknown): boolean => {
  Object.defineProperty(basic, Kind, { value: kind });
  if (!TypeGuard.IsSchema(basic)) throw new Error("schema type");
  return Value.Check(basic, data);
};
const objectCheck = (node: Schema, data: unknown, check: Check): boolean => {
  if (node.properties !== undefined && !isObject(node.properties)) throw new Error("schema properties");
  const props = isObject(node.properties) ? node.properties : {};
  const unknown = Object.defineProperty({}, Kind, { value: "Unknown" });
  const basic = {
    ...shallow(node),
    properties: Object.fromEntries(Object.keys(props).map(key => [key, unknown])),
    additionalProperties: node.additionalProperties !== false,
  };
  if (!basicCheck(basic, "Object", data) || !isObject(data)) return false;
  return Object.entries(data).every(([key, entry]) => {
    if (Object.hasOwn(props, key)) return check(props[key], entry);
    return !isObject(node.additionalProperties) || check(node.additionalProperties, entry);
  });
};
const arrayCheck = (node: Schema, data: unknown, check: Check): boolean => {
  const unknown = Object.defineProperty({}, Kind, { value: "Unknown" });
  if (!basicCheck({ ...shallow(node), items: unknown }, "Array", data) || !Array.isArray(data)) return false;
  if (node.items !== undefined && !data.every(item => check(node.items, item))) return false;
  if (node.contains === undefined) return true;
  const count = data.filter(item => check(node.contains, item)).length;
  const min = node.minContains === undefined ? 1 : node.minContains;
  const max = node.maxContains === undefined ? Infinity : node.maxContains;
  if (typeof min !== "number" || typeof max !== "number") throw new Error("schema contains");
  return count >= min && count <= max;
};
const branchesCheck = (node: Schema, data: unknown, check: Check): boolean => {
  if (Array.isArray(node.enum) && !node.enum.some(item => isDeepStrictEqual(item, data))) return false;
  if ("const" in node && !isDeepStrictEqual(node.const, data)) return false;
  for (const key of ["allOf", "anyOf", "oneOf"] as const) {
    const branches = node[key];
    if (branches === undefined) continue;
    if (!Array.isArray(branches)) throw new Error(`schema ${key}`);
    const count = branches.filter(branch => check(branch, data)).length;
    if (key === "allOf" && count !== branches.length) return false;
    if (key === "anyOf" && count === 0) return false;
    if (key === "oneOf" && count !== 1) return false;
  }
  return true;
};
const reference = (root: Schema, ref: string): unknown => {
  if (ref !== "#" && !ref.startsWith("#/")) throw new Error("schema reference");
  const path =
    ref === "#"
      ? []
      : ref
          .slice(2)
          .split("/")
          .map(part => part.replace(/~1/g, "/").replace(/~0/g, "~"));
  return path.reduce<unknown>((current, part) => (isObject(current) ? current[part] : undefined), root);
};
const untyped = (node: Schema): boolean => {
  const neutral = new Set([
    "$defs",
    "definitions",
    "$id",
    "description",
    "title",
    "default",
    "enum",
    "const",
    "allOf",
    "anyOf",
    "oneOf",
  ]);
  if (Object.keys(node).some(key => !neutral.has(key) && !localKeywords.has(key))) throw new Error("schema type");
  return true;
};
export function matchesSchema(schema: Schema, value: unknown): boolean {
  checkSchemaKeywords(schema);
  const check: Check = (node, data) => {
    if (typeof node === "boolean") return node;
    if (!isObject(node)) throw new Error("schema");
    if (typeof node.$ref === "string") {
      const siblings = Object.fromEntries(Object.entries(node).filter(([key]) => key !== "$ref"));
      return check(reference(schema, node.$ref), data) && check(siblings, data);
    }
    if (!branchesCheck(node, data, check)) return false;
    if (node.type === undefined) return untyped(node);
    if (typeof node.type !== "string") throw new Error("schema type");
    const kind = kinds[node.type];
    if (!kind) throw new Error("schema type");
    if (node.type === "object") return objectCheck(node, data, check);
    if (node.type === "array") return arrayCheck(node, data, check);
    return basicCheck(shallow(node), kind, data);
  };
  return check(schema, value);
}

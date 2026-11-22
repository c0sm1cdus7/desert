// Leaves the one-valued fields of a discriminated union out of the provider grammar and puts them back in answers.
type Schema = Record<string, unknown>;
const isObject = (value: unknown): value is Schema =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const none = Symbol("none");
/** The one value a node allows: a literal, or an object whose every field is required and one-valued. */
function oneValue(node: unknown): unknown {
  if (!isObject(node)) return none;
  if ("const" in node) return node.const;
  if (Array.isArray(node.enum) && node.enum.length === 1) return node.enum[0];
  if (node.type !== "object" || !isObject(node.properties)) return none;
  const required = Array.isArray(node.required) ? node.required : [];
  const entries = Object.entries(node.properties).map(([key, child]) => [key, oneValue(child)] as const);
  if (!entries.length || entries.some(([key, value]) => value === none || !required.includes(key))) return none;
  return Object.fromEntries(entries);
}
/** The values a branch's first property allows: the field that tells the branches of a union apart. */
function firstValues(branch: Schema): readonly unknown[] | undefined {
  const [first] = isObject(branch.properties) ? Object.values(branch.properties) : [];
  if (!isObject(first)) return undefined;
  if ("const" in first) return [first.const];
  return Array.isArray(first.enum) ? first.enum : undefined;
}
/** The fields that do not travel: required, one-valued and not the first, in a branch told apart by its first. */
function constants(branch: unknown): ReadonlyMap<string, unknown> {
  if (!isObject(branch) || branch.type !== "object" || !isObject(branch.properties) || !firstValues(branch))
    return new Map();
  const required = Array.isArray(branch.required) ? branch.required : [];
  return new Map(
    Object.entries(branch.properties)
      .slice(1)
      .flatMap(([key, child]) => {
        const value = oneValue(child);
        return value !== none && required.includes(key) ? [[key, value] as const] : [];
      }),
  );
}
/** The provider form of a branch without its constants; the rest of the schema as it came. */
export function withoutConstants(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(withoutConstants);
  if (!isObject(node)) return node;
  const result = Object.fromEntries(Object.entries(node).map(([key, value]) => [key, withoutConstants(value)]));
  if (!Array.isArray(result.anyOf)) return result;
  result.anyOf = result.anyOf.map((branch: unknown, index) => {
    const dropped = constants(Array.isArray(node.anyOf) ? node.anyOf[index] : undefined);
    if (!dropped.size || !isObject(branch) || !isObject(branch.properties)) return branch;
    const properties = branch.properties;
    return {
      ...branch,
      properties: Object.fromEntries(Object.entries(properties).filter(([key]) => !dropped.has(key))),
      required: (Array.isArray(branch.required) ? branch.required : []).filter(key => !dropped.has(String(key))),
    };
  });
  return result;
}
/** The one branch whose first field allows the answer's: with none or several, the answer stays as it came. */
function chosen(branches: readonly unknown[], value: Schema): Schema | undefined {
  const found = branches.filter((branch): branch is Schema => {
    if (!isObject(branch) || !isObject(branch.properties)) return false;
    const [key] = Object.keys(branch.properties);
    const allowed = firstValues(branch);
    return key !== undefined && !!allowed && allowed.some(each => each === value[key]);
  });
  return found.length === 1 ? found[0] : undefined;
}
/** Puts back, from the complete local contract, every constant the provider grammar left out. */
export function withConstants(schema: unknown, value: unknown): unknown {
  if (!isObject(schema)) return value;
  if (Array.isArray(value))
    return isObject(schema.items) ? value.map(each => withConstants(schema.items, each)) : value;
  if (!isObject(value)) return value;
  if (Array.isArray(schema.anyOf)) {
    const branch = chosen(schema.anyOf, value);
    if (!branch) return value;
    const filled = withConstants(branch, value);
    // A field with one possible value has it, however an unconstrained answer spelled it.
    return isObject(filled) ? { ...filled, ...Object.fromEntries(constants(branch)) } : filled;
  }
  if (!isObject(schema.properties)) return value;
  const properties = schema.properties;
  return Object.fromEntries(
    Object.entries(value).map(([key, each]) => [key, key in properties ? withConstants(properties[key], each) : each]),
  );
}

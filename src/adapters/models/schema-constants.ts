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
/** Whether no other branch allows a value of this branch's first field. */
function alone(branches: readonly unknown[], index: number): boolean {
  const mine = isObject(branches[index]) ? (firstValues(branches[index]) ?? []) : [];
  return branches.every(
    (other, at) => at === index || !isObject(other) || !(firstValues(other) ?? []).some(value => mine.includes(value)),
  );
}
/** The provider form of a branch without its constants; the rest of the schema as it came. */
export function withoutConstants(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(withoutConstants);
  if (!isObject(node)) return node;
  const result = Object.fromEntries(Object.entries(node).map(([key, value]) => [key, withoutConstants(value)]));
  if (!Array.isArray(result.anyOf)) return result;
  const original: unknown[] = Array.isArray(node.anyOf) ? node.anyOf : [];
  result.anyOf = result.anyOf.map((branch: unknown, index) => {
    // A branch is told apart only when no other branch allows a value of its first field: else nothing is dropped.
    const dropped = alone(original, index) ? constants(original[index]) : new Map<string, unknown>();
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
/** A node behind a local reference, as the provider received it inlined; any other node as it is. */
function resolved(root: unknown, node: unknown, seen = 0): unknown {
  if (!isObject(node) || typeof node.$ref !== "string" || seen > 32) return node;
  const ref = node.$ref;
  if (ref !== "#" && !ref.startsWith("#/")) return node;
  const path =
    ref === "#"
      ? []
      : ref
          .slice(2)
          .split("/")
          .map(part => part.replace(/~1/g, "/").replace(/~0/g, "~"));
  return resolved(
    root,
    path.reduce<unknown>((at, part) => (isObject(at) ? at[part] : undefined), root),
    seen + 1,
  );
}
/** Puts back, from the complete local contract, every constant the provider grammar left out: through its unions,
 * exclusive ones too, and its references, as the provider read them. */
export function withConstants(schema: unknown, value: unknown, root: unknown = schema): unknown {
  const node = resolved(root, schema);
  if (!isObject(node)) return value;
  if (Array.isArray(value))
    return isObject(node.items) ? value.map(each => withConstants(node.items, each, root)) : value;
  if (!isObject(value)) return value;
  const union = [node.anyOf, node.oneOf].find(each => Array.isArray(each));
  if (Array.isArray(union)) {
    const branch = chosen(
      union.map(each => resolved(root, each)),
      value,
    );
    if (!branch) return value;
    const filled = withConstants(branch, value, root);
    // A field with one possible value has it, however an unconstrained answer spelled it.
    return isObject(filled) ? { ...filled, ...Object.fromEntries(constants(branch)) } : filled;
  }
  if (!isObject(node.properties)) return value;
  const properties = node.properties;
  return Object.fromEntries(
    Object.entries(value).map(([key, each]) => [
      key,
      key in properties ? withConstants(properties[key], each, root) : each,
    ]),
  );
}

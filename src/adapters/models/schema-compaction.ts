// Bounds the provider grammar as the house grows: merges equivalent branches, turns literal unions into enums
// and drops long enums. Every dropped constraint stays in the local contract that checks each answer.

type Schema = Record<string, unknown>;
/** Longer literal lists travel as their plain type; the local contract still rejects any value outside them. */
export const enumLimit = 32;
const isObject = (value: unknown): value is Schema =>
  typeof value === "object" && value !== null && !Array.isArray(value);
type Literal = Readonly<{ type: string; values: readonly unknown[] }>;
const literal = (node: unknown): Literal | undefined => {
  if (!isObject(node) || typeof node.type !== "string" || ["object", "array"].includes(node.type)) return undefined;
  const keys = Object.keys(node).filter(key => key !== "type" && key !== "title" && key !== "description");
  if (keys.length === 1 && keys[0] === "const") return { type: node.type, values: [node.const] };
  if (keys.length === 1 && keys[0] === "enum" && Array.isArray(node.enum))
    return { type: node.type, values: node.enum };
  return undefined;
};
const literalNode = (type: string, values: readonly unknown[]): Schema => {
  const seen = new Set<string>();
  const unique = values.filter(value => {
    const text = JSON.stringify(value);
    if (seen.has(text)) return false;
    seen.add(text);
    return true;
  });
  if (unique.length > enumLimit) return { type };
  return unique.length === 1 ? { type, const: unique[0] } : { type, enum: unique };
};
type Group = { type: string; first: number; branch: Schema; properties: Schema; rest: number[]; values: unknown[] };
/** Groups branches equal except for one literal property, by a signature, so the work stays linear. */
function groupsFor(branches: readonly Schema[], key: string): Group[] {
  const groups = new Map<string, Group>();
  branches.forEach((branch, index) => {
    const properties = branch.properties;
    if (branch.type !== "object" || !isObject(properties) || !(key in properties)) return;
    const found = literal(properties[key]);
    if (!found) return;
    const signature = JSON.stringify([found.type, { ...branch, properties: { ...properties, [key]: null } }]);
    const group = groups.get(signature);
    if (!group) {
      groups.set(signature, {
        type: found.type,
        first: index,
        branch,
        properties,
        rest: [],
        values: [...found.values],
      });
      return;
    }
    group.rest.push(index);
    group.values.push(...found.values);
  });
  return [...groups.values()].filter(group => group.rest.length > 0);
}
/** Object branches that differ only in one literal property become one branch with all those values. */
function mergeBranches(branches: readonly Schema[]): Schema[] {
  let current = unique(branches);
  for (let changed = true; changed;) {
    changed = false;
    for (const key of new Set(
      current.flatMap(each => (isObject(each.properties) ? Object.keys(each.properties) : [])),
    )) {
      const merged = groupsFor(current, key);
      if (!merged.length) continue;
      changed = true;
      const drop = new Set(merged.flatMap(group => group.rest));
      const replace = new Map(
        merged.map(group => [
          group.first,
          { ...group.branch, properties: { ...group.properties, [key]: literalNode(group.type, group.values) } },
        ]),
      );
      current = unique(current.flatMap((branch, index) => (drop.has(index) ? [] : [replace.get(index) ?? branch])));
    }
  }
  return current;
}
const unique = (branches: readonly Schema[]): Schema[] => {
  const seen = new Set<string>();
  return branches.filter(branch => {
    const text = JSON.stringify(branch);
    if (seen.has(text)) return false;
    seen.add(text);
    return true;
  });
};
function compactBranches(node: Schema, key: "anyOf" | "allOf"): Schema {
  const branches = node[key];
  if (!Array.isArray(branches) || key === "allOf") return node;
  let current = branches.filter(isObject);
  if (current.length !== branches.length) return node;
  const literals = current.map(literal);
  const first = literals[0];
  if (first && literals.every(each => each?.type === first.type)) {
    const rest = Object.fromEntries(Object.entries(node).filter(([name]) => name !== key));
    return {
      ...rest,
      ...literalNode(
        first.type,
        literals.flatMap(each => each?.values ?? []),
      ),
    };
  }
  current = mergeBranches(current);
  const [only] = current;
  if (only && current.length === 1 && Object.keys(node).length === 1) return only;
  return { ...node, [key]: current };
}
/** Compacts bottom-up, so literal lists nested inside branches are bounded before the branches are compared. */
export function compactProviderSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(compactProviderSchema);
  if (!isObject(node)) return node;
  let result: Schema = Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, compactProviderSchema(value)]),
  );
  if (Array.isArray(result.enum) && typeof result.type === "string" && result.enum.length > enumLimit)
    result = Object.fromEntries(Object.entries(result).filter(([key]) => key !== "enum"));
  return compactBranches(compactBranches(result, "anyOf"), "allOf");
}
/** The documented limits of the provider grammar, measured on the schema actually sent. */
export function providerComplexity(schema: unknown) {
  let optional = 0;
  let unions = 0;
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isObject(node)) return;
    if (Array.isArray(node.anyOf) || Array.isArray(node.type)) unions++;
    if (node.type === "object" && isObject(node.properties)) {
      const required = new Set(Array.isArray(node.required) ? node.required : []);
      optional += Object.keys(node.properties).filter(key => !required.has(key)).length;
    }
    Object.values(node).forEach(visit);
  };
  visit(schema);
  return { optional, unions, bytes: JSON.stringify(schema).length };
}
export const providerLimits = { optional: 24, unions: 16 } as const;

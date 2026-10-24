// Rule J. Law: a piece the owner approves shows every declared state × variant through one specimen, and a closed
// contract offers exactly the variant values its declaration names. Raises: VARIANT_WITHOUT_SPECIMEN.
//
// `<id>.specimens.ts` sits beside the declaration and is read as data, never evaluated:
//   import type { CatalogSpecimen } from "../../types.d.ts";
//   export const FieldSpecimens = [
//     { state: "empty", variants: { measure: "writing", purpose: "text" }, props: { label: "Title", value: "" } },
//   ] as const satisfies readonly CatalogSpecimen<"field">[];
// The binding is the declaration's binding + `Specimens`. The gate reads `state` and `variants` (string literals only);
// `props` may hold any expression, because TypeScript checks it against `CatalogProps<id>`. A composition declares no
// states: its one state is `default`.
import { posix } from "node:path";
import ts from "typescript";
import type { ContractSchema, ReadContract } from "../read-contract.ts";
import type { GateContext, ContentRule } from "./context.ts";
import type { LocatedDeclaration } from "./inventory.ts";
import { violation, type Violation } from "./violation.ts";

const code = "VARIANT_WITHOUT_SPECIMEN";
type Axes = Readonly<Record<string, readonly string[]>>;
type Variants = Readonly<Record<string, string>>;
export type ReadSpecimen = Readonly<{ state: string; variants: Variants; line: number }>;
type Problem = Readonly<{ line: number; what: string }>;
export type ReadSpecimens = Readonly<{ specimens: readonly ReadSpecimen[]; problems: readonly Problem[]; line: number }>;

/** Ledger key of one specimen: `<state>|<axis>=<value>,…` with axes sorted, or `<state>` alone. */
export function specimenKey(state: string, variants: Variants): string {
  const pairs = Object.keys(variants).sort().map(axis => `${axis}=${variants[axis]}`);
  return pairs.length ? `${state}|${pairs.join(",")}` : state;
}

function exportedArray(file: ts.SourceFile, binding: string): ts.ArrayLiteralExpression | string {
  const statements = file.statements.filter(statement => !ts.isImportDeclaration(statement));
  const [statement] = statements;
  const declared = statement && statements.length === 1 && ts.isVariableStatement(statement)
    && statement.declarationList.flags & ts.NodeFlags.Const && statement.declarationList.declarations.length === 1
    && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ? statement.declarationList.declarations[0] : undefined;
  if (!declared || !ts.isIdentifier(declared.name) || declared.name.text !== binding) return `holds imports and one \`export const ${binding}\` only`;
  const value = declared.initializer && ts.isSatisfiesExpression(declared.initializer) ? declared.initializer.expression : declared.initializer;
  if (!value || !ts.isAsExpression(value) || value.type.getText(file) !== "const" || !ts.isArrayLiteralExpression(value.expression)) {
    return `${binding} is an array literal ending with \`as const\``;
  }
  return value.expression;
}

const keyOf = (property: ts.ObjectLiteralElementLike) => ts.isPropertyAssignment(property)
  && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? property.name.text : undefined;

function variantsOf(node: ts.Expression): Variants | string {
  if (!ts.isObjectLiteralExpression(node)) return "variants is an object literal";
  const variants: Record<string, string> = {};
  for (const property of node.properties) {
    const axis = keyOf(property);
    if (!axis || !ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.initializer)) return "each variant is `axis: \"value\"`";
    if (axis in variants) return `variant axis ${axis} is named twice`;
    variants[axis] = property.initializer.text;
  }
  return variants;
}

function specimenOf(node: ts.Expression): Omit<ReadSpecimen, "line"> | string {
  if (!ts.isObjectLiteralExpression(node)) return "a specimen is an object literal";
  let state: string | undefined, variants: Variants = {};
  for (const property of node.properties) {
    const key = keyOf(property);
    if (!key || !ts.isPropertyAssignment(property)) return "a specimen holds plain state, variants and props";
    if (key === "state") {
      if (!ts.isStringLiteral(property.initializer)) return "state is a string literal";
      state = property.initializer.text;
    } else if (key === "variants") {
      const read = variantsOf(property.initializer);
      if (typeof read === "string") return read;
      variants = read;
    } else if (key !== "props") return `unknown specimen field ${key}`;
  }
  return state === undefined ? "a specimen names its state" : { state, variants };
}

/** Reads a specimens file as data: its specimens, and each part that is not data. */
export function readSpecimens(file: ts.SourceFile, binding: string, lineOf: (node: ts.Node) => number): ReadSpecimens {
  const array = exportedArray(file, binding);
  if (typeof array === "string") return { specimens: [], problems: [{ line: 1, what: array }], line: 1 };
  const specimens: ReadSpecimen[] = [], problems: Problem[] = [];
  for (const element of array.elements) {
    const read = specimenOf(element);
    if (typeof read === "string") problems.push({ line: lineOf(element), what: read });
    else specimens.push({ ...read, line: lineOf(element) });
  }
  return { specimens, problems, line: lineOf(array) };
}

function combinations(states: readonly string[], axes: Axes): readonly string[] {
  let partial: readonly Variants[] = [{}];
  for (const [axis, values] of Object.entries(axes)) partial = partial.flatMap(variants => values.map(value => ({ ...variants, [axis]: value })));
  return states.flatMap(state => partial.map(variants => specimenKey(state, variants)));
}

function undeclaredNames(specimen: ReadSpecimen, states: readonly string[], axes: Axes): readonly string[] {
  const names: string[] = [];
  if (!states.includes(specimen.state)) names.push(`undeclared state ${specimen.state}`);
  for (const [axis, value] of Object.entries(specimen.variants)) {
    const values = axes[axis];
    if (!values) names.push(`undeclared axis ${axis}`);
    else if (!values.includes(value)) names.push(`undeclared value ${value} of axis ${axis}`);
  }
  for (const axis of Object.keys(axes)) if (!(axis in specimen.variants)) names.push(`no value for axis ${axis}`);
  return names;
}

function specimenViolations(id: string, path: string, read: ReadSpecimens, states: readonly string[], axes: Axes, required: boolean): Violation[] {
  const found: Violation[] = read.problems.map(problem => violation(code, path, problem.line, `${id} specimens: ${problem.what}`));
  const covered = new Set<string>();
  for (const specimen of read.specimens) {
    const names = undeclaredNames(specimen, states, axes), key = specimenKey(specimen.state, specimen.variants);
    for (const name of names) found.push(violation(code, path, specimen.line, `${id} specimen ${key} names ${name}`));
    if (names.length) continue;
    if (covered.has(key)) found.push(violation(code, path, specimen.line, `${id} specimen ${key} is written twice`));
    covered.add(key);
  }
  if (required && !read.problems.length) for (const key of combinations(states, axes)) {
    if (!covered.has(key)) found.push(violation(code, path, read.line, `${id} has no specimen for ${key}`));
  }
  return found;
}

function literalValues(schema: ContractSchema): readonly string[] | undefined {
  if (schema.kind === "literal") return typeof schema.value === "string" ? [schema.value] : undefined;
  if (schema.kind !== "union") return undefined;
  const values: string[] = [];
  for (const member of schema.members) {
    if (member.kind !== "literal" || typeof member.value !== "string") return undefined;
    values.push(member.value);
  }
  return values;
}

function contractDrift(id: string, path: string, contract: ReadContract, axes: Axes): Violation[] {
  if (!contract.closed) return [];
  const found: Violation[] = [];
  for (const [axis, declared] of Object.entries(axes)) {
    const property = contract.props[axis], offered = property && literalValues(property.schema);
    const same = offered !== undefined && offered.length === declared.length && declared.every(value => offered.includes(value));
    if (same) continue;
    const contractSide = !property ? "has no prop" : offered ? `offers ${[...offered].sort().join(", ")}` : "is not a string-literal union";
    found.push(violation(code, path, 1, `${id} axis ${axis}: declaration names ${[...declared].sort().join(", ")}, contract props.${axis} ${contractSide}`));
  }
  return found;
}

function pieceViolations(context: GateContext, { path, declaration }: LocatedDeclaration): Violation[] {
  if (declaration.kind === "mechanism") return [];
  const folder = posix.dirname(path), id = declaration.id, specimensPath = posix.join(folder, `${id}.specimens.ts`);
  const states = declaration.kind === "foundation" ? declaration.states : ["default"];
  const axes: Axes = declaration.kind === "foundation" ? declaration.variants ?? {} : {};
  const required = declaration.approval === "required", contract = context.contract(id);
  const drift = contract ? contractDrift(id, posix.join(folder, `${id}.contract.ts`), contract, axes) : [];
  if (context.text(specimensPath) === undefined) {
    const uncovered = combinations(states, axes).length;
    return required ? [...drift, violation(code, path, 1, `${id} has no ${id}.specimens.ts: ${uncovered} state × variant combination${uncovered === 1 ? "" : "s"} uncovered`)] : drift;
  }
  const parsed = context.parsed(specimensPath), [script] = parsed.scripts;
  if (!script) return [...drift, violation(code, specimensPath, 1, `${id} specimens file holds no script`)];
  const read = readSpecimens(script.file, `${declaration.binding}Specimens`, node => parsed.line(script.offset + node.getStart(script.file)));
  return [...drift, ...specimenViolations(id, specimensPath, read, states, axes, required)];
}

export const ruleJ: ContentRule = context => context.declarations.flatMap(located => pieceViolations(context, located));

// Rule U. Law: a closed contract is closed in what its types ARE, not only in where they come from. The reader admits
// `Type.Unsafe<T>()` and schema references only from non-visual tree modules; this rule asks the TypeScript checker what
// every prop, event and instance member of each closed contract resolves to, through every property, union, array,
// map, call signature and `this` parameter, and refuses `any`, `unknown`, `object`, `{}`, `Function`/`Object`, unresolved
// generics (a type parameter, a conditional, `keyof T`, `T[K]`) and any type declared by the DOM, Svelte or Node.
// Raises: CONTRACT_OPEN_TYPE.
//
// The judged tree is read as data: the checker parses it and evaluates nothing, and the tree cannot change what the
// checker believes. Packages (TypeBox, Svelte) resolve only in the gate's own checkout; a tree file may not reach other
// files through `/// <reference>` directives, declare ambient modules or `declare global`, or import outside the tree;
// TypeScript's library is recognised by the program (its default library files in the checkout), never by a path name.
import { realpathSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import ts from "typescript";
import type { CatalogLayout } from "../layout.ts";
import type { ContentRule } from "./context.ts";
import type { LocatedDeclaration } from "./inventory.ts";
import { contractPath, type ReadContract } from "../read-contract.ts";
import { violation, type Violation } from "./violation.ts";

const code = "CONTRACT_OPEN_TYPE";
// Real paths: TypeScript hands over resolved files, so a symlinked node_modules or checkout must compare the same.
const checkout = realpathSync(resolve(import.meta.dirname, "../../../.."));
const packages = join(checkout, "node_modules");
/** Library files whose types never cross a contract: browser globals. Packages whose types never do: Svelte and Node. */
const foreignLibrary = /^lib\.(dom|webworker|scripthost)[^/]*\.d\.ts$/;
const foreignPackages = ["svelte", "@types/node"].map(name => join(packages, name) + "/");
/** ES library types that are open themselves. */
const openLibrary = new Set(["Function", "Object", "CallableFunction", "NewableFunction"]);
/** ES library types trusted as values: judged by their type arguments only (Promise<T>, ReadonlyMap<K, V>). Every other
 * library interface (Error, PropertyDescriptor, JSON, a *Constructor) is walked member by member like a domain type. */
const trustedLibrary = new Set(["Array", "ReadonlyArray", "Promise", "Map", "ReadonlyMap", "Set", "ReadonlySet", "Date", "RegExp",
  "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array",
  "BigInt64Array", "BigUint64Array", "String", "Number", "Boolean", "Symbol", "BigInt"]);
const sections = ["props", "events", "instance"] as const;
const inside = (file: string, folder: string) => { const path = relative(folder, file); return path !== "" && !path.startsWith("..") && !posix.isAbsolute(path); };

export type ClosedContract = Readonly<{ declaration: LocatedDeclaration; contract: Extract<ReadContract, { closed: true }> }>;

function compilerHost(options: ts.CompilerOptions, entry: string, entryText: string, root: string, aliases: CatalogLayout["aliases"],
  unresolved: (containing: string, name: string) => void) {
  const host = ts.createCompilerHost(options, true);
  const readFile = host.readFile.bind(host), fileExists = host.fileExists.bind(host), getSourceFile = host.getSourceFile.bind(host);
  host.readFile = file => file === entry ? entryText : readFile(file);
  host.fileExists = file => file === entry || fileExists(file);
  host.getSourceFile = (file, language, ...rest) => file === entry
    ? ts.createSourceFile(file, entryText, language, true, ts.ScriptKind.TS) : getSourceFile(file, language, ...rest);
  // Tree modules resolve in the judged tree; packages always resolve in the gate's own checkout, so a judged tree cannot
  // supply its own TypeBox or Svelte types to the judgement.
  // A tree module that does not resolve, or resolves outside the judged tree, is reported, never silently `any`.
  const resolution = (name: string, containing: string) => {
    if (inside(resolve(containing), packages)) return ts.resolveModuleName(name, containing, options, ts.sys).resolvedModule;
    const alias = aliases.find(([prefix]) => name.startsWith(prefix));
    if (!alias && !name.startsWith(".")) return ts.resolveModuleName(name, join(checkout, "package.json"), options, ts.sys).resolvedModule;
    const request = alias ? join(root, alias[1], name.slice(alias[0].length)) : name;
    const found = ts.resolveModuleName(request, containing, options, host).resolvedModule;
    if (found && inside(resolve(found.resolvedFileName), root)) return found;
    // A Svelte component has no TypeScript module here; a contract type that reaches one is reported as `any` where it is used.
    if (!name.endsWith(".svelte")) unresolved(containing, name);
    return undefined;
  };
  host.resolveModuleNameLiterals = (literals, containing) => literals.map(literal => ({ resolvedModule: resolution(literal.text, containing) }));
  return { host, resolution };
}

/** Every closed contract's props, events and instance as one checker program over the judged tree. */
export function contractTypeViolations(judged: string, layout: Pick<CatalogLayout, "aliases">, closed: readonly ClosedContract[]): readonly Violation[] {
  if (!closed.length) return [];
  const root = realpathSync(judged), entry = join(root, "__catalog_contract_types__.ts");
  const lines = ['import type { Static } from "@sinclair/typebox";'];
  closed.forEach(({ declaration, contract }, index) => {
    const file = contractPath(declaration.path, declaration.declaration.id);
    lines.push(`import type { ${contract.binding} as C${index} } from ${JSON.stringify(`./${file}`)};`);
    for (const section of sections) lines.push(`export type T${index}_${section} = typeof C${index} extends { readonly ${section}: infer S extends import("@sinclair/typebox").TSchema } ? Static<S> : never;`);
  });
  const options: ts.CompilerOptions = { strict: true, noEmit: true, target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true, skipLibCheck: true, types: [], lib: ["lib.es2023.d.ts", "lib.dom.d.ts"] };
  const text = `${lines.join("\n")}\n`;
  const found: Violation[] = [];
  const at = (file: string) => relative(root, file).split("\\").join("/");
  const unresolved = (containing: string, name: string) =>
    found.push(violation(code, at(containing), 0, `imports ${name}, which does not resolve inside the judged tree; a contract's types are read from the tree only`));
  // Svelte's ambient runes ($state, $derived) always join the program, so a `.svelte.ts` module's types never depend on
  // which other contracts happen to pull Svelte in.
  const { host, resolution } = compilerHost(options, entry, text, root, layout.aliases, unresolved), runes = resolution("svelte", entry);
  if (!runes) throw new Error("CATALOG_GATE_CONTRACT_TYPES: svelte's types do not resolve");
  const program = ts.createProgram([entry, runes.resolvedFileName], options, host);
  // The library is TypeScript's own default library files, by place first: a tree file is never asked (a tree file with
  // `/// <reference no-default-lib="true" />` would otherwise pass as a library).
  const libraryFolder = realpathSync(dirname(ts.getDefaultLibFilePath(options)));
  const library = (file: ts.SourceFile) => inside(resolve(file.fileName), libraryFolder) && program.isSourceFileDefaultLibrary(file);
  const packaged = (file: ts.SourceFile) => inside(resolve(file.fileName), packages);
  for (const file of program.getSourceFiles()) {
    if (file.fileName === entry || library(file) || packaged(file)) continue;
    found.push(...treeFileViolations(file, at(file.fileName)));
  }
  const checker = program.getTypeChecker(), source = program.getSourceFile(entry);
  if (!source) throw new Error("CATALOG_GATE_CONTRACT_TYPES: the contract type program has no entry");
  const exportsOf = new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(source) ?? notModule()).map(symbol => [symbol.name, symbol]));
  const judge: Judge = { checker, library, packaged };
  closed.forEach(({ declaration }, index) => {
    const id = declaration.declaration.id, path = contractPath(declaration.path, id), reported = new Set<string>();
    for (const section of sections) {
      const alias = exportsOf.get(`T${index}_${section}`);
      if (!alias) throw new Error(`CATALOG_GATE_CONTRACT_TYPES: the program lost ${id}'s ${section}`);
      walk(judge, checker.getDeclaredTypeOfSymbol(alias), section, new Set(), (trail, what) => {
        // One finding per place: every open type is its own finding.
        const key = `${trail}|${what}`;
        if (reported.has(key)) return;
        reported.add(key);
        found.push(violation(code, path, 0, `${id} ${trail} resolves to ${what}; a contract carries domain values, never an open or platform type`));
      });
    }
  });
  return found;
}

/** A tree file changes nothing about the checker: no reference directives, ambient modules or global declarations. */
function treeFileViolations(file: ts.SourceFile, path: string): Violation[] {
  const found: Violation[] = [];
  const directives = [...file.referencedFiles.map(item => `path="${item.fileName}"`), ...file.typeReferenceDirectives.map(item => `types="${item.fileName}"`),
    ...file.libReferenceDirectives.map(item => `lib="${item.fileName}"`), ...file.hasNoDefaultLib ? ['no-default-lib="true"'] : []];
  for (const directive of directives) found.push(violation(code, path, 0, `holds /// <reference ${directive} />; a tree file reaches other files by import only`));
  const visit = (node: ts.Node): void => {
    if (ts.isModuleDeclaration(node) && (ts.isStringLiteral(node.name) || node.flags & ts.NodeFlags.GlobalAugmentation)) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      found.push(violation(code, path, line, `declares ${ts.isStringLiteral(node.name) ? `module "${node.name.text}"` : "global"}; a tree file cannot change what a package or a global is`));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

type Judge = Readonly<{ checker: ts.TypeChecker; library: (file: ts.SourceFile) => boolean; packaged: (file: ts.SourceFile) => boolean }>;
const filesOf = (symbol: ts.Symbol | undefined) => symbol?.declarations?.map(item => item.getSourceFile()) ?? [];
const primitive = ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.ESSymbolLike;
const unresolvedGeneric = ts.TypeFlags.TypeParameter | ts.TypeFlags.Conditional | ts.TypeFlags.Index | ts.TypeFlags.IndexedAccess | ts.TypeFlags.Substitution;

function notModule(): never { throw new Error("CATALOG_GATE_CONTRACT_TYPES: the contract type entry is not a module"); }

/** The platform a type is declared by, or undefined: a browser library file, or the Svelte or Node packages. */
function platform({ library }: Judge, type: ts.Type): string | undefined {
  for (const file of [...filesOf(type.aliasSymbol), ...filesOf(type.getSymbol())]) {
    const name = posix.basename(file.fileName.split("\\").join("/"));
    if (library(file) && foreignLibrary.test(name)) return name;
    const at = resolve(file.fileName);
    const owner = foreignPackages.find(folder => at.startsWith(folder));
    if (owner) return relative(packages, at).split("\\").join("/");
  }
  return undefined;
}

const emptyObject = (checker: ts.TypeChecker, type: ts.Type) => !!(type.flags & ts.TypeFlags.Object) && !checker.getPropertiesOfType(type).length
  && !type.getCallSignatures().length && !type.getConstructSignatures().length && !checker.getIndexInfosOfType(type).length;

function walk(judge: Judge, type: ts.Type, trail: string, seen: Set<ts.Type>, report: (trail: string, what: string) => void): void {
  const { checker } = judge;
  // `any`, `unknown` and `object` are one type each: they are reported wherever they occur, before the seen check.
  if (type.flags & ts.TypeFlags.Any) return report(trail, "any");
  if (type.flags & ts.TypeFlags.Unknown) return report(trail, "unknown");
  if (type.flags & ts.TypeFlags.NonPrimitive) return report(trail, "object");
  if (seen.has(type)) return;
  seen.add(type);
  // A generic is judged by its constraint: `K extends AccessMethod` is as closed as AccessMethod; `T` alone is unknown.
  if (type.flags & unresolvedGeneric) {
    const constraint = checker.getBaseConstraintOfType(type);
    if (!constraint || constraint === type || constraint.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
      return report(trail, `the unconstrained generic ${checker.typeToString(type)}`);
    }
    return walk(judge, constraint, trail, seen, report);
  }
  if (type.isUnionOrIntersection()) {
    // `string & {}` is a brand: an empty object beside a primitive narrows it and is not a value of its own.
    const branded = type.isIntersection() && type.types.some(member => member.flags & primitive);
    for (const member of type.types) if (!(branded && emptyObject(checker, member))) walk(judge, member, trail, seen, report);
    return;
  }
  if (!(type.flags & ts.TypeFlags.Object)) return;
  const symbol = type.getSymbol(), name = checker.typeToString(type), foreign = platform(judge, type);
  if (foreign) return report(trail, `${name} (${foreign})`);
  const declared = filesOf(symbol), fromLibrary = declared.length > 0 && declared.every(judge.library);
  if (fromLibrary && symbol && openLibrary.has(symbol.name)) return report(trail, symbol.name);
  // A section with no members (`props: Type.Object({})`) is closed; an empty object type as a value is not.
  if (emptyObject(checker, type)) return sections.some(section => section === trail) ? undefined : report(trail, "{}");
  const object = type as ts.ObjectType;
  if (object.objectFlags & ts.ObjectFlags.Reference) {
    checker.getTypeArguments(type as ts.TypeReference).forEach((argument, index) => walk(judge, argument, `${trail}<${index}>`, seen, report));
    if (checker.isTupleType(type) || checker.isArrayType(type)) return;
  }
  // A trusted ES library type (Promise, Array, Map, Date) that no tree file augments is judged by its type arguments
  // only; any other library interface and any mapped utility (Readonly, Pick) is walked like an object, member by member.
  if (fromLibrary && symbol && trustedLibrary.has(symbol.name) && symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.Class)) return;
  for (const property of checker.getPropertiesOfType(type)) {
    // A private or #private member is not part of what a caller can reach.
    const declared = property.valueDeclaration ?? property.declarations?.[0];
    if (property.name.startsWith("#") || declared && ts.getCombinedModifierFlags(declared) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    const propertyType = declaration ? checker.getTypeOfSymbolAtLocation(property, declaration) : checker.getTypeOfSymbol(property);
    walk(judge, propertyType, `${trail}.${property.name}`, seen, report);
  }
  for (const info of checker.getIndexInfosOfType(type)) walk(judge, info.type, `${trail}[]`, seen, report);
  for (const signature of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
    for (const parameter of [...signature.thisParameter ? [signature.thisParameter] : [], ...signature.getParameters()]) {
      const at = parameter.valueDeclaration;
      walk(judge, at ? checker.getTypeOfSymbolAtLocation(parameter, at) : checker.getTypeOfSymbol(parameter), `${trail}(${parameter.name})`, seen, report);
    }
    walk(judge, signature.getReturnType(), `${trail}()`, seen, report);
  }
}

export const ruleU: ContentRule = context => {
  if (context.contractTypes === "unread") throw new Error("CONTRACT_TYPES_UNREAD: rule U needs contractTypeViolations over the tree, then withContractTypes");
  return context.contractTypes;
};

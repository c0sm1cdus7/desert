// Rule U. Law: a closed contract is closed in what its types ARE, not only in where they come from. The reader
// admits `Type.Unsafe<T>()` and schema references only from non-visual tree modules; this rule asks the TypeScript
// checker what every prop, event and instance member of each closed contract resolves to, through every property,
// union, array, map, call signature, setter, type predicate and `this` parameter. It refuses `any`, `unknown`,
// `object`, `{}`, every ES library interface or class but a short list of value types (the library's mapped utilities
// and namespaces are walked), generics without a closed constraint (`<T>`, a conditional, `keyof T`, `T[K]` over them)
// and any type declared by the DOM, Svelte or Node.
// Raises: CONTRACT_OPEN_TYPE.
//
// The judged tree is read as data: the checker parses it and evaluates nothing, and the tree cannot change what the
// checker believes. Packages (TypeBox, Svelte) resolve only in the gate's own checkout; a tree file may not reach other
// files through `/// <reference>` directives, be a script file (its declarations are globals), declare ambient modules or
// `declare global`, or import outside the tree;
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
/** The ES library interfaces and classes a contract may carry, each judged by its first N type arguments only (Promise<T>,
 * Map<K, V>, Iterable<T> without its `any` defaults). Every other library interface or class (Function, Object, Error,
 * PropertyDescriptor, JSON, a *Constructor) is refused as it is: the library is fixed, since no tree file may change a global. */
const trustedLibrary: ReadonlyMap<string, number> = new Map([
  ...["Array", "ReadonlyArray", "Promise", "PromiseLike", "Set", "ReadonlySet", "ArrayLike", "Iterable", "IterableIterator", "AsyncIterable",
    "AsyncIterableIterator"].map(name => [name, 1] as const),
  ...["Map", "ReadonlyMap"].map(name => [name, 2] as const),
  ...["Date", "RegExp", "RegExpMatchArray", "RegExpExecArray", "TemplateStringsArray", "Int8Array", "Uint8Array", "Uint8ClampedArray",
    "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array", "BigInt64Array", "BigUint64Array",
    "String", "Number", "Boolean", "Symbol", "BigInt"].map(name => [name, 0] as const)]);
/** Deeper than this a type stops the walk with one finding: generic instantiations can be unbounded. */
const maxDepth = 64;
/** More types than this in one section stop the walk with one finding: a branching generic grows without bound. */
const maxTypes = 20000;
/** Stops a section's walk: an unbounded type is one finding, not thousands. */
class WalkLimit extends Error {}
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
      const report = (trail: string, what: string) => {
        // One finding per place an open type is first reached (a type shared by two members is judged once).
        const key = `${trail}|${what}`;
        if (reported.has(key)) return;
        reported.add(key);
        found.push(violation(code, path, 0, `${id} ${trail} resolves to ${what}; a contract carries domain values, never an open or platform type`));
      };
      try { walk(judge, checker.getDeclaredTypeOfSymbol(alias), section, new Set(), report); }
      catch (error) {
        if (!(error instanceof WalkLimit)) throw error;
        found.push(violation(code, path, 0, `${id} ${section} ${error.message}; a contract carries finite domain values`));
      }
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
  // A script file (no import or export) declares globals with every top-level statement: `interface Array<T> { leak: any }`.
  if (!ts.isExternalModule(file) && file.statements.length) {
    found.push(violation(code, path, 0, "is a script file: its top-level declarations are globals; a tree file is a module (import or export)"));
  }
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

function walk(judge: Judge, type: ts.Type, trail: string, seen: Set<ts.Type>, report: (trail: string, what: string) => void, depth = 0): void {
  const { checker } = judge, next = (inner: ts.Type, at: string) => walk(judge, inner, at, seen, report, depth + 1);
  if (depth > maxDepth) throw new WalkLimit(`${trail.slice(0, 80)}… nests deeper than ${maxDepth} levels`);
  // `any`, `unknown` and `object` are one type each: they are reported wherever they occur, before the seen check.
  if (type.flags & ts.TypeFlags.Any) return report(trail, "any");
  if (type.flags & ts.TypeFlags.Unknown) return report(trail, "unknown");
  if (type.flags & ts.TypeFlags.NonPrimitive) return report(trail, "object");
  if (seen.has(type)) return;
  seen.add(type);
  if (seen.size > maxTypes) throw new WalkLimit(`reaches more than ${maxTypes} types`);
  // A generic is judged by its constraint: `K extends AccessMethod` is as closed as AccessMethod; `T` alone is unknown.
  if (type.flags & unresolvedGeneric) {
    const constraint = checker.getBaseConstraintOfType(type);
    if (!constraint || constraint === type || constraint.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
      return report(trail, `the unconstrained generic ${checker.typeToString(type)}`);
    }
    return next(constraint, trail);
  }
  if (type.isUnionOrIntersection()) {
    // `string & {}` is a brand: an empty object beside a primitive narrows it and is not a value of its own.
    const branded = type.isIntersection() && type.types.some(member => member.flags & primitive);
    for (const member of type.types) if (!(branded && emptyObject(checker, member))) next(member, trail);
    return;
  }
  if (!(type.flags & ts.TypeFlags.Object)) return;
  const symbol = type.getSymbol(), name = checker.typeToString(type), foreign = platform(judge, type);
  if (foreign) return report(trail, `${name} (${foreign})`);
  const declared = filesOf(symbol), fromLibrary = declared.length > 0 && declared.every(judge.library);
  // A library interface or class is trusted or refused; a mapped utility (Readonly, Pick) is walked like an object.
  if (fromLibrary && symbol && symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.Class)) {
    const judged = trustedLibrary.get(symbol.name);
    if (judged === undefined) return report(trail, `the library type ${symbol.name}`);
    const object = type as ts.ObjectType;
    const args = object.objectFlags & ts.ObjectFlags.Reference ? checker.getTypeArguments(type as ts.TypeReference) : [];
    args.slice(0, judged).forEach((argument, index) => next(argument, `${trail}<${index}>`));
    return;
  }
  // A section with no members (`props: Type.Object({})`) is closed; an empty object type as a value is not.
  if (emptyObject(checker, type)) return sections.some(section => section === trail) ? undefined : report(trail, "{}");
  // A tree interface or class over a library base (`extends Array<string>`, `extends Error`) is its own members plus that
  // base, judged as the library type it is: inherited library members are not walked as if the tree declared them.
  const bases = type.isClassOrInterface() ? checker.getBaseTypes(type) : [];
  for (const base of bases) next(base, `${trail}:${checker.typeToString(base)}`);
  const inherited = (property: ts.Symbol) => !!property.declarations?.length && property.declarations.every(item => judge.library(item.getSourceFile()));
  // A tuple is its elements; a tree type's type arguments are judged beside its members.
  if ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) {
    checker.getTypeArguments(type as ts.TypeReference).forEach((argument, index) => next(argument, `${trail}<${index}>`));
    if (checker.isTupleType(type)) return;
  }
  for (const property of checker.getPropertiesOfType(type)) {
    if (bases.length && inherited(property)) continue;
    // A private or #private member is not part of what a caller can reach; a quoted "#name" key is an ordinary member.
    const declaration = property.valueDeclaration ?? property.declarations?.[0], named = declaration && ts.getNameOfDeclaration(declaration);
    if (named && ts.isPrivateIdentifier(named) || declaration && ts.getCombinedModifierFlags(declaration) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;
    const propertyType = declaration ? checker.getTypeOfSymbolAtLocation(property, declaration) : checker.getTypeOfSymbol(property);
    next(propertyType, `${trail}.${property.name}`);
    // A setter's write type is its parameter's: `set v(value: any)` beside `get v(): string`.
    for (const setter of property.declarations?.filter(ts.isSetAccessorDeclaration) ?? []) {
      const [value] = setter.parameters;
      if (value) next(checker.getTypeAtLocation(value), `${trail}.${property.name}=`);
    }
  }
  for (const info of checker.getIndexInfosOfType(type)) next(info.type, `${trail}[]`);
  for (const signature of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
    for (const parameter of [...signature.thisParameter ? [signature.thisParameter] : [], ...signature.getParameters()]) {
      const at = parameter.valueDeclaration;
      next(at ? checker.getTypeOfSymbolAtLocation(parameter, at) : checker.getTypeOfSymbol(parameter), `${trail}(${parameter.name})`);
    }
    next(signature.getReturnType(), `${trail}()`);
    // A type predicate narrows the caller's value to its type: `v is any` hands out any through a boolean.
    const predicate = checker.getTypePredicateOfSignature(signature)?.type;
    if (predicate) next(predicate, `${trail}() is`);
  }
}

export const ruleU: ContentRule = context => {
  if (context.contractTypes === "unread") throw new Error("CONTRACT_TYPES_UNREAD: rule U needs contractTypeViolations over the tree, then withContractTypes");
  return context.contractTypes;
};

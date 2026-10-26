// Rule U. Law: a closed contract is closed in what its types ARE, not only in where they come from. The reader
// admits `Type.Unsafe<T>()` and schema references only from non-visual tree modules; this rule asks the TypeScript
// checker what every prop, event and instance member of each closed contract resolves to, through every property,
// union, array, map, call signature, setter, type predicate and `this` parameter. It refuses `any`, `unknown`,
// `object`, `{}`, every ES library interface or class but a short list of value types (the library's mapped utilities
// and namespaces are walked), generics without a closed constraint, conditionals still waiting for their input, tree
// types that extend a library type, and any type declared by the DOM, Svelte or Node. What it cannot judge for certain
// it refuses rather than reasons about.
// Raises: CONTRACT_OPEN_TYPE.
//
// The judged tree is read as data: the checker parses it and evaluates nothing, and the tree cannot change what the
// checker believes. Packages (TypeBox, Svelte) resolve only in the checkout's own node_modules (contract-host.ts); a tree
// file may not reach other files through `/// <reference>` directives, be a script file (its declarations are globals),
// declare ambient modules or `declare global`, or import outside the tree;
// TypeScript's library is recognised by the program (its default library files in the checkout), never by a path name.
// A package is trusted by identity (package-identity.ts), never by where the gate runs: a real package root in the
// checkout's node_modules, or a file outside the judged tree whose parsed text is the checkout's copy at the same version.
import { realpathSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import ts from "typescript";
import type { CatalogLayout } from "../layout.ts";
import type { ContentRule } from "./context.ts";
import type { LocatedDeclaration } from "./inventory.ts";
import { contractPath, type ReadContract } from "../read-contract.ts";
import { violation, type Violation } from "./violation.ts";
import { inside, packages, packageTrust, type PackageFile } from "./package-identity.ts";
import { contractHost } from "./contract-host.ts";

const code = "CONTRACT_OPEN_TYPE";
/** Library files whose types never cross a contract: browser globals. Packages whose types never do: Svelte and Node (with
 * undici-types, Node's fetch: many of its exports are closed by the walk, PoolStats, MIMEType, Cookie, yet are Node's). */
const foreignLibrary = /^lib\.(dom|webworker|scripthost)[^/]*\.d\.ts$/;
const foreignPackages: ReadonlySet<string> = new Set(["svelte", "@types/node", "undici-types"]);
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
/** More open types than this in one section stop the walk: a finite branching type is one finding, not thousands. */
const maxFindings = 50;
/** How many findings a limited section keeps before its limit finding. */
const keptFindings = 10;
/** Stops a section's walk: an unbounded type is one finding, not thousands. */
class WalkLimit extends Error {}
const sections = ["props", "events", "instance"] as const;

export type ClosedContract = Readonly<{ declaration: LocatedDeclaration; contract: Extract<ReadContract, { closed: true }> }>;

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
    moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true, skipLibCheck: true, types: [], lib: ["lib.es2023.d.ts", "lib.dom.d.ts"],
    // A package's `/// <reference types="node" />` (@types/pg, undici-types) resolves in the checkout, never in the folder the
    // gate runs from: a product building with DESERT (cwd: the product) must not swap in its own @types/node.
    typeRoots: [join(packages, "@types")] };
  const text = `${lines.join("\n")}\n`;
  const found: Violation[] = [];
  const at = (file: string) => relative(root, file).split("\\").join("/");
  // One trust per program: what it read about packages is never reused by a later judgement.
  const trust = packageTrust(root), outside = new Set<string>();
  const findings = {
    unresolved: (containing: string, name: string) =>
      found.push(violation(code, at(containing), 0, `imports ${name}, which does not resolve inside the judged tree; a contract's types are read from the tree only`)),
    outside: (path: string, what: string) => {
      if (!outside.has(`${path}|${what}`)) found.push(violation(code, path, 0, what));
      outside.add(`${path}|${what}`);
    },
  };
  // Svelte's ambient runes ($state, $derived) always join the program, so a `.svelte.ts` module's types never depend on
  // which other contracts happen to pull Svelte in.
  const { host, resolution } = contractHost(options, entry, text, root, layout.aliases, trust, findings), runes = resolution("svelte");
  if (!runes) throw new Error("CATALOG_GATE_CONTRACT_TYPES: svelte's types do not resolve");
  const program = ts.createProgram([entry, runes.resolvedFileName], options, host);
  // The library is TypeScript's own default library files, by place first: a tree file is never asked (a tree file with
  // `/// <reference no-default-lib="true" />` would otherwise pass as a library).
  const libraryFolder = realpathSync(dirname(ts.getDefaultLibFilePath(options)));
  const library = (file: ts.SourceFile) => inside(resolve(file.fileName), libraryFolder) && program.isSourceFileDefaultLibrary(file);
  const owners = new Map<ts.SourceFile, PackageFile | undefined>();
  const owner = (file: ts.SourceFile) => {
    // A copy is compared by the text the checker parsed, never by the file as it lies on disk afterwards.
    if (!owners.has(file)) owners.set(file, trust(resolve(file.fileName), file.text));
    return owners.get(file);
  };
  const packaged = (file: ts.SourceFile) => owner(file) !== undefined;
  for (const file of program.getSourceFiles()) {
    if (file.fileName === entry || library(file) || packaged(file)) continue;
    found.push(...treeFileViolations(file, at(file.fileName)));
  }
  const checker = program.getTypeChecker(), source = program.getSourceFile(entry);
  if (!source) throw new Error("CATALOG_GATE_CONTRACT_TYPES: the contract type program has no entry");
  const exportsOf = new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(source) ?? notModule()).map(symbol => [symbol.name, symbol]));
  const judge: Judge = { checker, library, owner };
  closed.forEach(({ declaration }, index) => {
    const id = declaration.declaration.id, path = contractPath(declaration.path, id);
    for (const section of sections) {
      const reported = new Set<string>(), local: Violation[] = [];
      const alias = exportsOf.get(`T${index}_${section}`);
      if (!alias) throw new Error(`CATALOG_GATE_CONTRACT_TYPES: the program lost ${id}'s ${section}`);
      const report = (trail: string, what: string) => {
        // One finding per place an open type is first reached (a type shared by two members is judged once).
        const key = `${trail}|${what}`;
        if (reported.has(key)) return;
        reported.add(key);
        if (reported.size > maxFindings) throw new WalkLimit(`${section} holds more than ${maxFindings} open types`);
        local.push(violation(code, path, 0, `${id} ${trail} resolves to ${what}; a contract carries domain values, never an open or platform type`));
      };
      // A section that hits a limit keeps its first findings and then the limit, instead of thousands of lines.
      try { walk(judge, checker.getDeclaredTypeOfSymbol(alias), section, new Set(), report); found.push(...local); }
      catch (error) {
        if (!(error instanceof WalkLimit)) throw error;
        found.push(...local.slice(0, keptFindings), violation(code, path, 0, `${id} ${error.message}; the walk of ${section} stopped there`));
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

type Judge = Readonly<{ checker: ts.TypeChecker; library: (file: ts.SourceFile) => boolean; owner: (file: ts.SourceFile) => PackageFile | undefined }>;
const filesOf = (symbol: ts.Symbol | undefined) => symbol?.declarations?.map(item => item.getSourceFile()) ?? [];
const primitive = ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.ESSymbolLike;
const unresolvedGeneric = ts.TypeFlags.TypeParameter | ts.TypeFlags.Index | ts.TypeFlags.IndexedAccess | ts.TypeFlags.Substitution;

function notModule(): never { throw new Error("CATALOG_GATE_CONTRACT_TYPES: the contract type entry is not a module"); }

/** The platform a type is declared by, or undefined: a browser library file, or the Svelte or Node packages. */
function platform({ library, owner }: Judge, type: ts.Type): string | undefined {
  for (const file of [...filesOf(type.aliasSymbol), ...filesOf(type.getSymbol())]) {
    const name = posix.basename(file.fileName.split("\\").join("/"));
    if (library(file) && foreignLibrary.test(name)) return name;
    // Judged by the outermost package (packageRoots decides it): Svelte's nested dependencies are Svelte's.
    const installed = owner(file);
    if (installed && foreignPackages.has(installed.name)) return installed.at;
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
  // A primitive or a literal is closed; a union of thousands of literals is no reason to stop.
  if (type.flags & primitive) return;
  if (seen.has(type)) return;
  seen.add(type);
  if (seen.size > maxTypes) throw new WalkLimit(`${trail} reaches more than ${maxTypes} types`);
  // What the checker cannot resolve here is refused rather than reasoned about: a conditional still waiting for its input
  // (`U extends 'a' ? T : number`) may become anything once instantiated.
  if (type.flags & ts.TypeFlags.Conditional) return report(trail, `the unresolved conditional ${checker.typeToString(type)}`);
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
  if (pendingMapped(checker, type)) return report(trail, `the unresolved mapped type ${name}`);
  // A section with no members (`props: Type.Object({})`) is closed; an empty object type as a value is not.
  if (emptyObject(checker, type)) return sections.some(section => section === trail) ? undefined : report(trail, "{}");
  const reference = (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference ? type as ts.TypeReference : undefined;
  if (reference) {
    checker.getTypeArguments(reference).forEach((argument, index) => next(argument, `${trail}<${index}>`));
    if (checker.isTupleType(type)) return;
  }
  // A contract type composes library types, it never extends one: what a library base brings is not judged member by
  // member, so a tree type with a library type anywhere in its heritage is refused (`class Path extends Array<string>`).
  const heritage = libraryHeritage(checker, judge, reference ? reference.target : type, new Set());
  if (heritage) return report(trail, `a type that extends the library type ${heritage}`);
  // Members are judged on this type itself, instantiated, so inherited tree members are judged with this type's arguments.
  for (const property of checker.getPropertiesOfType(type)) {
    // A private or #private member is not part of what a caller can reach; a quoted "#name" key is an ordinary member.
    const declaration = property.valueDeclaration ?? property.declarations?.[0], named = declaration && ts.getNameOfDeclaration(declaration);
    const hidden = (item: ts.Declaration) => !!(ts.getCombinedModifierFlags(item) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected));
    if (named && ts.isPrivateIdentifier(named) || property.declarations?.length && property.declarations.every(hidden)) continue;
    const propertyType = declaration ? checker.getTypeOfSymbolAtLocation(property, declaration) : checker.getTypeOfSymbol(property);
    next(propertyType, `${trail}.${property.name}`);
    // A setter's write type is its parameter's. Read as declared, a parameter typed by the declaration's own generics
    // would be judged uninstantiated; so only a setter in the getter's own declaration writing the very type the getter
    // reads is skipped (merged declarations in two namespace blocks can give one name two meanings).
    const getter = property.declarations?.find(ts.isGetAccessorDeclaration), mapped = (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Mapped;
    for (const setter of getter && !mapped ? property.declarations?.filter(ts.isSetAccessorDeclaration) ?? [] : []) {
      const [value] = setter.parameters;
      if (!value?.type || !getter?.type) { report(`${trail}.${property.name}=`, "an untyped setter or getter"); continue; }
      const same = setter.parent === getter.parent && checker.getTypeFromTypeNode(value.type) === checker.getTypeFromTypeNode(getter.type);
      if (!same) next(checker.getTypeAtLocation(value), `${trail}.${property.name}=`);
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

/** A mapped type still waiting for its keys (`{ [K in keyof T]: … }` with T unresolved) shows only the keys T's constraint
 * has; like a pending conditional it is refused. TypeScript exposes no public test, so its own field is read, and a
 * mapped type without that field fails loudly instead of passing. */
function pendingMapped(checker: ts.TypeChecker, type: ts.Type): boolean {
  if (!((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Mapped)) return false;
  // Resolving the members sets the field; a homomorphic mapped type over an array-constrained generic resolves through
  // its apparent type instead, and printing it without its alias sets it then.
  checker.getPropertiesOfType(type);
  checker.typeToString(type, undefined, ts.TypeFormatFlags.InTypeAlias);
  const constraint = Reflect.get(type, "constraintType"), own = Reflect.get(type, "typeParameter"), name = Reflect.get(type, "nameType");
  if (!isType(constraint)) throw new Error("CATALOG_GATE_CONTRACT_TYPES: this TypeScript's mapped types carry no constraintType");
  // Pending when the keys, or the `as` clause that renames them, still mention a type parameter (TypeScript's own
  // isGenericMappedType): `'a' | U` is a union, not instantiable, and still waits for U.
  return generic(checker, constraint, undefined) || isType(name) && generic(checker, name, isType(own) ? own : undefined);
}

const isType = (value: unknown): value is ts.Type => value instanceof Object && typeof Reflect.get(value, "flags") === "number";

/** Whether a type still mentions a type parameter other than `own` (a mapped type's own key, compared by symbol because an
 * instantiated mapped type clones it). */
function generic(checker: ts.TypeChecker, type: ts.Type, own: ts.Type | undefined, seen = new Set<ts.Type>()): boolean {
  if (seen.has(type)) return false;
  seen.add(type);
  if (type.flags & ts.TypeFlags.TypeParameter) return !own || type.getSymbol() !== own.getSymbol();
  const inner: ts.Type[] = [];
  if (type.isUnionOrIntersection()) inner.push(...type.types);
  else if (type.flags & ts.TypeFlags.Index) inner.push((type as ts.IndexType).type);
  else if (type.flags & ts.TypeFlags.IndexedAccess) inner.push((type as ts.IndexedAccessType).objectType, (type as ts.IndexedAccessType).indexType);
  else if (type.flags & ts.TypeFlags.TemplateLiteral) inner.push(...(type as ts.TemplateLiteralType).types);
  else if (type.flags & ts.TypeFlags.StringMapping) inner.push((type as ts.StringMappingType).type);
  else if (type.flags & ts.TypeFlags.Substitution) inner.push((type as ts.SubstitutionType).baseType);
  else if (type.flags & ts.TypeFlags.Conditional) {
    // Any part of a conditional: a branch still generic is as pending as its check type. TypeScript fills the branches
    // lazily; printing the conditional fills them, and a branch still missing after that counts as pending.
    checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias);
    const conditional = type as ts.ConditionalType;
    inner.push(conditional.checkType, conditional.extendsType);
    for (const branch of [conditional.resolvedTrueType, conditional.resolvedFalseType]) if (branch) inner.push(branch);
    if (!conditional.resolvedTrueType || !conditional.resolvedFalseType) return true;
  }
  else if (type.flags & ts.TypeFlags.Instantiable) return true;
  // An object a key is read from (`Tab<U>[K]`, `{ a: 'a'; b: U }[K]`) is generic when its arguments or members are.
  else if (type.flags & ts.TypeFlags.Object) {
    inner.push(...type.aliasTypeArguments ?? []);
    if ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) inner.push(...checker.getTypeArguments(type as ts.TypeReference));
    for (const property of checker.getPropertiesOfType(type)) inner.push(checker.getTypeOfSymbol(property));
  }
  return inner.some(item => generic(checker, item, own, seen));
}

/** The first library type in a class or interface's heritage, through tree bases, intersections and mixins. */
function libraryHeritage(checker: ts.TypeChecker, judge: Judge, declared: ts.Type, climbed: Set<ts.Type>): string | undefined {
  if (climbed.has(declared)) return undefined;
  climbed.add(declared);
  if (climbed.size > maxTypes) throw new WalkLimit(`a heritage of more than ${maxTypes} types`);
  const bases = declared.isClassOrInterface() ? checker.getBaseTypes(declared) : declared.isIntersection() ? declared.types : [];
  for (const base of bases) {
    // A library interface or class is heritage; a library mapped utility (`extends Omit<Base, "b">`) is not, its members
    // are this type's own and are judged on it.
    const symbol = base.getSymbol(), files = filesOf(symbol);
    if (files.length > 0 && files.every(judge.library) && symbol && symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.Class)) {
      return checker.typeToString(base);
    }
    const target = (base as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference ? (base as ts.TypeReference).target : base;
    const found = libraryHeritage(checker, judge, target, climbed);
    if (found) return found;
  }
  return undefined;
}

export const ruleU: ContentRule = context => {
  if (context.contractTypes === "unread") throw new Error("CONTRACT_TYPES_UNREAD: rule U needs contractTypeViolations over the tree, then withContractTypes");
  return context.contractTypes;
};

// Rule U. Law: a closed contract is closed in what its types ARE, not only in where they come from. The reader admits
// `Type.Unsafe<T>()` and schema references only from non-visual tree modules; this rule asks the TypeScript checker what
// every prop, event and instance member of each closed contract resolves to, through every property, union, array,
// map and call signature, and refuses `any`, `unknown`, `object` and any type declared by the DOM, Svelte or Node.
// Raises: CONTRACT_OPEN_TYPE.
//
// The judged tree is read as data: the checker parses it and evaluates nothing. Packages (TypeBox, Svelte) always resolve
// in the gate's own checkout, so a PR tree without node_modules is judged the same and cannot bring its own types.
import { dirname, join, posix, resolve } from "node:path";
import ts from "typescript";
import type { CatalogLayout } from "../layout.ts";
import type { LocatedDeclaration } from "./inventory.ts";
import { contractPath, type ReadContract } from "../read-contract.ts";
import { violation, type Violation } from "./violation.ts";

const code = "CONTRACT_OPEN_TYPE";
const checkout = resolve(import.meta.dirname, "../../../..");
/** Declaration files whose types never cross a contract: browser and Node globals, and the Svelte runtime. */
const foreign = [/\/typescript\/lib\/lib\.(dom|webworker|scripthost)[^/]*\.d\.ts$/, /\/node_modules\/svelte\//, /\/node_modules\/@types\/node\//];
/** TypeScript's own ES library: its types are allowed, and only their type arguments are judged (Promise<T>, Array<T>). */
const esLibrary = /\/typescript\/lib\/lib\.es[^/]*\.d\.ts$/;
const sections = ["props", "events", "instance"] as const;

export type ClosedContract = Readonly<{ declaration: LocatedDeclaration; contract: Extract<ReadContract, { closed: true }> }>;

function compilerHost(options: ts.CompilerOptions, entry: string, entryText: string, root: string, aliases: CatalogLayout["aliases"]) {
  const host = ts.createCompilerHost(options, true);
  const readFile = host.readFile.bind(host), fileExists = host.fileExists.bind(host), getSourceFile = host.getSourceFile.bind(host);
  host.readFile = file => file === entry ? entryText : readFile(file);
  host.fileExists = file => file === entry || fileExists(file);
  host.getSourceFile = (file, language, ...rest) => file === entry
    ? ts.createSourceFile(file, entryText, language, true, ts.ScriptKind.TS) : getSourceFile(file, language, ...rest);
  // Tree modules resolve in the judged tree; packages always resolve in the gate's own checkout, so a judged tree cannot
  // supply its own TypeBox or Svelte types to the judgement.
  const resolution = (name: string, containing: string) => {
    const alias = aliases.find(([prefix]) => name.startsWith(prefix));
    if (alias) return ts.resolveModuleName(join(root, alias[1], name.slice(alias[0].length)), containing, options, host).resolvedModule;
    if (name.startsWith(".")) return ts.resolveModuleName(name, containing, options, host).resolvedModule;
    return ts.resolveModuleName(name, join(checkout, "package.json"), options, ts.sys).resolvedModule;
  };
  host.resolveModuleNameLiterals = (literals, containing) => literals.map(literal => ({ resolvedModule: resolution(literal.text, containing) }));
  return { host, resolution };
}

/** Every closed contract's props, events and instance as one checker program over the judged tree. */
export function contractTypeViolations(root: string, layout: Pick<CatalogLayout, "aliases">, closed: readonly ClosedContract[]): readonly Violation[] {
  if (!closed.length) return [];
  const entry = join(root, "__catalog_contract_types__.ts");
  const lines = ['import type { Static } from "@sinclair/typebox";'];
  closed.forEach(({ declaration, contract }, index) => {
    const file = contractPath(declaration.path, declaration.declaration.id);
    lines.push(`import type { ${contract.binding} as C${index} } from "./${file}";`);
    for (const section of sections) lines.push(`export type T${index}_${section} = typeof C${index} extends { readonly ${section}: infer S extends import("@sinclair/typebox").TSchema } ? Static<S> : never;`);
  });
  const options: ts.CompilerOptions = { strict: true, noEmit: true, target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true, skipLibCheck: true, types: [], lib: ["lib.es2023.d.ts", "lib.dom.d.ts"] };
  const text = `${lines.join("\n")}\n`;
  // Svelte's ambient runes ($state, $derived) always join the program, so a `.svelte.ts` module's types never depend on
  // which other contracts happen to pull Svelte in.
  const { host, resolution } = compilerHost(options, entry, text, root, layout.aliases), runes = resolution("svelte", entry);
  if (!runes) throw new Error("CATALOG_GATE_CONTRACT_TYPES: svelte's types do not resolve");
  const program = ts.createProgram([entry, runes.resolvedFileName], options, host);
  const checker = program.getTypeChecker(), source = program.getSourceFile(entry);
  if (!source) throw new Error("CATALOG_GATE_CONTRACT_TYPES: the contract type program has no entry");
  const exportsOf = new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(source) ?? fail()).map(symbol => [symbol.name, symbol]));
  const found: Violation[] = [];
  closed.forEach(({ declaration }, index) => {
    const id = declaration.declaration.id, path = contractPath(declaration.path, id), reported = new Set<string>();
    for (const section of sections) {
      const alias = exportsOf.get(`T${index}_${section}`);
      if (!alias) continue;
      walk(checker, checker.getDeclaredTypeOfSymbol(alias), section, new Set(), (trail, what) => {
        if (reported.has(what)) return;
        reported.add(what);
        found.push(violation(code, path, 0, `${id} ${trail} resolves to ${what}; a contract carries domain values, never an open or platform type`));
      });
    }
  });
  return found;
}

function fail(): never { throw new Error("CATALOG_GATE_CONTRACT_TYPES: the contract type entry is not a module"); }

const fileOf = (symbol: ts.Symbol | undefined) => symbol?.declarations?.[0]?.getSourceFile().fileName.split("\\").join("/");

function walk(checker: ts.TypeChecker, type: ts.Type, trail: string, seen: Set<ts.Type>, report: (trail: string, what: string) => void): void {
  if (seen.has(type)) return;
  seen.add(type);
  if (type.flags & ts.TypeFlags.Any) return report(trail, "any");
  if (type.flags & ts.TypeFlags.Unknown) return report(trail, "unknown");
  if (type.flags & ts.TypeFlags.NonPrimitive) return report(trail, "object");
  if (type.isUnionOrIntersection()) { for (const member of type.types) walk(checker, member, trail, seen, report); return; }
  if (!(type.flags & ts.TypeFlags.Object)) return;
  const symbol = type.getSymbol(), name = checker.typeToString(type);
  const file = [fileOf(type.aliasSymbol), fileOf(symbol)].find(item => item && foreign.some(pattern => pattern.test(item)));
  if (file) return report(trail, `${name} (${posix.basename(dirname(file)) === "lib" ? posix.basename(file) : file.replace(/^.*\/node_modules\//, "")})`);
  const object = type as ts.ObjectType;
  if (object.objectFlags & ts.ObjectFlags.Reference) {
    checker.getTypeArguments(type as ts.TypeReference).forEach((argument, index) => walk(checker, argument, `${trail}<${index}>`, seen, report));
    if (checker.isTupleType(type) || checker.isArrayType(type)) return;
  }
  // An ES library interface or class (Promise, Array, Map, Date) is judged by its type arguments only; a mapped utility
  // (Readonly, Pick, Partial) is walked like any object, property by property.
  const library = fileOf(symbol);
  if (library && esLibrary.test(library) && symbol && symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.Class)) return;
  for (const property of checker.getPropertiesOfType(type)) {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    const propertyType = declaration ? checker.getTypeOfSymbolAtLocation(property, declaration) : checker.getTypeOfSymbol(property);
    walk(checker, propertyType, `${trail}.${property.name}`, seen, report);
  }
  for (const info of checker.getIndexInfosOfType(type)) walk(checker, info.type, `${trail}[]`, seen, report);
  for (const signature of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
    signature.getParameters().forEach(parameter => {
      const at = parameter.valueDeclaration;
      walk(checker, at ? checker.getTypeOfSymbolAtLocation(parameter, at) : checker.getTypeOfSymbol(parameter), `${trail}(${parameter.name})`, seen, report);
    });
    walk(checker, signature.getReturnType(), `${trail}()`, seen, report);
  }
}

// Rule U's compiler host: where the contract type program's modules and type references come from. Tree modules resolve
// in the judged tree. Packages resolve only in the checkout's node_modules, so neither a judged tree nor a folder around
// the checkout can supply its own TypeBox, Svelte or Node types: a checkout nested in a product's folder never falls
// through to the product's node_modules. A specifier the checkout cannot satisfy but a folder outside it can is reported by
// name, never followed; a tree module that does not resolve, or resolves outside the judged tree, is reported, never `any`.
import { join, relative, resolve } from "node:path";
import { realpathSync } from "node:fs";
import ts from "typescript";
import type { CatalogLayout } from "../layout.ts";
import { checkout, inside, packages, type PackageFile } from "./package-identity.ts";

type Trust = (file: string, text: string) => PackageFile | undefined;
export type HostFindings = Readonly<{ unresolved: (containing: string, name: string) => void; outside: (path: string, what: string) => void }>;

/** Within the checkout's node_modules by real path: a dependency linked out of it is not there. */
const installed = (path: string) => {
  try { const at = realpathSync(path); return at === packages || inside(at, packages); } catch { return false; }
};
/** Module resolution that sees the checkout's node_modules only. */
const checkoutOnly: ts.ModuleResolutionHost = {
  fileExists: file => installed(file) && ts.sys.fileExists(file),
  readFile: file => installed(file) ? ts.sys.readFile(file) : undefined,
  directoryExists: folder => installed(folder) && ts.sys.directoryExists(folder),
  getDirectories: folder => installed(folder) ? ts.sys.getDirectories(folder) : [],
  realpath: path => ts.sys.realpath ? ts.sys.realpath(path) : path,
  getCurrentDirectory: () => checkout,
  useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
};

export function contractHost(options: ts.CompilerOptions, entry: string, entryText: string, root: string, aliases: CatalogLayout["aliases"],
  trust: Trust, findings: HostFindings) {
  const host = ts.createCompilerHost(options, true);
  const readFile = host.readFile.bind(host), fileExists = host.fileExists.bind(host), getSourceFile = host.getSourceFile.bind(host);
  host.readFile = file => file === entry ? entryText : readFile(file);
  host.fileExists = file => file === entry || fileExists(file);
  host.getSourceFile = (file, language, ...rest) => file === entry
    ? ts.createSourceFile(file, entryText, language, true, ts.ScriptKind.TS) : getSourceFile(file, language, ...rest);
  const shown = (file: string) => relative(root, file).split("\\").join("/");
  /** Where a file resolves from in the checkout: a package file (or its proven copy) from the checkout's own copy. */
  const origin = (containing: string, text: string | undefined) => {
    const own = text === undefined ? undefined : trust(resolve(containing), text);
    return { own, path: own ? `node_modules/${own.at}` : shown(containing), from: own ? join(packages, own.at) : undefined };
  };
  const elsewhere = (path: string, what: string, found: string | undefined) => {
    if (found) findings.outside(path, `${what}, which resolves outside DESERT's node_modules (${shown(found)}); packages are read from the checkout's node_modules only`);
  };
  const resolution = (name: string, containing: string, text: string | undefined) => {
    const { own, path, from } = origin(containing, text);
    const alias = own ? undefined : aliases.find(([prefix]) => name.startsWith(prefix));
    if (own || !alias && !name.startsWith(".")) {
      const at = from ?? join(checkout, "package.json"), found = ts.resolveModuleName(name, at, options, checkoutOnly).resolvedModule;
      if (!found) elsewhere(path, `imports ${name}`, ts.resolveModuleName(name, at, options, ts.sys).resolvedModule?.resolvedFileName);
      return found;
    }
    const request = alias ? join(root, alias[1], name.slice(alias[0].length)) : name;
    const found = ts.resolveModuleName(request, containing, options, host).resolvedModule;
    if (found && inside(resolve(found.resolvedFileName), root)) return found;
    // A Svelte component has no TypeScript module here; a contract type that reaches one is reported as `any` where it is used.
    if (!name.endsWith(".svelte")) findings.unresolved(containing, name);
    return undefined;
  };
  host.resolveModuleNameLiterals = (literals, containing, _redirected, _options, source) =>
    literals.map(literal => ({ resolvedModule: resolution(literal.text, containing, source.text) }));
  // `/// <reference types>` (a package's `types="node"`) resolves in the checkout too, never in a node_modules above it.
  host.resolveTypeReferenceDirectiveReferences = (references, containing, redirected, _options, source) => references.map(reference => {
    const name = typeof reference === "string" ? reference : reference.fileName.toLowerCase();
    const mode = ts.getModeForFileReference(reference, source?.impliedNodeFormat);
    const { path, from } = origin(containing, source?.text), at = from ?? containing;
    const result = ts.resolveTypeReferenceDirective(name, at, options, checkoutOnly, redirected, undefined, mode);
    if (!result.resolvedTypeReferenceDirective?.resolvedFileName) {
      const found = ts.resolveTypeReferenceDirective(name, at, options, ts.sys, redirected, undefined, mode).resolvedTypeReferenceDirective;
      elsewhere(path, `references types "${name}"`, found?.resolvedFileName);
    }
    return result;
  });
  return { host, resolution: (name: string) => resolution(name, entry, entryText) };
}

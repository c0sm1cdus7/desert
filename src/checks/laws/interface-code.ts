// No program and no distribution writes interface: DESERT paints, and they only produce screens.
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import ts from "typescript";
import { field, isRecord } from "../../fields/json-values.ts";
import { importsIn } from "./imports.ts";
import { codeFiles, filesUnder, fromRoot, isSpec, parsed, staleExemptions } from "./law-files.ts";
import type { Exemptions, Repository } from "./law-files.ts";
import { stringsIn } from "./law-words.ts";

export type InterfaceOptions = Readonly<{ exempt: Exemptions }>;
/** I1: files that are interface by their kind. */
const interfaceKinds = [
  ".svelte",
  ".vue",
  ".astro",
  ".jsx",
  ".tsx",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
];
/** I2 and I3: the entries of DESERT that paint, and the frameworks that draw for a screen or a terminal. */
const paintingEntries = ["desert/surface/pieces", "desert/surface/contract"];
const frameworks = [
  "svelte",
  "react",
  "react-dom",
  "react-native",
  "preact",
  "vue",
  "solid-js",
  "lit",
  "ink",
  "blessed",
  "chalk",
  "kleur",
  "picocolors",
  "ansi-escapes",
];
const frameworkScopes = ["@sveltejs", "@angular", "@capacitor"];
/** I4: a terminal control introducer (ESC [, ESC ], CSI), or the start of a page or of one of these elements. */
const controlIntroducer = /\u001b[[\]]|\u009b/u;
const tags = [
  "html",
  "body",
  "head",
  "div",
  "span",
  "p",
  "a",
  "form",
  "input",
  "button",
  "label",
  "style",
  "script",
].concat(["table", "ul", "ol", "li", "svg", "meta"]);
const elements = new RegExp(`<(?:!doctype|(?:${tags.join("|")})(?![\\p{L}\\p{N}-]))`, "iu");
/** I5: what a browser draws with. */
const drawingGlobals = ["HTMLElement", "customElements"];
const documentMembers = [
  "createElement",
  "createTextNode",
  "querySelector",
  "querySelectorAll",
  "getElementById",
  "body",
  "head",
];

const packageName = (specifier: string): string => {
  const parts = specifier.split("/");
  return (specifier.startsWith("@") ? parts.slice(0, 2) : parts.slice(0, 1)).join("/");
};
const paints = (specifier: string): boolean => {
  const name = packageName(specifier);
  return (
    paintingEntries.includes(specifier) ||
    frameworks.includes(name) ||
    frameworkScopes.some(scope => name.startsWith(`${scope}/`))
  );
};
/** A name declared or read as a member of something else is that thing's own, not the browser's. */
const ownName = (node: ts.Identifier): boolean => {
  const parent = node.parent;
  return (
    (ts.isPropertyAccessExpression(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isMethodSignature(parent)) &&
    parent.name === node
  );
};
const isDocument = (node: ts.Expression): boolean => ts.isIdentifier(node) && node.text === "document";
const memberOf = (node: ts.Node): string | undefined => {
  if (ts.isPropertyAccessExpression(node) && isDocument(node.expression)) return node.name.text;
  if (
    ts.isElementAccessExpression(node) &&
    isDocument(node.expression) &&
    ts.isStringLiteralLike(node.argumentExpression)
  )
    return node.argumentExpression.text;
  return undefined;
};
/** Every use of the browser's drawing interface in a file. */
const drawingIn = (source: ts.SourceFile): string[] => {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && drawingGlobals.includes(node.text) && !ownName(node)) found.push(node.text);
    const member = memberOf(node);
    if (member !== undefined && documentMembers.includes(member)) found.push(node.getText());
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

/** A string as code writes it, every control character escaped, so a finding can be read. */
const visible = (text: string): string =>
  JSON.stringify(text).replace(/\p{Cc}/gu, char => `\\u${(char.codePointAt(0) ?? 0).toString(16).padStart(4, "0")}`);
/** One line per finding, each starting with the path it is in. */
function findings(repo: Repository): string[] {
  const kinds = filesUnder(repo.root, path => interfaceKinds.includes(extname(path).toLowerCase())).map(
    path => `${fromRoot(repo.root, path)}: ${extname(path).toLowerCase()}`,
  );
  const code = codeFiles(repo).filter(file => !isSpec(file));
  const lines = code.flatMap(file => {
    const path = fromRoot(repo.root, file);
    const source = parsed(file);
    return [
      ...importsIn(source)
        .filter(paints)
        .map(specifier => `${path} → ${specifier}`),
      ...stringsIn(source)
        .filter(text => controlIntroducer.test(text) || elements.test(text))
        .map(text => `${path}: ${visible(text)}`),
      ...drawingIn(source).map(use => `${path}: ${use}`),
    ];
  });
  return [...kinds, ...lines, ...dependencies(repo)];
}
const manifest = "package.json";
/** I3: a framework the manifest depends on, to run or to develop. */
function dependencies(repo: Repository): string[] {
  const pkg: unknown = JSON.parse(readFileSync(join(repo.root, manifest), "utf8"));
  return ["dependencies", "devDependencies"].flatMap(key => {
    const declared = field(pkg, key);
    return isRecord(declared)
      ? Object.keys(declared)
          .filter(paints)
          .map(name => `${manifest} → ${name}`)
      : [];
  });
}

const covers = (path: string, line: string): boolean =>
  path.endsWith("/") ? line.startsWith(path) : line.startsWith(`${path}: `) || line.startsWith(`${path} → `);
/** What a program or a distribution writes that is interface, but what its map admits with a reason; and every entry
 * of that map that is gone or admits nothing the law finds. */
export function interfaceCode(repo: Repository, options: InterfaceOptions): string[] {
  const found = findings(repo);
  const paths = Object.keys(options.exempt);
  const gone = staleExemptions(repo, options.exempt);
  const stale = paths.filter(path => gone.includes(path) || !found.some(line => covers(path, line)));
  return [...found.filter(line => !paths.some(path => covers(path, line))), ...stale];
}

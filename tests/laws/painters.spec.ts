// Painters only paint: the cell painter reads no catalog, takes from the contract only spans, themes and tones, and
// holds no word; every name it writes is one of a closed set its types declare, such as a tone or a piece's kind.
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { isRecord } from "../../src/fields/json-values.ts";
import { root } from "../support/sources.ts";

const folder = join(root, "src/doors/terminal");
const painters = ["paint.ts", "thread.ts", "entry.ts"].map(name => join(folder, name));
/** What each painter may take from the contract: paint.ts also takes the screen, for its one signature. */
const fromContract = (file: string): readonly string[] =>
  file.endsWith("/paint.ts") ? ["Span", "Theme", "Tone", "Screen"] : ["Span", "Theme", "Tone"];
/** The findings still waiting for the commit that moves their drawing onto pieces; empty when every painter only
 * paints. */
const waiting: readonly string[] = [
  "src/doors/terminal/paint.ts: imports ../../texts/surface.texts.ts",
  "src/doors/terminal/paint.ts: takes Body from the contract",
  'src/doors/terminal/paint.ts: "list"',
  "src/doors/terminal/thread.ts: imports ../../texts/surface.texts.ts",
  "src/doors/terminal/thread.ts: takes Body from the contract",
  "src/doors/terminal/thread.ts: takes Panel from the contract",
  "src/doors/terminal/thread.ts: takes Row from the contract",
  "src/doors/terminal/thread.ts: takes ThreadEvent from the contract",
  'src/doors/terminal/thread.ts: "t3"',
  'src/doors/terminal/thread.ts: "thread"',
  'src/doors/terminal/thread.ts: "focus"',
  "src/doors/terminal/entry.ts: takes Body from the contract",
  "src/doors/terminal/entry.ts: takes Row from the contract",
  'src/doors/terminal/entry.ts: "entry"',
  'src/doors/terminal/entry.ts: "thread"',
];

/** A program over the painters, with planted files served from memory beside them. */
function programOf(planted: Readonly<Record<string, string>>): ts.Program {
  const config: unknown = ts.readConfigFile(join(root, "tsconfig.json"), path => ts.sys.readFile(path)).config;
  if (!isRecord(config)) throw new Error("tsconfig.json: no configuration to compile the painters with");
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, root);
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  host.fileExists = path => path in planted || ts.sys.fileExists(path);
  host.readFile = path => planted[path] ?? read(path);
  const source = host.getSourceFile.bind(host);
  host.getSourceFile = (path, language) => {
    const text = planted[path];
    return text === undefined ? source(path, language) : ts.createSourceFile(path, text, language, true);
  };
  return ts.createProgram([...painters, ...Object.keys(planted)], { ...options, noEmit: true }, host);
}
/** A literal names one of a closed set when the place it stands takes only literals, this one among them. */
function closedName(checker: ts.TypeChecker, node: ts.StringLiteralLike): boolean {
  const parent = node.parent;
  let type = checker.getContextualType(node);
  if (ts.isBinaryExpression(parent))
    type = checker.getTypeAtLocation(parent.left === node ? parent.right : parent.left);
  if (ts.isCaseClause(parent)) type = checker.getTypeAtLocation(parent.parent.parent.expression);
  const parts = type === undefined ? [] : [type];
  const names = (type?.isUnion() ? type.types : parts).filter(
    part => !(part.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)),
  );
  return (
    names.length > 0 && names.every(part => part.isStringLiteral()) && names.some(part => part.value === node.text)
  );
}
function wordsIn(checker: ts.TypeChecker, source: ts.SourceFile): readonly string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isStringLiteralLike(node) && /\p{L}/u.test(node.text) && !closedName(checker, node))
      found.push(JSON.stringify(node.text));
    if (ts.isTemplateExpression(node))
      for (const part of [node.head, ...node.templateSpans.map(span => span.literal)])
        if (/\p{L}/u.test(part.text)) found.push(JSON.stringify(part.text));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
function importsIn(file: string, source: ts.SourceFile): readonly string[] {
  return source.statements.filter(ts.isImportDeclaration).flatMap(statement => {
    const from = ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : "";
    if (from.includes("/texts/")) return [`imports ${from}`];
    if (!from.includes("/surface/contract/")) return [];
    const bindings = statement.importClause?.namedBindings;
    const names = bindings && ts.isNamedImports(bindings) ? bindings.elements.map(element => element.name.text) : [];
    const taken = statement.importClause?.name || (bindings && !ts.isNamedImports(bindings)) ? ["*"] : names;
    return taken.filter(name => !fromContract(file).includes(name)).map(name => `takes ${name} from the contract`);
  });
}
/** What keeps each painter from only painting, one line per finding. */
function findings(planted: Readonly<Record<string, string>> = {}): readonly string[] {
  const program = programOf(planted);
  const checker = program.getTypeChecker();
  return [...painters, ...Object.keys(planted)].flatMap(file => {
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`${file}: no source to read`);
    const name = file.slice(root.length + 1);
    return [...importsIn(file, source), ...wordsIn(checker, source)].map(finding => `${name}: ${finding}`);
  });
}
describe("the terminal's painters", () => {
  it("only paint pieces: no catalog, nothing of the contract but spans, themes and tones, no word", () => {
    expect(findings()).toEqual(waiting);
  });
  it("refuses a painter that reads the catalog, one that takes a row, and one that writes a word", () => {
    const plant = (name: string, text: string): Readonly<Record<string, string>> => ({ [join(folder, name)]: text });
    const head = 'import { put, type Grid } from "./cells.ts";\n';
    const planted = {
      ...plant(
        "planted-catalog.ts",
        `${head}import { surfaceTexts } from "../../texts/surface.texts.ts";\n` +
          'export const draw = (grid: Grid): number => put(grid, 0, 0, { text: surfaceTexts.more, tone: "t3" });\n',
      ),
      ...plant(
        "planted-row.ts",
        `${head}import type { Row } from "../../surface/contract/contract.ts";\n` +
          'export const draw = (grid: Grid, row: Row): number => put(grid, 0, 0, { text: row.title, tone: "t1" });\n',
      ),
      ...plant(
        "planted-word.ts",
        `${head}export const draw = (grid: Grid): number => put(grid, 0, 0, { text: "más", tone: "t3" });\n`,
      ),
    };
    const own = findings(planted).filter(line => line.includes("planted-"));
    expect(own).toEqual([
      "src/doors/terminal/planted-catalog.ts: imports ../../texts/surface.texts.ts",
      "src/doors/terminal/planted-row.ts: takes Row from the contract",
      'src/doors/terminal/planted-word.ts: "más"',
    ]);
  });
});

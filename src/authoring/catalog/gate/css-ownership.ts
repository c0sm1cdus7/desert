// Rule G. Law: a stylesheet styles only what its owner draws, and only its owner loads it. Raises CROSS_OWNER_CSS.
// Every `.css` file and every Svelte `<style>` is read with Svelte's own CSS parser. Only the theme mechanism styles
// elements or styles globally; a selector may name a vendor slot (`data-slot`) or a contract mark only inside the
// piece that owns it; compositions own no CSS; theme.css loads only the theme's mechanism stylesheets. What owners draw
// (marks written in markup, custom properties) is css-marks.ts.
// G reports, it never fixes: the stylesheets keep the pixels the owner approved.
import ts from "typescript";
import { isCSSRequest } from "vite";
import { isNode, nodes, walk, type SyntaxNode } from "./walk.ts";
import { parseable, type ContentRule, type GateContext } from "./context.ts";
import type { Owner } from "./ownership.ts";
import { resolveSpecifier, type Target } from "./resolve-imports.ts";
import { violation, type Violation } from "./violation.ts";
import { lineOf } from "./parse.ts";
import { position, readStylesheet, rulesOf, decodeCss, type Stylesheet } from "./stylesheet.ts";
import { themeMechanism } from "../layout.ts";
import { customPropertyViolations, foreignMarkViolations, ownerId } from "./css-marks.ts";

const code = "CROSS_OWNER_CSS", theme = themeMechanism;
type StylesheetImport = Readonly<{ from: string; line: number; specifier: string; target: Target }>;
type Marks = Readonly<{ slots: ReadonlyMap<string, ReadonlySet<string>>; marks: ReadonlyMap<string, string>; families: ReadonlyMap<string, string> }>;

const isThemeMechanism = (owner: Owner | undefined) => owner?.kind === "mechanism" && owner.id === theme;
const isThemeEntry = (owner: Owner | undefined) => owner?.kind === "fixed" && owner.category === theme;
const compositionOf = (owner: Owner | undefined) => owner?.kind === "piece" && owner.pieceKind === "composition" ? owner.id : undefined;
/** The template host loads the theme entry; rule T fixes that file's exact grammar. */
const isTemplateHost = (owner: Owner | undefined) => owner?.kind === "fixed" && owner.category === "build-host";

const describe = (path: string, owner: Owner | undefined) => owner?.kind === "piece" ? `${owner.pieceKind} ${owner.id}`
  : owner?.kind === "mechanism" ? `mechanism ${owner.id}` : owner?.kind === "vendor" ? `vendor family ${owner.family}`
  : isThemeEntry(owner) ? "theme.css" : path;

const staticText = (value: unknown) => Array.isArray(value) && value.length > 0 && value.every(part => part?.type === "Text")
  ? value.map(part => String(part.data)).join("") : undefined;

/** Slot names a vendor file writes: `data-slot="x"` in markup, `"data-slot": "x"` in an object or a destructuring default. */
function slotsWritten(context: GateContext, path: string): string[] {
  const parsed = context.parsed(path), found: string[] = [];
  if (parsed.kind === "svelte") walk(parsed.fragment, node => {
    const value = node.type === "Attribute" && node.name === "data-slot" ? staticText(node.value) : undefined;
    if (value !== undefined) found.push(value);
  });
  const named = (name: ts.Node | undefined) => name !== undefined && (ts.isStringLiteral(name) || ts.isIdentifier(name)) && name.text === "data-slot";
  for (const script of parsed.scripts) {
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAssignment(node) && named(node.name) && ts.isStringLiteral(node.initializer)) found.push(node.initializer.text);
      if (ts.isBindingElement(node) && named(node.propertyName) && node.initializer && ts.isStringLiteral(node.initializer)) found.push(node.initializer.text);
      ts.forEachChild(node, visit);
    };
    visit(script.file);
  }
  return found;
}

function ownedMarks(context: GateContext): Marks {
  const slots = new Map<string, Set<string>>(), families = new Map<string, string>(), marks = new Map<string, string>();
  for (const path of context.paths) {
    const owner = context.owners.of(path);
    if (owner?.kind === "vendor" && parseable(path) && context.text(path) !== undefined) for (const slot of slotsWritten(context, path)) {
      slots.set(slot, (slots.get(slot) ?? new Set<string>()).add(owner.foundation));
      families.set(`${slot}#${owner.foundation}`, owner.family);
    }
  }
  for (const { declaration } of context.declarations) {
    const contract = declaration.kind === "mechanism" ? undefined : context.contract(declaration.id);
    if (contract?.closed) for (const mark of contract.marks) marks.set(mark.toLowerCase(), declaration.id);
  }
  return { slots, marks, families };
}

function slotViolation(selector: string, part: SyntaxNode, owner: string | undefined, known: Marks): string | undefined {
  const slot = typeof part.value === "string" ? decodeCss(part.value) : undefined;
  if (part.matcher !== "=" || slot === undefined) return `selector ${selector} matches vendor slots by pattern: name one slot of the owner`;
  const owners = known.slots.get(slot);
  if (!owners) return `selector ${selector} names the slot ${slot}, which no vendor family defines`;
  if (owner !== undefined && owners.has(owner)) return undefined;
  const [foundation = ""] = [...owners].sort();
  return `selector ${selector} names the slot ${slot} of vendor family ${known.families.get(`${slot}#${foundation}`)}, owned by ${foundation}`;
}

/** Element, global, slot and mark selectors of one stylesheet, judged against the stylesheet's owner. */
function selectorViolations(context: GateContext, sheet: Stylesheet, known: Marks): Violation[] {
  const owner = context.owners.of(sheet.path), id = ownerId(owner), found: Violation[] = [];
  const styleElements = !isThemeMechanism(owner), styleGlobally = !isThemeMechanism(owner) && !isThemeEntry(owner);
  for (const rule of rulesOf(sheet.tree)) {
    const selector = sheet.text(rule.prelude).replace(/\s+/g, " ").trim(), line = sheet.line(rule.prelude);
    const reported = new Set<string>(), report = (what: string) => {
      if (!reported.has(what)) found.push(violation(code, sheet.path, line, what));
      reported.add(what);
    };
    walk(rule.prelude, part => {
      if (part.type === "TypeSelector" && styleElements)
        report(`selector ${selector} names the element ${decodeCss(String(part.name))}: only the theme mechanism styles elements`);
      if (part.type === "PseudoClassSelector" && part.name === "global" && styleGlobally)
        report(`selector ${selector} styles outside its component: only the theme mechanism styles globally`);
      if (part.type !== "AttributeSelector") return;
      const name = decodeCss(String(part.name)).toLowerCase(), markOwner = known.marks.get(name);
      const what = name === "data-slot" ? slotViolation(selector, part, id, known)
        : markOwner !== undefined && markOwner !== id ? `selector ${selector} names ${name}, a mark of ${markOwner}` : undefined;
      if (what !== undefined) report(what);
    });
  }
  return found;
}

/** Every `.css` file, Svelte `<style>` block and `<style>` element, parsed once. Reported directly: unparseable CSS, a
 * `<style>` element (it styles the whole document) and a composition's `<style>` block (compositions own no CSS). */
function stylesheetsOf(context: GateContext): { sheets: Stylesheet[]; direct: Violation[] } {
  const sheets: Stylesheet[] = [], direct: Violation[] = [];
  const add = (path: string, css: string, offset: number, line: (position: number) => number) => {
    const read = readStylesheet(path, css, offset, line);
    if (read.kind === "sheet") sheets.push(read.sheet);
    else direct.push(violation(code, path, read.line, `the stylesheet does not parse as CSS: ${read.reason}`));
  };
  for (const path of context.paths) {
    const text = context.text(path), owner = context.owners.of(path);
    if (text === undefined) continue;
    if (path.endsWith(".css")) add(path, text, 0, lineOf(text));
    if (!path.endsWith(".svelte")) continue;
    const parsed = context.parsed(path);
    if (parsed.kind !== "svelte") continue;
    const content = parsed.css?.content, composition = compositionOf(owner);
    if (parsed.css && composition !== undefined) direct.push(violation(code, path, parsed.line(position(parsed.css, "start")),
      `composition ${composition} has a <style> block: compositions own no CSS`));
    if (isNode(content)) add(path, text.slice(position(content, "start"), position(content, "end")), position(content, "start"), parsed.line);
    walk(parsed.fragment, node => {
      if (node.type !== "RegularElement" || node.name !== "style") return;
      if (!isThemeMechanism(owner)) direct.push(violation(code, path, parsed.line(position(node, "start")),
        "a <style> element styles the whole document: only the theme mechanism styles globally"));
      const [first] = nodes(isNode(node.fragment) ? node.fragment.nodes : undefined);
      if (first?.type === "Text") add(path, String(first.raw ?? first.data), position(first, "start"), parsed.line);
    });
  }
  return { sheets, direct };
}

/** A stylesheet request in any language the installed builder reads (`.css`, `.scss`, `.less`…), whatever its query. */
const isStylesheet = (specifier: string) => isCSSRequest(specifier.split(/[?#]/, 1)[0] ?? "");
/** Stylesheets loaded by script imports and re-exports (`import "./x.css"`, `export * from "./x.css"`) and by CSS `@import` / `@reference`. */
function stylesheetImports(context: GateContext, sheets: readonly Stylesheet[]): StylesheetImport[] {
  const present = new Set(context.paths), exists = (path: string) => present.has(path), found: StylesheetImport[] = [];
  for (const path of context.paths) for (const item of context.imports(path)) {
    if (isStylesheet(item.specifier)) found.push({ from: path, line: item.line, specifier: item.specifier, target: item.target });
  }
  for (const sheet of sheets) if (sheet.path.endsWith(".css")) for (const atRule of sheet.atRules) {
    if (atRule.name !== "import" && atRule.name !== "reference") continue;
    const specifier = /^\s*(?:url\(\s*)?(["']?)([^"')\s]+)\1/.exec(atRule.prelude)?.[2];
    if (specifier !== undefined) found.push({ from: sheet.path, line: atRule.line, specifier, target: resolveSpecifier(sheet.path, specifier, exists, context.layout.aliases) });
  }
  return found;
}

function importViolation(context: GateContext, item: StylesheetImport): string | undefined {
  const importer = context.owners.of(item.from), name = describe(item.from, importer);
  if (compositionOf(importer) !== undefined) return `${name} imports the stylesheet ${item.specifier}: compositions own no CSS`;
  if (item.target.kind === "package") return isThemeEntry(importer) || isThemeMechanism(importer) ? undefined
    : `${name} imports the package stylesheet ${item.target.name}: only the theme imports package CSS`;
  if (item.target.kind !== "file") return undefined;
  const path = item.target.path, owner = context.owners.of(path);
  if (isThemeEntry(owner) && isTemplateHost(importer)) return undefined;
  if (isThemeEntry(importer)) return owner?.kind === "mechanism" && owner.owner === theme ? undefined
    : `theme.css imports ${path}, which is not a theme mechanism stylesheet`;
  const mine = ownerId(importer), theirs = ownerId(owner);
  return mine !== undefined && mine === theirs ? undefined
    : `${name} imports ${path}, owned by ${theirs ?? "no declared owner"}: a stylesheet is imported only by its owner`;
}

export const ruleG: ContentRule = context => {
  const { sheets, direct } = stylesheetsOf(context), known = ownedMarks(context), found = [...direct];
  for (const sheet of sheets) found.push(...selectorViolations(context, sheet, known));
  found.push(...foreignMarkViolations(context, sheets, new Set([...known.marks.keys()].map(mark => `[${mark}]`))), ...customPropertyViolations(context, sheets));
  for (const item of stylesheetImports(context, sheets)) {
    const what = importViolation(context, item);
    if (what !== undefined) found.push(violation(code, item.from, item.line, what));
  }
  return found;
};

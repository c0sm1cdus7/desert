// Rule I. Law: DOM, style and motion facilities run only in a foundation folder, a vendor family a foundation owns, or a
// mechanism a foundation owns; and no visual-root file imports src/testing. Raises VISUAL_RUNTIME_GLOBAL.
import { posix } from "node:path";
import ts from "typescript";
import { walk } from "../../visual-boundary/walk.ts";
import { parseable, type ContentRule, type GateContext } from "./context.ts";
import { scriptLine, type Parsed, type Script } from "./parse.ts";
import { resolveSpecifier } from "./resolve-imports.ts";
import { violation, type Violation } from "./violation.ts";
import { themeMechanism } from "../layout.ts";

const code = "VISUAL_RUNTIME_GLOBAL";
const globalObjects = new Set(["window", "globalThis", "self"]);
const windowMembers = new Set(["document", "getComputedStyle", "matchMedia", "requestAnimationFrame", "getSelection", "innerWidth",
  "innerHeight", "outerWidth", "outerHeight", "visualViewport", "scrollTo", "scrollBy", "scrollX", "scrollY", "devicePixelRatio"]);
const globalFunctions = new Set(["getComputedStyle", "matchMedia", "requestAnimationFrame", "getSelection"]);
const observers = new Set(["ResizeObserver", "IntersectionObserver", "MutationObserver"]);
/** Element members read or written as properties (a call of the same name is someone else's method). */
const elementProperties = new Set(["style", "classList", "className", "innerHTML", "outerHTML", "textContent", "innerText",
  "adoptedStyleSheets", "scrollTop", "scrollLeft", "scrollWidth", "scrollHeight", "clientWidth", "clientHeight", "offsetWidth",
  "offsetHeight", "offsetTop", "offsetLeft"]);
/** Element members that act when called. */
const elementMethods = new Set(["animate", "insertAdjacentHTML", "insertAdjacentText", "insertAdjacentElement", "setAttribute",
  "removeAttribute", "toggleAttribute", "setProperty", "focus", "scrollTo", "scrollBy", "scrollIntoView", "getBoundingClientRect",
  "getClientRects", "querySelector", "querySelectorAll", "getElementById", "getElementsByClassName", "getElementsByTagName",
  "createElement", "createElementNS", "appendChild", "append", "prepend", "before", "after", "replaceWith", "remove",
  "insertBefore", "replaceChild", "removeChild", "replaceChildren", "closest", "attachShadow", "getAnimations"]);
/** `element.remove()` takes no argument; `host.remove(record, id)` is a domain method of the same name. */
const argumentless = new Set(["remove"]);

/** Why DOM is forbidden in this file, or undefined when its owner may touch the DOM. */
function forbiddenReason(context: GateContext, path: string, foundationFolders: readonly string[]): string | undefined {
  if (foundationFolders.some(folder => path.startsWith(folder))) return undefined;
  const owner = context.owners.of(path);
  if (!owner) return "an undeclared file owns no DOM";
  if (owner.kind === "vendor") return undefined;
  if (owner.kind === "mechanism") {
    if (owner.owner === themeMechanism) return "a theme mechanism owns no script DOM";
    return context.owners.declaration(owner.owner)?.declaration.kind === "foundation" ? undefined : `mechanism owner ${owner.owner} is not a foundation`;
  }
  if (owner.kind === "piece") {
    if (owner.pieceKind === "foundation") return undefined;
    return owner.dispatch ? `a renderer composition owns no DOM (${owner.id})` : `a composition owns no DOM (${owner.id})`;
  }
  if (owner.kind === "infra") return "infra/ must be nonvisual";
  if (owner.kind === "generated") return "a generated file owns no DOM";
  return `${owner.category} files own no DOM`;
}

function memberName(node: ts.Node): string | undefined {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) return node.argumentExpression.text;
  return undefined;
}

const isIdentifierNamed = (node: ts.Node, names: ReadonlySet<string>) => ts.isIdentifier(node) && names.has(node.text);
const callOf = (node: ts.Node) => ts.isCallExpression(node.parent) && node.parent.expression === node ? node.parent : undefined;
const receiverLabel = (receiver: ts.Expression) => /^[\w$.]+$/.test(receiver.getText()) ? receiver.getText() : "";

function inTypePosition(node: ts.Node): boolean {
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) if (ts.isTypeNode(current)) return true;
  return false;
}

/** `document` as a value: aliased, passed, destructured; not a member name, a declared name or a type query. */
function isBareDocument(node: ts.Node): boolean {
  if (!ts.isIdentifier(node) || node.text !== "document") return false;
  const parent = node.parent;
  if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node) return false;
  if (Reflect.get(parent, "name") === node || Reflect.get(parent, "propertyName") === node) return false;
  return !inTypePosition(node);
}

function memberOperation(node: ts.PropertyAccessExpression | ts.ElementAccessExpression): string | undefined {
  const name = memberName(node), receiver = node.expression;
  if (name === undefined) return undefined;
  if (ts.isIdentifier(receiver) && receiver.text === "document") return `document.${name}`;
  if (isIdentifierNamed(receiver, globalObjects) && windowMembers.has(name)) return `${receiver.getText()}.${name}`;
  const call = callOf(node);
  const facility = call ? elementMethods.has(name) && !(argumentless.has(name) && call.arguments.length) : elementProperties.has(name);
  return facility ? `${receiverLabel(receiver)}.${name}` : undefined;
}

function constructedObserver(node: ts.NewExpression): string | undefined {
  const callee = node.expression;
  const name = ts.isIdentifier(callee) ? callee.text
    : ts.isPropertyAccessExpression(callee) && isIdentifierNamed(callee.expression, globalObjects) ? callee.name.text : undefined;
  return name !== undefined && observers.has(name) ? `new ${name}` : undefined;
}

/** The DOM facility this node uses, named as the source spells it. */
function operationOf(node: ts.Node): string | undefined {
  if (ts.isNewExpression(node)) return constructedObserver(node);
  if (ts.isCallExpression(node) && isIdentifierNamed(node.expression, globalFunctions)) return node.expression.getText();
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) return memberOperation(node);
  return isBareDocument(node) ? "document" : undefined;
}

type Range = Readonly<{ start: number; end: number }>;
const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
/** The source range of a template expression node, when the value is one. */
function rangeOf(value: unknown): Range | undefined {
  if (!isObject(value)) return undefined;
  const start: unknown = Reflect.get(value, "start"), end: unknown = Reflect.get(value, "end");
  return typeof start === "number" && typeof end === "number" ? { start, end } : undefined;
}

/** Each maximal script expression of a Svelte template (event handlers, attribute values, block tests), as its own tree. */
function templateScripts(parsed: Parsed, path: string): readonly Script[] {
  if (parsed.kind !== "svelte") return [];
  const ranges: Range[] = [];
  walk(parsed.fragment, node => {
    for (const key of ["expression", "test", "declaration"]) {
      const range = rangeOf(node[key]);
      if (range) ranges.push(range);
    }
  });
  const maximal = ranges.filter(range => !ranges.some(other => other !== range && other.start <= range.start && range.end <= other.end
    && (other.start < range.start || range.end < other.end)));
  const unique = [...new Map(maximal.map(range => [`${range.start}:${range.end}`, range])).values()];
  return unique.map(range => ({ offset: range.start,
    file: ts.createSourceFile(path, parsed.source.slice(range.start, range.end), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS) }));
}

/** The receiver of a member access or the callee of a call: the next link down an access chain. */
function receiverOf(node: ts.Node): ts.Expression | undefined {
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) || ts.isCallExpression(node)) return node.expression;
  return ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node) ? node.expression : undefined;
}

/** The parts of an access chain that are not the chain itself: call arguments and computed keys, each its own chain. */
function branchesOf(node: ts.Node): readonly ts.Node[] {
  if (ts.isCallExpression(node)) return [...node.typeArguments ?? [], ...node.arguments];
  return ts.isElementAccessExpression(node) ? [node.argumentExpression] : [];
}

/** One use per DOM-operation chain: the outermost access is reported, the links below it are not. */
function domUses(context: GateContext, path: string, reason: string): Violation[] {
  const parsed = context.parsed(path), found: Violation[] = [];
  for (const script of [...parsed.scripts, ...templateScripts(parsed, path)]) {
    const skipChain = (node: ts.Node): void => {
      for (const branch of branchesOf(node)) visit(branch);
      const receiver = receiverOf(node);
      if (receiver) skipChain(receiver); else if (!ts.isIdentifier(node)) ts.forEachChild(node, visit);
    };
    const visit = (node: ts.Node): void => {
      const operation = operationOf(node);
      if (operation === undefined) { ts.forEachChild(node, visit); return; }
      found.push(violation(code, path, scriptLine(parsed, script, node), `${operation}: ${reason}`));
      skipChain(node);
    };
    visit(script.file);
  }
  return found;
}

/** N54: the test-only evidence project never enters the build path. */
function testOnlyImports(context: GateContext, path: string): Violation[] {
  return context.imports(path).flatMap(item => {
    const requested = resolveSpecifier(path, item.specifier, () => true, context.layout.aliases);
    if (requested.kind !== "file" || !requested.path.startsWith(`${context.layout.testing}/`)) return [];
    return [violation(code, path, item.line, `imports ${requested.path}: test-only code must not enter the build path`)];
  });
}

export const ruleI: ContentRule = context => {
  const foundationFolders = context.declarations.filter(located => located.declaration.kind === "foundation")
    .map(located => `${posix.dirname(located.path)}/`);
  return context.paths.filter(path => parseable(path) && context.text(path) !== undefined).flatMap(path => {
    const reason = forbiddenReason(context, path, foundationFolders);
    return [...testOnlyImports(context, path), ...reason === undefined ? [] : domUses(context, path, reason)];
  });
};

import { posix } from "node:path";
import { parse } from "svelte/compiler";
import ts from "typescript";
import { walk, type SyntaxNode as Node } from "./walk.ts";
import { cssProperty, cssDeclarationProperty, decodeCss as decode, isToolbarGeometry } from "./toolbar-properties.ts";
import { toolbarPlacement } from "./toolbar-placement.ts";

type Source = Readonly<{ path: string; source: string }>;
type Element = Readonly<{ tag: string; attributes: ReadonlyMap<string, readonly string[] | null>; classes: ReadonlySet<string> }>;
type Parsed = Source & { text: string; tree: ReturnType<typeof parse> };
const toolbar = "src/svelte/catalog/compositions/toolbar-layout/ToolbarLayout.svelte";
const identity = "src/svelte/catalog/compositions/toolbar-layout/ToolbarIdentity.svelte";
const button = "src/svelte/vendor/components/ui/button/button.svelte";
const material = "src/svelte/catalog/compositions/toolbar-layout/toolbar-layout.css";
const mechanisms = new Set([material, "src/svelte/catalog/mechanisms/surface-reading/surface-reading.css",
  "src/svelte/catalog/mechanisms/surface-chrome/surface-chrome.css", "src/svelte/catalog/mechanisms/typography/typography.css", "src/svelte/catalog/mechanisms/catalog-profile/catalog-profile.css"]);
const nodes = (value: unknown): Node[] => Array.isArray(value) ? value as Node[] : [];
const variableReads = (value: unknown) => [...decode(String(value)).replace(/\/\*[\s\S]*?\*\//g, "")
  .matchAll(/\bvar\(\s*(--[\w-]+)/g)].map(match => match[1]!);

function element(node: Node): Element {
  const attributes = new Map<string, readonly string[] | null>(), classes = new Set<string>();
  function finite(value: Node): readonly string[] | null {
    if (value.type === "Literal") return value.value === null ? [] : [String(value.value)];
    if (value.type === "Identifier" && value.name === "undefined") return [];
    if (value.type === "ConditionalExpression") {
      const consequent = finite(value.consequent as Node), alternate = finite(value.alternate as Node);
      return consequent && alternate ? [...consequent, ...alternate] : null;
    }
    return null;
  }
  for (const attribute of nodes(node.attributes)) {
    if (attribute.type !== "Attribute") continue;
    const values = attribute.value && typeof attribute.value === "object" && !Array.isArray(attribute.value)
      ? [attribute.value as Node] : nodes(attribute.value);
    const value = values.length && values.every(item => item.type === "Text")
      ? [values.map(item => String(item.data)).join("")] : attribute.value === true ? [""]
      : values.length === 1 && values[0]?.type === "ExpressionTag" ? finite(values[0].expression as Node) : null;
    if (value?.length === 0) continue;
    attributes.set(String(attribute.name), value);
    if (attribute.name === "class") {
      if (value !== null) for (const text of value) for (const name of text.split(/\s+/)) classes.add(name);
      else walk(attribute, part => { if (part.type === "Literal" && typeof part.value === "string")
        for (const name of part.value.split(/\s+/)) classes.add(name); });
    }
  }
  return { tag: String(node.name), attributes, classes };
}

function relativeMatches(relative: Node, candidate: Element): boolean {
  return nodes(relative.selectors).every(selector => {
    if (selector.type === "TypeSelector") return selector.name === "*" || decode(String(selector.name)) === candidate.tag;
    if (selector.type === "ClassSelector") return candidate.classes.has(decode(String(selector.name)));
    if (selector.type === "IdSelector") return candidate.attributes.get("id")?.includes(decode(String(selector.name))) ?? false;
    if (selector.type === "AttributeSelector") {
      const name = decode(String(selector.name));
      if (!candidate.attributes.has(name)) return false;
      const value = candidate.attributes.get(name);
      if (!selector.matcher || value === null) return true;
      const expected = decode(String(selector.value).replace(/^(["'])(.*)\1$/, "$2"));
      if (selector.matcher === "=") return value?.some(item => selector.flags === "i" ? item.toLowerCase() === expected.toLowerCase() : item === expected) ?? false;
      if (selector.matcher === "~=") return value?.some(item => item.split(/\s+/).includes(expected)) ?? false;
      if (selector.matcher === "^=") return value?.some(item => item.startsWith(expected)) ?? false;
      if (selector.matcher === "$=") return value?.some(item => item.endsWith(expected)) ?? false;
      if (selector.matcher === "*=") return value?.some(item => item.includes(expected)) ?? false;
      return true;
    }
    if (selector.type === "PseudoElementSelector") return false;
    if (selector.type === "PseudoClassSelector" && ["is", "where", "global"].includes(String(selector.name)) && selector.args)
      return nodes((selector.args as Node).children).some(complex => relativeMatches(nodes(complex.children).at(-1)!, candidate));
    // Negation, state and relational predicates can narrow a match, never prove
    // a foreign selector harmless. Unknown selectors fail conservatively.
    return true;
  });
}

function expandGlobal(complex: Node): Node[][] {
  let result: Node[][] = [[]];
  for (const relative of nodes(complex.children)) {
    const selectors = nodes(relative.selectors);
    const global = selectors.length === 1 && selectors[0]?.type === "PseudoClassSelector"
      && selectors[0].name === "global" ? selectors[0] : undefined;
    if (global?.args) {
      const children = nodes((global.args as Node).children).flatMap(expandGlobal);
      result = result.flatMap(prefix => children.map(child => [...prefix, ...child]));
    } else result = result.map(prefix => [...prefix, relative]);
  }
  return result;
}

function globalSubject(relative: Node, inherited: boolean): boolean {
  if (inherited) return true;
  let global = false;
  walk(relative, selector => { if (selector.type === "PseudoClassSelector" && selector.name === "global") global = true; });
  return global;
}

function readProfile(parsed: readonly Parsed[]) {
  const native: { value: Element; host: boolean }[] = [], protectedElements: { value: Element; owner: string }[] = [];
  const imports = new Map<string, Map<string, string>>(), reaches = new Set([toolbar, identity]), toolbarSlots = new Set<string>();
  for (const item of parsed) {
    const bindings = new Map<string, string>();
    for (const block of [item.tree.instance, item.tree.module]) {
      const content = block?.content as { start: number; end: number } | undefined;
      if (!content) continue;
      const script = ts.createSourceFile(item.path, item.source.slice(content.start, content.end), ts.ScriptTarget.Latest, true);
      for (const statement of script.statements) if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
        && statement.importClause?.name) {
        const request = statement.moduleSpecifier.text;
        bindings.set(statement.importClause.name.text, request.startsWith(".") ? posix.normalize(posix.join(posix.dirname(item.path), request))
          : request.startsWith("@desert/") ? `src/${request.slice(8)}` : request);
      }
    }
    imports.set(item.path, bindings);
  }
  const containsToolbar = (path: string, value: unknown, suppliedSlot = false) => {
    let found = false;
    walk(value, node => {
      if (node.type === "RenderTag" && suppliedSlot && toolbarSlots.has(path)
        || node.type === "Component" && reaches.has(imports.get(path)?.get(String(node.name)) ?? "")) found = true;
    });
    return found;
  };
  for (let changed = true; changed;) {
    changed = false;
    for (const item of parsed) {
      if (!reaches.has(item.path) && containsToolbar(item.path, item.tree.fragment)) {
        reaches.add(item.path); changed = true;
      }
      walk(item.tree.fragment, node => {
        if (node.type !== "Component" || !containsToolbar(item.path, node.fragment)) return;
        const target = imports.get(item.path)?.get(String(node.name));
        if (target && !toolbarSlots.has(target)) { toolbarSlots.add(target); changed = true; }
      });
    }
  }
  for (const item of parsed) walk(item.tree.fragment, node => {
    if (node.type !== "RegularElement" && node.type !== "Component") return;
    const value = element(node), host = containsToolbar(item.path, node.fragment, true);
    native.push({ value, host });
    if (node.type === "RegularElement" && [toolbar, identity, button].includes(item.path)) protectedElements.push({ value, owner: item.path });
  });
  return { native, protectedElements };
}

/** A style selector may cross a component only when its matched subject is not
 * part of the shared toolbar. Subjects and enclosing hosts come from the actual
 * Svelte AST, including lexical slot hosts, not another list of CSS class names. */
export function assertIndirectToolbarCss(sources: readonly Source[]): boolean {
  const parsed: Parsed[] = sources.filter(item => /\.(svelte|css)$/.test(item.path)).map(item => {
    const text = item.path.endsWith(".css") ? `<style>${item.source}</style>` : item.source;
    return { ...item, text, tree: parse(text, { modern: true }) };
  });
  if (!parsed.some(item => item.path === toolbar) || !parsed.some(item => item.path === material)) return false;
  const profile = readProfile(parsed);
  const placement = toolbarPlacement(sources, parsed);
  const definitions = new Map<string, { path: string; value: string }[]>(), pending = new Set<string>();
  definitions.set("--sidebar-width", placement.values.map(value => ({ path: placement.owner, value })));
  for (const item of parsed) if (mechanisms.has(item.path)) walk(item.tree.css, node => {
    if (node.type !== "Declaration") return;
    const property = cssDeclarationProperty(node, item.text);
    if (property.startsWith("--")) definitions.set(property, [...definitions.get(property) ?? [], { path: item.path, value: String(node.value) }]);
    else if (item.path === material && isToolbarGeometry(property)) for (const name of variableReads(node.value)) pending.add(name);
  });
  const writers = new Map<string, string>();
  for (const name of pending) {
    const declared = definitions.get(name) ?? [], owners = new Set(declared.map(item => item.path));
    if (owners.size !== 1) throw new Error(`TOOLBAR_OWNERSHIP: ${name}: geometry input needs one canonical writer`);
    writers.set(name, [...owners][0]!);
    for (const declaration of declared) for (const next of variableReads(declaration.value)) pending.add(next);
  }
  for (const item of parsed) {
    const fail = (message: string): never => { throw new Error(`TOOLBAR_OWNERSHIP: ${item.path}: ${message}`); };
    walk(item.tree.css, node => {
      if (node.type === "Declaration") {
        const property = cssDeclarationProperty(node, item.text), writer = writers.get(property);
        if (writer && writer !== item.path) fail(`inherited geometry ${property}; owner is ${writer}`);
      }
    });
    function inspect(value: unknown, inheritedGlobal = item.path.endsWith(".css"), layer?: string, utility?: string): void {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) { for (const child of value) inspect(child, inheritedGlobal, layer, utility); return; }
      const node = value as Node;
      if (node.type === "Atrule" && node.name === "layer") layer = String(node.prelude);
      if (node.type === "Atrule" && node.name === "utility") utility = String(node.prelude);
      if (node.type === "Rule") {
        const prelude = node.prelude as Node, complexes = nodes(prelude.children);
        const globalBlock = complexes.some(complex => nodes(complex.children).some(relative => nodes(relative.selectors)
          .some(selector => selector.type === "PseudoClassSelector" && selector.name === "global" && !selector.args)));
        const declarations = nodes((node.block as Node).children).filter(child => child.type === "Declaration" && isToolbarGeometry(cssDeclarationProperty(child, item.text)));
        if (item.path !== material && declarations.length) for (const complex of complexes) {
          const originalLast = nodes(complex.children).at(-1)!;
          if (!globalSubject(originalLast, inheritedGlobal)) continue;
          for (const chain of expandGlobal(complex)) {
            const subject = chain.at(-1)!;
            const targets = profile.protectedElements.filter(candidate => relativeMatches(subject, candidate.value));
            if (!targets.length || targets.every(candidate => candidate.owner === item.path)) continue;
            const typographyRule = item.path === "src/svelte/catalog/mechanisms/typography/typography.css" && declarations.every(declaration =>
              /^(?:font|line-height|letter-spacing)(?:-|$)/.test(cssDeclarationProperty(declaration, item.text))
              || layer === "base" && cssDeclarationProperty(declaration, item.text) === "margin" && declaration.value === "0"
              && chain.length === 1 && nodes(subject.selectors).every(selector => selector.type === "TypeSelector" && /^(?:h[1-6]|p)$/.test(String(selector.name))));
            if (typographyRule) continue;
            const universalReset = layer === "base" && chain.length === 1 && nodes(subject.selectors).length === 1
              && nodes(subject.selectors)[0]?.type === "TypeSelector" && nodes(subject.selectors)[0]?.name === "*"
              && declarations.every(declaration => cssDeclarationProperty(declaration, item.text) === "box-sizing" && declaration.value === "border-box");
            if (universalReset) continue;
            const buttonContent = targets.every(candidate => candidate.owner === button && candidate.value.attributes.has("data-button-content"));
            const controlFeedback = item.path === "src/svelte/catalog/mechanisms/control-feedback/control-feedback.css" && utility === "tm-control"
              && buttonContent && declarations.every(declaration => cssDeclarationProperty(declaration, item.text) === "transform");
            if (controlFeedback) continue;
            let disabled = false, materialState = false;
            walk(complex, selector => {
              if (selector.type === "PseudoClassSelector" && selector.name === "disabled") disabled = true;
              if (selector.type === "AttributeSelector") {
                const name = decode(String(selector.name)), value = String(selector.value).replace(/^["']|["']$/g, "");
                if (["data-disabled", "aria-disabled"].includes(name) && value === "true") disabled = true;
                if (name === "data-material" || name === "data-search-field" || name === "data-slot" && value === "field") materialState = true;
              }
            });
            const disabledMaterial = item.path === "src/svelte/catalog/mechanisms/pane-material/pane-material.css" && disabled && materialState
              && declarations.every(declaration => cssDeclarationProperty(declaration, item.text) === "opacity");
            if (disabledMaterial) continue;
            const ancestors = chain.slice(0, -1);
            const canReach = ancestors.every(relative => {
              const matching = profile.native.filter(candidate => relativeMatches(relative, candidate.value));
              return !matching.length || matching.some(candidate => candidate.host)
                || profile.protectedElements.some(candidate => relativeMatches(relative, candidate.value));
            });
            if (canReach) {
              const text = item.path.endsWith(".css") ? `<style>${item.source}</style>` : item.source;
              fail(`global geometry ${declarations.map(item => item.property).join(", ")} may reach toolbar-owned elements: ${text.slice(Number(prelude.start), Number(prelude.end))}`);
            }
          }
        }
        inspect(node.block, inheritedGlobal || globalBlock, layer, utility);
        return;
      }
      for (const child of Object.values(node)) inspect(child, inheritedGlobal, layer, utility);
    }
    inspect(item.tree.css);
    const write = (property: string) => {
      const writer = writers.get(decode(property));
      if (writer && writer !== item.path) fail(`inline/scripted inherited geometry ${property}`);
    };
    walk(item.tree.fragment, node => {
      if (node.type === "StyleDirective") write(String(node.name));
      if (node.type === "Attribute" && node.name === "style" && !placement.permittedInline.has(node)) walk(node.value, part => {
        const value = part.type === "Text" ? part.data : part.type === "Literal" ? part.value
          : part.type === "TemplateElement" ? (part.value as { raw?: string })?.raw : undefined;
        if (typeof value === "string") for (const match of decode(value).matchAll(/(--[\w-]+)\s*:/g)) write(match[1]!);
      });
      if (node.type === "CallExpression" && (node.callee as Node)?.type === "MemberExpression"
        && ((node.callee as Node).property as Node)?.name === "setProperty") {
        const first = nodes(node.arguments)[0]; if (first?.type === "Literal" && typeof first.value === "string") write(first.value);
      }
    });
    for (const block of [item.tree.instance, item.tree.module]) {
      const content = block?.content as { start: number; end: number } | undefined;
      if (!content) continue;
      const script = ts.createSourceFile(item.path, item.source.slice(content.start, content.end), ts.ScriptTarget.Latest, true);
      function visit(node: ts.Node): void {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "setProperty") {
          const first = node.arguments[0]; if (first && ts.isStringLiteral(first)) write(first.text);
        }
        ts.forEachChild(node, visit);
      }
      visit(script);
    }
  }
  return true;
}

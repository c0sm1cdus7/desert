// Rule T. Law: the generated host adds nothing visual. Each template and host file has one fixed grammar: the HTML shell
// as it is, a layout that imports the theme and renders its child, pages that mount one composition from the catalog
// index with the props of the virtual surface module, fixed configuration plugin lists. Raises UNQUALIFIED_ARTIFACT.
import { posix } from "node:path";
import ts from "typescript";
import type { ContentRule, GateContext } from "./context.ts";
import type { ParsedSvelte } from "./parse.ts";
import { violation, type Violation } from "./violation.ts";
import type { SyntaxNode } from "../../visual-boundary/walk.ts";

const host = "src/build/svelte", template = `${host}/template`, surfaceModule = "virtual:desert/surface";
const shell = '<!doctype html> <html lang="en"> <head> <meta charset="utf-8" /> <meta name="viewport" content="width=device-width, initial-scale=1" /> '
  + '<meta name="referrer" content="no-referrer" /> %sveltekit.head% </head> <body><div>%sveltekit.body%</div></body> </html>';
/** Each page mounts exactly this composition of the catalog index. */
const pages: Readonly<Record<string, string>> = { [`${template}/src/routes/+page.svelte`]: "AccessGate", [`${host}/public-catalog-page.svelte`]: "PublicCatalogProduct" };
const declarations = [`${template}/src/app.d.ts`, `${host}/public-catalog-app.d.ts`];
const hostImports: Readonly<Record<string, readonly string[]>> = {
  [`${host}/config.mjs`]: ["@sveltejs/adapter-node", "@sveltejs/vite-plugin-svelte", "node:url", "./bits-scroll-lock.ts"],
  [`${host}/vite.mjs`]: ["node:fs", "node:path", "vite", "@sveltejs/kit/vite", "@tailwindcss/vite"],
  [`${host}/worker.mjs`]: ["node:path", "node:child_process", "node:url"],
  [`${host}/bits-scroll-lock.ts`]: ["node:module", "node:path", "node:fs"],
};
const vitePlugins = ["desert-surface", "tailwindcss", "sveltekit"];

type Check = (context: GateContext, path: string, fail: (what: string, line?: number) => void) => void;
const isNode = (value: unknown): value is SyntaxNode => typeof value === "object" && value !== null && !Array.isArray(value);
const nodeList = (value: unknown): SyntaxNode[] => Array.isArray(value) ? value.filter(isNode) : [];
const nodes = (fragment: SyntaxNode) => nodeList(fragment.nodes);
const meaningful = (fragment: SyntaxNode) => nodes(fragment).filter(item => !(item.type === "Text" && !String(item.data ?? "").trim()) && item.type !== "Comment");
const importsOf = (context: GateContext, path: string) => context.imports(path).filter(item => item.form === "import");

const htmlShell: Check = (context, path, fail) => {
  if ((context.text(path) ?? "").replace(/\s+/g, " ").trim() !== shell) fail("the HTML shell holds only its fixed markup and the SvelteKit placeholders");
};

const layout: Check = (context, path, fail) => {
  const parsed = context.parsed(path);
  if (parsed.kind !== "svelte" || parsed.css) return fail("the layout holds no style");
  const specifiers = importsOf(context, path).map(item => `${item.typeOnly ? "type " : ""}${item.specifier}`).sort();
  if (specifiers.join(",") !== "@desert/svelte/theme.css,type svelte") fail(`the layout imports only the theme and the Snippet type; found ${specifiers.join(", ")}`);
  const body = meaningful(parsed.fragment), only = body[0], call = isNode(only?.expression) ? only.expression : undefined;
  const callee = isNode(call?.callee) ? call.callee : undefined;
  if (body.length !== 1 || only?.type !== "RenderTag" || callee?.name !== "children") fail("the layout renders exactly {@render children()}");
};

function page(composition: string): Check {
  return (context, path, fail) => {
    const parsed = context.parsed(path);
    if (parsed.kind !== "svelte" || parsed.css) return fail("a page holds no style");
    const index = context.layout.generated.index, surfaceNames = new Set<string>();
    let mounted = false, foreign = false;
    for (const item of importsOf(context, path)) {
      if (item.specifier === surfaceModule) { for (const binding of item.bindings) surfaceNames.add(binding.local); continue; }
      const fromIndex = item.target.kind === "file" && item.target.path === index;
      const binding = item.bindings.length === 1 ? item.bindings[0] : undefined;
      if (fromIndex && binding?.imported === composition && binding.local === composition) mounted = true;
      else { foreign = true; fail(`a page imports only ${composition} from the catalog index and the surface module; found ${item.specifier}`, item.line); }
    }
    if (!mounted && !foreign) fail(`a page imports ${composition} from the catalog index (${posix.basename(index)})`);
    const body = meaningful(parsed.fragment), tag = body[0];
    if (body.length !== 1 || tag?.type !== "Component" || tag.name !== composition) return fail(`a page renders exactly one <${composition}>`, line(parsed, tag));
    for (const attribute of nodeList(tag.attributes)) {
      const value = isNode(attribute.value) ? attribute.value : undefined, expression = isNode(value?.expression) ? value.expression : value;
      const shorthand = attribute.type === "Attribute" && expression?.type === "Identifier";
      if (!shorthand || !surfaceNames.has(String(attribute.name))) fail(`<${composition}> receives only {name} props of the surface module; found ${String(attribute.name ?? attribute.type)}`, line(parsed, attribute));
    }
  };
}
const line = (parsed: ParsedSvelte, node: SyntaxNode | undefined) => typeof node?.start === "number" ? parsed.line(node.start) : 1;

const statements = (context: GateContext, path: string) => context.parsed(path).scripts.flatMap(script => [...script.file.statements]);

const pageOptions: Check = (context, path, fail) => {
  const found = statements(context, path).map(statement => statement.getText().replace(/\s+/g, " ").trim()).sort();
  if (found.join("|") !== "export const prerender = true;|export const ssr = false;") fail("+page.ts sets only ssr = false and prerender = true");
};

const surfaceDeclaration: Check = (context, path, fail) => {
  const all = statements(context, path), [only] = all;
  const valid = all.length === 1 && only && ts.isModuleDeclaration(only) && ts.isStringLiteral(only.name) && only.name.text === surfaceModule
    && only.body && ts.isModuleBlock(only.body) && only.body.statements.every(statement => ts.isVariableStatement(statement)
      && statement.declarationList.declarations.every(declaration => declaration.type && ts.isImportTypeNode(declaration.type)));
  if (!valid) fail(`declares only the ${surfaceModule} module with imported types`);
};

function json(expected: (value: unknown) => boolean, what: string): Check {
  return (context, path, fail) => {
    let value: unknown;
    try { value = JSON.parse(context.text(path) ?? ""); } catch { return fail(`${what}; not JSON`); }
    if (!expected(value)) fail(what);
  };
}
const keys = (value: unknown) => value && typeof value === "object" ? Object.keys(value).sort().join(",") : "";

const importList: Check = (context, path, fail) => {
  const allowed = hostImports[path] ?? [];
  for (const item of context.imports(path)) if (!allowed.includes(item.specifier)) fail(`imports only ${allowed.join(", ")}; found ${item.specifier}`, item.line);
};

const viteConfig: Check = (context, path, fail) => {
  importList(context, path, fail);
  const names: string[] = [];
  for (const script of context.parsed(path).scripts) {
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === "plugins" && ts.isArrayLiteralExpression(node.initializer)) {
        for (const element of node.initializer.elements) names.push(ts.isCallExpression(element) && ts.isIdentifier(element.expression) ? element.expression.text
          : ts.isObjectLiteralExpression(element) ? pluginName(element) : element.getText());
      }
      ts.forEachChild(node, visit);
    };
    visit(script.file);
  }
  if (names.join(",") !== vitePlugins.join(",")) fail(`the Vite plugins are exactly ${vitePlugins.join(", ")}; found ${names.join(", ")}`);
};
function pluginName(element: ts.ObjectLiteralExpression): string {
  const name = element.properties.find(property => ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === "name");
  return name && ts.isPropertyAssignment(name) && ts.isStringLiteral(name.initializer) ? name.initializer.text : "anonymous plugin";
}

const checks: Readonly<Record<string, Check>> = {
  [`${template}/src/app.html`]: htmlShell,
  [`${template}/src/routes/+layout.svelte`]: layout,
  [`${template}/src/routes/+page.ts`]: pageOptions,
  ...Object.fromEntries(Object.entries(pages).map(([path, composition]) => [path, page(composition)])),
  ...Object.fromEntries(declarations.map(path => [path, surfaceDeclaration])),
  [`${template}/package.json`]: json(value => keys(value) === "name,private,type,version", "the template package holds only name, private, type and version"),
  [`${template}/tsconfig.json`]: json(value => keys(value) === "compilerOptions,extends,include", "the template tsconfig holds only extends, compilerOptions and include"),
  [`${host}/config.mjs`]: importList, [`${host}/worker.mjs`]: importList, [`${host}/bits-scroll-lock.ts`]: importList,
  [`${host}/vite.mjs`]: viteConfig,
};

export const ruleT: ContentRule = context => {
  const found: Violation[] = [];
  for (const [path, check] of Object.entries(checks)) {
    if (context.text(path) === undefined) { found.push(violation("UNQUALIFIED_ARTIFACT", path, 1, "a host file the gate qualifies is missing")); continue; }
    check(context, path, (what, at = 1) => found.push(violation("UNQUALIFIED_ARTIFACT", path, at, what)));
  }
  for (const path of context.paths) if (path.startsWith(`${template}/static/`)) {
    found.push(violation("UNQUALIFIED_ARTIFACT", path, 1, "a static asset of the template is not a declared asset of a foundation"));
  }
  return found;
};

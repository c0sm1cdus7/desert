// Rule T. Law: the generated host adds nothing visual. Each template and host file has one fixed grammar read from its
// syntax tree: the HTML shell as it is, a layout that imports the theme and renders its child, pages that mount one
// composition from the catalog index with the props of the virtual surface module, and configuration files whose every
// statement, key, plugin, directive and spawned binary is one the host has today. Raises UNQUALIFIED_ARTIFACT.
// Host paths are read from `layout.fixed["build-host"]`, each found by its file name; none is written here.
import { posix } from "node:path";
import ts from "typescript";
import type { ContentRule, GateContext } from "./context.ts";
import type { ParsedSvelte } from "./parse.ts";
import { violation, type Violation } from "./violation.ts";
import type { SyntaxNode } from "../../visual-boundary/walk.ts";

const code = "UNQUALIFIED_ARTIFACT", surfaceModule = "virtual:desert/surface", surfaceId = "\0desert-surface";
const shell = '<!doctype html> <html lang="en"> <head> <meta charset="utf-8" /> <meta name="viewport" content="width=device-width, initial-scale=1" /> '
  + '<meta name="referrer" content="no-referrer" /> %sveltekit.head% </head> <body><div>%sveltekit.body%</div></body> </html>';

type Fail = (what: string, line?: number) => void;
type Check = (context: GateContext, path: string, fail: Fail) => void;

// ---- Svelte template files -------------------------------------------------------------------------------------------
const isNode = (value: unknown): value is SyntaxNode => typeof value === "object" && value !== null && !Array.isArray(value);
const nodeList = (value: unknown): SyntaxNode[] => Array.isArray(value) ? value.filter(isNode) : [];
const meaningful = (fragment: SyntaxNode) => nodeList(fragment.nodes).filter(item => !(item.type === "Text" && !String(item.data ?? "").trim()) && item.type !== "Comment");
const importsOf = (context: GateContext, path: string) => context.imports(path).filter(item => item.form === "import");
const line = (parsed: ParsedSvelte, node: SyntaxNode | undefined) => typeof node?.start === "number" ? parsed.line(node.start) : 1;

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

// ---- TypeScript declarations and JSON --------------------------------------------------------------------------------
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
const jsonKeys = (value: unknown) => value && typeof value === "object" ? Object.keys(value).sort().join(",") : "";

// ---- Syntax helpers for the configuration files ----------------------------------------------------------------------
const flat = (node: ts.Node) => node.getText().replace(/\s+/g, " ").trim();
const nameOf = (name: ts.PropertyName) => ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : `[${flat(name)}]`;
/** The keys of an object literal in source order; a spread or computed key is named by its text, so it never matches. */
const keysOf = (object: ts.ObjectLiteralExpression) => object.properties.map(property => property.name ? nameOf(property.name) : flat(property));
const sameList = (found: readonly string[], expected: readonly string[]) => found.join("\0") === expected.join("\0");
function propertyOf(object: ts.ObjectLiteralExpression, key: string): ts.Expression | undefined {
  const found = object.properties.find(property => property.name && nameOf(property.name) === key);
  return found && ts.isPropertyAssignment(found) ? found.initializer : undefined;
}
const stringOf = (node: ts.Node | undefined) => node && ts.isStringLiteral(node) ? node.text : undefined;
const stringsOf = (node: ts.Node | undefined) => node && ts.isArrayLiteralExpression(node) ? node.elements.map(element => stringOf(element) ?? flat(element)) : undefined;
const unwrap = (node: ts.Expression): ts.Expression => ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node;
/** `callee(...)` called by the local name `callee`, with `count` arguments. */
const isCall = (node: ts.Node | undefined, callee: string | undefined, count: number): node is ts.CallExpression =>
  !!node && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === callee && node.arguments.length === count;
const isAccess = (node: ts.Node | undefined, text: string) => !!node && (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && flat(node) === text;
/** `fileURLToPath(new URL("<relative>", import.meta.url))`. */
function isPackageUrl(node: ts.Node | undefined, fileURLToPath: string | undefined, relative: string) {
  if (!isCall(node, fileURLToPath, 1)) return false;
  const url = node.arguments[0];
  return !!url && ts.isNewExpression(url) && ts.isIdentifier(url.expression) && url.expression.text === "URL" && url.arguments?.length === 2
    && stringOf(url.arguments[0]) === relative && isAccess(url.arguments[1], "import.meta.url");
}
const statementLine = (statement: ts.Node) => statement.getSourceFile().getLineAndCharacterOfPosition(statement.getStart()).line + 1;

/** The fixed import bindings of a host file: specifier → imported names, in any order. */
type ImportGrammar = Readonly<Record<string, readonly string[]>>;
function imports(grammar: ImportGrammar): Check {
  return (context, path, fail) => {
    for (const item of context.imports(path)) {
      const allowed = grammar[item.specifier];
      if (!allowed) { fail(`imports only ${Object.keys(grammar).join(", ")}; found ${item.specifier}`, item.line); continue; }
      const names = item.bindings.map(binding => binding.imported);
      if (item.form !== "import" || item.typeOnly || names.some(name => !allowed.includes(name))) {
        fail(`imports from ${item.specifier} only ${allowed.join(", ")}; found ${names.join(", ") || item.form}`, item.line);
      }
    }
  };
}
/** The local name a file binds an imported name to, so a call is read through its import. */
const localOf = (context: GateContext, path: string, specifier: string, imported: string) =>
  context.imports(path).find(item => item.specifier === specifier)?.bindings.find(binding => binding.imported === imported)?.local;

/** A file of imports and one `export default <expression>`, the expression read by `body`. */
function defaultExport(body: (context: GateContext, path: string, expression: ts.Expression, fail: Fail) => void): Check {
  return (context, path, fail) => {
    const exports: ts.ExportAssignment[] = [];
    for (const statement of statements(context, path)) {
      if (ts.isImportDeclaration(statement)) continue;
      if (ts.isExportAssignment(statement) && !statement.isExportEquals) { exports.push(statement); continue; }
      fail(`holds only its imports and one export default; found ${ts.SyntaxKind[statement.kind]}`, statementLine(statement));
    }
    const [only] = exports;
    if (exports.length !== 1 || !only) return fail("holds only its imports and one export default");
    body(context, path, unwrap(only.expression), (what, at) => fail(what, at ?? statementLine(only)));
  };
}
const all = (...checks: readonly Check[]): Check => (context, path, fail) => { for (const check of checks) check(context, path, fail); };

// ---- vite.mjs: defineConfig(() => ({ plugins: [desert-surface, tailwindcss(), sveltekit()] })) -----------------------
const viteImports: ImportGrammar = { "node:fs": ["readFileSync"], "node:path": ["resolve"], vite: ["defineConfig"],
  "@sveltejs/kit/vite": ["sveltekit"], "@tailwindcss/vite": ["default"] };
const vitePlugins = ["desert-surface", "tailwindcss()", "sveltekit()"], surfaceKeys = ["name", "resolveId", "load"];

/** A hook `name(id) { if (id === "<when>") return <result>; }`; returns the result expression when the shape holds. */
function guardedHook(plugin: ts.ObjectLiteralExpression, name: string, when: string): ts.Expression | undefined {
  const hook = plugin.properties.find(property => property.name && nameOf(property.name) === name);
  if (!hook || !ts.isMethodDeclaration(hook) || hook.asteriskToken || hook.modifiers?.length || hook.parameters.length !== 1) return undefined;
  const [parameter] = hook.parameters, [only, ...rest] = hook.body?.statements ?? [];
  if (!parameter || !ts.isIdentifier(parameter.name) || !only || rest.length || !ts.isIfStatement(only) || only.elseStatement) return undefined;
  const condition = only.expression, id = parameter.name.text;
  const guarded = ts.isBinaryExpression(condition) && condition.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    && ts.isIdentifier(condition.left) && condition.left.text === id && stringOf(condition.right) === when;
  return guarded && ts.isReturnStatement(only.thenStatement) ? only.thenStatement.expression : undefined;
}

function surfacePlugin(context: GateContext, path: string, plugin: ts.ObjectLiteralExpression, fail: Fail) {
  const keys = keysOf(plugin);
  if (!sameList(keys, surfaceKeys)) return fail(`the desert-surface plugin holds exactly ${surfaceKeys.join(", ")}; found ${keys.join(", ")}`);
  if (stringOf(guardedHook(plugin, "resolveId", surfaceModule)) !== surfaceId) fail(`the desert-surface resolveId maps only ${surfaceModule} to its private id`);
  const loaded = guardedHook(plugin, "load", surfaceId), read = localOf(context, path, "node:fs", "readFileSync");
  const file = isCall(loaded, read, 2) ? loaded.arguments[0] : undefined;
  const surfaceFile = isCall(file, localOf(context, path, "node:path", "resolve"), 1) && stringOf(file.arguments[0]) === "surface.mjs";
  if (!surfaceFile || !isCall(loaded, read, 2) || stringOf(loaded.arguments[1]) !== "utf8") fail("the desert-surface load returns only surface.mjs for its private id");
}

const pluginLabel = (element: ts.Expression) => ts.isObjectLiteralExpression(element)
  ? stringOf(propertyOf(element, "name")) ?? "anonymous plugin" : flat(element);

const viteConfig: Check = all(imports(viteImports), defaultExport((context, path, expression, fail) => {
  const define = localOf(context, path, "vite", "defineConfig"), factory = isCall(expression, define, 1) ? expression.arguments[0] : undefined;
  const plain = factory && ts.isArrowFunction(factory) && !factory.modifiers?.length && !factory.parameters.length && !ts.isBlock(factory.body);
  const config = plain && !ts.isBlock(factory.body) ? unwrap(factory.body) : undefined;
  if (!config || !ts.isObjectLiteralExpression(config)) return fail("exports defineConfig(() => ({ plugins }))");
  const keys = keysOf(config), plugins = propertyOf(config, "plugins");
  if (!sameList(keys, ["plugins"])) fail(`the Vite config holds exactly plugins; found ${keys.join(", ")}`);
  if (!plugins || !ts.isArrayLiteralExpression(plugins)) return fail("the Vite plugins are an array literal");
  const labels = plugins.elements.map(pluginLabel), [surface, tailwind, kit] = plugins.elements;
  const fixed = labels.length === 3 && !!surface && ts.isObjectLiteralExpression(surface) && labels[0] === "desert-surface"
    && isCall(tailwind, localOf(context, path, "@tailwindcss/vite", "default"), 0) && isCall(kit, localOf(context, path, "@sveltejs/kit/vite", "sveltekit"), 0);
  if (!fixed) return fail(`the Vite plugins are exactly ${vitePlugins.join(", ")}; found ${labels.join(", ")}`);
  surfacePlugin(context, path, surface, fail);
}));

// ---- config.mjs: { preprocess: vitePreprocess(), kit: { adapter, alias, csp } } --------------------------------------
const configImports: ImportGrammar = { "@sveltejs/adapter-node": ["default"], "@sveltejs/vite-plugin-svelte": ["vitePreprocess"],
  "node:url": ["fileURLToPath"], "./bits-scroll-lock.ts": ["resolveBitsScrollLock"] };
const desertAlias = "@desert", bitsAlias = "@desert-internal/bits-scroll-lock";
/** The host's CSP: each directive and the sources it may allow; a directive may allow fewer, never more. */
const directives: Readonly<Record<string, readonly string[]>> = {
  "default-src": ["self"], "script-src": ["self"], "style-src": ["self"], "connect-src": ["self"], "img-src": ["self", "data:", "blob:"],
  "media-src": ["self", "blob:"], "object-src": ["none"], "base-uri": ["none"], "frame-ancestors": ["none"],
};
/** N36, the documented exception: inline style attributes stay allowed until slice 4 removes them, so this directive is
 * optional. Slice 4 deletes this entry and the directive with it. */
const optionalDirectives: Readonly<Record<string, readonly string[]>> = { "style-src-attr": ["unsafe-inline"] };

function exactKeys(object: ts.ObjectLiteralExpression, expected: readonly string[], label: string, fail: Fail) {
  const keys = keysOf(object);
  if (!sameList([...keys].sort(), [...expected].sort()) || new Set(keys).size !== keys.length) fail(`${label} holds exactly ${expected.join(", ")}; found ${keys.join(", ")}`);
}
const objectAt = (object: ts.ObjectLiteralExpression, key: string) => {
  const value = propertyOf(object, key);
  return value && ts.isObjectLiteralExpression(value) ? value : undefined;
};

function adapterCall(context: GateContext, path: string, kit: ts.ObjectLiteralExpression, fail: Fail) {
  const call = propertyOf(kit, "adapter"), options = isCall(call, localOf(context, path, "@sveltejs/adapter-node", "default"), 1) ? call.arguments[0] : undefined;
  const fixed = !!options && ts.isObjectLiteralExpression(options) && sameList(keysOf(options), ["out"]) && stringOf(propertyOf(options, "out")) === "build";
  if (!fixed) fail('the adapter is exactly adapter({ out: "build" })');
}

function aliases(context: GateContext, path: string, kit: ts.ObjectLiteralExpression, fail: Fail) {
  const alias = objectAt(kit, "alias");
  if (!alias) return fail("kit.alias is an object literal");
  exactKeys(alias, [desertAlias, bitsAlias], "kit.alias", fail);
  if (!isPackageUrl(propertyOf(alias, desertAlias), localOf(context, path, "node:url", "fileURLToPath"), "../../")) {
    fail(`alias ${desertAlias} is fileURLToPath(new URL("../../", import.meta.url))`);
  }
  if (!isCall(propertyOf(alias, bitsAlias), localOf(context, path, "./bits-scroll-lock.ts", "resolveBitsScrollLock"), 0)) fail(`alias ${bitsAlias} is resolveBitsScrollLock()`);
}

function csp(kit: ts.ObjectLiteralExpression, fail: Fail) {
  const policy = objectAt(kit, "csp"), list = policy && objectAt(policy, "directives");
  if (!policy || !list || !sameList(keysOf(policy), ["mode", "directives"]) || stringOf(propertyOf(policy, "mode")) !== "hash") {
    return fail('kit.csp holds exactly mode "hash" and directives');
  }
  const found = keysOf(list);
  for (const name of found) {
    const allowed = directives[name] ?? optionalDirectives[name];
    if (!allowed) { fail(`CSP directive ${name} is not one of the host's directives`); continue; }
    const sources = stringsOf(propertyOf(list, name));
    if (!sources?.length || sources.some(source => !allowed.includes(source))) fail(`CSP directive ${name} allows only ${allowed.join(", ")}; found ${sources?.join(", ") ?? "no list"}`);
  }
  for (const name of Object.keys(directives)) if (!found.includes(name)) fail(`CSP directive ${name} is missing`);
}

const svelteConfig: Check = all(imports(configImports), defaultExport((context, path, config, fail) => {
  if (!ts.isObjectLiteralExpression(config)) return fail("exports a plain object");
  exactKeys(config, ["preprocess", "kit"], "the Svelte config", fail);
  if (!isCall(propertyOf(config, "preprocess"), localOf(context, path, "@sveltejs/vite-plugin-svelte", "vitePreprocess"), 0)) fail("preprocess is exactly vitePreprocess()");
  const kit = objectAt(config, "kit");
  if (!kit) return fail("kit is an object literal");
  exactKeys(kit, ["adapter", "alias", "csp"], "kit", fail);
  adapterCall(context, path, kit, fail);
  aliases(context, path, kit, fail);
  csp(kit, fail);
}));

// ---- worker.mjs: imports, root and mode constants, the mode guard, the build steps -----------------------------------
const workerImports: ImportGrammar = { "node:path": ["resolve"], "node:child_process": ["execFileSync"], "node:url": ["fileURLToPath"] };
const modes = ["check", "build"];
/** Each binary the worker may spawn, with its exact arguments. */
const steps: Readonly<Record<string, readonly string[]>> = {
  "node_modules/@sveltejs/kit/svelte-kit.js": ["sync"],
  "node_modules/svelte-check/bin/svelte-check": ["--tsconfig", "./tsconfig.json"],
  "node_modules/vite/bin/vite.js": ["build"],
};
const workerShape = "holds only its imports, the root and mode constants, the mode guard and the build steps";

type WorkerNames = Readonly<{ resolve: string | undefined; spawn: string | undefined; fileURLToPath: string | undefined }>;
function constant(statement: ts.Statement, name: string, initializer: (node: ts.Expression | undefined) => boolean) {
  if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const) || statement.modifiers?.length) return false;
  const [only, ...rest] = statement.declarationList.declarations;
  return !!only && !rest.length && ts.isIdentifier(only.name) && only.name.text === name && !only.type && initializer(only.initializer);
}
const modeTest = (node: ts.Expression, operator: ts.SyntaxKind, mode: string) => ts.isBinaryExpression(node) && node.operatorToken.kind === operator
  && ts.isIdentifier(node.left) && node.left.text === "mode" && stringOf(node.right) === mode;
/** `if (mode !== "check" && mode !== "build") throw new Error("<CODE>");` */
function modeGuard(statement: ts.Statement) {
  if (!ts.isIfStatement(statement) || statement.elseStatement || !ts.isThrowStatement(statement.thenStatement)) return false;
  const condition = statement.expression, thrown = statement.thenStatement.expression;
  const bothModes = ts.isBinaryExpression(condition) && condition.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    && modes.every((mode, at) => modeTest(at ? condition.right : condition.left, ts.SyntaxKind.ExclamationEqualsEqualsToken, mode));
  return bothModes && ts.isNewExpression(thrown) && ts.isIdentifier(thrown.expression) && thrown.expression.text === "Error"
    && thrown.arguments?.length === 1 && stringOf(thrown.arguments[0]) !== undefined;
}
/** `execFileSync(process.execPath, [resolve(root, "<binary>"), ...arguments], { stdio: "inherit" })`: the binary and arguments. */
function spawned(statement: ts.Statement, names: WorkerNames): { step: string | undefined; valid: boolean } | undefined {
  if (!ts.isExpressionStatement(statement) || !isCall(statement.expression, names.spawn, 3)) return undefined;
  const [node, argv, options] = statement.expression.arguments, [binary, ...rest] = argv && ts.isArrayLiteralExpression(argv) ? argv.elements : [];
  const [base, relative] = isCall(binary, names.resolve, 2) ? binary.arguments : [];
  const file = base && ts.isIdentifier(base) && base.text === "root" ? stringOf(relative) : undefined;
  const words = rest.map(word => stringOf(word) ?? flat(word)), step = file === undefined ? argv && flat(argv) : [file, ...words].join(" ");
  const inherit = !!options && ts.isObjectLiteralExpression(options) && sameList(keysOf(options), ["stdio"]) && stringOf(propertyOf(options, "stdio")) === "inherit";
  const known = file !== undefined && !!steps[file] && sameList(words, steps[file]);
  return { step, valid: isAccess(node, "process.execPath") && known && inherit };
}

const worker: Check = all(imports(workerImports), (context, path, fail) => {
  const names: WorkerNames = { resolve: localOf(context, path, "node:path", "resolve"),
    spawn: localOf(context, path, "node:child_process", "execFileSync"), fileURLToPath: localOf(context, path, "node:url", "fileURLToPath") };
  const spawn = (statement: ts.Statement) => {
    const found = spawned(statement, names);
    if (found && !found.valid) fail(`spawns only svelte-kit sync, svelte-check and vite build; found ${found.step ?? flat(statement)}`, statementLine(statement));
    return !!found;
  };
  /** `if (mode === "build") { <build steps> }` */
  const buildOnly = (statement: ts.Statement) => {
    if (!ts.isIfStatement(statement) || statement.elseStatement || !ts.isBlock(statement.thenStatement)
      || !modeTest(statement.expression, ts.SyntaxKind.EqualsEqualsEqualsToken, "build")) return false;
    for (const inner of statement.thenStatement.statements) if (!spawn(inner)) fail(`${workerShape}; found ${ts.SyntaxKind[inner.kind]}`, statementLine(inner));
    return true;
  };
  for (const statement of statements(context, path)) {
    const known = ts.isImportDeclaration(statement)
      || constant(statement, "root", initializer => isPackageUrl(initializer, names.fileURLToPath, "../../../"))
      || constant(statement, "mode", initializer => isAccess(initializer, "process.argv[2]"))
      || modeGuard(statement) || spawn(statement) || buildOnly(statement);
    if (!known) fail(`${workerShape}; found ${ts.SyntaxKind[statement.kind]}`, statementLine(statement));
  }
});

// ---- bits-scroll-lock.ts: a path resolver, no visual statement -------------------------------------------------------
const bitsImports: ImportGrammar = { "node:module": ["createRequire"], "node:path": ["dirname", "join"], "node:fs": ["existsSync", "readFileSync"] };
const bitsResolver: Check = all(imports(bitsImports), (context, path, fail) => {
  for (const statement of statements(context, path)) {
    const known = ts.isImportDeclaration(statement)
      || constant(statement, "require", initializer => isCall(initializer, localOf(context, path, "node:module", "createRequire"), 1))
      || ts.isFunctionDeclaration(statement) && statement.name?.text === "resolveBitsScrollLock";
    if (!known) fail(`holds only its imports, require and resolveBitsScrollLock; found ${ts.SyntaxKind[statement.kind]}`, statementLine(statement));
  }
});

// ---- The host files, found by name in the layout ---------------------------------------------------------------------
/** Every host file the rule qualifies, by file name in `layout.fixed["build-host"]`. */
const hostFiles: Readonly<Record<string, Check>> = {
  "app.html": htmlShell, "+layout.svelte": layout, "+page.ts": pageOptions,
  "+page.svelte": page("AccessGate"), "public-catalog-page.svelte": page("PublicCatalogProduct"),
  "app.d.ts": surfaceDeclaration, "public-catalog-app.d.ts": surfaceDeclaration,
  "package.json": json(value => jsonKeys(value) === "name,private,type,version", "the template package holds only name, private, type and version"),
  "tsconfig.json": json(value => jsonKeys(value) === "compilerOptions,extends,include", "the template tsconfig holds only extends, compilerOptions and include"),
  "config.mjs": svelteConfig, "vite.mjs": viteConfig, "worker.mjs": worker, "bits-scroll-lock.ts": bitsResolver,
};
/** The template's root is the folder of its package.json; its static folder holds only declared assets. */
const templatePackage = "package.json";

function hostPath(context: GateContext, name: string): { path: string } | { missing: string } {
  const matches = (context.layout.fixed["build-host"] ?? []).filter(path => posix.basename(path) === name);
  if (matches.length === 1 && matches[0]) return { path: matches[0] };
  return { missing: matches.length ? `the build-host layout lists more than one ${name}` : `the build-host layout lists no ${name}` };
}

export const ruleT: ContentRule = context => {
  const found: Violation[] = [];
  for (const [name, check] of Object.entries(hostFiles)) {
    const host = hostPath(context, name);
    if ("missing" in host) { found.push(violation(code, name, 1, host.missing)); continue; }
    if (context.text(host.path) === undefined) { found.push(violation(code, host.path, 1, "a host file the gate qualifies is missing")); continue; }
    check(context, host.path, (what, at = 1) => found.push(violation(code, host.path, at, what)));
  }
  const template = hostPath(context, templatePackage);
  const staticFolder = "path" in template ? `${posix.dirname(template.path)}/static/` : undefined;
  if (staticFolder) for (const path of context.paths) if (path.startsWith(staticFolder)) {
    found.push(violation(code, path, 1, "a static asset of the template is not a declared asset of a foundation"));
  }
  return found;
};

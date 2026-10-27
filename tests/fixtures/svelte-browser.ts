import { build, transform } from "esbuild";
import { compile, compileModule } from "svelte/compiler";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, relative as posixRelative, resolve } from "node:path";
import { chromium } from "playwright";
import { messageBundleBefore, prunedSourcesBefore } from "./pruned-sources-before.ts";
import { generateMessageKeys } from "../../src/messages/generate.ts";
import { resolveBitsScrollLock } from "../../src/build/svelte/bits-scroll-lock.ts";

/** A piece's entry: `<folder>/<Folder>.svelte` under the catalog's compositions or foundations. */
const entryName = (catalog: string, path: string) => {
  const match = /^(?:compositions|foundations)\/([a-z0-9-]+)\/([A-Za-z0-9]+)\.svelte$/.exec(posixRelative(catalog, path));
  const kebab = match?.[2]?.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return match && kebab === match[1] ? match[2] : undefined;
};

/** The catalog index with an export for each piece Batch 3 deleted that the page or a frozen source names (closed over the frozen
 * sources of those pieces, prunedSourcesBefore), so a frozen page, and frozen pieces importing each other, still name it
 * `Catalog.<Name>`; the deleted pieces' sources come with it. */
async function frozenCatalog(root: string, page: string, given: Readonly<Record<string, string>>): Promise<Record<string, string>> {
  const catalog = resolve(root, "src/svelte/catalog"), index = resolve(catalog, "index.ts");
  const pruned = Object.fromEntries(Object.entries(prunedSourcesBefore).map(([path, text]) => [resolve(root, path), text]));
  const sources = { ...pruned, ...given };
  const pieces = new Map(Object.keys(sources).filter(path => !existsSync(path))
    .flatMap(path => { const name = entryName(catalog, path); return name ? [[name, path] as const] : []; }));
  const named = new Set<string>(), pending = [page, ...Object.values(given)];
  for (let text = pending.pop(); text !== undefined; text = pending.pop()) for (const [name, path] of pieces) {
    if (named.has(name) || !new RegExp(`\\b${name}\\b`).test(text)) continue;
    named.add(name);
    pending.push(...Object.entries(sources).filter(([file]) => dirname(file) === dirname(path)).map(([, source]) => source));
  }
  // A page that names no deleted piece may still reach a deleted file through a frozen source (an infra shim).
  if (!named.size) return { ...pruned, ...given };
  const current = given[index] ?? await readFile(index, "utf8");
  // A deleted piece whose name today's index gives another piece (the catalog-card foundation) is reached by its path.
  const exports = [...named].filter(name => !current.includes(` as ${name} }`)).sort().map(name => `export { default as ${name} } from "./${posixRelative(catalog, pieces.get(name) ?? "")}";`);
  // The deleted pieces read their message namespaces, which the base's bundle still carries: today's bundle with every key
  // only the base has added back, so today's pieces keep reading today's keys.
  const keys = resolve(root, "src/messages/keys.ts");
  const today = JSON.parse(await readFile(resolve(root, "src/messages/en.json"), "utf8")) as MessageTree;
  const bundle = JSON.stringify(withBaseKeys(today, JSON.parse(messageBundleBefore) as MessageTree));
  const generated = generateMessageKeys(new Map([["en", bundle]]), { catalogModule: "./catalog.ts", command: "tests/fixtures/svelte-browser.ts" });
  return { ...pruned, [keys]: generated, ...given, [index]: `${current}\n${exports.join("\n")}\n` };
}

type MessageTree = { readonly [key: string]: string | MessageTree };
/** `today` with every key only `base` has (a deleted piece's namespace, a message it alone read); today's text wins. */
function withBaseKeys(today: MessageTree, base: MessageTree): MessageTree {
  const merged: Record<string, string | MessageTree> = { ...today };
  for (const [key, value] of Object.entries(base)) {
    const own = merged[key];
    if (own === undefined) merged[key] = value;
    else if (typeof own !== "string" && typeof value !== "string") merged[key] = withBaseKeys(own, value);
  }
  return merged;
}

/** Actual browser components, compiled in memory; no product server or database. */
export async function svelteBrowser(source: string, given: Readonly<Record<string, string>> = {}, origin?: string,
  options: { readonly initialCss?: string } = {}) {
  const root = resolve(import.meta.dirname, "../..");
  const overrides = await frozenCatalog(root, source, given);
  const result = await build({
    stdin: { contents: 'import { mount } from "svelte"; import App from "virtual-component.svelte"; mount(App, { target: document.body });',
      resolveDir: root, sourcefile: "entry.js" },
    bundle: true, write: false, platform: "browser", format: "iife", conditions: ["browser", "svelte"],
    alias: {
      "@desert": resolve(root, "src"),
      "@desert-internal/bits-scroll-lock": resolveBitsScrollLock(),
    },
    plugins: [{ name: "in-memory-svelte", setup(builder) {
      builder.onResolve({ filter: /^virtual-component\.svelte$/ }, () => ({ path: "virtual-component.svelte", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
        contents: compile(source, { filename: resolve(root, "virtual-component.svelte"), generate: "client", css: "injected" }).js.code,
        loader: "js", resolveDir: root,
      }));
      // A frozen source whose folder the tree no longer has (deleted in Batch 3) imports relative to that folder as it was,
      // and packages from the repository root.
      builder.onResolve({ filter: /.*/ }, async ({ path, resolveDir, kind, namespace }) => {
        // A frozen file the tree no longer has (a deleted shim), named relative to a folder that still exists.
        const named = resolveDir && path.startsWith(".") ? resolve(resolveDir, path) : undefined;
        if (named && overrides[named] !== undefined && !existsSync(named)) return { path: named };
        if (namespace !== "file" || !resolveDir || existsSync(resolveDir)) return undefined;
        const absolute = resolve(resolveDir, path), relative = path.startsWith(".");
        const frozen = [absolute, absolute.replace(/\.js$/, ".ts")].find(path => overrides[path] !== undefined);
        if (relative && frozen !== undefined) return { path: frozen };
        const found = await builder.resolve(relative ? `./${posixRelative(root, absolute)}` : path, { resolveDir: root, kind });
        return found.errors.length ? undefined : { path: found.path, external: found.external };
      });
      // A frozen script the tree no longer has, named through the alias (a deleted vendor family's `index.js`).
      builder.onResolve({ filter: /^@desert\/.*\.(js|ts)$/ }, ({ path }) => {
        const absolute = resolve(root, "src", path.slice("@desert/".length));
        const frozen = [absolute, absolute.replace(/\.js$/, ".ts")].find(file => overrides[file] !== undefined && !existsSync(file));
        return frozen === undefined ? undefined : { path: frozen };
      });
      // A frozen "before" source may name a file the tree no longer has: resolve it to its override.
      builder.onResolve({ filter: /\.svelte$/ }, ({ path, resolveDir }) => {
        // Plugins see a specifier before the alias applies: `@desert/…` names the repository's src folder.
        const absolute = path.startsWith("@desert/") ? resolve(root, "src", path.slice("@desert/".length)) : resolve(resolveDir, path);
        return overrides[absolute] === undefined ? undefined : { path: absolute };
      });
      builder.onLoad({ filter: /\.svelte$/ }, async ({ path }) => ({
        contents: compile(overrides[path] ?? await readFile(path, "utf8"), { filename: path, generate: "client", css: "injected" }).js.code,
        loader: "js", resolveDir: dirname(path),
      }));
      builder.onLoad({ filter: /\.svelte\.(js|ts)$/ }, async ({ path }) => {
        const raw = overrides[path] ?? await readFile(path, "utf8");
        const code = path.endsWith(".ts") ? (await transform(raw, { loader: "ts" })).code : raw;
        return { contents: compileModule(code, { filename: path, generate: "client" }).js.code, loader: "js", resolveDir: dirname(path) };
      });
      builder.onLoad({ filter: /\.ts$/ }, ({ path }) => overrides[path] === undefined ? undefined :
        { contents: overrides[path], loader: "ts", resolveDir: dirname(path) });
    } }],
  });
  // Text antialiasing is the platform's, not the page's: Chrome on macOS always draws grayscale glyphs, Chrome on Linux
  // draws subpixel (LCD) glyphs on an opaque layer and grayscale on a composited one. Pixel comparisons pin grayscale, so
  // two sides that draw the same glyphs at the same place compare equal on every platform.
  const browser = await chromium.launch({ args: ["--disable-lcd-text"] });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const html="<!doctype html><html><body></body></html>";
    if(origin){
      await page.route(origin,route=>route.fulfill({contentType:'text/html',body:html}));
      await page.goto(origin);
    } else await page.setContent(html);
    if (options.initialCss !== undefined) {
      const stylesheet=await page.addStyleTag({ content:options.initialCss });
      await stylesheet.evaluate(element=>(element as HTMLStyleElement).setAttribute('data-fixture-initial-css',''));
    }
    await page.addScriptTag({ content: result.outputFiles[0]!.text });
    return { page, errors, close: () => browser.close() };
  } catch (error) { await browser.close(); throw error; }
}

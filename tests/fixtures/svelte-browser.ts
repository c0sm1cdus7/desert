import { build, transform } from "esbuild";
import { compile, compileModule } from "svelte/compiler";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, relative as posixRelative, resolve } from "node:path";
import { chromium } from "playwright";
import { prunedSourcesBefore } from "./pruned-sources-before.ts";
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
  if (!named.size) return given;
  const exports = [...named].sort().map(name => `export { default as ${name} } from "./${posixRelative(catalog, pieces.get(name) ?? "")}";`);
  return { ...pruned, ...given, [index]: `${given[index] ?? await readFile(index, "utf8")}\n${exports.join("\n")}\n` };
}

/** Actual browser components, compiled in memory; no product server or database. */
export async function svelteBrowser(source: string, given: Readonly<Record<string, string>> = {}, origin?: string,
  options: { readonly headed?: boolean; readonly channel?: "chrome"; readonly initialCss?: string } = {}) {
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
        if (namespace !== "file" || !resolveDir || existsSync(resolveDir)) return undefined;
        const absolute = resolve(resolveDir, path), relative = path.startsWith(".");
        const frozen = [absolute, absolute.replace(/\.js$/, ".ts")].find(path => overrides[path] !== undefined);
        if (relative && frozen !== undefined) return { path: frozen };
        const found = await builder.resolve(relative ? `./${posixRelative(root, absolute)}` : path, { resolveDir: root, kind });
        return found.errors.length ? undefined : { path: found.path, external: found.external };
      });
      // A frozen "before" source may name a file the tree no longer has: resolve it to its override.
      builder.onResolve({ filter: /\.svelte$/ }, ({ path, resolveDir }) => {
        const absolute = resolve(resolveDir, path);
        return overrides[absolute] === undefined ? undefined : { path: absolute };
      });
      builder.onLoad({ filter: /\.svelte$/ }, async ({ path }) => ({
        contents: compile(overrides[path] ?? await readFile(path, "utf8"), { filename: path, generate: "client", css: "injected" }).js.code,
        loader: "js", resolveDir: dirname(path),
      }));
      builder.onLoad({ filter: /\.svelte\.(js|ts)$/ }, async ({ path }) => {
        const raw = await readFile(path, "utf8");
        const code = path.endsWith(".ts") ? (await transform(raw, { loader: "ts" })).code : raw;
        return { contents: compileModule(code, { filename: path, generate: "client" }).js.code, loader: "js", resolveDir: dirname(path) };
      });
      builder.onLoad({ filter: /\.ts$/ }, ({ path }) => overrides[path] === undefined ? undefined :
        { contents: overrides[path], loader: "ts", resolveDir: dirname(path) });
    } }],
  });
  const browser = await chromium.launch({ headless: !options.headed, ...(options.channel ? { channel: options.channel } : {}) });
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

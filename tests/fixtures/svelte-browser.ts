import { build, transform } from "esbuild";
import { compile, compileModule } from "svelte/compiler";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";
import { resolveBitsScrollLock } from "../../src/build/svelte/bits-scroll-lock.ts";

/** Actual browser components, compiled in memory; no product server or database. */
export async function svelteBrowser(source: string, overrides: Readonly<Record<string, string>> = {}, origin?: string,
  options: { readonly headed?: boolean; readonly channel?: "chrome"; readonly initialCss?: string } = {}) {
  const root = resolve(import.meta.dirname, "../..");
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

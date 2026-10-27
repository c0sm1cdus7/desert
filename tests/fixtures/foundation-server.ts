// Real catalog components rendered on the server, compiled in memory: the markup a foundation emits for given props,
// without a browser. `entry` is a Svelte source that may import tree files through `@desert/…`.
import { build, transform } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { compile, compileModule } from "svelte/compiler";
import { resolveBitsScrollLock } from "../../src/build/svelte/bits-scroll-lock.ts";

const root = resolve(import.meta.dirname, "../..");

/** Renders `entry` (a component source) with svelte/server and returns its body. */
export async function renderFoundation(entry: string): Promise<string> {
  const result = await build({
    stdin: { contents: 'import { render } from "svelte/server"; import App from "virtual-entry.svelte"; export const body = render(App).body;',
      resolveDir: root, sourcefile: "entry.js" },
    bundle: true, write: false, platform: "node", format: "esm", conditions: ["svelte"], alias: { "@desert": resolve(root, "src"), "@desert-internal/bits-scroll-lock": resolveBitsScrollLock() },
    external: ["svelte", "svelte/*"],
    plugins: [{ name: "in-memory-svelte", setup(builder) {
      builder.onResolve({ filter: /^virtual-entry\.svelte$/ }, () => ({ path: "virtual-entry.svelte", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
        contents: compile(entry, { filename: resolve(root, "virtual-entry.svelte"), generate: "server" }).js.code, loader: "js", resolveDir: root,
      }));
      builder.onLoad({ filter: /\.svelte$/ }, async ({ path }) => ({
        contents: compile(await readFile(path, "utf8"), { filename: path, generate: "server" }).js.code, loader: "js", resolveDir: dirname(path),
      }));
      builder.onLoad({ filter: /\.svelte\.(js|ts)$/ }, async ({ path }) => {
        const raw = await readFile(path, "utf8");
        const code = path.endsWith(".ts") ? (await transform(raw, { loader: "ts" })).code : raw;
        return { contents: compileModule(code, { filename: path, generate: "server" }).js.code, loader: "js", resolveDir: dirname(path) };
      });
    } }],
  });
  const [output] = result.outputFiles;
  if (!output) throw new Error("FOUNDATION_SERVER_FIXTURE: esbuild produced no output");
  const file = resolve(root, "node_modules/.cache/foundation-server", `${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, output.text);
  try {
    const rendered: unknown = await import(file);
    const body: unknown = rendered && typeof rendered === "object" ? Reflect.get(rendered, "body") : undefined;
    if (typeof body !== "string") throw new Error("FOUNDATION_SERVER_FIXTURE: the entry rendered no body");
    return body;
  } finally { await rm(file, { force: true }); }
}

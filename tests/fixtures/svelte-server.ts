// A Svelte component rendered on the server, compiled in memory: enough to exercise component context (setContext and
// getContext need a component being initialised) without a browser. Returns the rendered body.
import { build } from "esbuild";
import { resolve } from "node:path";
import { compile } from "svelte/compiler";

const root = resolve(import.meta.dirname, "../..");

/** `components` maps virtual file names (`Child.svelte`) to sources the entry and each other may import as `./Name.svelte`. */
export async function renderServer(entry: string, components: Readonly<Record<string, string>> = {}): Promise<string> {
  const sources: Readonly<Record<string, string>> = { "Entry.svelte": entry, ...components };
  const result = await build({
    stdin: { contents: 'import { render } from "svelte/server"; import App from "./Entry.svelte"; export const body = render(App).body;',
      resolveDir: root, sourcefile: "entry.js" },
    bundle: true, write: false, platform: "node", format: "esm", alias: { "@desert": resolve(root, "src") },
    plugins: [{ name: "in-memory-svelte", setup(builder) {
      builder.onResolve({ filter: /^\.\/[A-Za-z]+\.svelte$/ }, ({ path }) => ({ path: path.slice(2), namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
        contents: compile(sources[path] ?? "", { filename: resolve(root, path), generate: "server" }).js.code, loader: "js", resolveDir: root,
      }));
    } }],
  });
  const [output] = result.outputFiles;
  if (!output) throw new Error("SVELTE_SERVER_FIXTURE: esbuild produced no output");
  const rendered: unknown = await import(`data:text/javascript;base64,${Buffer.from(output.text).toString("base64")}`);
  const body: unknown = rendered && typeof rendered === "object" ? Reflect.get(rendered, "body") : undefined;
  if (typeof body !== "string") throw new Error("SVELTE_SERVER_FIXTURE: the entry rendered no body");
  return body;
}

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

/** Compile the actual renderer's theme and source utilities, without a product/controller fixture. */
export async function rendererCss(): Promise<string> {
  const base = resolve(import.meta.dirname, "../../src/svelte");
  const compiler = await compile(await readFile(resolve(base, "theme.css"), "utf8"), { base, onDependency: () => {} });
  const scanner = new Scanner({ sources: compiler.sources });
  return compiler.build(scanner.scan());
}

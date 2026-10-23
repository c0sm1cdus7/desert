import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compile } from "svelte/compiler";
import { rendererCss } from "./renderer-css.ts";

export async function workspaceCss() {
  const filename = resolve(import.meta.dirname, "../../src/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte");
  // The isolated harness injects child styles after parent styles. The production
  // bundle places this unchanged shell-owner rule after AdaptiveSurfaceLayout.
  // Match that order, not an invented geometry override; built-app QA remains a gate.
  const owner = compile(await readFile(filename, "utf8"), { filename, generate: "client", css: "external" }).css?.code ?? "";
  return `${await rendererCss()}\n${owner}`;
}

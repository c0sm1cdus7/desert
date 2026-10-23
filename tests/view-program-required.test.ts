import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import test from "node:test";
import { compile } from "../src/index.ts";
import { compile as compileProtocol } from "../src/compile.ts";
import { Notebook, NotebookProduct, NotebookViewProgram } from "../products/notebook/product.ts";
import { ReadNote } from "../products/notebook/journeys.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { readScopes } from "../src/web/client/view-scopes.ts";
import { readPresentation } from "../src/web/client/presentation.ts";
import { humanProduct } from "../src/web/client/model.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { WebCatalogManifest } from "../src/svelte/catalog-manifest.ts";

test("the compiled product supplies the only View program and no surface navigation table", async () => {
  const source = await buildHumanModule(compile(NotebookProduct), "human");
  const browser = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  assert.equal(browser.viewProgram.entry, NotebookViewProgram.entry);
  assert.equal(Object.hasOwn(browser.surface, "navigation"), false);
  assert.deepEqual(browser.viewProgram, NotebookViewProgram);
});

test("wire compilation cannot invent a renderer program from an exposed read", async () => {
  await assert.rejects(buildHumanModule(compileProtocol(Notebook), "human"), /COMPOSED_PRODUCT_REQUIRED/);
});

test("read execution scopes derive exclusively from declared View journeys", () => {
  const surface = compile(NotebookProduct).surface("human") as HumanSurface;
  const scope = readScopes(NotebookViewProgram, surface).find(item => item.read.id === ReadNote.id)!;
  assert.equal(readPresentation(surface, scope.read.id), scope.read);
  assert.doesNotThrow(() => humanProduct(surface, () => true, { scope }));
  assert.throws(() => readPresentation(surface, undefined as never), /READ_PRESENTATION_REQUIRED/);
});

test("AccessGate has one mandatory ViewProduct route and no standalone renderer remains installed", async () => {
  const gate = await readFile(new URL("../src/svelte/pieces/AccessGate.svelte", import.meta.url), "utf8");
  assert.match(gate, /viewProgram: ViewProgram/);
  assert.match(gate, /<ViewProduct program=\{viewProgram\}/);
  assert.doesNotMatch(gate, /HumanProduct|Standalone|viewProgram\?/);
  assert.equal(Object.hasOwn(WebCatalogManifest.owners, "StandaloneProduct"), false);
  assert.equal(Object.hasOwn(WebCatalogManifest.owners, "StandaloneWorkspace"), false);
  for (const path of ["HumanProduct.svelte", "ProductWorkspace.svelte", "SurfaceHost.svelte",
    "pieces/StandaloneProduct.svelte", "pieces/StandaloneWorkspace.svelte"]) {
    await assert.rejects(access(new URL(`../src/svelte/${path}`, import.meta.url)), { code: "ENOENT" });
  }
});

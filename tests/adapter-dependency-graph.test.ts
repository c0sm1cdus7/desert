import assert from "node:assert/strict";
import test from "node:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { previousGateViolations, runWithVisualBoundaries } from "../src/authoring/visual-boundary/source.ts";

const root = resolve(import.meta.dirname, "..");
const adapterPath = "src/svelte/catalog/renderer/view-item/ViewItem.svelte";
const fixturePath = "src/web/client/graph-fixture.ts";
const fixtureSpecifier = relative(dirname(adapterPath), fixturePath);

/** Exercise the real build admission, not only a standalone AST helper. */
async function withDependency(source: string, check: (root: string) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), "desert-adapter-graph-"));
  try {
    cpSync(join(root, "src"), join(directory, "src"), { recursive: true });
    const adapter = join(directory, adapterPath);
    const original = readFileSync(adapter, "utf8");
    assert.ok(original.includes('<script lang="ts">'), `${adapterPath} must keep its TypeScript script anchor`);
    writeFileSync(adapter, original.replace('<script lang="ts">',
      `<script lang="ts">\n  import { observe } from "${fixtureSpecifier}";\n  observe();`));
    writeFileSync(join(directory, fixturePath), source);
    await check(directory);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("build rejects visual authority hidden behind an adapter's TypeScript dependency", async () => {
  for (const source of [
    'import "../../svelte/theme.css"; export const observe = () => {};',
    'export { default as observe } from "../../svelte/catalog/foundations/action/Action.svelte";',
    'export const observe = () => { document.body.textContent = "Injected"; };',
    'export const observe = () => import("../../svelte/theme.css?inline");',
    'export const observe = () => { const host = globalThis; host["document"].write("Injected"); };',
    'import { mount } from "svelte"; export const observe = (component, target) => mount(component, { target });',
    'import * as framework from "svelte"; export const observe = framework.mount;',
    'export { mount as observe } from "svelte";',
    'export const observe = () => setTimeout("document.write(1)", 0);',
  ]) {
    await withDependency(source, async directory => {
      let invoked = false;
      await assert.rejects(runWithVisualBoundaries(directory, async () => { invoked = true; }), /NONVISUAL_DEPENDENCY/);
      assert.equal(invoked, false, "The build worker must never run after an ownership violation");
    });
  }
});

test("the registered browser lifecycle cannot become an arbitrary host access escape", async () => {
  for (const extension of [
    'window.document.write("Injected");',
    'const leaked = window; leaked.document.write("Injected");',
    'window.addEventListener("resize", () => {});',
    'location.hash = "#changed";',
  ]) await withDependency('export const observe = () => {};', async directory => {
    const host = join(directory, "src/web/client/browser-session.ts");
    writeFileSync(host, readFileSync(host, "utf8") + "\n" + extension);
    await assert.rejects(runWithVisualBoundaries(directory, async () => undefined), /NONVISUAL_DEPENDENCY/);
  });
});

test("barrels do not launder visual authority, and missing/opaque dependency edges fail closed", async () => {
  for (const source of [
    'export { observe } from "./graph-second.ts";',
    'export { observe } from "./missing-graph-dependency.ts";',
    'export const observe = () => import(location.hash.slice(1));',
    'import { observe } from "unregistered-drawing-package"; export { observe };',
  ]) await withDependency(source, async directory => {
    writeFileSync(join(directory, "src/web/client/graph-second.ts"),
      'import "../../svelte/theme.css"; export const observe = () => {};');
    await assert.rejects(runWithVisualBoundaries(directory, async () => undefined), /NONVISUAL_DEPENDENCY/);
  });
});

test("ordinary nonvisual helper chains and type-only visual references remain legal", async () => {
  await withDependency('export { observe } from "./graph-second.ts";', async directory => {
    writeFileSync(join(directory, "src/web/client/graph-second.ts"),
      'import type Action from "../../svelte/catalog/foundations/action/Action.svelte";\n'
      + 'export const observe = () => ({ title: "Notes", value: 1 });');
    // Strict build (Q1): the real tree still carries catalog violations, so the worker never runs; the previous gate alone passes.
    assert.deepEqual(await previousGateViolations(directory), []);
  });
});

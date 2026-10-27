import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("toolbar overflow spends actual remaining space and reserves one More slot only when needed", async () => {
  const { toolbarVisibleCount } = await import("../src/svelte/infra/toolbar-capacity.ts");
  assert.equal(toolbarVisibleCount(4, 44, 8, 200), 4);
  assert.equal(toolbarVisibleCount(4, 44, 8, 199), 2);
  assert.equal(toolbarVisibleCount(4, 44, 8, 148), 2);
  assert.equal(toolbarVisibleCount(4, 44, 8, 147), 1);
  assert.equal(toolbarVisibleCount(4, 44, 8, 44), 0);
  assert.equal(toolbarVisibleCount(0, 44, 8, 44), 0);
});

test("main navigation lane cannot receive view commands or the sidebar toggle", async () => {
  // The navigation actions are Bar's leading rail since Batch 3 deleted toolbar-layout.
  const source = await readFile(new URL("../src/svelte/catalog/foundations/bar/Bar.svelte", import.meta.url), "utf8");
  assert.doesNotMatch(source, /topActions|Sidebar\.Trigger/);
});

test("toolbar overflow is the registered speed dial and every lateral surface uses shared dock motion", async () => {
  // Bar draws the overflow as the Menu that replaced the speed dial; the lateral motion is the shell's and the modal's
  // (Batch 3 dissolved the lateral-surface-motion mechanism into them).
  const toolbar = await readFile(new URL("../src/svelte/catalog/foundations/bar/Bar.svelte", import.meta.url), "utf8");
  const shell = await readFile(new URL("../src/svelte/catalog/foundations/shell/catalog-shell.css", import.meta.url), "utf8");
  const modal = await readFile(new URL("../src/svelte/catalog/foundations/modal/modal.css", import.meta.url), "utf8");
  assert.match(toolbar, /<Menu/);
  assert.match(shell, /sidebar-container[^}]*var\(--motion-lateral\)/);
  assert.match(modal, /\.drawer\[data-adaptive-surface\][^{]*\{[^}]*var\(--motion-lateral\)/);
  for (const css of [shell, modal]) assert.match(css, /prefers-reduced-motion/);
});

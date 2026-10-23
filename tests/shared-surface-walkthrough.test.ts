import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("toolbar overflow spends actual remaining space and reserves one More slot only when needed", async () => {
  const { toolbarVisibleCount } = await import("../src/svelte/pieces/toolbar-capacity.ts");
  assert.equal(toolbarVisibleCount(4, 44, 8, 200), 4);
  assert.equal(toolbarVisibleCount(4, 44, 8, 199), 2);
  assert.equal(toolbarVisibleCount(4, 44, 8, 148), 2);
  assert.equal(toolbarVisibleCount(4, 44, 8, 147), 1);
  assert.equal(toolbarVisibleCount(4, 44, 8, 44), 0);
  assert.equal(toolbarVisibleCount(0, 44, 8, 44), 0);
});

test("main navigation lane cannot receive view commands or the sidebar toggle", async () => {
  const source = await readFile(new URL("../src/svelte/explorer/CatalogNavigationActions.svelte", import.meta.url), "utf8");
  assert.doesNotMatch(source, /topActions|Sidebar\.Trigger/);
});

test("toolbar overflow is the registered speed dial and every lateral surface uses shared dock motion", async () => {
  const toolbar = await readFile(new URL("../src/svelte/pieces/ToolbarLayout.svelte", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/svelte/pieces/lateral-surface-motion.css", import.meta.url), "utf8");
  assert.match(toolbar, /<SpeedDial/);
  assert.match(css, /sidebar-container/);
  assert.match(css, /data-adaptive-surface/);
  assert.match(css, /prefers-reduced-motion/);
});

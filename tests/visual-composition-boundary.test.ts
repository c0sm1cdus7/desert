import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "svelte/compiler";

function nativeNodes(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(nativeNodes);
  const node = value as Record<string, unknown>;
  return [...(node.type === "RegularElement" ? [String(node.name)] : []), ...Object.values(node).flatMap(nativeNodes)];
}

test("frame and leaf view adapters do not construct visual wrappers", async () => {
  for (const name of ["FrameBody", "views/ViewItem", "views/ViewContent"]) {
    const source = await readFile(new URL(`../src/svelte/${name}.svelte`, import.meta.url), "utf8");
    assert.deepEqual(nativeNodes(parse(source, { modern: true }).fragment), [], name);
  }
});

test("text and utility compositions retain closed content/event contracts, not HTML forwarding", async () => {
  for (const name of ["TextContent", "UtilityActions", "ContentFlow", "PlaceHeader"]) {
    const source = await readFile(new URL(`../src/svelte/pieces/${name}.svelte`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /HTMLAttributes|Snippet|className|\.\.\.attributes|\.\.\.props/);
  }
});

test("toolbar calendar controls cannot be supplied as arbitrary rendering", async () => {
  const toolbar = await readFile(new URL("../src/svelte/pieces/Toolbar.svelte", import.meta.url), "utf8");
  const calendar = await readFile(new URL("../src/svelte/pieces/DateCalendar.svelte", import.meta.url), "utf8");
  assert.doesNotMatch(toolbar, /controls\??:\s*Snippet|@render controls/);
  assert.doesNotMatch(calendar, /#snippet controls/);
});

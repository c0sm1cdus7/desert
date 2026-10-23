import assert from "node:assert/strict";
import test from "node:test";

test("built surfaces admit only same-origin media and authorized private blob playback", async () => {
  const configuration = new URL("../src/build/svelte/config.mjs", import.meta.url).href;
  const { default: config } = await import(configuration);
  const directives = config.kit.csp.directives;
  assert.deepEqual(directives["media-src"], ["self", "blob:"]);
  assert.deepEqual(directives["connect-src"], ["self"]);
  assert.deepEqual(directives["default-src"], ["self"]);
  assert.deepEqual(directives["object-src"], ["none"]);
});

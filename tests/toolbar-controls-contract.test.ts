import assert from "node:assert/strict";
import test from "node:test";
import { assertToolbarControls } from "../src/svelte/infra/toolbar-controls.ts";

test("calendar controls are a closed semantic slot, including JavaScript callers", () => {
  assert.doesNotThrow(() => assertToolbarControls(undefined));
  assert.doesNotThrow(() => assertToolbarControls({ kind: "calendar" }));
  for (const value of [() => "replacement", null, [], { kind: "other" },
    { kind: "calendar", class: "p-0" }, { kind: "calendar", render() {} },
    { kind: "calendar", [Symbol("style")]: "padding:0" }]) {
    assert.throws(() => assertToolbarControls(value), /INVALID_TOOLBAR_CONTROLS/);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { assertHeadingContent } from "../src/svelte/catalog/foundations/heading/heading-content.ts";

test("heading content uses finite semantic roles, not HTML/typographic customization", () => {
  for (const value of [
    { kind: "page", text: "Notes", focusTarget: true },
    { kind: "document-title", text: "A note" },
    { kind: "rail-title", text: "Albums", id: "albums" },
    { kind: "group-label", text: "All notes", required: true },
  ]) assert.doesNotThrow(() => assertHeadingContent(value));
  for (const value of [
    { kind: "page", text: "Notes", class: "p-4" },
    { kind: "page", text: "Notes", style: { "--text-page": "12px" } },
    { kind: "page", text: "Notes", children() {} },
    { kind: "page", text: "Notes", level: 6 },
    { kind: "page", text: "Notes", role: "button" },
    { kind: "page", text: "Notes", "data-place-title": false },
    { kind: "page", text: "Notes", [Symbol("style")]: "red" },
    { kind: "page", text: "Notes", required: true },
    { kind: "rail-title", text: "Albums" },
  ]) assert.throws(() => assertHeadingContent(value), /INVALID_HEADING_CONTENT/);
});

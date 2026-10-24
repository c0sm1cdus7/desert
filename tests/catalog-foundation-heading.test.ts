// Heading: four meanings (display, page, section, group) that pick the type role and level; no margins of its own.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("heading: the contract offers four kinds; focus, id and required belong to one kind each", async () => {
  assert.deepEqual(await contractShape("heading"), {
    kind: ["display", "page", "section", "group"], text: "text", "align?": ["start", "center"],
    "focusTarget?": ["boolean", "undefined"], "id?": ["undefined", "string"], "required?": ["undefined", "boolean"],
  });
});

test("heading: every kind has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("heading"), []);
});

test("heading: each kind is its role and level, spaced only by its column", async () => {
  const f = await mounted(`<Catalog.Column gap="regular"><Catalog.Heading kind="display" text="Franco" focusTarget />
  <Catalog.Heading kind="page" text="Notes" focusTarget align="center" />
  <Catalog.Heading kind="section" text="Albums" id="albums" />
  <Catalog.Heading kind="group" text="Display name" required /></Catalog.Column>`);
  try {
    const headings = await f.page.locator(":is(h1,h2)").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return { tag: node.tagName, size: style.fontSize, weight: style.fontWeight, margin: style.margin, tabindex: node.getAttribute("tabindex"),
        id: node.id, place: node.hasAttribute("data-place-title"), align: style.textAlign, text: node.textContent?.trim() };
    }));
    assert.deepEqual(headings, [
      { tag: "H1", size: "32px", weight: "600", margin: "0px", tabindex: "-1", id: "", place: false, align: "start", text: "Franco" },
      { tag: "H1", size: "22px", weight: "600", margin: "0px", tabindex: "-1", id: "", place: true, align: "center", text: "Notes" },
      { tag: "H2", size: "16px", weight: "600", margin: "0px", tabindex: null, id: "albums", place: false, align: "start", text: "Albums" },
      { tag: "H2", size: "11px", weight: "400", margin: "0px", tabindex: null, id: "", place: false, align: "start", text: "Display name*" },
    ]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

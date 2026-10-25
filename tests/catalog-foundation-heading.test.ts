// Heading: four meanings (display, page, section, group) that pick the type role and level; no margins of its own.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("heading: the contract offers four kinds; focus, id and required belong to one kind each", async () => {
  assert.deepEqual(await contractShape("heading"), {
    kind: ["display", "page", "section", "group"], text: "text", "align?": ["start", "center"],
    "focusTarget?": ["boolean", "undefined"], "focusKey?": ["string", "undefined"], "id?": ["undefined", "string"], "required?": ["undefined", "boolean"],
  });
});

test("heading: a display or page title given a focusKey takes focus through the nearest focus scope, by key", async () => {
  const f = await mounted(`<Catalog.Column gap="regular"><Catalog.Heading kind="display" text="Feel at home." focusKey="access-heading" />
  <Catalog.Heading kind="page" text="Notes" /></Catalog.Column>
  <button onclick={() => { moved = scope.focus("access-heading"); missing = scope.focus("other"); }}>Move</button>
  <output>{moved}:{missing}</output>`, `  import { provideFocusScope } from "@desert/svelte/infra/focus-scope.ts";
  const scope = provideFocusScope();
  let moved = $state(false), missing = $state(true);`);
  try {
    assert.deepEqual(await f.page.locator("h1").evaluateAll(nodes => nodes.map(node => node.getAttribute("tabindex"))), ["-1", null]);
    await f.page.getByRole("button", { name: "Move", exact: true }).click();
    assert.equal(await f.page.locator("output").innerText(), "true:false");
    assert.deepEqual(await f.page.evaluate(() => [document.activeElement?.textContent?.trim(),
      document.activeElement ? getComputedStyle(document.activeElement).outlineStyle : null]), ["Feel at home.", "none"],
      "a title focus moves to draws no ring, as a place title");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
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
        id: node.id, place: node.hasAttribute("data-place-title"), align: style.textAlign,
        // What it shows: its text and the mark the theme draws after a required group label.
        text: `${node.textContent?.trim()}${/^"([^"]*)"/.exec(getComputedStyle(node, "::after").content)?.[1] ?? ""}` };
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

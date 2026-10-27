// A fact value that does not fit its row breaks after a path separator before it breaks inside a word (slice 3 package:
// a contract's Source read «…/foundati / ons/avatar/…» at 390px), and its file name breaks only before its extension,
// never inside a word or at a hyphen (second review: «MediaReferenceSelector.s / velte», «media- / reference»). Its text,
// and so its copy and its name, is unchanged: one markup in every state, the real visible text with a <wbr> at each join
// of the text policy (a path's separators, a name's words) and nothing duplicated or generated.
import assert from "node:assert/strict";
import test from "node:test";
import { nameParts } from "../src/interaction/name-parts.ts";
import { mounted } from "./support/foundation.ts";

const source = "src/svelte/catalog/foundations/attention-indicator/AttentionIndicator.svelte";

/** Where a path may break: after each "/" and before its file's extension. */
const pieces = (path: string) => path.split(/(?<=\/)(?=.)|(?=\.[^./]+$)/);

for (const [name, path, width] of [["a long path", "src/svelte/catalog/compositions/media-reference-selector/MediaReferenceSelector.svelte", 354],
  ["a file name wider than its column", "src/svelte/catalog/compositions/appearance-preferences/AppearancePreferences.svelte", 300]] as const)
  test(`fact value: ${name} breaks only after a separator or before its extension`, async () => {
    const f = await mounted(`<div style="width:${width}px" data-probe-host><Catalog.Information items={[
  { kind: "fact", label: "Source", value: ${JSON.stringify(path)} },
]} /></div>`);
    try {
      const lines = await f.page.locator("[data-probe-host] [data-fact-state]").evaluate(node => {
        const rows = new Map<number, string>(), walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        for (let text = walker.nextNode(); text; text = walker.nextNode()) for (let at = 0; at < text.textContent!.length; at++) {
          const range = document.createRange(); range.setStart(text, at); range.setEnd(text, at + 1);
          const top = Math.round(range.getBoundingClientRect().top);
          rows.set(top, (rows.get(top) ?? "") + text.textContent![at]);
        }
        return [...rows.entries()].sort(([a], [b]) => a - b).map(([, text]) => text);
      });
      assert.ok(lines.length > 1, `the path does not fit one line: ${lines.join(" | ")}`);
      assert.equal(lines.join(""), path);
      // Each line is whole pieces: it ends where a piece ends (the next one starts with a piece).
      const ends = new Set<number>(); let at = 0;
      for (const piece of pieces(path)) ends.add(at += piece.length);
      let offset = 0;
      for (const line of lines) { offset += line.length; assert.ok(ends.has(offset), `a line breaks inside a word: ${lines.join(" | ")}`); }
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });

test("fact value: a long path wraps at its separators, never mid-word, and reads as the same text", async () => {
  const f = await mounted(`<div style="width:354px" data-probe-host><Catalog.Information items={[
  { kind: "fact", label: "Owner", value: "AttentionIndicator" },
  { kind: "fact", label: "Source", value: ${JSON.stringify(source)} },
]} /></div>`);
  try {
    const lines = await f.page.locator("[data-probe-host] [data-fact-state]").nth(1).evaluate(node => {
      const rows = new Map<number, string>(), walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) for (let at = 0; at < text.textContent!.length; at++) {
        const range = document.createRange(); range.setStart(text, at); range.setEnd(text, at + 1);
        const top = Math.round(range.getBoundingClientRect().top);
        rows.set(top, (rows.get(top) ?? "") + text.textContent![at]);
      }
      return [...rows.entries()].sort(([a], [b]) => a - b).map(([, text]) => text);
    });
    assert.ok(lines.length > 1, "the path does not fit one line of the value column");
    assert.deepEqual(lines.slice(0, -1).filter(line => !line.endsWith("/")), [], `every line but the last ends at a separator: ${lines.join(" | ")}`);
    assert.equal(lines.join(""), source);
    assert.equal(await f.page.locator("[data-probe-host] [data-fact-state]").nth(1).textContent(), source);
    // One markup: the name is the text, and a <wbr> stands at each join of the text policy, no more, no fewer.
    const read = await f.page.locator("[data-probe-host] [data-fact-state]").evaluateAll(nodes => nodes.map(node => [node.textContent, node.querySelectorAll("wbr").length] as const));
    assert.deepEqual(read, [["AttentionIndicator", nameParts("AttentionIndicator", true).length - 1], [source, nameParts(source, true).length - 1]]);
    assert.equal(await f.page.locator("[data-probe-host] [data-fact-state] [data-fact-words], [data-probe-host] .sr-only").count(), 0, "no generated or hidden copy of the name");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

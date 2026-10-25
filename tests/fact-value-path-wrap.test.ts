// A fact value that does not fit its row breaks after a path separator before it breaks inside a word (slice 3 package:
// a contract's Source read «…/foundati / ons/avatar/…» at 390px). Its text, and so its copy and its name, is unchanged.
import assert from "node:assert/strict";
import test from "node:test";
import { mounted } from "./support/foundation.ts";

const source = "src/svelte/catalog/foundations/attention-indicator/AttentionIndicator.svelte";

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
    const breaks = await f.page.locator("[data-probe-host] [data-fact-state]").evaluateAll(nodes => nodes.map(node => node.querySelectorAll("wbr").length));
    assert.deepEqual(breaks, [0, source.split("/").length - 1], "a value without a separator gains no break opportunity");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

// Inline: a horizontal sequence with a gap from the spacing scale that wraps, scrolls in a labelled rail, or neither.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("inline: the contract offers gap, alignment, justification and overflow; only a scroll rail is labelled", async () => {
  assert.deepEqual(await contractShape("inline"), {
    gap: "GapSchema", "align?": ["start", "center", "baseline", "end"], "justify?": ["start", "center", "end", "between"],
    overflow: ["wrap", "none", "scroll"], "label?": ["undefined", "text"],
  });
});

test("inline: every overflow × justification has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("inline"), []);
});

test("inline: a row of pieces at a spacing step; a scroll rail is a labelled region that scrolls instead of wrapping", async () => {
  const f = await mounted(`<div style="width:300px" data-probe-host>
  <Catalog.Inline gap="close" overflow="wrap" justify="between" align="baseline"><span>a</span><span>b</span></Catalog.Inline>
  <Catalog.Inline gap="regular" overflow="none"><span>a</span><span>b</span></Catalog.Inline>
  <Catalog.Inline gap="snug" overflow="scroll" label="Albums">{#each Array.from({ length: 8 }) as _, index}<span style="flex:none;width:80px">{index}</span>{/each}</Catalog.Inline>
</div>`);
  try {
    const rows = await f.page.locator("[data-probe-host] > div").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return { display: style.display, gap: style.columnGap, wrap: style.flexWrap, align: style.alignItems, justify: style.justifyContent,
        overflow: style.overflowX, role: node.getAttribute("role"), label: node.getAttribute("aria-label"), scrolls: node.scrollWidth > node.clientWidth };
    }));
    assert.deepEqual(rows, [
      { display: "flex", gap: "12px", wrap: "wrap", align: "baseline", justify: "space-between", overflow: "visible", role: null, label: null, scrolls: false },
      { display: "flex", gap: "16px", wrap: "nowrap", align: "center", justify: "flex-start", overflow: "visible", role: null, label: null, scrolls: false },
      { display: "flex", gap: "8px", wrap: "nowrap", align: "center", justify: "flex-start", overflow: "auto", role: "region", label: "Albums", scrolls: true },
    ]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

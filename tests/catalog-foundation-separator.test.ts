// Separator: a hairline in the separator ink, horizontal or vertical, optionally inset like grouped rows.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("separator: the contract offers an orientation and an inset, nothing else", async () => {
  assert.deepEqual(await contractShape("separator"), { orientation: ["horizontal", "vertical"], inset: ["none", "row"] });
});

test("separator: every orientation × inset has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("separator"), []);
});

test("separator: a one-pixel line in the separator ink, announced with its orientation; a row inset starts at the row content", async () => {
  const f = await mounted(`<div data-probe-column style="display:grid;width:300px"><Catalog.Separator orientation="horizontal" inset="none" />
  <Catalog.Separator orientation="horizontal" inset="row" /></div>
<div data-probe-row style="display:flex;height:40px"><span>a</span><Catalog.Separator orientation="vertical" inset="none" /><span>b</span></div>`);
  try {
    const lines = await f.page.locator("[role=separator]").evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect(), probe = document.createElement("i");
      probe.style.color = "var(--separator)"; document.body.append(probe);
      const ink = getComputedStyle(probe).color; probe.remove();
      return { orientation: node.getAttribute("aria-orientation"), size: `${box.width}x${box.height}`,
        start: getComputedStyle(node).marginInlineStart, ink: getComputedStyle(node).backgroundColor === ink };
    }));
    assert.deepEqual(lines, [
      { orientation: "horizontal", size: "300x1", start: "0px", ink: true },
      { orientation: "horizontal", size: "284x1", start: "16px", ink: true },
      { orientation: "vertical", size: "1x40", start: "0px", ink: true },
    ]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

// Choice(cards) with pictures (slice 3 package): at most three cards to a row, and never so narrow that a card's caption
// breaks a word per line beside its control (the cover choice read «Cover / image / 1» in a 390px popover).
import assert from "node:assert/strict";
import test from "node:test";
import { mounted } from "./support/foundation.ts";

const pictures = (count: number) => `Array.from({ length: ${count} }, (_, index) => ({ value: \`cover-\${index + 1}\`,
  label: \`Cover image \${index + 1}\`, disabled: false, leading: { kind: "artwork" as const, media: "video" as const } }))`;

test("choice picture cards: one per row-track of at least 9rem in a narrow panel, three to a row in a wide one", async () => {
  const f = await mounted(`<div style="width:330px" data-narrow><Catalog.Choice presentation="cards" cardinality="one" label="Cover"
  labelVisibility="accessible" options={one} selected={[]} disabled={false} required={false} /></div>
<div style="width:900px" data-wide><Catalog.Choice presentation="cards" cardinality="one" label="Cover"
  labelVisibility="accessible" options={four} selected={[]} disabled={false} required={false} /></div>`,
  `  const one = ${pictures(1)}, four = ${pictures(4)};`);
  try {
    const cards = (host: string) => f.page.locator(`${host} [data-choice-option]`).evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect(), caption = node.querySelector(":scope > span:last-child > span:last-child")!;
      const line = Number.parseFloat(getComputedStyle(caption).lineHeight);
      return { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width),
        lines: Math.round(caption.getBoundingClientRect().height / line) };
    }));
    const [narrow] = await cards("[data-narrow]");
    assert.ok(narrow && narrow.width >= 144, `a narrow panel keeps a picture card at least 9rem wide (${narrow?.width}px)`);
    assert.equal(narrow?.lines, 1, "its caption reads on one line beside its control");
    const wide = await cards("[data-wide]");
    assert.deepEqual(wide.slice(0, 3).map(card => card.top), Array(3).fill(wide[0]!.top), "three to a row");
    assert.deepEqual(wide.slice(0, 3).map(card => card.width), Array(3).fill(292), "a third of the row each, less the gaps");
    assert.ok(wide[3]!.top > wide[0]!.top && wide[3]!.left === wide[0]!.left, "a fourth picture starts the next row");
    assert.ok(wide.every(card => card.lines === 1));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

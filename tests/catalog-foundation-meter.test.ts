// Meter: a total in the display role, a bar proportional to its segments, and the legend.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("meter: the contract offers a total, its label, the segments, a name and an id, nothing else", async () => {
  assert.deepEqual(await contractShape("meter"), { total: "integer", totalLabel: "text", segments: "array", label: "text", "id?": "string" });
});

test("meter: the id names the whole for a card's description, and the readings stay regular inside a medium-weight card", async () => {
  const f = await mounted(`<div style="font-weight:500"><Catalog.Meter id="total" total={3} totalLabel="Tasks" label="3 Tasks 2 Open 1 Completed"
  segments={[{ count: 2, label: "Open" }, { count: 1, label: "Completed" }]} /></div>`);
  try {
    const meter = await f.page.locator("#total").evaluate(node => ({ name: node.getAttribute("aria-label"),
      label: getComputedStyle(node.firstElementChild!.lastElementChild!).fontWeight, legend: getComputedStyle(node.lastElementChild!).fontWeight }));
    assert.deepEqual(meter, { name: "3 Tasks 2 Open 1 Completed", label: "400", legend: "400" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("meter: its one state has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("meter"), []);
});

test("meter: the bar's segments are proportional to their counts and alternate primary and muted ink", async () => {
  const f = await mounted(`<div style="width:300px"><Catalog.Meter total={12} totalLabel="notes" label="Notes by state"
  segments={[{ count: 9, label: "Draft" }, { count: 3, label: "Published" }]} /></div>`);
  try {
    const meter = await f.page.locator("[data-meter]").evaluate(node => {
      const ink = (name: string) => {
        const probe = document.createElement("i"); probe.style.color = `var(${name})`; document.body.append(probe);
        const value = getComputedStyle(probe).color; probe.remove(); return value;
      };
      const segments = [...node.querySelectorAll("[aria-hidden=true] > span")];
      return { role: node.getAttribute("role"), name: node.getAttribute("aria-label"), total: getComputedStyle(node.querySelector("strong")!).fontSize,
        widths: segments.map(segment => Math.round(segment.getBoundingClientRect().width)),
        inks: segments.map(segment => getComputedStyle(segment).backgroundColor === ink(segment === segments[0] ? "--primary" : "--muted-foreground")),
        legend: [...node.lastElementChild!.children].map(item => item.textContent?.replace(/\s+/g, " ").trim()) };
    });
    // 300px less the 2px gap, split 9:3.
    assert.deepEqual(meter, { role: "group", name: "Notes by state", total: "32px", widths: [224, 75], inks: [true, true], legend: ["9 Draft", "3 Published"] });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

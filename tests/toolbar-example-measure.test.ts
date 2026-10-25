// The Toolbar page's example stays in the page's reading measure (second review of the slice 3 package): at 1280 its bar
// spread its commands across the wide inspection column, far past the lists and text of the same page.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

test("the toolbar example's commands end where the page's lists end", async () => {
  const f = await mounted(`<div style="width:832px" data-host><Catalog.Column gap="section">
    <SharedOwnerSpecimen owner="ToolbarLayout" />
    <Catalog.StackLayout title="Contract"><Catalog.Information items={[{ kind: "fact", label: "Owner", value: "ToolbarLayout" }]} /></Catalog.StackLayout>
  </Catalog.Column></div>`, `  import SharedOwnerSpecimen from "@desert/svelte/catalog/compositions/shared-owner-specimen/SharedOwnerSpecimen.svelte";`);
  try {
    await f.page.setViewportSize({ width: 1280, height: 800 });
    const edges = await f.page.evaluate(() => {
      const right = (element: Element | null | undefined) => element ? Math.round(element.getBoundingClientRect().right) : NaN;
      const bar = document.querySelector('[data-piece="toolbar"]');
      const commands = [...(bar?.querySelectorAll("button") ?? [])].map(button => right(button));
      return { bar: right(bar), commands: Math.max(...commands), list: right([...document.querySelectorAll("[data-host] [data-fact-state]")].at(-1)?.closest(".list, [data-list]")) };
    });
    assert.ok(Number.isFinite(edges.list), JSON.stringify(edges));
    assert.ok(edges.bar <= edges.list + .5 && edges.commands <= edges.list, `the bar ends at ${edges.bar} (commands ${edges.commands}), the list at ${edges.list}`);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

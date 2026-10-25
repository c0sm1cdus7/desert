// Bar's surface controls (lane E): commands local to a surface that are no surface intent (the media viewer's zoom) follow
// the identity as icon actions, raise `control` with their id, and take their own centred line on a narrow rail; a caller
// that binds the bar moves focus to its leading command.
import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import Bar from "@desert/svelte/catalog/foundations/bar/Bar.svelte";
  let bar = $state<ReturnType<typeof Bar>>(), events = $state<string[]>([]), focused = $state("");
  Reflect.set(window, "events", () => events);
  const controls = [{ id: "zoom-out", label: "Zoom out", icon: "zoom-out", state: "unavailable" },
    { id: "zoom-reset", label: "Reset zoom", icon: "restore", state: "ready" }, { id: "zoom-in", label: "Zoom in", icon: "zoom-in", state: "ready" }];
</script>
<button onclick={() => { focused = String(bar?.focusLeading()); }}>Focus leading</button><output data-focused>{focused}</output>
<div data-host style="width:640px">
  <Bar bind:this={bar} edge="top" purpose="commands" identity={{ title: "Harbour", subtitle: "1 / 2" }} identityRole="heading"
    leading={{ label: "Close media viewer", icon: "close", state: "ready", intent: { kind: "close" } }} trailing={[]} {controls}
    settingsPlaceholder={false} inert={false} oninvoke={intent => events = [...events, intent.kind]}
    oncontrol={id => events = [...events, id]} />
</div>`;

test("surface controls raise their ids, stay unavailable when they cannot act, and the leading command takes focus", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const bar = f.page.locator("[data-host] [data-toolbar]");
    const group = bar.locator("[data-toolbar-controls]");
    assert.deepEqual(await group.getByRole("button").evaluateAll(nodes => nodes.map(node => [node.getAttribute("aria-label"), (node as HTMLButtonElement).disabled])),
      [["Zoom out", true], ["Reset zoom", false], ["Zoom in", false]]);
    await group.getByRole("button", { name: "Zoom in", exact: true }).click();
    await group.getByRole("button", { name: "Reset zoom", exact: true }).click();
    await bar.getByRole("button", { name: "Close media viewer", exact: true }).click();
    assert.deepEqual(await f.page.evaluate(() => [...Reflect.get(window, "events")()]), ["zoom-in", "zoom-reset", "close"]);
    await f.page.getByRole("button", { name: "Focus leading", exact: true }).click();
    assert.equal(await f.page.locator("[data-focused]").textContent(), "true");
    assert.equal(await bar.getByRole("button", { name: "Close media viewer", exact: true }).evaluate(node => node === document.activeElement), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("the controls follow the identity on a wide rail and take their own centred line on a narrow one", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const measure = () => f.page.locator("[data-host] [data-toolbar]").evaluate(node => {
      const box = (element: Element) => element.getBoundingClientRect();
      const row = box(node.querySelector(".toolbar-row")!), title = box(node.querySelector("[data-toolbar-heading]")!);
      const controls = box(node.querySelector("[data-toolbar-controls]")!);
      return { sameLine: Math.abs(controls.top - row.top) <= 1, below: controls.top >= title.bottom - 1,
        centred: Math.abs(controls.left + controls.width / 2 - (row.left + row.width / 2)) <= 1, trailing: Math.abs(controls.right - row.right) <= 1 };
    });
    const wide = await measure();
    assert.equal(wide.sameLine && wide.trailing, true, JSON.stringify(wide));
    await f.page.locator("[data-host]").evaluate(node => { (node as HTMLElement).style.width = "320px"; });
    const narrow = await measure();
    assert.equal(narrow.below && narrow.centred, true, JSON.stringify(narrow));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

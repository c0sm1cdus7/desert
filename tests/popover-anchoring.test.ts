// Risk R1 (design §8): the popover owns bits-ui and draws no bits Trigger. Its surface anchors to the trigger by id
// (customAnchor), a press on the trigger while open toggles exactly once, and dismissal returns focus to the trigger.
import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { settleMotion } from "./web/fixture.ts";

const fixture = (content: "information" | "menu", align: "start" | "end") => svelteBrowser(`<script>
  import Popover from '@desert/svelte/catalog/foundations/popover/Popover.svelte';
  let open = $state(false), opens = $state(0);
</script>
<main data-surface-host style="padding:240px 0 0 600px;min-height:900px">
  <Popover label="About this note" {open} disabled={false} locked={false} content="${content}" placement="anchored" align="${align}"
    trigger={{ kind: "action", label: "About", icon: "open", face: "fit", emphasis: "secondary", state: "ready" }}
    onopenchange={next => { open = next; if (next) opens += 1; }}>
    <p>Notes keep their history.</p><button>Inside</button>
  </Popover>
  <output data-opens>{opens}</output><button>After</button>
</main>`);

test("R1: the surface anchors below its trigger, at the trigger's start or end edge", async () => {
  for (const align of ["start", "end"] as const) {
    const f = await fixture("information", align);
    try {
      await f.page.setViewportSize({ width: 1200, height: 900 });
      await f.page.addStyleTag({ content: await rendererCss() });
      const trigger = f.page.getByRole("button", { name: "About", exact: true });
      await trigger.click();
      const surface = f.page.getByRole("dialog", { name: "About this note", exact: true });
      await surface.waitFor(); await settleMotion(f.page);
      const [anchor, box] = await Promise.all([trigger.boundingBox(), surface.boundingBox()]);
      assert.ok(anchor && box);
      assert.ok(Math.abs(box.y - (anchor.y + anchor.height + 8)) < 2, `below with the 8px offset (${align})`);
      const edge = align === "start" ? Math.abs(box.x - anchor.x) : Math.abs(box.x + box.width - (anchor.x + anchor.width));
      assert.ok(edge < 2, `aligned to the trigger's ${align} edge`);
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      assert.equal(await trigger.getAttribute("aria-controls"), await surface.getAttribute("id"));
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  }
});

test("R1: a press on the trigger while open closes once and the surface stays closed", async () => {
  const f = await fixture("information", "start");
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const trigger = f.page.getByRole("button", { name: "About", exact: true });
    const surface = f.page.getByRole("dialog", { name: "About this note", exact: true });
    await trigger.click(); await surface.waitFor();
    await trigger.click();
    await surface.waitFor({ state: "hidden" });
    await f.page.waitForTimeout(250);
    assert.equal(await surface.count(), 0);
    assert.equal(await f.page.locator("[data-opens]").textContent(), "1", "the press did not reopen it");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.equal(await trigger.getAttribute("aria-controls"), null, "aria-controls only while expanded");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("R1: Escape returns focus to the trigger; an outside press keeps focus where the person went", async () => {
  const f = await fixture("information", "start");
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const trigger = f.page.getByRole("button", { name: "About", exact: true });
    const surface = f.page.getByRole("dialog", { name: "About this note", exact: true });
    await trigger.focus(); await f.page.keyboard.press("Enter"); await surface.waitFor();
    await f.page.getByRole("button", { name: "Inside", exact: true }).focus();
    await f.page.keyboard.press("Escape");
    await surface.waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true, "Escape returns to the trigger");
    await trigger.click(); await surface.waitFor();
    const after = f.page.getByRole("button", { name: "After", exact: true });
    await after.click();
    await surface.waitFor({ state: "hidden" });
    assert.equal(await after.evaluate(element => element === document.activeElement), true, "an outside press keeps its focus");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a menu popover is a labelled dialog without the pane, aligned to its trigger's end", async () => {
  const f = await fixture("menu", "end");
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.getByRole("button", { name: "About", exact: true }).click();
    const surface = f.page.getByRole("dialog", { name: "About this note", exact: true });
    await surface.waitFor();
    assert.equal(await surface.getAttribute("data-popover"), "menu");
    assert.equal(await surface.getAttribute("data-material"), null);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

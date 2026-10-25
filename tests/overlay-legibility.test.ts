// A surface presented over the page (an anchored popover, a dialog, a bottom sheet) never lets the page's text read
// through it (second review of the slice 3 package: the calendar, the cover picker, the dialogs and the large date sheet
// showed the page's words through their pane). Measured on the result: the page under each surface is half ink (a block
// of the foreground colour) and half page; a point of the pane's empty padding over the ink and one over the page must
// look the same (WCAG contrast at most 1.1:1), in both themes and with reduced transparency. And an anchored surface is
// at least as wide as the field it opens from (the calendar stopped 34px short of its field; the cover picker was
// narrower than its field at 1280).
import test from "node:test";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const css = rendererCss();
mkdirSync("artifacts/overlay-legibility", { recursive: true });
const page = (body: string, script = "") => `<script lang="ts">
  import Popover from "@desert/svelte/catalog/foundations/popover/Popover.svelte";
  import Modal from "@desert/svelte/catalog/foundations/modal/Modal.svelte";
  import DateControl from "@desert/svelte/catalog/foundations/date-control/DateControl.svelte";
  import Dialog from "@desert/svelte/catalog/compositions/dialog/Dialog.svelte";
  ${script}
</script>
<main style="position:relative;min-height:100dvh;background:var(--background);color:var(--foreground)">
  <div data-ink style="position:fixed;inset:0 50% 0 0;background:var(--foreground)"></div>
  ${body}
</main>`;

const surfaces: Record<string, { source: string; open: string; pane: string; width: number }> = {
  popover: { width: 1280, pane: "[data-slot=popover-content]", open: "[data-field-trigger]", source: page(`
    <div style="position:absolute;left:calc(50% - 12rem);top:120px;width:30rem">
      <Popover label="Cover" {open} disabled={false} locked={false} content="form" placement="anchored" align="start"
        trigger={{ kind: "field", label: "Cover", required: false, invalid: false, display: { kind: "text", text: "Automatic", placeholder: false }, measure: "fill" }}
        onopenchange={value => open = value}><p style="margin:0">Choose a cover.</p><div style="height:120px"></div></Popover>
    </div>`, "let open = $state(false);") },
  dialog: { width: 1280, pane: "[data-slot=dialog-content]", open: "", source: page(`
    <Dialog open={true} locked={false} tone="standard" face={{ kind: "status", severity: "warning" }} title="Move note to Trash?"
      subtitle="You can restore the note from Trash." secondary={{ label: "Cancel", icon: "back", state: "ready", intent: { kind: "back" } }}
      primary={{ label: "Move to Trash", icon: "archive", state: "ready", intent: { kind: "accept" } }} oninvoke={() => {}} ondismiss={() => {}} />`) },
  sheet: { width: 390, pane: "[data-slot=dialog-content]", open: "", source: page(`
    <Modal label="Date" open={true} locked={false} presentation="sheet"><p style="margin:0">Pick a day.</p><div style="height:240px"></div></Modal>`) },
};

/** WCAG contrast of two sRGB pixels. */
function contrast(a: readonly number[], b: readonly number[]) {
  const luminance = (pixel: readonly number[]) => {
    const [r, g, bl] = pixel.map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
    return .2126 * r! + .7152 * g! + .0722 * bl!;
  };
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + .05) / (y! + .05);
}

for (const [name, { source, open, pane, width }] of Object.entries(surfaces)) for (const scheme of ["light", "dark"] as const)
  for (const transparency of ["no-preference", "reduce"] as const) {
    test(`${name} · ${scheme} · transparency ${transparency}: the page's ink never reads through the pane`, { timeout: 120000 }, async () => {
      const f = await svelteBrowser(source);
      try {
        await f.page.addStyleTag({ content: await css });
        await f.page.setViewportSize({ width, height: 844 });
        const session = await f.page.context().newCDPSession(f.page);
        await session.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme },
          { name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-reduced-transparency", value: transparency }] });
        if (open) await f.page.locator(open).first().click();
        const surface = f.page.locator(pane).first();
        await surface.waitFor();
        await f.page.waitForTimeout(500);
        // The ink's edge runs under the middle of the surface, wherever its owner placed it.
        const box = (await surface.boundingBox())!, middle = Math.round(box.x + box.width / 2);
        await f.page.locator("[data-ink]").evaluate((ink, edge) => { if (ink instanceof HTMLElement) { ink.style.right = "auto"; ink.style.width = `${edge}px`; } }, middle);
        await f.page.waitForTimeout(200);
        // Its last padding row (no content of the pane is there), 90px either side of the ink's edge: beyond the reach of
        // the pane's blur, so the two points show what the pane lets through, not the blurred edge between them.
        const reach = 90;
        await f.page.screenshot({ path: `artifacts/overlay-legibility/${name}-${scheme}-${transparency}.png` });
        assert.ok(box.x < middle - reach && box.x + box.width > middle + reach, `the ${name} spans the ink's edge: ${JSON.stringify(box)}`);
        const y = Math.round(box.y + box.height - 6);
        const shot = await f.page.screenshot({ clip: { x: middle - reach - 1, y, width: 2 * reach + 2, height: 1 } });
        const pixels = await f.page.evaluate(async (data: string) => {
          const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
          const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          const read = (x: number) => [...context.getImageData(x, 0, 1, 1).data.slice(0, 3)];
          return [read(0), read(image.width - 1)];
        }, shot.toString("base64"));
        const ratio = contrast(pixels[0]!, pixels[1]!);
        assert.ok(ratio <= 1.1, `over ink ${pixels[0]} vs over page ${pixels[1]}: ${ratio.toFixed(3)}:1 shows the page through the ${name}`);
        assert.deepEqual(f.errors, []);
      } finally { await f.close(); }
    });
  }

const anchored: Record<string, { source: string; open: string; width: number }> = {
  "field popover at 1280": { width: 1280, open: "[data-field-trigger]", source: page(`<div style="padding:40px;width:40rem">
    <Popover label="Cover" {open} disabled={false} locked={false} content="form" placement="anchored" align="start"
      trigger={{ kind: "field", label: "Cover", required: false, invalid: false, display: { kind: "text", text: "Automatic", placeholder: false }, measure: "fill" }}
      onopenchange={value => open = value}><p>Choose a cover.</p></Popover></div>`, "let open = $state(false);") },
  "date calendar at 390": { width: 390, open: "[data-field-trigger]", source: page(`<div style="padding:18px">
    <DateControl node={{ version: "desert.control/1", kind: "date", id: "due", label: "Date", required: true, disabled: false, value: "2026-10-15" }} onevent={() => {}} /></div>`) },
};
for (const [name, { source, open, width }] of Object.entries(anchored)) {
  test(`an anchored surface is at least as wide as its field: ${name}`, { timeout: 120000 }, async () => {
    const f = await svelteBrowser(source);
    try {
      await f.page.addStyleTag({ content: await css });
      await f.page.setViewportSize({ width, height: 844 });
      await f.page.emulateMedia({ reducedMotion: "reduce" });
      const trigger = f.page.locator(open).first();
      await trigger.click();
      const surface = f.page.locator("[data-slot=popover-content]").first();
      await surface.waitFor();
      await f.page.waitForTimeout(400);
      const field = (await trigger.boundingBox())!, pane = (await surface.boundingBox())!;
      assert.ok(pane.width >= field.width - .5, `the surface is ${pane.width}px wide under a ${field.width}px field`);
      assert.ok(pane.x + pane.width <= width - 11, `and stays inside the viewport: ${JSON.stringify(pane)}`);
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}

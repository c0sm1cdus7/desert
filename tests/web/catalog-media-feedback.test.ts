import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { Locator, Page } from "playwright";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { settle } from "./public-catalog-expectations.ts";

// Independently stated before repair: an image action visibly reacts to hover
// and a held pointer, even when reduced motion removes content compression.
// Inspect rendered pixels: a changed CSS background hidden by a photo is not feedback.
const build = basename(process.env.DESERT_CATALOG_BUILD ?? "build/landmarks-web-v1");
const directory = resolve("artifacts/hover-consistency", process.env.DESERT_HOVER_PHASE ?? build);

async function capture(page: Page, button: Locator, name: string) {
  const appearance = await button.evaluate(element => {
    const box = element.getBoundingClientRect(), style = getComputedStyle(element);
    return { box: { x: box.x, y: box.y, width: box.width, height: box.height },
      background: style.backgroundImage, pressed: element.getAttribute("data-pressed"),
      hovered: element.matches(":hover"), transform: style.transform };
  });
  // Upper-center interior avoids corners, foreground titles, floating controls,
  // and edge reveals from compression. Compare actual decoded RGB pixels.
  const { box } = appearance;
  const png = await page.screenshot({ clip: { x: box.x + box.width * .6, y: box.y + 24, width: 16, height: 12 },
    animations: "disabled", caret: "hide" });
  const pixels = await page.evaluate(async data => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return [...context.getImageData(0, 0, image.width, image.height).data];
  }, png.toString("base64"));
  await button.screenshot({ path: resolve(directory, `${name}.png`), animations: "disabled", caret: "hide" });
  return { ...appearance, pixels };
}

function difference(first: number[], second: number[]) {
  assert.equal(first.length, second.length);
  let total = 0, changed = 0;
  for (let index = 0; index < first.length; index++) if (index % 4 !== 3) {
    const delta = Math.abs(first[index]! - second[index]!); total += delta; if (delta) changed++;
  }
  return { meanChannelDelta: total / (first.length * .75), changedChannels: changed };
}

for (const theme of ["light", "dark"] as const)
  for (const motion of ["no-preference", "reduce"] as const)
    for (const presentation of ["featured", "item"] as const) {
      test(`${theme}/${motion}: ${presentation} image action visibly responds to hover and held pointer`, async () => {
        const fixture = await publicCatalogFixture();
        const name = `media-${build}-${theme}-${motion}-${presentation}`;
        try {
          const { page } = fixture;
          await mkdir(directory, { recursive: true });
          await page.setViewportSize({ width: 1100, height: 760 });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: motion }); await settle(page);
          const card = page.locator(`[data-catalog-card="${presentation}"]`).first();
          const button = card.locator("[data-catalog-image-action]");
          await button.scrollIntoViewIfNeeded();
          await card.locator("img").evaluate(async element => {
            await (element as HTMLImageElement).decode();
          });
          await page.mouse.move(1090, 750); await settle(page);
          const normal = await capture(page, button, `${name}-normal`);
          await button.hover({ position: { x: normal.box.width * .6, y: 30 } }); await settle(page);
          const hover = await capture(page, button, `${name}-hover`);
          await page.mouse.down(); await settle(page);
          const held = await capture(page, button, `${name}-held`);
          await page.mouse.move(1090, 750); await settle(page);
          const cancelled = await capture(page, button, `${name}-cancelled`);
          await page.mouse.up();
          const deltas = { hover: difference(normal.pixels, hover.pixels), held: difference(hover.pixels, held.pixels),
            cancelled: difference(normal.pixels, cancelled.pixels) };
          const failures = [];
          if (!hover.hovered) failures.push("Pointer must enter the image action");
          if (held.pressed !== "pointer") failures.push("Held pointer must engage shared feedback");
          if (deltas.hover.meanChannelDelta <= .2) failures.push("Hover must visibly paint above the image");
          if (deltas.held.meanChannelDelta <= .2) failures.push("Held state must visibly differ from hover");
          if (deltas.cancelled.meanChannelDelta !== 0) failures.push("Moving outside must restore the resting image");
          for (const state of [hover, held, cancelled]) {
            if (JSON.stringify(state.box) !== JSON.stringify(normal.box)) failures.push("Hit geometry must stay fixed");
            if (state.transform !== "none") failures.push("Action container must not compress");
          }
          await writeFile(resolve(directory, `${name}.json`), JSON.stringify({ build, theme, motion, presentation,
            states: { normal, hover, held, cancelled }, deltas, failures }, null, 2) + "\n");
          assert.deepEqual(failures, [], failures.join("; "));
        } finally { await fixture.page.mouse.up().catch(() => {}); await fixture.close(); }
      });
    }

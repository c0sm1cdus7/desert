import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type Locator, type Page } from "playwright";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, evidence as catalogEvidence, navigationAction, settle } from "./public-catalog-expectations.ts";
import { paintedLabelContrast } from "./painted-label-contrast.ts";

async function evidence(page: Page, name: string, values: unknown) {
  if (!process.env.DESERT_CONTRAST_EVIDENCE) return catalogEvidence(page, name, values);
  const directory = resolve(process.env.DESERT_CONTRAST_EVIDENCE);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, `${name}.json`), JSON.stringify(values, null, 2) + "\n");
  await page.screenshot({ path: resolve(directory, `${name}.png`), animations: "disabled" });
}

async function contrast(locator: Locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgba = (value: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    const uniformPaint = (layer: CSSStyleDeclaration) => {
      const base = rgba(layer.backgroundColor);
      if (layer.backgroundImage === "none") return base;
      if (!layer.backgroundImage.startsWith("linear-gradient(")) throw new Error("Unsupported contrast material: " + layer.backgroundImage);
      const source = layer.backgroundImage.slice("linear-gradient(".length, -1);
      const stops: string[] = []; let depth = 0, start = 0;
      for (let index = 0; index < source.length; index++) {
        if (source[index] === "(") depth++;
        else if (source[index] === ")") depth--;
        else if (source[index] === "," && depth === 0) { stops.push(source.slice(start, index).trim()); start = index + 1; }
      }
      stops.push(source.slice(start).trim());
      if (stops.length !== 2 || stops[0] !== stops[1]) throw new Error("Non-uniform gradient needs pixel-region contrast evidence: " + layer.backgroundImage);
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = layer.backgroundColor; context.fillRect(0, 0, 1, 1);
      context.fillStyle = stops[0]!; context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    const over = (front: number[], back: number[]) => {
      const a = front[3]! / 255, b = back[3]! / 255, alpha = a + b * (1 - a);
      return [...front.slice(0, 3).map((value, index) => alpha ?
        (value * a + back[index]! * b * (1 - a)) / alpha : 0), alpha * 255];
    };
    const foreground = rgba(style.color), backgroundLayers = [];
    let background = [0, 0, 0, 0];
    // Flat ancestor paints support quiet transparent links, not arbitrary media
    // or overlapping layers. Unknown materials must request pixel-region evidence.
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      const layer = getComputedStyle(ancestor);
      if (Number(layer.opacity) !== 1 || layer.filter !== "none" || layer.mixBlendMode !== "normal")
        throw new Error("Unsupported contrast compositing: opacity/filter/blend on " + ancestor.tagName);
      if (background[3] === 255) continue;
      if (layer.backdropFilter !== "none" || layer.backgroundBlendMode !== "normal")
        throw new Error("Unsupported contrast material: backdrop/background blend on " + ancestor.tagName);
      const paint = uniformPaint(layer);
      backgroundLayers.push({ tag: ancestor.tagName, slot: ancestor.getAttribute("data-slot"),
        color: layer.backgroundColor, image: layer.backgroundImage, rgba: paint });
      background = over(background, paint);
    }
    const luminance = (rgb: number[]) => rgb.slice(0, 3).map(value => value / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index]!, 0);
    const a = luminance(foreground), b = luminance(background);
    return { foreground: style.color, background: style.backgroundColor, backgroundImage: style.backgroundImage,
      compositedBackground: background.slice(0, 3), backgroundLayers, foregroundAlpha: foreground[3],
      backgroundAlpha: background[3], opacity: Number(style.opacity), size: parseFloat(style.fontSize),
      weight: Number(style.fontWeight), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  });
}

async function enabledStates<T>(page: Page, locator: Locator, measure: (locator: Locator) => Promise<T>) {
  await page.mouse.move(0, 0);
  await settle(page);
  const normal = await measure(locator);
  await locator.hover();
  await settle(page);
  const hover = await measure(locator);
  await page.mouse.down();
  await settle(page);
  const pressed = await measure(locator);
  // Release outside the control: this is a visual state test, not activation.
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await page.keyboard.press('Tab'); await locator.focus(); await settle(page);
  const focus = await measure(locator);
  return { normal, hover, pressed, focus };
}

function normalTextContrast(measured: { foregroundAlpha: number | undefined; backgroundAlpha: number | undefined; opacity: number; ratio: number; foreground: string; compositedBackground: number[] }, name: string) {
  assert.equal(measured.foregroundAlpha, 255, `${name}: expected opaque text for this measurement`);
  assert.equal(measured.backgroundAlpha, 255, `${name}: the composited background must be fully resolved`);
  assert.equal(measured.opacity, 1, `${name}: disabled/attenuated controls are not this enabled-state test`);
  assert.ok(measured.ratio >= 4.5,
    `${name}: ${measured.foreground} on composited rgb(${measured.compositedBackground.join(", ")}) is ${measured.ratio.toFixed(5)}:1; small text requires at least 4.5:1`);
}

test("contrast measurement composites uniform ancestors without accepting low contrast or unknown media", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<main style="background:black"><a style="color:white;background:transparent">Test link</a></main>');
    const link = page.locator("a");
    const transparent = await contrast(link);
    assert.deepEqual(transparent.compositedBackground, [0, 0, 0]);
    assert.equal(transparent.ratio, 21); normalTextContrast(transparent, "transparent fixture");
    await link.evaluate(element => { (element as HTMLElement).style.background = "rgba(255,255,255,.5)"; });
    const translucent = await contrast(link);
    assert.equal(translucent.backgroundAlpha, 255);
    assert.ok(translucent.ratio < 4.5);
    assert.throws(() => normalTextContrast(translucent, "low contrast fixture"), /at least 4\.5:1/);
    await link.evaluate(element => { (element as HTMLElement).style.background = "transparent"; });
    await page.locator("main").evaluate(element => {
      (element as HTMLElement).style.backgroundImage = "linear-gradient(black, white)";
    });
    await assert.rejects(contrast(link), /Non-uniform gradient needs pixel-region contrast evidence/);
    // Assign a valid image URL through the CSS API; unsupported images cannot
    // silently fall back to a convenient ancestor's solid background color.
    await page.locator("main").evaluate(element => {
      (element as HTMLElement).style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>')}")`;
    });
    await assert.rejects(contrast(link), /Unsupported contrast material/);
  } finally { await browser.close(); }
});

test("enabled public catalog primary actions preserve normal-text contrast", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await action(page, "Learn More").waitFor();
    const hero = await enabledStates(page, action(page, "Learn More"), target => paintedLabelContrast(page, target));
    // The user's direct-select contract removes selection Confirm altogether.
    // Its old measurement is preserved in the historical v2-v4 evidence.
    await evidence(page, "contrast-enabled-actions", { hero, minimumNormalTextRatio: 4.5,
      superseded: "Selection Confirm no longer exists; not counted as contrast coverage." });
    for (const [state, measured] of Object.entries(hero)) normalTextContrast(measured, `Learn More ${state}`);
  } finally { await fixture.close(); }
});

test("visible bank sidebar destinations preserve normal-text contrast in selected and unselected states", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    // Category-return links were deliberately removed from the bank hierarchy.
    // Keep the navigation contrast obligation on the real retained destinations,
    // including selected/unselected rows and both docked and overlay materials.
    for (const width of [390, 1280]) for (const theme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto(fixture.origin);
      await (await navigationAction(page, "Component bank")).click();
      await navigationAction(page, "Component bank");
      await settle(page);
      const measured: Record<string, unknown> = {};
      for (const name of ["Component bank", "Landmarks", "Travel kit"]) {
        const destination = page.getByRole("navigation", { name: "Main navigation" })
          .getByRole("button", { name, exact: true });
        await destination.waitFor();
        const selected = name === "Component bank";
        assert.equal(await destination.getAttribute("aria-current"), selected ? "page" : null);
        const label = destination.locator('[data-button-content] > span:last-child');
        assert.equal(await label.textContent(), name, "Measure the visible destination label, excluding its decorative face");
        const states = await enabledStates(page, destination, target => paintedLabelContrast(page, target, label));
        for (const [state, value] of Object.entries(states)) normalTextContrast(value, `${width}/${theme}/${name}/${state}`);
        measured[name] = { selected, states };
      }
      await evidence(page, `contrast-bank-navigation-${width}-${theme}`, { measured, minimumNormalTextRatio: 4.5,
        superseded: "Back to catalog navigation category links no longer exist; measured real sidebar destinations instead." });
    }
  } finally { await fixture.close(); }
});

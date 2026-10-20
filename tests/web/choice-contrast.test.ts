import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Locator, type Page } from "playwright";
import { loadVerifiedBuild } from "../../src/build/manifest.ts";

// Exercise the compiled bank without a controller or database: catalog state is local.
async function catalog() {
  const directory = process.env.DESERT_WEB_BUILD ? resolve(process.env.DESERT_WEB_BUILD)
    : fileURLToPath(new URL("../../build/notebook-web", import.meta.url));
  loadVerifiedBuild(directory);
  const { handler } = await import(pathToFileURL(resolve(directory, "web/handler.js")).href);
  const cleanup: (() => Promise<void>)[] = [];
  async function close() {
    const failures: unknown[] = [];
    for (const dispose of cleanup.splice(0).reverse()) {
      try { await dispose(); } catch (error) { failures.push(error); }
    }
    if (failures.length) throw new AggregateError(failures, "CHOICE_CONTRAST_CLEANUP_FAILED");
  }
  try {
    const server = createServer((request, response) => {
      if (request.url?.startsWith("/api/")) {
        response.writeHead(503, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Catalog-only contrast fixture has no controller" }));
      } else handler(request, response);
    });
    await new Promise<void>((accept, reject) => {
      server.once("error", reject); server.listen(0, "127.0.0.1", accept);
    });
    cleanup.push(() => new Promise((accept, reject) => {
      server.closeAllConnections(); server.close(error => error ? reject(error) : accept());
    }));
    const browser = await chromium.launch({ headless: true });
    cleanup.push(() => browser.close());
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error" && /Content Security Policy|unsafe-eval/.test(message.text())) errors.push(message.text());
    });
    const address = server.address();
    assert.ok(address && typeof address === "object");
    await page.goto(`http://127.0.0.1:${address.port}/?catalog=1`);
    await page.locator('[data-specimen="control.options:one"]').waitFor();
    return { page, errors, close };
  } catch (error) {
    try { await close(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], "CHOICE_CONTRAST_SETUP_FAILED"); }
    throw error;
  }
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})));
  });
}

async function contrast(control: Locator) {
  return control.evaluate(element => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const paint = (color: string) => { context.fillStyle = color; context.fillRect(0, 0, 1, 1); };
    const sample = () => Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    const luminance = (rgb: number[]) => rgb.map(value => value / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index]!, 0);
    const ratio = (a: number[], b: number[]) => {
      const light = luminance(a), dark = luminance(b);
      return (Math.max(light, dark) + .05) / (Math.min(light, dark) + .05);
    };
    const ancestors: Element[] = [];
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) ancestors.unshift(ancestor);
    paint("white");
    for (const ancestor of [...ancestors, element]) {
      const style = getComputedStyle(ancestor);
      if (style.opacity !== "1" || style.backgroundImage !== "none") throw new Error("Unsupported translucent group or background image");
      if (ancestor !== element) paint(style.backgroundColor);
    }
    const outside = sample(), style = getComputedStyle(element);
    if (style.borderTopStyle !== "solid" || parseFloat(style.borderTopWidth) < 1) throw new Error("Missing choice boundary");
    paint(style.backgroundColor);
    const inside = sample();
    // CSS backgrounds extend under the border; preserve alpha in both paint layers.
    if (style.backgroundClip !== "border-box") throw new Error("Unsupported choice background clipping");
    paint(style.borderTopColor);
    const boundary = sample();
    const marker = element.querySelector("svg");
    let markerRatio: number | null = null, markerColor: number[] | null = null;
    if (element.getAttribute("aria-checked") === "true") {
      if (!marker) throw new Error("Checked choice has no visible marker");
      const markerStyle = getComputedStyle(marker);
      if (marker.getBoundingClientRect().width === 0 || markerStyle.opacity !== "1" || markerStyle.visibility !== "visible") {
        throw new Error("Checked choice marker is hidden or translucent");
      }
      context.clearRect(0, 0, 1, 1); paint(`rgb(${inside.join(" ")})`);
      paint(markerStyle.backgroundColor);
      paint(markerStyle.stroke === "none" ? markerStyle.color : markerStyle.stroke);
      markerColor = sample(); markerRatio = ratio(markerColor, inside);
    }
    context.clearRect(0, 0, 1, 1); paint(style.getPropertyValue("--primary"));
    const primary = sample();
    context.clearRect(0, 0, 1, 1); paint(style.getPropertyValue("--primary-foreground"));
    const primaryForeground = sample();
    return { outside, inside, boundary, borderColor: style.borderTopColor, backgroundColor: style.backgroundColor,
      boundaryOutside: ratio(boundary, outside), boundaryInside: ratio(boundary, inside), markerRatio,
      markerColor, primary, primaryForeground };
  });
}

test("choices meet 3:1 contrast and checked choices use primary roles in both themes", { timeout: 30000 }, async t => {
  const f = await catalog();
  const results: { theme: string; choice: string; state: string; values: Awaited<ReturnType<typeof contrast>> }[] = [];
  try {
    for (const colorScheme of ["light", "dark"] as const) {
      for (const explicit of [false, true]) {
        await f.page.emulateMedia({ colorScheme });
        await f.page.evaluate(({ explicit, colorScheme }) => {
          if (explicit) document.documentElement.dataset.theme = colorScheme;
          else delete document.documentElement.dataset.theme;
        }, { explicit, colorScheme });
        await f.page.mouse.move(0, 0); await settle(f.page);
        for (const [choice, cardinality] of [["radio", "one"], ["checkbox", "many"]] as const) {
          const selector = `[data-specimen="control.options:${cardinality}"] [role="${choice}"]:not(:disabled):not([aria-disabled="true"])`;
          const choices = f.page.locator(selector);
          assert.equal(await choices.count(), 2, "both enabled choice specimens remain represented");
          const unchecked = f.page.locator(`${selector}[aria-checked="false"]`).first();
          assert.equal(await unchecked.getAttribute("aria-checked"), "false");
          results.push({ theme: `${colorScheme}/${explicit ? "explicit" : "system"}`, choice, state: "unchecked", values: await contrast(unchecked) });
          await unchecked.click();
          const selected = f.page.locator(`${selector}[aria-checked="true"]`).first();
          await selected.blur(); await f.page.mouse.move(0, 0); await settle(f.page);
          assert.equal(await selected.getAttribute("aria-checked"), "true");
          results.push({ theme: `${colorScheme}/${explicit ? "explicit" : "system"}`, choice, state: "checked", values: await contrast(selected) });
          if (choice === "checkbox") {
            await selected.click(); await f.page.mouse.move(0, 0); await settle(f.page);
          }
        }
      }
    }
    t.diagnostic(JSON.stringify(results));
    assert.deepEqual(f.errors, []);
    const same = (a: number[] | null, b: number[]) => a !== null && a.every((value, index) => value === b[index]);
    const failures = results.filter(({ state, values }) => state === "unchecked"
      ? Math.min(values.boundaryInside, values.boundaryOutside) < 3
      : (values.markerRatio ?? 0) < 3 || !same(values.inside, values.primary)
        || !same(values.boundary, values.primary) || !same(values.markerColor, values.primaryForeground));
    assert.deepEqual(failures, [], "choice graphics must meet 3:1 without rounding up, with exact checked primary fill/border/marker roles");
  } finally { await f.close(); }
});

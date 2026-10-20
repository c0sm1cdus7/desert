import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Locator } from "playwright";
import { browserFixture, settleMotion } from "./fixture.ts";

async function textContrast(message: Locator) {
  return message.evaluate(element => {
    // Use the choice-contrast test's canvas method so alpha and CSS color spaces
    // are resolved by the browser, then evaluate the actual composited fill.
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const paint = (color: string) => { context.fillStyle = color; context.fillRect(0, 0, 1, 1); };
    const sample = () => Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    const luminance = (rgb: number[]) => rgb.map(value => value / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index]!, 0);
    const ancestors: Element[] = [];
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) ancestors.unshift(ancestor);
    paint("white");
    for (const ancestor of ancestors) {
      const style = getComputedStyle(ancestor);
      if (style.opacity !== "1" || style.backgroundImage !== "none") throw new Error("Unsupported translucent group or background image");
      paint(style.backgroundColor);
    }
    const background = sample(), style = getComputedStyle(element);
    paint(style.color);
    const foreground = sample(), a = luminance(foreground), b = luminance(background);
    return { foreground, background, color: style.color, fontSize: parseFloat(style.fontSize), fontWeight: style.fontWeight,
      ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  });
}

test("real product field explanations retain at least 4.5:1 contrast on their actual light and dark surface", { timeout: 30000 }, async t => {
  const f = await browserFixture();
  const results: { theme: string; width: number; field: string; values: Awaited<ReturnType<typeof textContrast>> }[] = [];
  const directory = `artifacts/field-feedback-contrast/${basename(process.env.DESERT_WEB_BUILD ?? "current")}`;
  try {
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    const form = f.page.getByRole("dialog", { name: "Create note", exact: true });
    assert.equal(await form.locator('[data-slot="field-error"]').count(), 0);
    await form.getByRole("textbox", { name: "Title", exact: true }).focus();
    await form.getByRole("textbox", { name: "Content", exact: true }).focus();
    await form.getByRole("textbox", { name: "Content", exact: true }).blur();
    await mkdir(directory, { recursive: true });
    for (const colorScheme of ["light", "dark"] as const) {
      for (const explicit of [false, true]) {
        await f.page.emulateMedia({ colorScheme });
        await f.page.evaluate(({ explicit, colorScheme }) => {
          if (explicit) document.documentElement.dataset.theme = colorScheme;
          else delete document.documentElement.dataset.theme;
        }, { explicit, colorScheme });
        for (const width of [1280, 390]) {
          await f.page.setViewportSize({ width, height: 900 });
          await settleMotion(f.page);
          for (const field of ["Title", "Content"]) {
            const input = form.getByRole("textbox", { name: field, exact: true });
            assert.equal(await input.getAttribute("aria-invalid"), "true");
            const messageId = await input.getAttribute("aria-describedby");
            assert.ok(messageId, "the measured explanation is associated with the actual invalid field");
            const message = form.locator('[data-slot="field-error"]').filter({ hasText: "Enter a value." })
              .and(form.locator(`[id="${messageId}"]`));
            assert.equal(await message.isVisible(), true);
            results.push({ theme: `${colorScheme}/${explicit ? "explicit" : "system"}`, width, field, values: await textContrast(message) });
          }
          await f.page.screenshot({ path: `${directory}/${colorScheme}-${explicit ? "explicit" : "system"}-${width}.png` });
        }
      }
    }
    await writeFile(`${directory}/measurements.json`, JSON.stringify(results, null, 2));
    t.diagnostic(JSON.stringify(results));
    assert.deepEqual(f.errors, []);
    assert.deepEqual(results.filter(result => result.values.ratio < 4.5), [],
      "small field explanations must meet 4.5:1 without rounding up on the actual product surface");
  } finally { await f.close(); }
});

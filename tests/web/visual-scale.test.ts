import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Locator, type Page } from "playwright";
import { browserFixture, settleMotion } from "./fixture.ts";

// A frozen catalog URL permits read-only comparison when the source fingerprint has moved.
async function catalog() {
  const url = process.env.DESERT_VISUAL_URL;
  if (url) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(url);
    await page.locator('[data-specimen="context:available"]').waitFor();
    return { page, errors, close: () => browser.close() };
  }
  const f = await browserFixture();
  try { await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click(); return f; }
  catch (error) { await f.close(); throw error; }
}
async function evidence(page: Page, name: string, values: unknown) {
  await settleMotion(page);
  const directory = `artifacts/visual-scale/${process.env.DESERT_VISUAL_PHASE ?? "current"}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${name}.json`, JSON.stringify({ route: page.url(), values }, null, 2));
  await page.screenshot({ path: `${directory}/${name}.png` });
}
async function textStyle(node: Locator) {
  return node.evaluate(element => {
    const style = getComputedStyle(element);
    return { size: parseFloat(style.fontSize), weight: style.fontWeight, line: parseFloat(style.lineHeight) };
  });
}
async function iconStyle(node: Locator) {
  return node.evaluate(element => {
    const style = getComputedStyle(element), box = element.getBoundingClientRect();
    return { width: box.width, height: box.height, stroke: parseFloat(style.strokeWidth) };
  });
}
async function context(page: Page) {
  await page.locator('[data-specimen="context:available"]').getByRole("button").click();
  const dialog = page.getByRole("dialog", { name: "Context specimen", exact: true });
  await settleMotion(page);
  return dialog;
}

test("Close is the common control type scale; chevrons share size, stroke and alignment", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    for (const scale of [1, 1.3]) {
      await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
      const select = f.page.getByLabel("Single choice", { exact: true });
      const selectIcon = await iconStyle(select.locator("svg").last());
      const dialog = await context(f.page);
      const close = dialog.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true });
      const row = dialog.locator('[data-piece="destination-row"]').first();
      const facts = dialog.locator('[data-composition="context"] .fact-row');
      assert.ok(await facts.count() > 0);
      for (const fact of await facts.all()) assert.equal(await fact.isVisible(), true);
      assert.equal(await dialog.getByRole("button", { name: "Details", exact: true }).count(), 0);
      const values = { close: await textStyle(close),
        action: await textStyle(row.locator(".destination-title")), select: await textStyle(select), selectIcon,
        section: await textStyle(dialog.getByRole("heading", { name: "Actions", exact: true })),
        fieldLabel: await textStyle(dialog.locator(".fact-label").first()), body: await textStyle(dialog.locator(".fact-value").first()),
        input: await textStyle(f.page.locator('[data-specimen="input.text:value"] [data-slot="input-group-control"]')),
        layout: await f.page.evaluate(() => {
          const read = (selector: string) => getComputedStyle(document.querySelector(selector)!);
          return { catalog: parseFloat(read(".catalog").paddingLeft), footer: parseFloat(read('[role="dialog"] .bank-footer').paddingLeft),
            facts: parseFloat(read('[role="dialog"] .fact-row').paddingTop), border: parseFloat(read('[role="dialog"] .bank-stack').borderTopWidth) };
        }),
        actionIcon: await iconStyle(row.locator("svg")),
        heights: await Promise.all([close, row, select].map(async node => (await node.boundingBox())!.height)),
        centers: await Promise.all([row].map(node => node.evaluate(element => {
          const title = element.querySelector(".destination-title")!.getBoundingClientRect();
          const icons = element.querySelectorAll("svg"), icon = icons[icons.length - 1]!.getBoundingClientRect();
          return Math.abs(title.y + title.height / 2 - icon.y - icon.height / 2);
        }))) };
      await evidence(f.page, `type-scale-${scale}`, values);
      assert.ok(Math.abs(values.layout.catalog - 32 * scale) < .05 && Math.abs(values.layout.footer - 20 * scale) < .05,
        "the shared layer order must preserve catalog and footer spacing");
      assert.ok(Math.abs(values.layout.facts - 14 * scale) < .05 && values.layout.border === 1,
        "base resets must not erase component padding or the grouped border");
      assert.ok(Math.abs(values.close.size - 14 * scale) < .05, "Close remains the 14px baseline, scaled accessibly");
      assert.deepEqual(values.action, values.close, "destination labels match Close typography");
      assert.deepEqual(values.section, values.close, "section labels use the control hierarchy, not a larger heading");
      assert.equal(values.select.size, values.input.size, "selection and text entry share the field scale, distinct from action labels");
      assert.equal(values.fieldLabel.size, values.close.size);
      assert.ok(Math.abs(values.input.size - 16 * scale) < .05 && Math.abs(values.body.size - 14 * scale) < .05,
        "input entry retains 16px while read-only body restores the approved 14px role; both scale accessibly");
      for (const icon of [values.actionIcon, selectIcon]) {
        assert.ok(Math.abs(icon.width - 16 * scale) < .05 && Math.abs(icon.height - 16 * scale) < .05);
        assert.equal(icon.stroke, 2);
      }
      assert.ok(values.heights.every(height => height >= 44), "smaller text never shrinks the hit target below 44px");
      assert.ok(values.centers.every(distance => distance <= 1), "label and chevron centers align");
      await close.click(); await dialog.waitFor({ state: "hidden" });
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("destination focus follows the grouped container without hiding context facts", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    const dialog = await context(f.page);
    const rows = dialog.locator('[data-piece="destination-row"]');
    assert.ok(await rows.count() >= 2, "first and last rows exercise both outer corners");
    const facts = dialog.locator('[data-composition="context"] .fact-row');
    assert.ok(await facts.count() > 0);
    for (const edge of ["first", "last"] as const) {
      const row = edge === "first" ? rows.first() : rows.last();
      await f.page.keyboard.press("Tab"); await row.focus();
      const values = await row.evaluate(element => {
        const style = getComputedStyle(element), parent = getComputedStyle(element.parentElement!);
        return { focus: element.matches(":focus-visible"), top: parseFloat(style.borderTopLeftRadius),
          bottom: parseFloat(style.borderBottomLeftRadius), parentRadius: parseFloat(parent.borderTopLeftRadius),
          outline: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset), overflow: parent.overflow };
      });
      await evidence(f.page, `destination-focus-${edge}`, values);
      assert.equal(values.focus, true);
      assert.ok((edge === "first" ? values.top : values.bottom) >= values.parentRadius - 1,
        "outer row corners must follow the clipped stack");
      assert.ok(values.outline >= 2);
      assert.ok(values.overflow !== "hidden" || values.offset <= -values.outline,
        "the complete focus stroke must sit within a clipping ancestor");
      for (const fact of await facts.all()) assert.equal(await fact.isVisible(), true);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

async function contrast(button: Locator, face: string) {
  return button.evaluate((element, selector) => {
    const color = getComputedStyle(element.querySelector(selector)!).color;
    const background = getComputedStyle(element).backgroundColor;
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    const luminance = (value: string) => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
      const rgb = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3)
        .map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
      return rgb[0]! * .2126 + rgb[1]! * .7152 + rgb[2]! * .0722;
    };
    const a = luminance(color), b = luminance(background);
    return { color, background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  }, face);
}
test("primary labels and compact icons retain AA contrast in light and dark", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    for (const theme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme: theme });
      await f.page.setViewportSize({ width: 1280, height: 900 });
      await settleMotion(f.page);
      const label = f.page.locator('[data-specimen="action:ready"] button');
      assert.equal(await label.getAttribute("data-button-face"), "label");
      const labelContrast = await contrast(label, "[data-button-label]");
      await f.page.setViewportSize({ width: 320, height: 844 });
      const icon = f.page.locator('[data-specimen="review:prepared"] [data-emphasis="primary"]');
      await icon.locator("svg").waitFor();
      await icon.scrollIntoViewIfNeeded();
      const iconContrast = await contrast(icon, "svg");
      await evidence(f.page, `primary-contrast-${theme}`, { label: labelContrast, icon: iconContrast });
      assert.ok(labelContrast.ratio >= 4.5, `${theme} primary label: ${labelContrast.ratio}`);
      assert.ok(iconContrast.ratio >= 4.5, `${theme} compact primary icon: ${iconContrast.ratio}`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

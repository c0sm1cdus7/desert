import assert from "node:assert/strict";
import test from "node:test";
import type { Locator } from "playwright";
import { activePanel, panelToolbar, settleMotion, waitForNote } from "./fixture.ts";
import { openCatalog } from "./inspection-fixture.ts";
import { catalog, evidence, finishTarget, openNotes, target } from "./press-fixture.ts";

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

test("published reading, editing and catalog controls preserve their distinct accessible type roles", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    for (const scale of [1, 1.3]) {
      await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
      await openCatalog(f.page);
      const select = f.page.locator('[data-specimen="control.select:available"] [data-selection-trigger]');
      const selectIcon = await iconStyle(select.locator("svg").last());
      const entry = await textStyle(f.page.locator('[data-specimen="input.text:value"] [data-slot="input-group-control"]'));
      const selection = await textStyle(select.locator('[data-field-value]'));
      const primary = await target(f.page, "primary");
      const close = panelToolbar(f.page, "bottom").getByRole("button", { name: "Close", exact: true });
      const closeStyle = await textStyle(close), primaryStyle = await textStyle(primary);
      const footerInset = await panelToolbar(f.page, "bottom").evaluate(node => parseFloat(getComputedStyle(node).paddingLeft));
      assert.equal(footerInset, 8, "the one shared toolbar geometry owns the inset");
      assert.equal(primaryStyle.size, closeStyle.size, "primary and secondary controls use the same type scale");
      assert.ok(Math.abs(closeStyle.size - 13 * scale) < .05);
      assert.ok(Math.abs(entry.size - 16 * scale) < .05 && selection.size === entry.size);
      await finishTarget(f.page);
      const row = f.page.locator('[data-composition="collection"]:visible button').first();
      const rowIcon = await iconStyle(row.locator("svg"));
      for (const icon of [rowIcon, selectIcon]) {
        assert.ok(Math.abs(icon.width - 16 * scale) < .05 && Math.abs(icon.height - 16 * scale) < .05);
        assert.equal(icon.stroke, 2);
      }
      const center = await row.evaluate(element => {
        const title = element.querySelector("strong")!.getBoundingClientRect();
        const icon = element.querySelector("svg")!.getBoundingClientRect();
        return Math.abs(title.y + title.height / 2 - icon.y - icon.height / 2);
      });
      assert.ok(center <= 1, "record title and chevron centers align");
      assert.ok((await row.boundingBox())!.height >= 44);
      await row.click();
      await waitForNote(f.page, "First press witness");
      const reading = activePanel(f.page).locator('[data-reading="multiline"]');
      const body = await textStyle(reading);
      assert.ok(Math.abs(body.size - 16 * scale) < .05, "published paragraphs use the shared prose role");
      assert.equal(await reading.innerText(), "Published reading content.");
      assert.equal(await activePanel(f.page).locator("details").count(), 0, "published facts need no disclosure");
      await evidence(f.page, "type-scale-" + scale, { entry, selection, closeStyle, primaryStyle, footerInset, rowIcon, selectIcon, body, center });
      await finishTarget(f.page);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("collection row focus follows the shared grouped boundary", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    await openNotes(f.page);
    const rows = f.page.locator('[data-composition="collection"]:visible button');
    assert.equal(await rows.count(), 3);
    for (const edge of ["first", "last"] as const) {
      const row = edge === "first" ? rows.first() : rows.last();
      await f.page.keyboard.press("Tab"); await row.focus();
      const values = await row.evaluate(element => {
        const style = getComputedStyle(element), group = getComputedStyle(element.closest("[data-grouped-panel]")!);
        return { focus: element.matches(":focus-visible"), top: parseFloat(style.borderTopLeftRadius),
          bottom: parseFloat(style.borderBottomLeftRadius), groupRadius: parseFloat(group.borderTopLeftRadius),
          outline: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset), overflow: group.overflow };
      });
      await evidence(f.page, "collection-focus-" + edge, values);
      assert.equal(values.focus, true);
      assert.ok((edge === "first" ? values.top : values.bottom) >= values.groupRadius - 1);
      assert.ok(values.outline >= 2);
      assert.ok(values.overflow !== "hidden" || values.offset <= -values.outline, "focus fits within the clipping group");
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
test("real primary labels and compact icons retain AA contrast in light and dark", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    for (const theme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme: theme });
      await f.page.setViewportSize({ width: 1280, height: 900 });
      const primary = await target(f.page, "primary");
      await settleMotion(f.page);
      assert.equal(await primary.getAttribute("data-button-face"), "label");
      const labelContrast = await contrast(primary, "[data-button-label]");
      await f.page.setViewportSize({ width: 320, height: 844 });
      await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
      await primary.locator("svg").waitFor();
      await primary.scrollIntoViewIfNeeded();
      const iconContrast = await contrast(primary, "svg");
      await evidence(f.page, "primary-contrast-" + theme, { label: labelContrast, icon: iconContrast });
      assert.ok(labelContrast.ratio >= 4.5, theme + " primary label: " + labelContrast.ratio);
      assert.ok(iconContrast.ratio >= 4.5, theme + " compact primary icon: " + iconContrast.ratio);
      await finishTarget(f.page);
      await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "1"));
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

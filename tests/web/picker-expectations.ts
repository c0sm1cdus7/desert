import assert from "node:assert/strict";
import type { Locator, Page } from "playwright";
import { box, settle } from "./public-catalog-expectations.ts";

/** A constrained selection owns a modal sheet, not an anchored popup. */
export async function bottomPicker(page: Page, menu: Locator) {
  const sheet = page.locator('[data-picker-sheet]');
  await sheet.waitFor(); await settle(page);
  assert.equal(await sheet.getAttribute('aria-modal'), 'true');
  assert.equal(await sheet.getAttribute('data-edge'), 'bottom');
  assert.equal(await sheet.getByRole('listbox').count(), 1);
  assert.equal(await menu.getByRole('option').count() > 0, true);
  assert.ok(await sheet.evaluate(element => element.contains(document.activeElement)), 'focus belongs to the modal sheet');
  const panel = await box(sheet), viewport = page.viewportSize()!;
  assert.ok(panel.x >= 0 && panel.y >= 0 && panel.x + panel.width <= viewport.width + 1 &&
    panel.y + panel.height <= viewport.height + 1, 'sheet fits the viewport');
  assert.ok(viewport.height - panel.y - panel.height <= 24, 'sheet remains attached to the bottom inset');
  return { panel, viewport };
}

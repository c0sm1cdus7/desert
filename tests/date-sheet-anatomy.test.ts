// The calendar sheet (third review of the slice 3 package, large text at 390): its ✕ and «October 2026» started on two
// lines (21px and 33px), it stopped short of the screen's bottom with the page's text showing below it, and its top bar had
// a title but no subtitle. Laws 10a and 9c: a transient surface's top bar is ✕ + title + subtitle, the subtitle naming the
// subject (the field being edited); one inset axis for what the sheet holds; and a sheet rising from the bottom edge
// reaches it.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

test("the calendar sheet: ✕ + title + the field as subtitle, one inset axis, down to the bottom edge", async () => {
  const f = await mounted(`<main style="padding:16px;background:var(--background);color:var(--foreground)">
    <p>Text of the page under the sheet.</p>
    <Catalog.DateControl node={{ version: "desert.control/1", kind: "date", id: "arrival", label: "Arrival", required: true, disabled: false,
      value: "2026-10-15" }} onevent={() => {}} />
  </main>`);
  try {
    for (const colorScheme of ["light", "dark"] as const) {
      // Too short for the anchored calendar (28rem of block room), as large text at 390 is.
      await f.page.setViewportSize({ width: 390, height: 420 });
      await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await f.page.keyboard.press("Escape");
      await f.page.waitForTimeout(200);
      await f.page.locator("[data-field-trigger]").click();
      const sheet = f.page.locator('[data-modal="sheet"]');
      await sheet.waitFor({ state: "visible" });
      await f.page.waitForTimeout(400);
      const seen = await sheet.evaluate(element => {
        const box = (selector: string) => element.querySelector(selector)?.getBoundingClientRect();
        const bar = element.querySelector('[data-toolbar="top"], [data-bar]') ?? element;
        const texts = [...bar.querySelectorAll("h1, h2, h3, p, span, strong")].map(node => node.textContent?.trim()).filter(Boolean);
        const close = [...element.querySelectorAll("button:not(.drawer-grip)")].find(button => /close/i.test(button.getAttribute("aria-label") ?? ""))!.getBoundingClientRect();
        const month = element.querySelector("[data-date-calendar-month]")!;
        const range = document.createRange(); range.selectNodeContents(month);
        const sheetBox = element.getBoundingClientRect(), style = getComputedStyle(element);
        return { texts, close: close.left, month: range.getBoundingClientRect().left, bottom: sheetBox.bottom, viewport: innerHeight,
          bottomRadius: style.borderBottomLeftRadius, grid: box("[data-calendar-grid-viewport]")?.left };
      });
      const shown = JSON.stringify(seen);
      assert.ok(seen.texts.includes("Choose a date"), `${colorScheme}: the top bar's title says what the sheet does: ${shown}`);
      assert.ok(seen.texts.includes("Arrival"), `${colorScheme}: its subtitle names the field it edits: ${shown}`);
      assert.ok(Math.abs(seen.month - seen.close) <= 1, `${colorScheme}: «October 2026» starts on the ✕'s axis: ${shown}`);
      assert.ok(Math.abs(seen.bottom - seen.viewport) <= .5, `${colorScheme}: the sheet reaches the screen's bottom edge: ${shown}`);
      assert.equal(seen.bottomRadius, "0px", `${colorScheme}: on the screen's edge its bottom corners are the edge's: ${shown}`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

import assert from "node:assert/strict";
import test from "node:test";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";
import { settingsEvidence } from "./settings-language-expectations.ts";

// Added after manual v36 review exposed crowding not covered by the original
// six expectations. Keep that narrower result intact. A calendar may retain
// its meaningful 2D layout in a local scroller; surrounding content must reflow.
test("compact Calendar keeps enlarged weekday and day glyphs inside distinct cells", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture(), failures: string[] = [];
  try {
    await f.page.setViewportSize({ width: 320, height: 844 });
    await (await navigationAction(f.page, "Travel kit")).click();
    const calendar = f.page.locator('[data-control="date"]');
    for (const scale of [1, 2]) {
      await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
      await calendar.scrollIntoViewIfNeeded(); await settle(f.page);
      const geometry = await calendar.evaluate(root => {
        const cells = [...root.querySelectorAll("th, [data-calendar-day]")].map(node => {
          const textNode = node.querySelector("[data-button-content]") ?? node;
          const range = document.createRange(); range.selectNodeContents(textNode);
          const text = range.getBoundingClientRect(), cell = node.getBoundingClientRect();
          return { label: node.textContent?.trim(), kind: node.tagName, font: parseFloat(getComputedStyle(node).fontSize),
            cell: { left: cell.left, right: cell.right, width: cell.width },
            text: { left: text.left, right: text.right, width: text.width } };
        });
        const main = document.querySelector("[data-catalog-scroll]")!;
        return { cells, main: { scroll: main.scrollWidth, client: main.clientWidth },
          scrollers: [...root.querySelectorAll("*")].filter(node => {
            const style = getComputedStyle(node);
            return ["auto", "scroll"].includes(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
          }).map(node => ({ width: node.clientWidth, scrollWidth: node.scrollWidth })) };
      });
      await settingsEvidence(f.page, `calendar-scale-${scale}`, geometry);
      assert.equal(geometry.cells.filter(cell => cell.kind === "TH").length, 7, "Calendar retains seven weekday columns");
      for (const cell of geometry.cells) {
        if (cell.text.left < cell.cell.left + 1 || cell.text.right > cell.cell.right - 1)
          failures.push(`${scale}x ${cell.kind} ${cell.label}: text ${cell.text.width.toFixed(1)}px crowds ${cell.cell.width.toFixed(1)}px cell`);
      }
      if (geometry.main.scroll > geometry.main.client + 1) failures.push(`${scale}x calendar causes whole-surface horizontal overflow`);
      if (scale === 1 && geometry.scrollers.length) failures.push("100% calendar should fit without local horizontal scrolling");
    }
    const days = calendar.locator("[data-calendar-day]:not([data-outside-month])");
    await days.first().focus();
    const focusGeometry = async () => {
      await settle(f.page);
      await f.page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      return f.page.evaluate(() => {
      const day = document.activeElement!, rect = day.getBoundingClientRect();
      const style = getComputedStyle(day), outlineExtent = style.outlineStyle === "none" ? 0
        : Math.max(0, parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset));
      let left = 0, right = innerWidth, parent = day.parentElement;
      const ancestors = [];
      while (parent) {
        const bounds = parent.getBoundingClientRect(), style = getComputedStyle(parent);
        ancestors.push({ tag: parent.tagName, slot: parent.getAttribute("data-slot"), class: parent.className,
          left: bounds.left, right: bounds.right, width: bounds.width, overflowX: style.overflowX,
          scrollLeft: parent.scrollLeft, clientWidth: parent.clientWidth, scrollWidth: parent.scrollWidth,
          gridViewport: parent.hasAttribute("data-calendar-grid-viewport"), scrollTop: parent.scrollTop,
          clientHeight: parent.clientHeight, scrollHeight: parent.scrollHeight });
        if (["auto", "scroll", "hidden", "clip"].includes(getComputedStyle(parent).overflowX)) {
          const r = parent.getBoundingClientRect(); left = Math.max(left, r.left); right = Math.min(right, r.right);
        }
        parent = parent.parentElement;
      }
      return { column: day.closest("td")?.cellIndex, left: rect.left, right: rect.right, clipLeft: left, clipRight: right,
        height: rect.height, cellHeight: day.closest("td")?.getBoundingClientRect().height,
        outline: { style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset, extent: outlineExtent }, markup: day.outerHTML, ancestors };
      });
    };
    const focused = [];
    // Both scroll directions must reveal the full focused day. End on the last
    // column to prove the later-column date can still be selected.
    for (const [index, targetColumn] of [6, 0, 6].entries()) {
      for (let step = 0; step < 7; step++) {
        const column = await f.page.evaluate(() => document.activeElement?.closest("td")?.cellIndex);
        if (column === targetColumn) break;
        await f.page.keyboard.press(targetColumn === 6 ? "ArrowRight" : "ArrowLeft");
      }
      const geometry = await focusGeometry(); focused.push(geometry);
      await settingsEvidence(f.page, `calendar-keyboard-focus-${index}`, geometry);
      assert.equal(geometry.column, targetColumn, "Keyboard reaches the requested weekday column");
      if (geometry.left < geometry.clipLeft - 1 || geometry.right > geometry.clipRight + 1)
        failures.push(`Column ${targetColumn}: focused day ${geometry.left}..${geometry.right} clipped by ${geometry.clipLeft}..${geometry.clipRight}`);
      if (geometry.left - geometry.outline.extent < geometry.clipLeft - 1 || geometry.right + geometry.outline.extent > geometry.clipRight + 1)
        failures.push(`Column ${targetColumn}: ${geometry.outline.extent}px outer focus paint clips at the local grid viewport`);
      if (geometry.outline.style === "none" || parseFloat(geometry.outline.width) < 2)
        failures.push(`Column ${targetColumn}: keyboard navigation loses its visible 2px focus outline`);
      if (geometry.cellHeight === undefined || geometry.cellHeight < geometry.height - 1)
        failures.push(`Column ${targetColumn}: ${geometry.height}px day target exceeds ${geometry.cellHeight}px cell height`);
      for (const ancestor of geometry.ancestors.filter(node => node.gridViewport)) {
        if (ancestor.scrollTop > 1 || ancestor.scrollHeight > ancestor.clientHeight + 1)
          failures.push(`Column ${targetColumn}: day grid unexpectedly scrolls vertically (${ancestor.scrollTop}px / ${ancestor.clientHeight}px / ${ancestor.scrollHeight}px)`);
      }
    }
    await f.page.keyboard.press("Enter"); await settle(f.page);
    const selection = await calendar.locator('[data-calendar-day][data-selected]').getAttribute("data-value");
    assert.ok(selection, "Keyboard can select a date in a later column");
    assert.match(await calendar.getByRole("status").innerText(), new RegExp(selection!));
    await settingsEvidence(f.page, "calendar-keyboard-selection", { selection, focused });
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

test("enlarged Calendar keeps month navigation readable while only the day grid pans", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture(), failures: string[] = [];
  try {
    await f.page.setViewportSize({ width: 320, height: 844 });
    await (await navigationAction(f.page, "Travel kit")).click();
    await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
    const calendar = f.page.locator('[data-control="date"]');
    await calendar.locator("[data-calendar-header]").scrollIntoViewIfNeeded(); await settle(f.page);
    const measureHeader = () => calendar.evaluate(root => {
      const nodes = [...root.querySelectorAll("[data-calendar-header], [data-calendar-prev-button], [data-calendar-next-button]")];
      return nodes.map(node => {
        const rect = node.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(node);
        const text = range.getBoundingClientRect();
        let clipLeft = 0, clipRight = innerWidth, parent = node.parentElement;
        while (parent) {
          if (["auto", "scroll", "hidden", "clip"].includes(getComputedStyle(parent).overflowX)) {
            const r = parent.getBoundingClientRect(); clipLeft = Math.max(clipLeft, r.left); clipRight = Math.min(clipRight, r.right);
          }
          parent = parent.parentElement;
        }
        return { label: node.getAttribute("aria-label") ?? node.textContent?.trim(),
          heading: node.hasAttribute("data-calendar-header"), left: rect.left, right: rect.right,
          textLeft: text.left, textRight: text.right, clipLeft, clipRight };
      });
    });
    const before = await measureHeader();
    await calendar.locator("[data-calendar-day]:not([data-outside-month])").first().focus();
    for (let index = 0; index < 7; index++) {
      const column = await f.page.evaluate(() => document.activeElement?.closest("td")?.cellIndex);
      if (column === 6) break;
      await f.page.keyboard.press("ArrowRight");
    }
    await settle(f.page);
    await f.page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const after = await measureHeader();
    const scrollers = await calendar.evaluate(root => [...root.querySelectorAll("*")]
      .filter(node => ["auto", "scroll"].includes(getComputedStyle(node).overflowX) && node.scrollWidth > node.clientWidth + 1)
      .map(node => ({ left: node.scrollLeft, viewport: node.clientWidth, content: node.scrollWidth })));
    await settingsEvidence(f.page, "calendar-fixed-header", { before, after, scrollers });
    assert.equal(before.length, 3, "Month label and both month navigation controls exist");
    assert.ok(scrollers.some(node => node.left > 0), "The enlarged grid actually pans to reveal its final column");
    for (const [phase, nodes] of [["before", before], ["after", after]] as const) {
      for (const node of nodes) {
        if (node.left < node.clipLeft - 1 || node.right > node.clipRight + 1 ||
            (node.heading && (node.textLeft < node.clipLeft - 1 || node.textRight > node.clipRight + 1)))
          failures.push(`${phase}: ${node.label} is clipped by the local viewport`);
      }
    }
    for (let index = 0; index < before.length; index++) {
      if (Math.abs(before[index]!.left - after[index]!.left) > 1 || Math.abs(before[index]!.right - after[index]!.right) > 1)
        failures.push(`${before[index]!.label} moves horizontally with the day grid`);
    }
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

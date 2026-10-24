import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { activePanel, browserFixture, panelToolbar, settleMotion, waitForNote } from "./fixture.ts";

test("reading docks on wide screens, adapts to a transient and preserves paragraphs and navigation", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.setViewportSize({ width: 1600, height: 1000 });
    const text = "An idea needs room to breathe. A quiet interface lets the words carry the meaning.\n\nKeep the important things close. Let everything else wait until it is needed.\n\nThis is the complete text, not a summary.";
    for (const title of ["A quiet place to think", "Make room for the next idea"]) {
      const run = await f.session.begin("create-note");
      const prepared = await f.session.prepare(run.id, { title, body: text });
      await f.session.accept(prepared.id, prepared.confirmationDigest);
    }
    await f.page.reload();
    const first = f.page.getByRole("button", { name: /A quiet place to think/ });
    const alignment = await first.evaluate(button => {
      const bounds = button.getBoundingClientRect();
      const title = button.querySelector(".row-label")!.getBoundingClientRect();
      const metadata = button.querySelector(".row-metadata")!.getBoundingClientRect();
      return { titleInset: title.left - bounds.left, metadataInset: metadata.left - bounds.left };
    });
    assert.ok(alignment.titleInset >= 12 && alignment.titleInset <= 24, "collection title aligns to its leading content inset");
    assert.ok(Math.abs(alignment.titleInset - alignment.metadataInset) <= 1, "metadata shares the title's leading edge");
    await first.click();
    const reading = activePanel(f.page);
    await waitForNote(f.page, "A quiet place to think");
    await reading.getByText(text, { exact: true }).waitFor();
    assert.equal(await f.page.getByRole("dialog").count(), 0, "ordinary reading must not trap the collection behind a modal");
    const prose = reading.locator('[data-reading="multiline"]');
    const metrics = await prose.evaluate(element => {
      const style = getComputedStyle(element);
      return { align: style.textAlign, size: parseFloat(style.fontSize), line: parseFloat(style.lineHeight), width: element.getBoundingClientRect().width };
    });
    assert.equal(metrics.align, "start");
    assert.ok(metrics.size >= 16 && metrics.line >= metrics.size * 1.45);
    assert.ok(metrics.width >= 400, "desktop prose uses available reading width");
    assert.equal(await reading.locator('[data-toolbar-title]').getByText("A quiet place to think", { exact: true }).count(), 1);
    assert.equal(await reading.locator('[data-surface-slot="content"]').getByText("A quiet place to think", { exact: true }).count(), 0,
      "published title belongs only to the toolbar, never a repeated metadata row");
    await f.page.getByRole("button", { name: /Make room for the next idea/ }).click();
    await waitForNote(f.page, "Make room for the next idea");
    assert.equal(await reading.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), true,
      "selecting another object from the main collection enters its retained reading surface");
    mkdirSync("artifacts/reading-workspace", { recursive: true });
    await settleMotion(f.page);
    await f.page.screenshot({ path: "artifacts/reading-workspace/desktop.png", fullPage: true });
    await f.page.setViewportSize({ width: 390, height: 844 });
    await reading.and(f.page.getByRole("dialog")).waitFor();
    await settleMotion(f.page);
    assert.equal(await first.evaluate(button => Boolean(button.closest('[inert]'))), true,
      "compact transient makes the underlying collection inert until dismissal");
    await first.evaluate(button => (button as HTMLElement).focus());
    assert.equal(await first.evaluate(button => button === document.activeElement), false,
      "an inert collection cannot receive keyboard focus");
    const accessibility = await f.context.newCDPSession(f.page);
    const tree = await accessibility.send("Accessibility.getFullAXTree");
    assert.equal(tree.nodes.some(node => !node.ignored && node.role?.value === "button"
      && node.name?.value.includes("A quiet place to think")), false,
      "the browser accessibility tree excludes the underlying collection");
    await accessibility.detach();
    assert.equal(await prose.isVisible(), true);
    const rect = await prose.boundingBox();
    assert.ok(rect && rect.width >= 300 && rect.x >= 0 && rect.x + rect.width <= 390);
    await f.page.screenshot({ path: "artifacts/reading-workspace/mobile.png", fullPage: true });
    await panelToolbar(f.page, "top").getByRole("button", { name: "Close", exact: true }).click();
    await reading.waitFor({ state: "hidden" });
    assert.equal(await first.isVisible(), true);
    await f.page.getByRole("button", { name: /A quiet place to think/ }).press("Enter");
    await waitForNote(f.page, "A quiet place to think");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

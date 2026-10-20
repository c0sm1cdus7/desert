import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { browserFixture, settleMotion } from "./fixture.ts";

test("reading is nonmodal, preserves paragraphs and allows direct navigation between records", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
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
      const title = button.querySelector("strong")!.getBoundingClientRect();
      const metadata = button.querySelector("[data-record-metadata]")!.getBoundingClientRect();
      return { titleInset: title.left - bounds.left, metadataInset: metadata.left - bounds.left };
    });
    assert.ok(alignment.titleInset >= 12 && alignment.titleInset <= 24, "collection title aligns to its leading content inset");
    assert.ok(Math.abs(alignment.titleInset - alignment.metadataInset) <= 1, "metadata shares the title's leading edge");
    await first.click();
    const reading = f.page.getByRole("region", { name: "Object context", exact: true });
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
    assert.equal(await reading.getByText("A quiet place to think", { exact: true }).count(), 1, "title is not repeated as a metadata row");
    await f.page.getByRole("button", { name: /Make room for the next idea/ }).click();
    await reading.getByRole("heading", { name: "Make room for the next idea", exact: true }).waitFor();
    mkdirSync("artifacts/reading-workspace", { recursive: true });
    await settleMotion(f.page);
    await f.page.screenshot({ path: "artifacts/reading-workspace/desktop.png", fullPage: true });
    await f.page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await f.page.locator('[data-collection-pane]').isVisible(), false);
    assert.equal(await prose.isVisible(), true);
    const rect = await prose.boundingBox();
    assert.ok(rect && rect.width >= 300 && rect.x >= 0 && rect.x + rect.width <= 390);
    await f.page.screenshot({ path: "artifacts/reading-workspace/mobile.png", fullPage: true });
    await reading.getByRole("button", { name: "Back", exact: true }).click();
    assert.equal(await f.page.locator('[data-collection-pane]').isVisible(), true);
    await f.page.getByRole("button", { name: /A quiet place to think/ }).press("Enter");
    await reading.getByRole("heading", { name: "A quiet place to think", exact: true }).waitFor();
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { activePanel, settleMotion, waitForNote } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

test("floating labels, required indicators and text scaling preserve the draft", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    const title = f.page.getByRole("textbox", { name: "Title", exact: true });
    const body = f.page.getByRole("textbox", { name: "Content", exact: true });
    const field = f.page.getByRole("dialog").locator('[data-primitive="input.text"]');
    const label = field.locator("label");
    await body.focus();
    const resting = await label.boundingBox();
    const restingSize = await label.evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    await title.focus();
    const floating = await label.boundingBox();
    assert.ok(floating!.y < resting!.y - 3, "empty label must float on focus");
    assert.ok(await label.evaluate(node => parseFloat(getComputedStyle(node).fontSize)) < restingSize,
      "floating label has smaller type without collapsing its reserved line height");
    await title.fill("A quiet place");
    await body.focus();
    assert.equal((await label.boundingBox())!.y, floating!.y, "filled label remains floated");
    const colors = await field.evaluate(node => ({
      star: getComputedStyle(node.querySelector(".required")!).color,
      label: getComputedStyle(node.querySelector("label")!).color,
    }));
    assert.notEqual(colors.star, colors.label);
    assert.equal(await title.getAttribute("aria-required"), "true");
    const before = await title.evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "1.3"));
    const after = await title.evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    assert.ok(Math.abs(after / before - 1.3) < .01, "field follows shared text scale");
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.emulateMedia({ colorScheme: "dark" });
    assert.equal(await title.inputValue(), "A quiet place");
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true,
      JSON.stringify(await f.page.evaluate(() => [...document.querySelectorAll("body *")]
        .filter(node => node.getBoundingClientRect().right > innerWidth + 1)
        .map(node => ({ tag: node.tagName, class: node.className })).slice(0, 12))));
    await body.fill("A draft that stays with you.");
    await settleMotion(f.page);
    await mkdir("artifacts/notebook-approved-bank", { recursive: true });
    await f.page.screenshot({ path: "artifacts/notebook-approved-bank/form-mobile.png" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("reading facts remain exposed with aligned prose and published toolbar commands", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("A quiet place");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("A draft that stays with you.\nA second line.");
    await activePanel(f.page).getByRole("button", { name: "Create note", exact: true }).click();
    const context = activePanel(f.page);
    await waitForNote(f.page, "A quiet place");
    assert.equal(await context.locator('[data-toolbar-title]').getByText("A quiet place", { exact: true }).isVisible(), true);
    const facts = context.locator('.fact-row');
    const prose = context.locator('.fact-row[data-multiline="true"]').first();
    const label = prose.locator(".fact-label"), value = prose.locator(".fact-value");
    assert.ok(await facts.count() > 0, "the reading context has authored facts");
    assert.equal(await context.getByRole("button", { name: "Details", exact: true }).count(), 0,
      "metadata is reading content, not a disclosure");
    for (const width of [1280, 390]) {
      await f.page.setViewportSize({ width, height: 900 });
      for (const fact of await facts.all()) assert.equal(await fact.isVisible(), true);
      const a = (await label.boundingBox())!, b = (await value.boundingBox())!;
      assert.ok(Math.abs(a.x - b.x) < 1, "reading prose shares its visible label lane");
      assert.equal(await value.textContent(), "A draft that stays with you.\nA second line.",
        "exposing the content preserves the complete multiline value");
    }
    const actions = context.locator('[data-surface-slot="top"]');
    const destination = actions.getByRole("button", { name: "Archive note", exact: true });
    assert.equal(await destination.count(), 1, "the published command is an icon action in the object's toolbar");
    assert.equal(await destination.locator('svg').count(), 1);
    assert.equal(await destination.getAttribute("data-button-face"), "icon");
    assert.equal(await destination.isVisible(), true);
    assert.equal(await context.locator('[data-surface-slot="bottom"]').count(), 0);
    assert.equal(await f.page.getByRole("dialog").count(), 1, "compact reading adapts the same view into a transient");
    const back = context.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true });
    await back.scrollIntoViewIfNeeded();
    const button = (await back.boundingBox())!;
    assert.ok(button.width >= 44 && button.height >= 44, "reading navigation retains a reachable touch target");
    await f.page.setViewportSize({ width: 1600, height: 900 });
    await f.page.emulateMedia({ colorScheme: "dark" });
    await settleMotion(f.page);
    await mkdir("artifacts/notebook-approved-bank", { recursive: true });
    await f.page.screenshot({ path: "artifacts/notebook-approved-bank/context-desktop.png" });
    await destination.focus();
    await f.page.keyboard.press("Enter");
    await activePanel(f.page).locator('[data-toolbar-title]').getByText("Review · Archive note", { exact: true }).waitFor();
    await f.page.getByRole("button", { name: "Archive note", exact: true }).last().and(f.page.locator(':enabled')).waitFor();
    const notes = await f.session.read((await f.session.begin("read-note")).id);
    assert.equal(notes[0]!.facts.state, "active", "opening the destination must not archive the note");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

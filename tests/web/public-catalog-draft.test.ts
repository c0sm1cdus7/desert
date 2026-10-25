import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, evidence, navigationAction, readOnlyRequests, selectionTrigger, settle } from "./public-catalog-expectations.ts";
import { observeDiagnostics } from "./public-catalog-diagnostics.ts";

// Supersedes v4's staged Confirm contract at the user's explicit request.
test("Destination commits directly; Escape preserves the selected local draft", async () => {
  const fixture = await publicCatalogFixture();
  const { page } = fixture, diagnostics = observeDiagnostics(page), readonly = readOnlyRequests(page);
  try {
    await page.reload();
    await (await navigationAction(page, "Travel kit")).click();
    const trigger = selectionTrigger(page, "Destination"), dialog = page.getByRole("listbox");
    assert.match(await trigger.innerText(), /Not selected/);
    await trigger.click();
    await settle(page);
    await evidence(page, "draft-destination-open", { diagnostics: diagnostics.snapshot(), approval: "pending" });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /Not selected/, "Dismissing without selecting preserves the value");
    assert.ok(await trigger.evaluate(element => element === document.activeElement));
    await trigger.press("Enter");
    await dialog.getByRole("option", { name: "Mount Fuji", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /Mount Fuji/);
    await trigger.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.match(await trigger.innerText(), /Mount Fuji/, "Escape does not commit a highlighted option");
    assert.ok(await trigger.evaluate(element => element === document.activeElement));
    assert.equal(await page.getByRole("status").filter({ hasText: /^(Saved|Accepted|Completed)$/i }).count(), 0);
    await page.setViewportSize({ width: 1280, height: 800 });
    await trigger.click();
    await dialog.waitFor();
    await settle(page);
    await evidence(page, "draft-destination-wide", { viewport: page.viewportSize(), diagnostics: diagnostics.snapshot(), approval: "pending" });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    readonly(); diagnostics.assertClean();
  } finally { try { await evidence(page, "draft-selection", diagnostics.snapshot()); } finally { await fixture.close(); } }
});

test("Travel kit preserves local writing, selected destination and arrival day across navigation", async () => {
  const fixture = await publicCatalogFixture();
  const { page } = fixture, diagnostics = observeDiagnostics(page), readonly = readOnlyRequests(page);
  try {
    await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
    await page.reload();
    await (await navigationAction(page, "Travel kit")).click();
    await page.getByRole("textbox", { name: "Trip name", exact: true }).fill("Quiet mountain weekend");
    await page.getByRole("textbox", { name: "Things to remember", exact: true }).fill("Bring the camera");
    await selectionTrigger(page, "Destination").click();
    const dialog = page.getByRole("listbox");
    await dialog.getByRole("option", { name: "Mount Fuji", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    const calendar = page.locator('[data-control="date"]');
    await calendar.getByRole("button", { name: /October 16, 2026/ }).click();
    assert.match(await calendar.getByRole("status").innerText(), /2026-10-16/);
    await (await navigationAction(page, "Landmarks")).click();
    await action(page, "Learn More").click();
    await action(page, "Back").click();
    await (await navigationAction(page, "Travel kit")).click();
    assert.equal(await page.getByRole("textbox", { name: "Trip name", exact: true }).inputValue(), "Quiet mountain weekend");
    assert.equal(await page.getByRole("textbox", { name: "Things to remember", exact: true }).inputValue(), "Bring the camera");
    assert.match(await selectionTrigger(page, "Destination").innerText(), /Mount Fuji/);
    assert.match(await calendar.getByRole("status").innerText(), /2026-10-16/);
    assert.match(await page.getByRole("main").innerText(), /nothing is booked, uploaded or saved to an account/i);
    readonly(); diagnostics.assertClean();
  } finally { try { await evidence(page, "draft-navigation-retention", diagnostics.snapshot()); } finally { await fixture.close(); } }
});

test("About this draft remains inline through Escape, editing and navigation", async () => {
  const fixture = await publicCatalogFixture();
  const { page } = fixture, diagnostics = observeDiagnostics(page), readonly = readOnlyRequests(page);
  try {
    await page.reload();
    await (await navigationAction(page, "Travel kit")).click();
    const draft = page.locator('[data-place-content] [data-view-item="draft"]');
    const copy = draft.getByText("Nothing is booked, uploaded or saved to an account. Closing or reloading this tab discards the draft and local file references.", { exact: true });
    const assertReadingContent = async () => {
      assert.equal(await draft.getByRole("heading", { name: "About this draft", exact: true }).isVisible(), true);
      assert.equal(await draft.getByText("Only in this tab", { exact: true }).isVisible(), true);
      assert.equal(await copy.isVisible(), true);
      assert.equal(await draft.locator('button, input, textarea, select, [role="button"], [role="dialog"], [aria-expanded], details, summary, [data-stack-kind="disclosure"], [data-slot^="collapsible"], [data-slot^="accordion"]').count(), 0,
        "Draft lifetime is permanent reading content, not an expandable control or popup");
      assert.equal(await page.getByRole("dialog", { name: "Only in this tab", exact: true }).count(), 0);
    };
    await draft.scrollIntoViewIfNeeded();
    await settle(page);
    await assertReadingContent();
    const geometry = await draft.evaluate(element => {
      const frame = element.getBoundingClientRect();
      return { top: frame.top, bottom: frame.bottom, width: frame.width, height: frame.height };
    });
    await evidence(page, "draft-inline-reading", { geometry, diagnostics: diagnostics.snapshot(), approval: "pending" });
    assert.ok(geometry.height > 32 && geometry.top >= -1 && geometry.bottom <= page.viewportSize()!.height + 1,
      "Inline lifetime information is readable within the viewport after scrolling to its Stack");
    await page.keyboard.press("Escape");
    await settle(page);
    await assertReadingContent();
    const writing = page.getByRole("textbox", { name: "Trip name", exact: true });
    await writing.fill("A directly readable draft");
    await assertReadingContent();
    await (await navigationAction(page, "Landmarks")).click();
    await (await navigationAction(page, "Travel kit")).click();
    await settle(page);
    assert.equal(await writing.inputValue(), "A directly readable draft");
    await draft.scrollIntoViewIfNeeded();
    await assertReadingContent();
    readonly(); diagnostics.assertClean();
  } finally { try { await evidence(page, "draft-inline-retention", diagnostics.snapshot()); } finally { await fixture.close(); } }
});

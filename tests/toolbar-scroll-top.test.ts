import test from "node:test";
import assert from "node:assert/strict";
import { toolbarScrollFixture, scrollDown, clickFreeToolbarRegion } from "./fixtures/toolbar-scroll-top.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

for (const target of ["title", "free space"] as const) {
  test(`top toolbar ${target} returns only its associated content to the beginning`, async () => {
    const f = await toolbarScrollFixture();
    try {
      await scrollDown(f.viewport);
      await scrollDown(f.otherViewport, 450);
      assert.ok(await f.viewport.evaluate(element => element.scrollTop) > 0);
      const cursor = await f.toolbar.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return getComputedStyle(document.elementFromPoint(bounds.left + 2, bounds.top + 2)!).cursor;
      });
      assert.equal(cursor, "pointer", "the clickable toolbar area advertises its action");
      if (target === "title") await f.toolbar.getByRole("heading", { name: "Reading pane", exact: true }).click();
      else await clickFreeToolbarRegion(f.toolbar);
      await f.page.waitForFunction(() => document.querySelector('[data-test-pane="0"] [data-surface-slot="content"]')!.scrollTop === 0);
      assert.deepEqual(await f.scrollCalls(), [[{ top: 0, behavior: "smooth" }]]);
      assert.equal(await f.otherViewport.evaluate(element => element.scrollTop), 450);
      assert.deepEqual(await f.scrollCalls(f.otherViewport), []);
      assert.equal(await f.page.getByRole("status", { name: "Invoked actions" }).textContent(), "");
      assert.equal(await f.page.evaluate(() => scrollY), 0);
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}

test("toolbar actions retain their own invocation and never trigger return to top", async () => {
  const f = await toolbarScrollFixture();
  try {
    await scrollDown(f.viewport);
    for (const name of ["Close pane", "Utility", "Confirm"]) {
      await f.pane.getByRole("button", { name, exact: true }).click();
      assert.equal(await f.viewport.evaluate(element => element.scrollTop), 600, `${name} does not scroll`);
    }
    await f.toolbar.getByRole("button", { name: "Unavailable utility", exact: true }).click({ force: true });
    assert.deepEqual(await f.scrollCalls(), []);
    assert.deepEqual((await f.page.getByRole("status", { name: "Invoked actions" }).textContent())!.split("|").map(value => JSON.parse(value)),
      [{ kind: "close" }, { kind: "journey", journey: "utility" }, { kind: "accept" }]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

for (const key of ["Enter", "Space"]) {
  test(`the toolbar return-to-top action supports ${key} without losing heading semantics`, async () => {
    const f = await toolbarScrollFixture();
    try {
      await scrollDown(f.viewport);
      const action = f.toolbar.getByRole("button", { name: "Back to top", exact: true });
      await action.focus();
      const original = await action.elementHandle();
      assert.equal(await f.toolbar.getByRole("heading", { name: "Reading pane", exact: true }).isVisible(), true);
      await action.press(key);
      await f.page.waitForFunction(() => document.querySelector('[data-test-pane="0"] [data-surface-slot="content"]')!.scrollTop === 0);
      assert.deepEqual(await f.scrollCalls(), [[{ top: 0, behavior: "smooth" }]]);
      assert.equal(await action.evaluate((element, initial) => element === initial && document.activeElement === element, original), true,
        "the same keyboard target retains focus after reaching the top");
      await action.press(key);
      assert.deepEqual(await f.scrollCalls(), [[{ top: 0, behavior: "smooth" }]], "activation at the top is a no-op");
      await f.page.keyboard.press("Tab");
      assert.equal(await f.toolbar.getByRole("button", { name: "Close pane", exact: true })
        .evaluate(element => element === document.activeElement), true, "Tab continues to the next toolbar action");
      assert.equal(await action.count(), 0, "the idle shortcut leaves the tab order after focus moves on");
      assert.equal(await f.page.getByRole("status", { name: "Invoked actions" }).textContent(), "");
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}

test("reduced motion returns to top without animated scrolling", async () => {
  const f = await toolbarScrollFixture("reduce");
  try {
    await scrollDown(f.viewport);
    await f.toolbar.getByRole("heading", { name: "Reading pane", exact: true }).click();
    assert.deepEqual(await f.scrollCalls(), [[{ top: 0, behavior: "auto" }]]);
    assert.equal(await f.viewport.evaluate(element => element.scrollTop), 0);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("clicking the toolbar at the beginning is a no-op", async () => {
  const f = await toolbarScrollFixture();
  try {
    await f.toolbar.getByRole("heading", { name: "Reading pane", exact: true }).click();
    await clickFreeToolbarRegion(f.toolbar);
    assert.equal(await f.viewport.evaluate(element => element.scrollTop), 0);
    assert.deepEqual(await f.scrollCalls(), []);
    assert.equal(await f.page.getByRole("status", { name: "Invoked actions" }).textContent(), "");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a toolbar drag does not become a return-to-top click", async () => {
  const f = await toolbarScrollFixture();
  try {
    await scrollDown(f.viewport);
    const title = await f.toolbar.getByRole("heading", { name: "Reading pane", exact: true }).boundingBox();
    assert.ok(title);
    const x = title.x + title.width / 2, y = title.y + title.height / 2;
    await f.page.mouse.move(x, y);
    await f.page.mouse.down();
    await f.page.mouse.move(x + 24, y, { steps: 3 });
    await f.page.mouse.up();
    assert.deepEqual(await f.scrollCalls(), []);
    assert.equal(await f.viewport.evaluate(element => element.scrollTop), 600);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("an inert content viewport cannot be returned to top through its toolbar", async () => {
  const f = await toolbarScrollFixture();
  try {
    await scrollDown(f.viewport);
    await f.viewport.evaluate(element => { (element as HTMLElement).inert = true; });
    await f.toolbar.getByRole("heading", { name: "Reading pane", exact: true }).click();
    assert.deepEqual(await f.scrollCalls(), []);
    assert.equal(await f.viewport.evaluate(element => element.scrollTop), 600);
    assert.equal(await f.toolbar.getByRole("button", { name: "Back to top", exact: true }).count(), 0);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

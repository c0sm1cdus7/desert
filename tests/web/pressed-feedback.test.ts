import assert from "node:assert/strict";
import test from "node:test";
import type { Locator } from "playwright";
import { settleMotion } from "./fixture.ts";
import { appearance, cases, catalog, evidence, finishTarget, target } from "./press-fixture.ts";
import { openCatalog } from "./inspection-fixture.ts";

for (const theme of ["light", "dark"] as const) for (const input of ["pointer", "Space", "Enter"] as const) {
  test(`${theme} ${input} held: common feedback preserves every container and separator`, { timeout: 30000 }, async () => {
    const f = await catalog();
    try {
      await f.page.emulateMedia({ colorScheme: theme }); await settleMotion(f.page);
      assert.equal(await f.page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), theme);
      let commonOverlay: string | undefined;
      for (const name of cases) {
        const button = await target(f.page, name);
        await button.scrollIntoViewIfNeeded();
        if (input !== "pointer") { await f.page.keyboard.press("Tab"); await button.focus(); }
        else await button.hover();
        await settleMotion(f.page);
        const before = await appearance(button);
        if (input === "pointer") await f.page.mouse.down(); else await f.page.keyboard.down(input);
        try {
          await settleMotion(f.page);
          const pressed = await appearance(button);
          if (theme === "dark" && input === "pointer" && name === "middle-row") {
            const close = f.page.getByRole("button", { name: "Create note", exact: true });
            const closeBox = (await close.boundingBox())!;
            assert.ok(closeBox.y >= 0 && closeBox.y + closeBox.height <= f.page.viewportSize()!.height);
            assert.equal((await appearance(close)).contentScale, 1, "the visible comparison control stays unpressed");
          }
          await evidence(f.page, `pressed-${theme}-${input}-${name}`, { before, pressed });
          assert.equal(pressed.transform, "none", "interactive container must not scale");
          assert.ok(pressed.contentScale !== null && Math.abs(pressed.contentScale - .96) < .001,
            "only the shared content layer compresses using the canonical scale");
          for (const dimension of ["x", "y", "width", "height"] as const)
            assert.ok(Math.abs(before.box[dimension] - pressed.box[dimension]) <= .1, `${name}: fixed ${dimension}`);
          assert.equal(pressed.topBorder, before.topBorder); assert.equal(pressed.bottomBorder, before.bottomBorder);
          assert.equal(pressed.background, before.background, "pressed overlay preserves the semantic base surface");
          assert.equal(pressed.color, before.color, "primary/destructive/neutral foreground semantics do not change");
          assert.notEqual(pressed.overlay, before.overlay, "held state has its own surface feedback");
          if (name !== "primary") {
            commonOverlay ??= pressed.overlay;
            assert.equal(pressed.overlay, commonOverlay, "neutral rows do not acquire arbitrary primary tint");
          }
          assert.equal(pressed.focus, input !== "pointer", "keyboard focus and pointer pressed state remain distinct");
        } finally {
          if (input === "pointer") await f.page.mouse.up(); else await f.page.keyboard.up(input);
        }
        await settleMotion(f.page);
        assert.equal((await appearance(button)).contentScale, 1, "release restores the content layer");
        await finishTarget(f.page);
      }
    } finally { await f.close(); }
  });
}

test("reduced motion keeps press feedback but removes content compression", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    for (const name of cases) {
      const button = await target(f.page, name);
      await button.scrollIntoViewIfNeeded(); await button.hover();
      const before = await appearance(button);
      await f.page.mouse.down();
      try {
        const pressed = await appearance(button);
        await evidence(f.page, `pressed-reduced-${name}`, { before, pressed });
        assert.equal(pressed.transform, "none"); assert.equal(pressed.contentScale, 1);
        assert.notEqual(pressed.overlay, before.overlay, "non-motion press feedback remains available");
      } finally { await f.page.mouse.up(); }
      await finishTarget(f.page);
    }
  } finally { await f.close(); }
});

test("select and calendar compose the same feedback without changing native selection semantics", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    await openCatalog(f.page);
    const date = f.page.locator('[data-date-trigger]');
    await date.click();
    const calendar = f.page.getByRole("dialog", { name: "Date", exact: true });
    const press = async (button: Locator, key: "pointer" | "Space" | "Enter", name: string) => {
      await button.scrollIntoViewIfNeeded();
      if (key === "pointer") await button.hover(); else await button.focus();
      await settleMotion(f.page);
      const before = await appearance(button);
      if (key === "pointer") await f.page.mouse.down(); else await f.page.keyboard.down(key);
      try {
        await settleMotion(f.page);
        const pressed = await appearance(button);
        await evidence(f.page, `pressed-composed-${name}`, { before, pressed });
        assert.equal(pressed.transform, "none");
        assert.ok(pressed.contentScale !== null && Math.abs(pressed.contentScale - .96) < .001);
        for (const dimension of ["x", "y", "width", "height"] as const)
          assert.ok(Math.abs(before.box[dimension] - pressed.box[dimension]) <= .1);
      } finally {
        if (key === "pointer") await f.page.mouse.up(); else await f.page.keyboard.up(key);
      }
      await settleMotion(f.page);
    };
    await press(calendar.getByRole("button", { name: "Next month", exact: true }), "pointer", "calendar-next");
    await press(calendar.getByRole("button", { name: "Previous month", exact: true }), "Space", "calendar-previous");
    for (const [day, key] of [[16, "Space"], [17, "Enter"]] as const) {
      if (!await calendar.isVisible()) await date.click();
      const dayButton = calendar.getByRole("button", { name: new RegExp(`October ${day}, 2026`) });
      await dayButton.focus();
      // Bits commits the date on key-down and closes its surface immediately.
      // A retained held-state screenshot would invent a different interaction.
      await f.page.keyboard.down(key);
      await f.page.keyboard.up(key);
      await calendar.waitFor({ state: "hidden" });
      assert.equal((await date.locator('[data-field-value]').innerText()).trim(), `Oct ${day}, 2026`,
        "native key-up must not double-toggle the date selected by Bits key-down");
    }
    const select = f.page.locator('[data-specimen="control.select:available"] [data-selection-trigger]');
    await press(select, "pointer", "select");
    await f.page.getByRole("listbox").getByRole("option", { name: "Second option", exact: true }).click();
    await f.page.getByRole("listbox").waitFor({ state: "hidden" });
    assert.equal(await select.locator('[data-field-value]').innerText(), "Second option");
  } finally { await f.close(); }
});

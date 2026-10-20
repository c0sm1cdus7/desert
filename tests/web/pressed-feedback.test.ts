import assert from "node:assert/strict";
import test from "node:test";
import type { Locator } from "playwright";
import { settleMotion } from "./fixture.ts";
import { appearance, cases, catalog, evidence, target } from "./press-fixture.ts";

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
            const close = f.page.getByRole("dialog").locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true });
            const closeBox = (await close.boundingBox())!;
            assert.ok(closeBox.y >= 0 && closeBox.y + closeBox.height <= f.page.viewportSize()!.height);
            assert.equal((await appearance(close)).contentScale, 1, "the visible comparison control stays unpressed");
          }
          await evidence(f.page, `pressed-${theme}-${input}-${name}`, { before, pressed });
          assert.equal(pressed.transform, "none", "interactive container must not scale");
          assert.ok(pressed.contentScale !== null && Math.abs(pressed.contentScale - .985) < .001,
            "only the shared content layer compresses using the canonical scale");
          for (const dimension of ["x", "y", "width", "height"] as const)
            assert.ok(Math.abs(before.box[dimension] - pressed.box[dimension]) <= .1, `${name}: fixed ${dimension}`);
          assert.equal(pressed.topBorder, before.topBorder); assert.equal(pressed.bottomBorder, before.bottomBorder);
          assert.equal(pressed.background, before.background, "pressed overlay preserves the semantic base surface");
          assert.equal(pressed.color, before.color, "primary/destructive/neutral foreground semantics do not change");
          assert.notEqual(pressed.overlay, before.overlay, "held state has its own surface feedback");
          commonOverlay ??= pressed.overlay;
          assert.equal(pressed.overlay, commonOverlay, "neutral rows do not acquire arbitrary primary tint");
          assert.equal(pressed.focus, input !== "pointer", "keyboard focus and pointer pressed state remain distinct");
        } finally {
          if (input === "pointer") await f.page.mouse.up(); else await f.page.keyboard.up(input);
        }
        await settleMotion(f.page);
        assert.equal((await appearance(button)).contentScale, 1, "release restores the content layer");
        if (name !== "primary" && name !== "neutral") {
          await f.page.keyboard.press("Escape"); await f.page.getByRole("dialog").waitFor({ state: "hidden" });
        }
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
      if (name !== "primary" && name !== "neutral") {
        await f.page.keyboard.press("Escape"); await f.page.getByRole("dialog").waitFor({ state: "hidden" });
      }
    }
  } finally { await f.close(); }
});

test("select and calendar compose the same feedback without changing native selection semantics", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    const calendar = f.page.locator('[data-control="date"]');
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
        assert.ok(pressed.contentScale !== null && Math.abs(pressed.contentScale - .985) < .001);
        for (const dimension of ["x", "y", "width", "height"] as const)
          assert.ok(Math.abs(before.box[dimension] - pressed.box[dimension]) <= .1);
      } finally {
        if (key === "pointer") await f.page.mouse.up(); else await f.page.keyboard.up(key);
      }
      await settleMotion(f.page);
    };
    await press(calendar.getByRole("button", { name: "Next", exact: true }), "pointer", "calendar-next");
    await press(calendar.getByRole("button", { name: "Previous", exact: true }), "Space", "calendar-previous");
    for (const [day, key] of [[16, "Space"], [17, "Enter"]] as const) {
      await press(calendar.getByRole("button", { name: new RegExp(`October ${day}, 2026`) }), key, `calendar-day-${key}`);
      assert.equal(await calendar.getByRole("status").textContent(), `2026-10-${day}`,
        "native key-up must not double-toggle the date selected by Bits key-down");
    }
    const select = f.page.getByLabel("Single choice", { exact: true });
    await press(select, "pointer", "select");
    await f.page.getByRole("dialog", { name: "Single choice", exact: true }).getByRole("radio", { name: "Second option", exact: true }).click();
    await f.page.getByRole("dialog", { name: "Single choice", exact: true }).getByRole("button", { name: "Confirm", exact: true }).click();
    assert.equal((await select.textContent())?.trim(), "Second option");
  } finally { await f.close(); }
});

import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { workspaceCss } from "./fixtures/workspace-css.ts";
import { appearanceStorageKey } from "../src/svelte/infra/appearance-preferences.ts";

test("appearance uses shared choices, persists locally and applies to the whole catalog", async () => {
  const browser = await svelteBrowser(`
    <script>
      import Appearance from '@desert/svelte/catalog/compositions/appearance/Appearance.svelte';
      import AppearanceRoot from '@desert/svelte/catalog/foundations/appearance-root/AppearanceRoot.svelte';
    </script>
    <AppearanceRoot /><Appearance />`, {}, "http://desert-appearance.test/");
  try {
    await browser.page.addStyleTag({ content: await workspaceCss() });
    await browser.page.getByRole("radio", { name: "Dark", exact: true }).click();
    assert.equal(await browser.page.locator("html").getAttribute("data-theme"), "dark");
    await browser.page.getByRole("button", { name: "Text size · Default", exact: true }).click();
    await browser.page.getByRole("option", { name: "Larger", exact: true }).click();
    await browser.page.getByRole("option", { name: "Larger", exact: true }).waitFor({ state: "hidden" });
    assert.equal(await browser.page.getByRole("button", { name: "Text size · Larger", exact: true }).getAttribute("data-floating-field"), "true");
    assert.equal(await browser.page.getByRole("button", { name: "Text size · Larger", exact: true }).evaluate(element => element.classList.contains("material-pane")), true,
      "A standard popover trigger must preserve its child's canonical field material");
    assert.equal(await browser.page.getByRole("group", { name: "Text size", exact: true }).count(), 1);
    await browser.page.getByRole("radio", { name: "Rose", exact: true }).click();
    await browser.page.getByRole("radio", { name: "Mist", exact: true }).click();
    assert.equal(await browser.page.locator("html").evaluate(el => getComputedStyle(el).getPropertyValue("--text-scale")), "1.3");
    const saved = await browser.page.evaluate(key => JSON.parse(localStorage.getItem(key)!), appearanceStorageKey);
    assert.deepEqual(saved, { theme: "dark", textSize: "larger", tint: "rose", wallpaper: "mist" });
    assert.equal(await browser.page.locator(".required, input[type=file]").count(), 0);
    assert.equal(await browser.page.getByRole("button", { name: /Choose image/ }).count(), 0);
    assert.equal(await browser.page.getByText("Tint", { exact: true }).count(), 1);
    await browser.page.getByRole("radio", { name: "Light", exact: true }).click();
    assert.equal(await browser.page.locator("html").getAttribute("data-theme"), "light");
    assert.equal(await browser.page.getByRole("radio", { name: "System", exact: true }).count(), 0);
    assert.deepEqual(browser.errors, []);
  } finally { await browser.close(); }
});

test("legacy system follows the effective preview without rewriting storage until an explicit choice", async () => {
  const stored = { theme: "system", textSize: "standard", tint: "rose", wallpaper: "silk" };
  const browser = await svelteBrowser(`
    <script>
      import Appearance from '@desert/svelte/catalog/compositions/appearance/Appearance.svelte';
      import AppearanceRoot from '@desert/svelte/catalog/foundations/appearance-root/AppearanceRoot.svelte';
      localStorage.setItem(${JSON.stringify(appearanceStorageKey)}, ${JSON.stringify(JSON.stringify(stored))});
    </script><AppearanceRoot /><Appearance />`, {}, "http://desert-legacy-appearance.test/");
  try {
    const read = () => browser.page.evaluate(key => JSON.parse(localStorage.getItem(key)!), appearanceStorageKey);
    for (const scheme of ["dark", "light", "dark"] as const) {
      await browser.page.emulateMedia({ colorScheme: scheme });
      await browser.page.waitForFunction(scheme => document.querySelector(`[aria-label="${scheme === "dark" ? "Dark" : "Light"}"]`)?.getAttribute("aria-checked") === "true", scheme);
      assert.equal(await browser.page.locator("html").getAttribute("data-theme"), null);
      assert.deepEqual(await read(), stored);
    }
    await browser.page.getByRole("radio", { name: "Dark", exact: true }).click();
    assert.deepEqual(await read(), { ...stored, theme: "dark" });
    assert.equal(await browser.page.locator("html").getAttribute("data-theme"), "dark");
    assert.deepEqual(browser.errors, []);
  } finally { await browser.close(); }
});

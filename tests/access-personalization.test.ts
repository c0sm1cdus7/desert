import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { appearancePreferences } from "../src/svelte/infra/appearance-preferences.ts";
import { accessInput } from "../src/identity/contract.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

test("personalization admits only system wallpapers and finite tints", () => {
  const preference = { theme: "dark", textSize: "large", tint: "rose", wallpaper: "silk" };
  assert.deepEqual(appearancePreferences(preference), preference);
  for (const wallpaper of ["photo", "data:image/png;base64,AA", "https://example.com/image.jpg"])
    assert.equal(appearancePreferences({ ...preference, wallpaper }), null);
  assert.equal(appearancePreferences({ ...preference, tint: "#ff0000" }), null);
  assert.equal(appearancePreferences({ ...preference, image: "photo.png" }), null);
});

test("identity initialization admits a bounded seed, never avatar markup or URLs", () => {
  const identity = { login: "new-owner", displayName: "New owner", password: "a test password only", avatarSeed: "0011223344556677" };
  assert.deepEqual(accessInput("initialize", identity), identity);
  for (const avatarSeed of ["", "<svg>", "https://example.com/me.png"])
    assert.throws(() => accessInput("initialize", { ...identity, avatarSeed }), /INVALID_ACCESS_REQUEST/);
});

test("onboarding is two steps with one password, seeded avatar and a text-only final action", { timeout: 180000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import AccessForm from '@desert/svelte/catalog/compositions/access-form/AccessForm.svelte';
    let submitted = $state('');
  </script><AccessForm mode="initialize" onsubmit={async input => { submitted = JSON.stringify(input); }}/><output>{submitted}</output>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.getByLabel("Display name", { exact: true }).fill("New owner");
    await f.page.getByLabel("Identity name", { exact: true }).fill("new-owner");
    await f.page.getByLabel("Password", { exact: true }).fill("a test password only");
    assert.equal(await f.page.locator('input[type="password"]').count(), 1);
    await f.page.getByRole("button", { name: "Shuffle avatar", exact: true }).click();
    await f.page.getByRole("button", { name: "Continue", exact: true }).click();
    assert.equal(await f.page.locator("output").textContent(), "", "first step does not create the identity");
    assert.equal(await f.page.getByRole("radio", { name: "System", exact: true }).count(), 0,
      "initial personalization remains an explicit dark/light choice");
    await f.page.getByRole("radio", { name: "Light", exact: true }).click();
    await f.page.getByRole("radio", { name: "Rose", exact: true }).click();
    assert.equal(await f.page.locator('input[type="file"]').count(), 0);
    assert.equal(await f.page.locator(".required-mark").count(), 0, "already-valued appearance controls are not required inputs");
    const finish = f.page.getByRole("button", { name: "Get started", exact: true });
    assert.equal(await finish.locator('svg:visible').count(), 0);
    await finish.click();
    const submitted = JSON.parse((await f.page.locator("output").textContent())!);
    assert.equal(submitted.login, "new-owner");
    assert.match(submitted.avatarSeed, /^[a-f0-9]{16}$/);
    assert.equal(submitted.password, "a test password only");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a new identity on a dark system starts from the dark appearance, the scheme AppearanceRoot publishes", async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import AccessForm from '@desert/svelte/catalog/compositions/access-form/AccessForm.svelte';
    import AppearanceRoot from '@desert/svelte/catalog/foundations/appearance-root/AppearanceRoot.svelte';
    let shown = $state(false), chosen = $state('');
  </script><button onclick={() => shown = true}>Show</button>
  {#if shown}<AppearanceRoot /><AccessForm mode="initialize" preferences={{ theme: 'system', textSize: 'standard', tint: 'blue', wallpaper: 'silk' }}
    onappearancechange={value => chosen = value.theme} onsubmit={async () => {}} />{/if}<output>{chosen}</output>`);
  try {
    await f.page.emulateMedia({ colorScheme: "dark" });
    await f.page.getByRole("button", { name: "Show", exact: true }).click();
    assert.equal(await f.page.locator("output").textContent(), "dark");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("access copy and choices contain no image upload, ghost action or redundant workspace slogan", async () => {
  const files = await Promise.all(["access-screen/AccessScreen.svelte", "access-form/AccessForm.svelte", "appearance/Appearance.svelte"]
    .map(file => readFile(new URL(`../src/svelte/catalog/compositions/${file}`, import.meta.url), "utf8")));
  assert.doesNotMatch(files.join("\n"), /Your private workspace|Unlock your private workspace|Choose image|UI tint|variant="ghost"/);
});

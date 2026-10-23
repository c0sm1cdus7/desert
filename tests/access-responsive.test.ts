import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { accessProfile } from "../src/svelte/pieces/access-profile.ts";
import { avatarGeometry, identityAvatarSeed } from "../src/svelte/pieces/avatar-seed.ts";

test("remembered identity is bounded presentation data, never session authority", () => {
  const profile = { login:"sample-user", displayName:"Sample user", avatarSeed:"0011223344556677" };
  assert.deepEqual(accessProfile(profile), profile);
  for (const value of [{ ...profile, token:"secret" }, { ...profile, role:"administrator" }, { ...profile, avatarSeed:"<svg>" }, { ...profile, login:"" }]) assert.equal(accessProfile(value), null);
  assert.deepEqual(avatarGeometry(profile.avatarSeed), avatarGeometry(profile.avatarSeed));
  assert.match(identityAvatarSeed("legacy-identity"), /^[a-f0-9]{16}$/);
});

test("access stays operable at wide, narrow and enlarged text sizes with a real bank composition", { timeout:240000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import { onMount } from 'svelte';
    import AccessExperience from '@desert/svelte/pieces/AccessExperience.svelte';
    import { mountCatalogAppearance } from '@desert/svelte/pieces/catalog-appearance.ts';
    let current = $state({state:{kind:'onboarding'},busy:false,error:null});
    const profile={login:'sample-user',displayName:'Sample user',avatarSeed:'0011223344556677'};
    onMount(mountCatalogAppearance);
  </script><AccessExperience productLabel="VOID" {current} {profile}
    authenticate={async () => { current={state:{kind:'locked'},busy:false,error:null}; }} refresh={async () => {}} />`, {}, "http://access-fixture.test/");
  const directory = new URL("../artifacts/access-personalization/current/", import.meta.url);
  try {
    f.page.setDefaultTimeout(15000);
    await mkdir(directory, { recursive:true });
    await f.page.addStyleTag({ content:await rendererCss() });
    await f.page.emulateMedia({ colorScheme:"dark", reducedMotion:"reduce" });
    for (const width of [1440,390]) {
      await f.page.setViewportSize({width,height:1000});
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await f.page.screenshot({path:new URL(`identity-${width}.png`,directory).pathname,fullPage:true});
    }
    const inputs = await f.page.locator('input').evaluateAll(elements => elements.map(element => ({label:element.getAttribute('aria-label'),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height,display:getComputedStyle(element).display,visibility:getComputedStyle(element).visibility})));
    assert.ok(inputs.every(input => input.width > 0 && input.height > 0), JSON.stringify({inputs,errors:f.errors}));
    await f.page.getByLabel("Display name", {exact:true}).fill("Sample user");
    await f.page.getByLabel("Identity name", {exact:true}).fill("sample-user");
    await f.page.getByLabel("Password", {exact:true}).fill("Example password only");
    await f.page.getByRole("button",{name:"Continue",exact:true}).click();
    await f.page.getByRole("radio",{name:"Rose",exact:true}).click();
    for (const width of [1440,390,320]) {
      await f.page.setViewportSize({width,height:1000});
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await f.page.screenshot({path:new URL(`appearance-${width}.png`,directory).pathname,fullPage:true});
    }
    await f.page.evaluate(() => document.documentElement.style.setProperty("font-size","200%"));
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await f.page.getByRole("button",{name:"Get started",exact:true}).click();
    await f.page.getByRole("heading",{name:"Sample user",exact:true}).waitFor();
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.ok(await f.page.getByRole("button").evaluateAll(elements => elements.every(element => {
      const rect=element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth;
    })), "every lock action fits the narrow viewport at 200% text");
    await f.page.screenshot({path:new URL("lock-320-200percent.png",directory).pathname,fullPage:true});
    await f.page.evaluate(() => document.documentElement.style.removeProperty("font-size"));
    for (const width of [1440,390]) {
      await f.page.setViewportSize({width,height:1000});
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await f.page.screenshot({path:new URL(`lock-${width}.png`,directory).pathname,fullPage:true});
    }
    assert.equal(await f.page.getByLabel("Identity name",{exact:true}).count(),0);
    await f.page.getByRole("button",{name:"Use another identity",exact:true}).click();
    await f.page.getByLabel("Identity name",{exact:true}).fill("another-user");
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});

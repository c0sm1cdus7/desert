import test from "node:test";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { avatarEvidence, avatarGeometry, avatarViolations } from "./web/avatar-identity-expectations.ts";

// The avatar control is MediaControl's row of an Avatar and its label Text (lane D): the row is what holds the avatar.
test("shared avatar keeps long names readable in actual light and dark themes at 200 percent", { timeout: 60000 }, async () => {
  const source = `<script lang="ts">
    import MediaControl from "@desert/svelte/catalog/compositions/media-control/MediaControl.svelte";
    import * as Card from "@desert/svelte/vendor/components/ui/card/index.js";
    const node = {version:"desert.control/1",kind:"avatar",id:"independent-identity",disabled:false,
      label:"AlexandraVeryLongUnbrokenFamilyName Rivera",source:null,seed:"5c2e9b71a0d4f386"};
  </script><main style="padding:16px"><Card.Root><Card.Content>
    <MediaControl {node}/>
  </Card.Content></Card.Root></main>`;
  const f = await svelteBrowser(source), failures: string[] = [], palettes: string[] = [];
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 320, height: 844 });
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
      const row = f.page.locator('div:has(> [data-slot="avatar"])');
      const geometry = await avatarGeometry(row), violations = avatarViolations(geometry, true);
      failures.push(...violations.map(value => `${colorScheme}: ${value}`));
      const font = await row.locator(":scope > p").evaluate(node => getComputedStyle(node).fontSize);
      assert.ok(parseFloat(font) >= 26, "the readable name really scales at 200%, not only its container");
      palettes.push(JSON.stringify(geometry.surface));
      const axe = await new AxeBuilder({ page: f.page }).include('div:has(> [data-slot="avatar"])').analyze();
      const serious = axe.violations.filter(item => item.impact === "serious" || item.impact === "critical");
      failures.push(...serious.map(item => `${colorScheme}: ${item.id}`));
      await avatarEvidence(f.page, `source-long-name-${colorScheme}`, { geometry, violations, font, axe: serious });
    }
    assert.notEqual(palettes[0], palettes[1], "actual theme surfaces change, not merely the media preference");
    assert.deepEqual(f.errors, []); assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

test("a person without a picture shows the seed drawing filling the face, never letters", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import MediaControl from "@desert/svelte/catalog/compositions/media-control/MediaControl.svelte";
    const node = {version:"desert.control/1",kind:"avatar",id:"seed-only",disabled:false,
      label:"William West",source:null,seed:"a1b2c3d4e5f60718"};
  </script><main style="padding:16px"><MediaControl {node}/></main>`);
  const failures: string[] = [];
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 320, height: 844 });
    for (const colorScheme of ["light", "dark"] as const) for (const scale of [1, 2]) {
      await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await f.page.evaluate(scale => document.documentElement.style.setProperty("--text-scale", String(scale)), scale);
      const row = f.page.locator('div:has(> [data-slot="avatar"])');
      assert.equal(await row.locator("[data-avatar-seed]").getAttribute("data-avatar-seed"), "a1b2c3d4e5f60718");
      const geometry = await avatarGeometry(row), violations = avatarViolations(geometry, true);
      failures.push(...violations.map(value => `${colorScheme}/${scale}: ${value}`));
      await avatarEvidence(f.page, `source-seed-${colorScheme}-${scale}`, { geometry, violations }, row);
    }
    assert.deepEqual(f.errors, []); assert.deepEqual(failures, []);
  } finally { await f.close(); }
});
